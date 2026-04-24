import { compileResourcePattern } from './resource-matcher.js';

/**
 * First-stage supported Condition operators.
 */
export type ConditionOperator = 'StringEquals' | 'StringLike' | 'Bool' | 'IpAddress';

/**
 * Normalised Condition entry produced from raw policy data.
 */
export interface ConditionEntry {
  readonly operator: string;
  readonly key: string;
  readonly values: readonly string[];
}

/**
 * Raw condition structure as it appears in StandardStatement.conditions.
 */
export type RawConditions = Readonly<Record<string, Record<string, string | string[] | boolean | boolean[]>>>;

/**
 * Evaluation context – key/value map provided at request time.
 */
export interface EvaluationContext {
  readonly [key: string]: unknown;
}

/**
 * Result of evaluating a set of Condition entries.
 */
export interface ConditionEvaluationResult {
  readonly matched: boolean;
  readonly reason: 'conditions_matched' | 'conditions_not_matched' | 'unsupported_feature';
  readonly unsupportedDetails?: readonly string[];
}

/** Operators supported in the first stage. */
const SUPPORTED_OPERATORS: ReadonlySet<string> = new Set<ConditionOperator>([
  'StringEquals',
  'StringLike',
  'Bool',
  'IpAddress',
]);

/** Pre-computed byte masks for CIDR matching (index = remaining bits). */
const BYTE_MASKS: readonly number[] = [0x00, 0x80, 0xc0, 0xe0, 0xf0, 0xf8, 0xfc, 0xfe, 0xff];

/**
 * Flatten the nested RawConditions structure into a linear list of
 * ConditionEntry objects.
 *
 * All policy values are normalised to string[]:
 * - string          → [value]
 * - string[]        → preserved
 * - boolean         → ["true"] or ["false"]
 * - boolean[]       → each element mapped to "true" / "false"
 *
 * Unknown operators are preserved as-is so that evaluateConditions can
 * report them as unsupported.
 */
export function normalizeConditions(raw: RawConditions): ConditionEntry[] {
  const entries: ConditionEntry[] = [];

  for (const [operator, keyMap] of Object.entries(raw)) {
    for (const [key, rawValue] of Object.entries(keyMap)) {
      let values: string[];

      if (typeof rawValue === 'string') {
        values = [rawValue];
      } else if (Array.isArray(rawValue)) {
        values = rawValue.map((v) => String(v));
      } else if (typeof rawValue === 'boolean') {
        values = [String(rawValue)];
      } else {
        // Exhaustiveness guard; unreachable for valid RawConditions values.
        const _exhaustive: never = rawValue;
        throw new Error(`Unexpected raw condition value: ${_exhaustive}`);
      }

      entries.push({
        operator,
        key,
        values,
      });
    }
  }

  return entries;
}

/**
 * Evaluate a list of ConditionEntry objects against the supplied context.
 *
 * Algorithm:
 * 1. Scan for unsupported operators – if any are found, return
 *    unsupported_feature immediately.
 * 2. Evaluate every entry; a missing key or a handler returning false
 *    causes an immediate conditions_not_matched result.
 * 3. If all entries pass, return conditions_matched.
 */
export function evaluateConditions(
  conditions: readonly ConditionEntry[],
  context: EvaluationContext,
): ConditionEvaluationResult {
  const unsupportedDetails: string[] = [];

  for (const entry of conditions) {
    if (!SUPPORTED_OPERATORS.has(entry.operator)) {
      unsupportedDetails.push(`unsupported operator: ${entry.operator}`);
    }
  }

  if (unsupportedDetails.length > 0) {
    return {
      matched: false,
      reason: 'unsupported_feature',
      unsupportedDetails,
    };
  }

  for (const entry of conditions) {
    const contextValue = context[entry.key];

    if (contextValue === undefined || contextValue === null) {
      return {
        matched: false,
        reason: 'conditions_not_matched',
      };
    }

    let handlerResult: boolean;

    switch (entry.operator) {
      case 'StringEquals': {
        handlerResult = handleStringEquals(entry.key, entry.values, contextValue);
        break;
      }
      case 'StringLike': {
        handlerResult = handleStringLike(entry.key, entry.values, contextValue);
        break;
      }
      case 'Bool': {
        handlerResult = handleBool(entry.key, entry.values, contextValue);
        break;
      }
      case 'IpAddress': {
        handlerResult = handleIpAddress(entry.key, entry.values, contextValue);
        break;
      }
      default: {
        // Unreachable because unsupported operators are filtered out above.
        throw new Error(`Unexpected operator: ${entry.operator}`);
      }
    }

    if (!handlerResult) {
      return {
        matched: false,
        reason: 'conditions_not_matched',
      };
    }
  }

  return {
    matched: true,
    reason: 'conditions_matched',
  };
}

