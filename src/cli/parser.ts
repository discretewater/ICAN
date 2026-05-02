/**
 * Z06-D01: CLI argument parser for the `ican check` subcommand.
 *
 * Parses a raw string array (typically process.argv after the subcommand)
 * and produces a typed ParseResult: success (CheckCommandOptions),
 * error (list of ParamError), or help (help text).
 *
 * Validation rules (per Design Book §10.3):
 * - --policy is required (at least one).
 * - --action is required.
 * - --resource is required.
 * - --context-json and --context-file are mutually exclusive.
 * - --format must be "text" or "json"; defaults to "text".
 * - --help triggers help output immediately.
 *
 * This module is a pure function; it does NOT:
 * - Read files
 * - Parse JSON
 * - Call the engine
 * - Call reporters
 * - Use process.argv or process.exit
 */

import { renderHelpText } from './help.js';
import {
  VALID_FORMATS,
  VALUED_FLAGS,
  BOOLEAN_FLAGS,
} from './types.js';
import type {
  CheckCommandOptions,
  OutputFormat,
  ParamError,
  ParamErrorCode,
  ParseResult,
} from './types.js';

// ─── Internal helpers ─────────────────────────────────────────────────

function makeError(code: ParamErrorCode, message: string): ParamError {
  return { code, message };
}

// ─── Raw argument parsing ─────────────────────────────────────────────

/**
 * Parse raw string arguments into an intermediate key-value map.
 *
 * Handles:
 * - Valued flags: --flag value (e.g., --policy p1.json, --action s3:GetObject).
 * - Boolean flags: --help (stored as "true" string marker).
 * - Repeated flags: --policy values are accumulated in an array.
 * - Unknown flags: flagged as errors.
 * - Missing values: flagged as errors.
 *
 * @param rawArgs Raw argument strings (no subcommand prefix).
 * @returns An object with parsed key-value pairs and any parse-level errors.
 */
interface RawParseResult {
  readonly args: Readonly<Record<string, string | string[]>>;
  readonly errors: ParamError[];
}

function parseRaw(rawArgs: readonly string[]): RawParseResult {
  // Use a mutable intermediate map to avoid noUncheckedIndexedAccess
  // complications with Record dereference.
  const argMap = new Map<string, string | string[]>();
  const errors: ParamError[] = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i] as string;

    // ── Boolean flags ─────────────────────────────────────────
    if (BOOLEAN_FLAGS.has(arg)) {
      argMap.set(arg, 'true');
      continue;
    }

    // ── Valued flags ─────────────────────────────────────────
    if (VALUED_FLAGS.has(arg)) {
      const nextIdx = i + 1;
      if (nextIdx >= rawArgs.length) {
        errors.push(
          makeError('missing_value', `Flag ${arg} requires a value but none was provided.`),
        );
        continue;
      }

      const rawValue = rawArgs[nextIdx] as string;

      // Treat the next arg as a value UNLESS it looks like another flag
      if (rawValue.startsWith('--')) {
        errors.push(
          makeError('missing_value', `Flag ${arg} requires a value but received flag ${rawValue}.`),
        );
        // Do NOT increment i; let the next iteration handle the flag
        continue;
      }

      // Single-value flags must not be repeated (--policy is the exception)
      if (arg !== '--policy' && argMap.has(arg)) {
        errors.push(
          makeError('duplicate_flag', `Duplicate flag: ${arg}. This flag may only be specified once.`),
        );
        i++; // consume the duplicate value but do not overwrite the first
        continue;
      }

      // Accumulate for repeated flags (--policy only at this point)
      const existing = argMap.get(arg);
      if (existing !== undefined) {
        if (Array.isArray(existing)) {
          existing.push(rawValue);
        } else {
          argMap.set(arg, [existing, rawValue]);
        }
      } else {
        argMap.set(arg, rawValue);
      }

      i++; // consume the value
      continue;
    }

    // ── Positional or unknown ─────────────────────────────────
    if (arg.startsWith('--')) {
      errors.push(
        makeError('unknown_flag', `Unknown flag: ${arg}. Use --help for usage information.`),
      );
    } else {
      errors.push(
        makeError(
          'unexpected_positional',
          `Unexpected positional argument: "${arg}". The "check" command does not accept positional arguments.`,
        ),
      );
    }
  }

  // Convert Map back to plain Record for downstream consumption
  const args: Record<string, string | string[]> = {};
  for (const [key, value] of argMap) {
    args[key] = value;
  }

  return { args, errors };
}

// ─── Validation ───────────────────────────────────────────────────────

/**
 * Validate parsed raw arguments against the business rules
 * defined in Design Book §10.3.
 *
 * @param args Raw parsed arguments map.
 * @returns List of validation errors (may be empty).
 */
