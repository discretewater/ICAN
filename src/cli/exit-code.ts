/**
 * Z06-D04: Exit code model and status-to-exit-code mapping.
 *
 * Defines ExitCode type (numeric literal union), constant mapping,
 * and pure mapping functions from decision/status and errors
 * to exit codes.
 *
 * Boundaries:
 * - type-imports FinalDecision and DecisionStatus from engine
 *   (types only, no engine function calls).
 * - Does NOT call process.exit, write to stdout/stderr, or use `any`.
 * - Does NOT produce actual fixtures, golden output, or real samples.
 */

import type {
  FinalDecision,
  DecisionStatus,
} from '../engine/decision-evaluator.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * CLI exit code type: numeric literal union for type safety.
 *
 * Valid values:
 * - 0: allow
 * - 1: deny
 * - 2: parameter/input error
 * - 3: indeterminate result
 */
export type ExitCode = 0 | 1 | 2 | 3;

// ─── Constants ──────────────────────────────────────────────────────

/** Exit code constant mapping. */
export const EXIT_CODE = {
  /** Evaluation passed (ALLOW). */
  ALLOW: 0 as ExitCode,
  /** Evaluation denied (EXPLICIT_DENY or IMPLICIT_DENY). */
  DENY: 1 as ExitCode,
  /** Parameter or input error. */
  ERROR: 2 as ExitCode,
  /** Indeterminate result (INDETERMINATE). */
  INDETERMINATE: 3 as ExitCode,
} as const;

// ─── Core mapping functions ─────────────────────────────────────────

/**
 * Map a finalDecision + decisionStatus pair to an exit code.
 *
 * Mapping rules:
 * - decisionStatus = 'DETERMINATE' and finalDecision = 'ALLOW'        → 0
 * - decisionStatus = 'DETERMINATE' and finalDecision ≠ 'ALLOW'        → 1
 * - decisionStatus = 'INDETERMINATE' (regardless of finalDecision)    → 3
 *
 * Does NOT call process.exit, write to stdout/stderr, or import
 * engine functions.
 *
 * @param finalDecision  The merged policy decision.
 * @param decisionStatus DETERMINATE or INDETERMINATE.
 * @returns ExitCode (0, 1, or 3).
 */
export function mapDecisionToExitCode(
  finalDecision: FinalDecision,
  decisionStatus: DecisionStatus,
): ExitCode {
  if (decisionStatus === 'INDETERMINATE') {
    return EXIT_CODE.INDETERMINATE;
  }

  // decisionStatus === 'DETERMINATE'
  if (finalDecision === 'ALLOW') {
    return EXIT_CODE.ALLOW;
  }

  // EXPLICIT_DENY or IMPLICIT_DENY
  return EXIT_CODE.DENY;
}

/**
 * Map parameter/input errors to exit code 2.
 *
 * Accepts ErrorEntry[] (from output-formatter), ParamError (from parser),
 * or any array of objects with `code: string` and `message: string` fields.
 *
 * Always returns exit code 2 — this function is only called when the
 * CLI has already determined an error state exists.
 *
 * Does NOT call process.exit, write to stdout/stderr, or import
 * engine functions.
 *
 * @param _errors  List of error entries (type-validated by readonly shape).
 * @returns ExitCode (always 2).
 */
export function mapErrorsToExitCode(
  _errors: readonly { readonly code: string; readonly message: string }[],
): ExitCode {
  return EXIT_CODE.ERROR;
}
