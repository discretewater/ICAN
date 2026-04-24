/**
 * Statement evaluator – evaluates a single StandardStatement against an
 * EvaluationRequest through a three-dimensional matching pipeline:
 *
 *   1. Action  → compile statement.actions, then matchAction
 *   2. Resource → compile statement.resources, then matchResource
 *   3. Condition → normalize & evaluate conditions (or pass-through if empty)
 *
 * Each dimension applies short-circuit semantics: if an earlier dimension
 * fails, later dimensions are not evaluated and their matched flags are
 * set to false.
 */

import { compileActionPattern, matchAction } from './action-matcher.js';
import { compileResourcePattern, matchResource } from './resource-matcher.js';
import {
  normalizeConditions,
  evaluateConditions,
} from './condition-evaluator.js';
import type { RawConditions, EvaluationContext } from './condition-evaluator.js';
import type { StandardStatement } from '../parser/policy-types.js';
import type { EvaluationRequest } from '../parser/evaluation-request-types.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * Reason codes explaining why a statement is not applicable.
 * At most one reason is produced per failed dimension; unsupported_feature
 * takes precedence when the condition evaluation encounters an unsupported
 * operator.
 */
export type NonApplicableReason =
  | 'action_not_matched'
  | 'resource_not_matched'
  | 'condition_not_matched'
  | 'unsupported_feature';

/**
 * Result of evaluating a single StandardStatement against an
 * EvaluationRequest.
 *
 * - applicable is true only when all three dimensions are satisfied.
 * - nonApplicableReasons is empty when applicable is true.
 * - unsupportedFeatures carries the detail strings from the condition
 *   evaluator when nonApplicableReasons includes 'unsupported_feature'.
 */
export interface MatchResult {
  readonly statementId: string;
  readonly effect: 'Allow' | 'Deny';
  readonly actionMatched: boolean;
  readonly resourceMatched: boolean;
  readonly conditionMatched: boolean;
  readonly applicable: boolean;
  readonly nonApplicableReasons: readonly NonApplicableReason[];
  readonly unsupportedFeatures: readonly string[];
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Build a rejection MatchResult with all dimensions after `skipUpTo`
 * set to false.
 *
 * @param statement  Source statement for statementId/effect passthrough.
 * @param actionMatched  Whether the action dimension passed.
 * @param resourceMatched  Whether the resource dimension passed.
 * @param reason  The primary non-applicable reason.
 * @param unsupportedFeatures  Optional detail strings (condition evaluator).
 */
function rejectResult(
  statement: StandardStatement,
  actionMatched: boolean,
  resourceMatched: boolean,
  reason: NonApplicableReason,
  unsupportedFeatures: readonly string[] = [],
): MatchResult {
  return {
    statementId: statement.statementId,
    effect: statement.effect,
    actionMatched,
    resourceMatched,
    conditionMatched: false,
    applicable: false,
    nonApplicableReasons: [reason],
    unsupportedFeatures,
  };
}

// ─── Core evaluation ─────────────────────────────────────────────────

/**
 * Evaluate a single {@link StandardStatement} against an
 * {@link EvaluationRequest}.
 *
 * Pipeline:
 * 1. Action phase – compile patterns and match; short-circuit on failure.
 * 2. Resource phase – compile patterns and match; short-circuit on failure.
 * 3. Condition phase – empty conditions pass implicitly; non-empty
 *    conditions are normalised and evaluated; unsupported features are
 *    surfaced through unsupportedFeatures when reason is
 *    'unsupported_feature'.
 */
export function evaluateStatement(
  statement: StandardStatement,
  request: EvaluationRequest,
): MatchResult {
  // ── Action phase ───────────────────────────────────────────────
  if (statement.actions.length === 0) {
    return rejectResult(statement, false, false, 'action_not_matched');
  }

  const actionPatterns = statement.actions.map((a) => compileActionPattern(a));
  const actionResult = matchAction(request.action, actionPatterns);

  if (!actionResult.matched) {
    return rejectResult(statement, false, false, 'action_not_matched');
  }

  // ── Resource phase ─────────────────────────────────────────────
  if (statement.resources.length === 0) {
    return rejectResult(statement, true, false, 'resource_not_matched');
  }

  const resourcePatterns = statement.resources.map((r) => compileResourcePattern(r));
  const resourceResult = matchResource(request.resource, resourcePatterns);

  if (!resourceResult.matched) {
    return rejectResult(statement, true, false, 'resource_not_matched');
  }

  // ── Condition phase ─────────────────────────────────────────────
  const conditionKeys = Object.keys(statement.conditions);
  if (conditionKeys.length === 0) {
    // Empty conditions are implicitly satisfied.
    return {
      statementId: statement.statementId,
      effect: statement.effect,
      actionMatched: true,
      resourceMatched: true,
      conditionMatched: true,
      applicable: true,
      nonApplicableReasons: [],
      unsupportedFeatures: [],
    };
  }

  const entries = normalizeConditions(statement.conditions as RawConditions);
  const conditionContext: EvaluationContext = request.context;
  const conditionResult = evaluateConditions(entries, conditionContext);

  if (conditionResult.reason === 'unsupported_feature') {
    return {
      statementId: statement.statementId,
      effect: statement.effect,
      actionMatched: true,
      resourceMatched: true,
      conditionMatched: false,
      applicable: false,
      nonApplicableReasons: ['unsupported_feature'],
      unsupportedFeatures: conditionResult.unsupportedDetails ?? [],
    };
  }

  if (conditionResult.reason === 'conditions_not_matched') {
    return rejectResult(statement, true, true, 'condition_not_matched');
  }

  // conditions_matched
  return {
    statementId: statement.statementId,
    effect: statement.effect,
    actionMatched: true,
    resourceMatched: true,
    conditionMatched: true,
    applicable: true,
    nonApplicableReasons: [],
    unsupportedFeatures: [],
  };
}

/**
 * Evaluate multiple {@link StandardStatement}s against a single
 * {@link EvaluationRequest}, returning one {@link MatchResult} per
 * statement.
 *
 * Each statement is evaluated independently; there is no cross-statement
 * interaction at this stage.
 */
export function evaluateStatements(
  statements: readonly StandardStatement[],
  request: EvaluationRequest,
): readonly MatchResult[] {
  return statements.map((stmt) => evaluateStatement(stmt, request));
}