function validate(rawArgsResult: RawParseResult): ParamError[] {
  const errors: ParamError[] = [...rawArgsResult.errors];
  const { args } = rawArgsResult;

  // ── Check for --help first ── (help bypasses other validation)
  // Help is handled before validation in the main parse function.

  // ── Required: at least one --policy ────────────────────────
  const policies = args['--policy'];
  if (policies === undefined) {
    errors.push(
      makeError('missing_required', 'Missing required parameter: --policy. At least one policy file must be specified.'),
    );
  }

  // ── Required: --action ────────────────────────────────────
  if (args['--action'] === undefined) {
    errors.push(
      makeError('missing_required', 'Missing required parameter: --action. An IAM action must be specified.'),
    );
  }

  // ── Required: --resource ──────────────────────────────────
  if (args['--resource'] === undefined) {
    errors.push(
      makeError('missing_required', 'Missing required parameter: --resource. A target resource must be specified.'),
    );
  }

  // ── Mutually exclusive: --context-json vs --context-file ──
  const hasContextJson = args['--context-json'] !== undefined;
  const hasContextFile = args['--context-file'] !== undefined;

  if (hasContextJson && hasContextFile) {
    errors.push(
      makeError(
        'mutually_exclusive',
        '--context-json and --context-file cannot be used together. Choose one context input method.',
      ),
    );
  }

  // ── Format validation ─────────────────────────────────────
  const formatValue = args['--format'];
  if (formatValue !== undefined) {
    const formatStr: string = Array.isArray(formatValue) ? formatValue[0] ?? '' : formatValue;
    if (!VALID_FORMATS.includes(formatStr as OutputFormat)) {
      errors.push(
        makeError(
          'invalid_format',
          `Invalid --format value: "${formatStr}". Must be one of: ${VALID_FORMATS.join(', ')}.`,
        ),
      );
    }
  }

  return errors;
}

// ─── Assembly ──────────────────────────────────────────────────────────

/**
 * Assemble validated arguments into a typed {@link CheckCommandOptions}.
 *
 * Defaults:
 * - format: "text" if not specified.
 *
 * @param args Validated raw arguments.
 * @returns Typed CheckCommandOptions.
 */
function assemble(args: Readonly<Record<string, string | string[]>>): CheckCommandOptions {
  // ── Policies: always an array ──────────────────────────────
  const policiesRaw = args['--policy'];
  let policies: string[];
  if (policiesRaw === undefined) {
    policies = [];
  } else if (Array.isArray(policiesRaw)) {
    policies = policiesRaw;
  } else {
    policies = [policiesRaw];
  }

  // ── Format: default to text ──────────────────────────────
  const formatValue = args['--format'];
  const formatRaw: string = Array.isArray(formatValue) ? (formatValue[0] ?? 'text') : (formatValue ?? 'text');
  const format: OutputFormat = VALID_FORMATS.includes(formatRaw as OutputFormat)
    ? (formatRaw as OutputFormat)
    : 'text';

  // ── Context: only one of these will be set at this point ──
  const contextJsonRaw = args['--context-json'];
  const contextFileRaw = args['--context-file'];
  const contextJson: string | undefined = Array.isArray(contextJsonRaw)
    ? (contextJsonRaw[0])
    : contextJsonRaw;
  const contextFile: string | undefined = Array.isArray(contextFileRaw)
    ? (contextFileRaw[0])
    : contextFileRaw;

  return {
    policies,
    action: (args['--action'] as string) ?? '',
    resource: (args['--resource'] as string) ?? '',
    ...(contextJson !== undefined && { contextJson }),
    ...(contextFile !== undefined && { contextFile }),
    format,
  };
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Parse and validate CLI arguments for the `ican check` subcommand.
 *
 * Takes the raw argument array (after the "check" subcommand token)
 * and returns a typed {@link ParseResult}.
 *
 * Processing order:
 * 1. Check for --help → return help immediately.
 * 2. Parse raw args into key-value map.
 * 3. Validate business rules (required, mutually exclusive, format).
 * 4. If errors exist, return error result.
 * 5. Otherwise, assemble and return success result with options.
 *
 * This function is pure: it does not read files, call the engine,
 * or produce side effects.
 *
 * @param rawArgs Argument strings after the "check" subcommand.
 *                 e.g., ["--policy", "p.json", "--action", "s3:GetObject", "--resource", "r"]
 * @returns ParseResult (success, error, or help).
 */
export function parseCheckArgs(rawArgs: readonly string[]): ParseResult {
  // ── Step 1: --help takes priority ──────────────────────────
  if (rawArgs.includes('--help')) {
    return { kind: 'help', helpText: renderHelpText() };
  }

  // ── Step 2: Raw parse ─────────────────────────────────────
  const rawResult = parseRaw(rawArgs);

  // ── Step 3: Validate ──────────────────────────────────────
  const validationErrors = validate(rawResult);

  if (validationErrors.length > 0) {
    return { kind: 'error', errors: validationErrors };
  }

  // ── Step 4: Assemble ─────────────────────────────────────
  const options = assemble(rawResult.args);

  return { kind: 'success', options };
}
