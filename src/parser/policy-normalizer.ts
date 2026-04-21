/**
 * Policy Normalization - D02 Implementation.
 *
 * This module implements the normalization of InputPolicyDocument (validated by D01)
 * into internal StandardStatement list, with stable sourcePolicyId and statementId generation.
 *
 * Key design decisions:
 * - Pure function: no side effects,便于测试
 * - sourcePolicyId: stable identifier for the source policy document
 * - statementId: stable identifier for each statement within a policy
 * - All source tracing fields are preserved for downstream processing
 */

import type {
  InputPolicyDocument,
  InputStatement,
  StandardStatement,
} from './policy-types.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Input for the normalizePolicy function.
 */
export interface NormalizationInput {
  /** D01-validated InputPolicyDocument */
  readonly policy: InputPolicyDocument;
  /** Source file path (empty string for non-file input) */
  readonly sourcePolicyPath: string;
  /** Stable source descriptor for non-file input */
  readonly sourceDescription: string;
  /** Policy index within the document (starts from 0) */
  readonly sourcePolicyIndex: number;
}

/**
 * Output of the normalizePolicy function.
 */
export interface NormalizationOutput {
  /** Generated sourcePolicyId - uniquely identifies this policy document */
  readonly sourcePolicyId: string;
  /** Normalized statement list */
  readonly statements: readonly StandardStatement[];
}

/**
 * Condition value type after normalization.
 * Numbers are converted to strings for consistency.
 */
type NormalizedConditionValue = string | string[] | boolean | boolean[];

/**
 * Normalized condition structure.
 */
type NormalizedConditions = Readonly<Record<string, Readonly<Record<string, NormalizedConditionValue>>>>;

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a stable sourcePolicyId based on input source.
 *
 * For file input: uses the full path + sourcePolicyIndex
 * For non-file input: uses sourceDescription + sourcePolicyIndex
 *
 * @param sourcePolicyPath - Source file path (can be empty)
 * @param sourceDescription - Stable source descriptor for non-file input
 * @param sourcePolicyIndex - Policy index within document
 * @returns Stable sourcePolicyId
 */
export function generateSourcePolicyId(
  sourcePolicyPath: string,
  sourceDescription: string,
  sourcePolicyIndex: number,
): string {
  if (sourcePolicyPath && sourcePolicyPath.length > 0) {
    // For file input: use full path + index for maximum stability and uniqueness
    return `${sourcePolicyPath}:${sourcePolicyIndex}`;
  }
  // For non-file input: use sourceDescription + index
  return `${sourceDescription}:${sourcePolicyIndex}`;
}

/**
 * Generate statement content hash for statementId generation.
 *
 * @param statement - The input statement
 * @returns MD5 hash string (first 8 characters)
 */
function generateStatementContentHash(statement: InputStatement): string {
  // Create a canonical string representation for hashing
  // We include the key fields that define statement identity
  const canonical = JSON.stringify({
    Effect: statement.Effect,
    Action: Array.isArray(statement.Action) ? statement.Action : [statement.Action],
    Resource: Array.isArray(statement.Resource) ? statement.Resource : [statement.Resource],
    Condition: statement.Condition,
    Sid: statement.Sid,
  });
  return md5Hash(canonical);
}

/**
 * Simple MD5 hash implementation.
 * Returns first 8 characters of the hash.
 *
 * @param input - String to hash
 * @returns MD5 hash (first 8 hex characters)
 */
function md5Hash(input: string): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(input).digest('hex').substring(0, 8);
}

/**
 * Generate statementId based on Sid or content hash.
 *
 * Rules:
 * 1. If Sid exists and is non-empty: "sid:<sourcePolicyId>:<Sid>"
 * 2. If Sid is missing/empty: "stmt:<sourcePolicyId>:<shortHash>"
 * 3. If duplicate content within same policy: "stmt:<sourcePolicyId>:<shortHash>:dup<N>"
 *
 * @param sid - Original Sid from statement (may be undefined)
 * @param sourcePolicyId - Parent policy identifier
 * @param contentHash - Short hash of statement content
 * @param duplicateIndex - Index for duplicate detection (0 = first occurrence)
 * @returns Generated statementId
 */
