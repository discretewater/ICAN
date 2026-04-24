/**
 * Path trace builder – D06: generates structured PathTraceEntry[] from
 * EvaluationResult and StandardStatement[].
 *
 * This module consumes the output of D05 (EvaluationResult, which carries
 * MatchResult[] in its statementResults field) and the source information
 * from Z01-D02's StandardStatement[] to produce a machine-readable path
 * trace for downstream consumers (Z04 output rendering, etc.).
 *
 * Boundary: does not re-execute matching (D01/D02/D03), does not re-evaluate
 * statements (D04), does not re-merge decisions (D05), does not modify
 * EvaluationResult.finalDecision or .decisionStatus, and does not produce
 * text/JSON/CLI rendering.
 */

import type { EvaluationResult } from './decision-evaluator.js';
import type { MatchResult } from './statement-evaluator.js';
import type { StandardStatement } from '../parser/policy-types.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * Source information for a statement, mapping the statement back to its
 * originating policy document.
 *
 * When a corresponding StandardStatement cannot be found, default values
 * are used: sourcePolicyId="", sourcePolicyPath="", sourcePolicyIndex=-1,
 * sourceStatementIndex=-1, sid=undefined.
 */
export interface StatementSource {
  /** Source policy document identifier */
  readonly sourcePolicyId: string;
  /** Source policy file path (empty string for non-file input) */
  readonly sourcePolicyPath: string;
  /** Index of the source policy in the input document sequence (0-based) */
  readonly sourcePolicyIndex: number;
  /** Index of the statement within its source policy (0-based) */
  readonly sourceStatementIndex: number;
  /** Original Sid from the input statement, or undefined if absent */
  readonly sid: string | undefined;
}

/**
 * Single statement path trace entry, combining the matching result with
 * the source provenance information.
 *
 * Field correspondence to MatchResult:
 * - statementId, effect, actionMatched, resourceMatched, conditionMatched,
 *   applicable, nonApplicableReasons, unsupportedFeatures are carried over
 *   as-is from EvaluationResult.statementResults.
 * - source is resolved by looking up statementId in StandardStatement[].
 */
export interface PathTraceEntry {
  /** Stable identifier for the statement */
  readonly statementId: string;
  /** Effect of the statement: Allow or Deny */
  readonly effect: 'Allow' | 'Deny';
  /** Whether the action dimension matched */
  readonly actionMatched: boolean;
  /** Whether the resource dimension matched */
  readonly resourceMatched: boolean;
  /** Whether the condition dimension matched */
  readonly conditionMatched: boolean;
  /** Whether the statement is applicable (all dimensions satisfied) */
  readonly applicable: boolean;
  /** Reasons why the statement is not applicable (empty when applicable) */
  readonly nonApplicableReasons: readonly string[];
  /** Unsupported feature detail strings */
  readonly unsupportedFeatures: readonly string[];
  /** Source provenance information */
  readonly source: StatementSource;
}

// ─── Default placeholder source ──────────────────────────────────────

/**
 * Default source used when a statementId cannot be found in the
 * provided StandardStatement[]. This conservative fallback ensures
 * the function never throws due to missing source information.
 */
const DEFAULT_SOURCE: StatementSource = Object.freeze({
  sourcePolicyId: '',
  sourcePolicyPath: '',
  sourcePolicyIndex: -1,
  sourceStatementIndex: -1,
  sid: undefined,
});

// ─── Core function ───────────────────────────────────────────────────

/**
 * Build a PathTraceEntry[] from an EvaluationResult and StandardStatement[].
 *
 * For each MatchResult in EvaluationResult.statementResults:
 * 1. Extract statementId, effect, actionMatched, resourceMatched,
 *    conditionMatched, applicable, nonApplicableReasons, unsupportedFeatures.
 * 2. Look up statementId in StandardStatement[] to resolve source info.
 * 3. If found, map sourcePolicyId, sourcePolicyPath, sourcePolicyIndex,
 *    sourceStatementIndex, sid.
 * 4. If not found, use the default placeholder source.
 *
 * The output order matches the input statementResults order exactly.
 * This function does NOT modify the EvaluationResult.
 *
 * @param evaluationResult  The D05 EvaluationResult containing MatchResult[].
 * @param statements         The StandardStatement[] providing source info.
 * @returns A readonly PathTraceEntry[] preserving input order.
 */
export function buildPathTrace(
  evaluationResult: EvaluationResult,
  statements: readonly StandardStatement[],
): readonly PathTraceEntry[] {
  // Build a lookup map from statementId to StandardStatement for O(n) access.
  const statementMap: ReadonlyMap<string, StandardStatement> = new Map(
    statements.map((stmt: StandardStatement): [string, StandardStatement] => [
      stmt.statementId,
      stmt,
    ]),
  );

  return evaluationResult.statementResults.map(
    (match: MatchResult): PathTraceEntry => {
      const sourceStatement: StandardStatement | undefined =
        statementMap.get(match.statementId);

      const source: StatementSource = sourceStatement !== undefined
        ? {
            sourcePolicyId: sourceStatement.sourcePolicyId,
            sourcePolicyPath: sourceStatement.sourcePolicyPath,
            sourcePolicyIndex: sourceStatement.sourcePolicyIndex,
            sourceStatementIndex: sourceStatement.sourceStatementIndex,
            sid: sourceStatement.sid,
          }
        : { ...DEFAULT_SOURCE };

      return {
        statementId: match.statementId,
        effect: match.effect,
        actionMatched: match.actionMatched,
        resourceMatched: match.resourceMatched,
        conditionMatched: match.conditionMatched,
        applicable: match.applicable,
        nonApplicableReasons: match.nonApplicableReasons,
        unsupportedFeatures: match.unsupportedFeatures,
        source,
      };
    },
  );
}