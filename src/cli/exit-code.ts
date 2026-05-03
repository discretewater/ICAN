/**
 * Z06-D04 (revised): Exit code model and status-to-exit-code mapping.
 *
 * Defines ExitCode type (numeric literal union 0|1|2|3|4|10),
 * constant mapping, and pure mapping functions from decision/status
 * and errors to exit codes.
 *
 * Design reference: §10.8 Exit Code Recommendations
 *   - 0: DETERMINATE + ALLOW
 *   - 1: DETERMINATE + EXPLICIT_DENY
 *   - 4: DETERMINATE + IMPLICIT_DENY
 *   - 2: input/validation error
 *   - 3: INDETERMINATE or unsupported feature
 *   - 10: internal error
 *
 * Boundaries:
 * - Type-imports FinalDecision and DecisionStatus from engine
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
 * - 0: allow (DETERMINATE + ALLOW)
 * - 1: explicit deny (DETERMINATE + EXPLICIT_DENY)
 * - 2: parameter/input/validation error
 * - 3: indeterminate result (INDETERMINATE) or unsupported feature
 * - 4: implicit deny (DETERMINATE + IMPLICIT_DENY)
 * - 10: internal runtime error
 */
export type ExitCode = 0 | 1 | 2 | 3 | 4 | 10;

// ─── Constants ──────────────────────────────────────────────────────

/** Exit code constant mapping per §10.8. */
export const EXIT_CODE = {
  /** Evaluation passed (DETERMINATE + ALLOW). */
  ALLOW: 0 as ExitCode,
  /** Explicitly denied (DETERMINATE + EXPLICIT_DENY). */
  EXPLICIT_DENY: 1 as ExitCode,
  /** Parameter, input, or validation error. */
  ERROR: 2 as ExitCode,
  /** Indeterminate result (INDETERMINATE) or unsupported feature. */
  INDETERMINATE: 3 as ExitCode,
  /** Implicitly denied (DETERMINATE + IMPLICIT_DENY). */
  IMPLICIT_DENY: 4 as ExitCode,
  /** Internal runtime error (unexpected failure). */
  INTERNAL_ERROR: 10 as ExitCode,
} as const;

// ─── Core mapping functions ─────────────────────────────────────────

/**
 * Map a finalDecision + decisionStatus pair to an exit code.
 *
 * Mapping rules (per §10.8):
 * - INDETERMINATE (any finalDecision)                        → 3
 * - DETERMINATE + ALLOW                                      → 0
 * - DETERMINATE + EXPLICIT_DENY                              → 1
 * - DETERMINATE + IMPLICIT_DENY                              → 4
 *
 * Does NOT call process.exit, write to stdout/stderr, or import
 * engine functions.
 *
 * @param finalDecision  The merged policy decision.
 * @param decisionStatus DETERMINATE or INDETERMINATE.
 * @returns ExitCode (0, 1, 3, or 4).
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
  if (finalDecision === 'EXPLICIT_DENY') {
    return EXIT_CODE.EXPLICIT_DENY;
  }

  // IMPLICIT_DENY → 4 (corrected per §10.8)
  return EXIT_CODE.IMPLICIT_DENY;
}

/**
 * Map a list of structured errors to an exit code via heuristic
 * classification based on the first error's code field.
 *
 * Classification rules (checked in order):
 * 1. Empty error list                                    → 2 (ERROR)
 * 2. First error code contains "INTERNAL" (case-insensitive)
 *    or "INTERNAL_ERROR"                                 → 10 (INTERNAL_ERROR)
 * 3. First error code contains "UNSUPPORTED" (case-insensitive)
 *                                                        → 3 (INDETERMINATE)
 * 4. All other errors (input, parameter, validation)     → 2 (ERROR)
 *
 * Does NOT call process.exit, write to stdout/stderr, or import
 * engine functions.
 *
 * @param errors  List of error entries with `code` and `message` fields.
 *                Only the first error's code is used for classification.
 * @returns ExitCode (2, 3, or 10).
 */
export function mapErrorsToExitCode(
  errors: readonly { readonly code: string; readonly message: string }[],
): ExitCode {
  if (errors.length === 0) {
    return EXIT_CODE.ERROR;
  }

  const code = errors[0]!.code.toUpperCase();

  // Check for internal errors first (highest priority).
  if (code.includes('INTERNAL') || code.includes('INTERNAL_ERROR')) {
    return EXIT_CODE.INTERNAL_ERROR;
  }

  // Check for unsupported features.
  if (code.includes('UNSUPPORTED')) {
    return EXIT_CODE.INDETERMINATE;
  }

  // Default: input, parameter, or validation errors.
  return EXIT_CODE.ERROR;
}
