/**
 * Evaluation output assembler – Z04-D01: assembles EvaluationResult and
 * PathTraceEntry[] into an intermediate output structure for downstream
 * consumers (JSON rendering, text/report rendering, etc.).
 *
 * This module does NOT re-compute decisions, re-evaluate statements, or
 * re-construct pathTrace. It only maps/assembles existing data from its
 * inputs into a flat, consumer-friendly structure.
 *
 * Boundary:
 * - Does not call buildPathTrace()
 * - Does not call action/resource/condition matchers
 * - Does not call statement evaluator or decision merger
 * - Does not generate JSON strings
 * - Does not generate text/report strings
 * - Does not handle CLI
 */

import type { EvaluationResult, FinalDecision, DecisionStatus } from '../engine/decision-evaluator.js';
import type { MatchResult } from '../engine/statement-evaluator.js';
import type { PathTraceEntry } from '../engine/path-trace-builder.js';
import type { Diagnostic } from '../parser/error-model.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * Input structure for the evaluation output assembly function.
 *
 * Combines the EvaluationResult from the decision evaluator with the
 * PathTraceEntry[] from the path trace builder.
 */
export interface EvaluationOutputAssemblyInput {
  readonly evaluationResult: EvaluationResult;
  readonly pathTrace: readonly PathTraceEntry[];
}

/**
 * Intermediate assembly output combining all evaluation result fields
 * and path trace entries into a single consumer-friendly structure.
 *
 * All fields come directly from the inputs – no re-computation.
 * All fields are readonly to enforce immutability.
 */
export interface EvaluationOutputAssembly {
  /** Final policy decision, directly from EvaluationResult */
  readonly finalDecision: FinalDecision;
  /** Decision determinacy status, directly from EvaluationResult */
  readonly decisionStatus: DecisionStatus;
  /** Human-readable one-line summary, directly from EvaluationResult */
  readonly summary: string;
  /** Per-statement evaluation results, directly from EvaluationResult */
  readonly statementResults: readonly MatchResult[];
  /** Path trace entries, directly from input (order preserved) */
  readonly pathTrace: readonly PathTraceEntry[];
  /** IDs of applicable Deny statements, directly from EvaluationResult */
  readonly matchedDenyStatementIds: readonly string[];
  /** IDs of applicable Allow statements, directly from EvaluationResult */
  readonly matchedAllowStatementIds: readonly string[];
  /** Structured diagnostic information, directly from EvaluationResult */
  readonly diagnostics: Diagnostic;
}

// ─── Core function ───────────────────────────────────────────────────

/**
 * Assemble EvaluationResult and PathTraceEntry[] into an intermediate
 * output structure.
 *
 * This function:
 * - Does NOT modify input objects
 * - Preserves pathTrace input order
 * - Preserves statementResults input order
 * - Does NOT call buildPathTrace() or any matcher/evaluator
 * - Does NOT generate JSON/text strings
 * - All fields come directly from input – no re-computation
 *
 * @param evaluationResult  The D05 EvaluationResult.
 * @param pathTrace          The D06 PathTraceEntry[].
 * @returns EvaluationOutputAssembly with all fields mapped from inputs.
 */
export function assembleEvaluationOutput(
  evaluationResult: EvaluationResult,
  pathTrace: readonly PathTraceEntry[],
): EvaluationOutputAssembly {
  return {
    finalDecision: evaluationResult.finalDecision,
    decisionStatus: evaluationResult.decisionStatus,
    summary: evaluationResult.summary,
    statementResults: evaluationResult.statementResults,
    pathTrace: pathTrace,
    matchedDenyStatementIds: evaluationResult.matchedDenyStatementIds,
    matchedAllowStatementIds: evaluationResult.matchedAllowStatementIds,
    diagnostics: evaluationResult.diagnostics,
  };
}