export function generateStatementId(
  sid: string | undefined,
  sourcePolicyId: string,
  contentHash: string,
  duplicateIndex: number = 0,
): string {
  if (sid !== undefined && sid !== null && sid.length > 0) {
    return `sid:${sourcePolicyId}:${sid}`;
  }
  if (duplicateIndex > 0) {
    return `stmt:${sourcePolicyId}:${contentHash}:dup${duplicateIndex}`;
  }
  return `stmt:${sourcePolicyId}:${contentHash}`;
}

// ============================================================================
// Normalization Logic
// ============================================================================

/**
 * Normalize an InputPolicyDocument to StandardStatement list.
 *
 * This function:
 * - Unwraps Statement (single object or array) to array
 * - Generates stable sourcePolicyId
 * - Generates statementId for each statement (Sid-based or hash-based)
 * - Normalizes actions/resources to string arrays
 * - Normalizes condition values (numbers converted to strings)
 * - Preserves source tracing fields and raw statement
 *
 * @param input - NormalizationInput containing policy and source info
 * @returns NormalizationOutput with sourcePolicyId and StandardStatement list
 */
export function normalizePolicy(input: NormalizationInput): NormalizationOutput {
  const { policy, sourcePolicyPath, sourceDescription, sourcePolicyIndex } = input;

  // Generate sourcePolicyId for this policy document
  const sourcePolicyId = generateSourcePolicyId(
    sourcePolicyPath,
    sourceDescription,
    sourcePolicyIndex,
  );

  // Unwrap Statement to array
  const statementArray: InputStatement[] = Array.isArray(policy.Statement)
    ? policy.Statement
    : [policy.Statement];

  // Track content hashes for duplicate detection
  const contentHashCount: Map<string, number> = new Map();

  // Process each statement
  const statements: StandardStatement[] = statementArray.map(
    (stmt: InputStatement, index: number): StandardStatement => {
      // Generate content hash for this statement
      const contentHash = generateStatementContentHash(stmt);

      // Count occurrences for duplicate detection
      const previousCount = contentHashCount.get(contentHash) ?? 0;
      contentHashCount.set(contentHash, previousCount + 1);

      // Generate statementId
      const statementId = generateStatementId(
        stmt.Sid,
        sourcePolicyId,
        contentHash,
        previousCount, // 0 for first, N for subsequent duplicates
      );

      // Normalize actions to array
      const actions: readonly string[] = normalizeToStringArray(stmt.Action);

      // Normalize resources to array
      const resources: readonly string[] = normalizeToStringArray(stmt.Resource);

      // Normalize conditions (numbers converted to strings)
      const conditions: NormalizedConditions = normalizeConditions(stmt.Condition);

      return {
        statementId,
        sourcePolicyId,
        sourcePolicyPath,
        sourcePolicyIndex,
        sourceStatementIndex: index,
        sid: stmt.Sid,
        effect: stmt.Effect,
        actions,
        resources,
        conditions,
        raw: stmt as unknown,
      };
    },
  );

  return {
    sourcePolicyId,
    statements,
  };
}

/**
 * Normalize a value to a readonly string array.
 *
 * @param value - Single string or array of strings
 * @returns Readonly string array
 */
function normalizeToStringArray(value: string | string[]): readonly string[] {
  if (Array.isArray(value)) {
    return Object.freeze([...value]);
  }
  return Object.freeze([value]);
}

/**
 * Normalize condition values.
 * Numbers are converted to strings for type consistency.
 *
 * @param condition - Input condition or undefined
 * @returns Normalized condition structure
 */
function normalizeConditions(
  condition: InputStatement['Condition'],
): NormalizedConditions {
  if (condition === undefined) {
    return Object.freeze({});
  }

  const result: Record<string, Record<string, NormalizedConditionValue>> = {};

  for (const [operator, conditions] of Object.entries(condition)) {
    const normalizedOperator: Record<string, NormalizedConditionValue> = {};
    for (const [key, value] of Object.entries(conditions)) {
      normalizedOperator[key] = normalizeConditionValue(value);
    }
    result[operator] = Object.freeze(normalizedOperator);
  }

  return Object.freeze(result);
}

/**
 * Normalize a single condition value.
 * Numbers are converted to strings.
 *
 * @param value - Raw condition value
 * @returns Normalized value
 */
function normalizeConditionValue(
  value: string | string[] | boolean | boolean[] | number | number[],
): NormalizedConditionValue {
  if (typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return value as string[];
    }
    if (typeof value[0] === 'number') {
      return (value as number[]).map(v => String(v));
    }
    return value as NormalizedConditionValue;
  }
  return value as NormalizedConditionValue;
}