/**
 * StringEquals – case-sensitive strict equality.
 * contextValue must be a string and match at least one policy value.
 */
function handleStringEquals(key: string, policyValues: readonly string[], contextValue: unknown): boolean {
  void key;
  if (typeof contextValue !== 'string') {
    return false;
  }
  return policyValues.some((value) => value === contextValue);
}

/**
 * StringLike – wildcard matching that reuses compileResourcePattern from
 * the resource matcher.  The compiled pattern may be 'any', 'exact', or
 * 'wildcard'; each kind is handled appropriately.
 */
function handleStringLike(key: string, policyValues: readonly string[], contextValue: unknown): boolean {
  void key;
  if (typeof contextValue !== 'string') {
    return false;
  }

  for (const policyValue of policyValues) {
    const pattern = compileResourcePattern(policyValue);

    switch (pattern.kind) {
      case 'any': {
        return true;
      }
      case 'exact': {
        if (contextValue === pattern.value) {
          return true;
        }
        break;
      }
      case 'wildcard': {
        if (pattern.regex.test(contextValue)) {
          return true;
        }
        break;
      }
      default: {
        const _exhaustive: never = pattern;
        throw new Error(`Unknown pattern kind: ${_exhaustive}`);
      }
    }
  }

  return false;
}

/**
 * Bool – boolean comparison with normalisation.
 * contextValue is normalised from boolean or from the strings "true" /
 * "false".  Policy values are expected to be "true" or "false" strings.
 */
function handleBool(key: string, policyValues: readonly string[], contextValue: unknown): boolean {
  void key;
  let normalizedContext: boolean;

  if (typeof contextValue === 'boolean') {
    normalizedContext = contextValue;
  } else if (typeof contextValue === 'string') {
    normalizedContext = contextValue === 'true';
  } else {
    return false;
  }

  const normalizedPolicies = policyValues.map((v) => v === 'true');
  return normalizedPolicies.some((p) => p === normalizedContext);
}

/**
 * Parse an IPv4 address into its four byte components.
 */
function parseIpv4(ip: string): [number, number, number, number] {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (
    parts.length !== 4 ||
    parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
  ) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return parts as [number, number, number, number];
}

/**
 * Determine whether an IPv4 address falls inside a CIDR range.
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const cidrParts = cidr.split('/');
  if (cidrParts.length !== 2) {
    throw new Error(`Invalid CIDR format: ${cidr}`);
  }
  const networkIp = cidrParts[0]!;
  const prefixStr = cidrParts[1]!;
  const prefix = parseInt(prefixStr, 10);

  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix: ${prefixStr}`);
  }

  const ipBytes = parseIpv4(ip);
  const networkBytes = parseIpv4(networkIp);

  const fullBytes = Math.floor(prefix / 8);
  const remainingBits = prefix % 8;

  for (let i = 0; i < fullBytes; i++) {
    if (ipBytes[i] !== networkBytes[i]) {
      return false;
    }
  }

  if (remainingBits > 0) {
    const mask = BYTE_MASKS[remainingBits];
    if (mask === undefined || fullBytes >= 4) {
      throw new Error(`Unexpected remaining bits or byte index`);
    }
    const ipByte = ipBytes[fullBytes];
    const netByte = networkBytes[fullBytes];
    if (ipByte === undefined || netByte === undefined) {
      throw new Error(`Unexpected byte index: ${fullBytes}`);
    }
    if ((ipByte & mask) !== (netByte & mask)) {
      return false;
    }
  }

  return true;
}

/**
 * IpAddress – IPv4 address matching against a list of CIDR ranges.
 * contextValue must be a valid IPv4 string.  If it is not, the handler
 * returns false.
 */
function handleIpAddress(key: string, policyValues: readonly string[], contextValue: unknown): boolean {
  void key;
  if (typeof contextValue !== 'string') {
    return false;
  }

  for (const cidr of policyValues) {
    try {
      if (isIpInCidr(contextValue, cidr)) {
        return true;
      }
    } catch {
      // Invalid IP or CIDR – treat as non-match for this value.
      continue;
    }
  }

  return false;
}
