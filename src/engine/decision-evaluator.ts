/**
 * Decision evaluator – merges individual MatchResults into a final
 * EvaluationResult following ICAN's deterministic decision logic.
 *
 * Decision merge rules (applied in order):
 *
 *  1. Collect applicable Deny statement IDs → matchedDenyStatementIds
 *  2. Collect applicable Allow statement IDs → matchedAllowStatementIds
 *  3. Detect unsupported features across all MatchResults
 *  4. If matchedDenyStatementIds non-empty → EXPLICIT_DENY / DETERMINATE
 *  5. Else if unsupported exists:
 *     - matchedAllowStatementIds non-empty → ALLOW / INDETERMINATE
 *     - otherwise → IMPLICIT_DENY / INDETERMINATE
 *  6. Else if matchedAllowStatementIds non-empty → ALLOW / DETERMINATE
 *  7. Else → IMPLICIT_DENY / DETERMINATE
 *
 * Boundary: does not call evaluateStatement/evaluateStatements,
 * does not accept StandardStatement[] or EvaluationRequest,
 * does not implement pathTrace, CLI, or file I/O.
 */

import type { MatchResult } from './statement-evaluator.js';
import type { Diagnostic } from '../parser/error-model.js';
import { createDiagnostic } from '../parser/error-model.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * Final decision rendered after merging all statement evaluation results.
 *
 * - ALLOW: at least one applicable Allow statement, no applicable Deny.
 * - EXPLICIT_DENY: at least one applicable Deny statement.
 * - IMPLICIT_DENY: no applicable Allow or Deny statement.
 */
export type FinalDecision = 'ALLOW' | 'EXPLICIT_DENY' | 'IMPLICIT_DENY';

/**
 * Determines whether the final decision is fully determined or
 * influenced by unsupported features.
 *
 * - DETERMINATE: the final decision is considered stable under the
 *   frozen decision rules, including the case where an applicable Deny
 *   determines the result despite other unsupported features.
 * - INDETERMINATE: unsupported features exist and no applicable Deny
 *   independently determines the result.
 */
export type DecisionStatus = 'DETERMINATE' | 'INDETERMINATE';

/**
 * Complete evaluation result produced by the decision evaluator.
 *
 * Fields:
 * - finalDecision: the merged policy decision.
 * - decisionStatus: DETERMINATE if the decision is stable under frozen rules
 *   (including applicable-Deny-overrides-unsupported); INDETERMINATE if unsupported
 *   features exist and no applicable Deny independently determines the result.
 * - matchedDenyStatementIds: IDs of applicable Deny statements, in input order.
 * - matchedAllowStatementIds: IDs of applicable Allow statements, in input order.
 * - statementResults: original MatchResult array, preserved as-is.
 * - diagnostics: structured diagnostic information (passed through or default empty).
 * - summary: human-readable one-line description; not intended as a machine assertion target.
 */
export interface EvaluationResult {
  readonly finalDecision: FinalDecision;
  readonly decisionStatus: DecisionStatus;
  readonly matchedDenyStatementIds: readonly string[];
  readonly matchedAllowStatementIds: readonly string[];
  readonly statementResults: readonly MatchResult[];
  readonly diagnostics: Diagnostic;
  readonly summary: string;
}

// ─── Core evaluation ─────────────────────────────────────────────────

/**
 * Merge a set of per-statement MatchResults into a single
 * {@link EvaluationResult} following the ICAN decision rules.
 *
 * @param matchResults  Per-statement evaluation results from D04.
 * @param diagnostics   Optional Diagnostic to carry through; if omitted,
 *                      an empty default Diagnostic is generated.
 * @returns EvaluationResult with merged decision, status, and diagnostics.
 */
export function evaluateDecision(
  matchResults: readonly MatchResult[],
  diagnostics?: Diagnostic,
): EvaluationResult {
  // ── Step 1: applicable Deny IDs (preserving input order) ───────────
  const matchedDenyStatementIds: readonly string[] = matchResults
    .filter((r: MatchResult): boolean => r.applicable && r.effect === 'Deny')
    .map((r: MatchResult): string => r.statementId);

  // ── Step 2: applicable Allow IDs (preserving input order) ──────────
  const matchedAllowStatementIds: readonly string[] = matchResults
    .filter((r: MatchResult): boolean => r.applicable && r.effect === 'Allow')
    .map((r: MatchResult): string => r.statementId);

  // ── Step 3: detect any unsupported features across all MatchResults ─
  const hasUnsupported: boolean = matchResults.some(
    (r: MatchResult): boolean => r.unsupportedFeatures.length > 0,
  );

  // ── Steps 4-7: determine finalDecision and decisionStatus ──────────
  let finalDecision: FinalDecision;
  let decisionStatus: DecisionStatus;

  if (matchedDenyStatementIds.length > 0) {
    // Step 4: applicable Deny → EXPLICIT_DENY / DETERMINATE
    // Deny authority is absolute; unsupported cannot override it.
    finalDecision = 'EXPLICIT_DENY';
    decisionStatus = 'DETERMINATE';
  } else if (hasUnsupported) {
    // Step 5: unsupported features present, no applicable Deny
    if (matchedAllowStatementIds.length > 0) {
      finalDecision = 'ALLOW';
    } else {
      finalDecision = 'IMPLICIT_DENY';
    }
    decisionStatus = 'INDETERMINATE';
  } else if (matchedAllowStatementIds.length > 0) {
    // Step 6: no unsupported, at least one applicable Allow
    finalDecision = 'ALLOW';
    decisionStatus = 'DETERMINATE';
  } else {
    // Step 7: no applicable anything, no unsupported
    finalDecision = 'IMPLICIT_DENY';
    decisionStatus = 'DETERMINATE';
  }

  // ── Diagnostics: passthrough or default empty ─────────────────────
  const resolvedDiagnostics: Diagnostic = diagnostics ?? createDiagnostic();

  // ── Summary ───────────────────────────────────────────────────────
  const summary: string = buildSummary(
    finalDecision,
    decisionStatus,
    matchResults,
  );

  return {
    finalDecision,
    decisionStatus,
    matchedDenyStatementIds,
    matchedAllowStatementIds,
    statementResults: matchResults,
    diagnostics: resolvedDiagnostics,
    summary,
  };
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Build a human-readable summary string.
 *
 * - For DETERMINATE: a one-line description of the final decision.
 * - For INDETERMINATE: final decision + INDETERMINATE marker + the
 *   list of unsupported feature strings found in any MatchResult.
 *
 * The summary is informational only and MUST NOT be used as a
 * machine-assertion target.
 */
function buildSummary(
  finalDecision: FinalDecision,
  decisionStatus: DecisionStatus,
  matchResults: readonly MatchResult[],
): string {
  if (decisionStatus === 'DETERMINATE') {
    return `Final decision: ${finalDecision}`;
  }

  // INDETERMINATE – collect unsupported feature detail strings
  const featureList: readonly string[] = matchResults
    .flatMap((r: MatchResult): readonly string[] => r.unsupportedFeatures)
    .filter((f: string, i: number, arr: readonly string[]): boolean =>
      arr.indexOf(f) === i,
    );

  const featureClause: string =
    featureList.length > 0
      ? `; unsupported features: ${featureList.join(', ')}`
      : '';

  return `Final decision: ${finalDecision} (INDETERMINATE${featureClause})`;
}