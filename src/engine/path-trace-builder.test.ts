/**
 * Unit tests for path-trace-builder – D06: PathTraceEntry[] generation.
 *
 * Covers T1–T15 as specified in the D06 unit task document.
 */

import { describe, it, expect } from 'vitest';
import { buildPathTrace } from './path-trace-builder.js';
import type { PathTraceEntry } from './path-trace-builder.js';
import type { EvaluationResult, FinalDecision, DecisionStatus } from './decision-evaluator.js';
import type { MatchResult } from './statement-evaluator.js';
import type { StandardStatement } from '../parser/policy-types.js';
import { createDiagnostic } from '../parser/error-model.js';

// ─── Helpers ─────────────────────────────────────────────────────────

/** Build a minimal EvaluationResult for testing. */
function makeEvalResult(
  statementResults: readonly MatchResult[],
  finalDecision: FinalDecision = 'ALLOW',
  decisionStatus: DecisionStatus = 'DETERMINATE',
): EvaluationResult {
  const matchedDenyStatementIds = statementResults
    .filter((r) => r.applicable && r.effect === 'Deny')
    .map((r) => r.statementId);
  const matchedAllowStatementIds = statementResults
    .filter((r) => r.applicable && r.effect === 'Allow')
    .map((r) => r.statementId);

  return {
    finalDecision,
    decisionStatus,
    matchedDenyStatementIds,
    matchedAllowStatementIds,
    statementResults,
    diagnostics: createDiagnostic(),
    summary: `Final decision: ${finalDecision}`,
  };
}

/** Create an applicable Allow MatchResult. */
function allowMatch(statementId: string): MatchResult {
  return {
    statementId,
    effect: 'Allow',
    actionMatched: true,
    resourceMatched: true,
    conditionMatched: true,
    applicable: true,
    nonApplicableReasons: [],
    unsupportedFeatures: [],
  };
}

/** Create an applicable Deny MatchResult. */
function denyMatch(statementId: string): MatchResult {
  return {
    statementId,
    effect: 'Deny',
    actionMatched: true,
    resourceMatched: true,
    conditionMatched: true,
    applicable: true,
    nonApplicableReasons: [],
    unsupportedFeatures: [],
  };
}

/** Create a not-applicable MatchResult with a specific reason. */
function notApplicableMatch(
  statementId: string,
  reason: 'action_not_matched' | 'resource_not_matched' | 'condition_not_matched' | 'unsupported_feature',
  effect: 'Allow' | 'Deny' = 'Allow',
): MatchResult {
  const base: MatchResult = {
    statementId,
    effect,
    actionMatched: reason === 'action_not_matched' ? false : true,
    resourceMatched: reason === 'resource_not_matched' ? false : (reason === 'action_not_matched' ? false : true),
    conditionMatched: false,
    applicable: false,
    nonApplicableReasons: [reason],
    unsupportedFeatures: reason === 'unsupported_feature'
      ? ['NumericEquals']
      : [],
  };
  return base;
}

/** Create an unsupported_feature MatchResult (action & resource matched, condition unsupported). */
function unsupportedMatch(
  statementId: string,
  unsupportedFeatures: readonly string[] = ['NumericEquals'],
): MatchResult {
  return {
    statementId,
    effect: 'Allow',
    actionMatched: true,
    resourceMatched: true,
    conditionMatched: false,
    applicable: false,
    nonApplicableReasons: ['unsupported_feature'],
    unsupportedFeatures,
  };
}

/** Create a StandardStatement with source information. */
function makeStatement(
  statementId: string,
  options: Partial<Pick<StandardStatement, 'sourcePolicyId' | 'sourcePolicyPath' | 'sourcePolicyIndex' | 'sourceStatementIndex' | 'sid' | 'effect'>> = {},
): StandardStatement {
  return {
    statementId,
    sourcePolicyId: options.sourcePolicyId ?? 'policy-1',
    sourcePolicyPath: options.sourcePolicyPath ?? '/policies/default.json',
    sourcePolicyIndex: options.sourcePolicyIndex ?? 0,
    sourceStatementIndex: options.sourceStatementIndex ?? 0,
    sid: options.sid,
    effect: options.effect ?? 'Allow',
    actions: ['s3:GetObject'],
    resources: ['arn:aws:s3:::my-bucket/*'],
    conditions: {},
    raw: {},
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('path-trace-builder', () => {
  describe('buildPathTrace', () => {
    // T1: applicable Allow generates a trace entry
    it('T1: applicable Allow generates trace entry with correct fields', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult = makeEvalResult(matchResults);
      const statements: readonly StandardStatement[] = [
        makeStatement('allow-1', { effect: 'Allow' }),
      ];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toHaveLength(1);
      const entry = trace[0]!;
      expect(entry.statementId).toBe('allow-1');
      expect(entry.effect).toBe('Allow');
      expect(entry.actionMatched).toBe(true);
      expect(entry.resourceMatched).toBe(true);
      expect(entry.conditionMatched).toBe(true);
      expect(entry.applicable).toBe(true);
      expect(entry.nonApplicableReasons).toEqual([]);
      expect(entry.unsupportedFeatures).toEqual([]);
    });

    // T2: applicable Deny generates a trace entry
    it('T2: applicable Deny generates trace entry with correct fields', () => {
      const matchResults: readonly MatchResult[] = [denyMatch('deny-1')];
      const evalResult = makeEvalResult(matchResults, 'EXPLICIT_DENY', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [
        makeStatement('deny-1', { effect: 'Deny' }),
      ];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toHaveLength(1);
      const entry = trace[0]!;
      expect(entry.statementId).toBe('deny-1');
      expect(entry.effect).toBe('Deny');
      expect(entry.applicable).toBe(true);
    });

    // T3: action_not_matched not-applicable Statement
    it('T3: action_not_matched generates trace entry with actionMatched=false', () => {
      const matchResults: readonly MatchResult[] = [
        notApplicableMatch('s1', 'action_not_matched'),
      ];
      const evalResult = makeEvalResult(matchResults, 'IMPLICIT_DENY', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [makeStatement('s1')];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toHaveLength(1);
      const entry = trace[0]!;
      expect(entry.actionMatched).toBe(false);
      expect(entry.nonApplicableReasons).toEqual(['action_not_matched']);
    });

    // T4: resource_not_matched not-applicable Statement
    it('T4: resource_not_matched generates trace entry with resourceMatched=false', () => {
      const matchResults: readonly MatchResult[] = [
        notApplicableMatch('s2', 'resource_not_matched'),
      ];
      const evalResult = makeEvalResult(matchResults, 'IMPLICIT_DENY', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [makeStatement('s2')];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toHaveLength(1);
      const entry = trace[0]!;
      expect(entry.actionMatched).toBe(true);
      expect(entry.resourceMatched).toBe(false);
      expect(entry.nonApplicableReasons).toEqual(['resource_not_matched']);
    });

    // T5: condition_not_matched not-applicable Statement
    it('T5: condition_not_matched generates trace entry with conditionMatched=false', () => {
      const matchResults: readonly MatchResult[] = [
        notApplicableMatch('s3', 'condition_not_matched'),
      ];
      const evalResult = makeEvalResult(matchResults, 'IMPLICIT_DENY', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [makeStatement('s3')];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toHaveLength(1);
      const entry = trace[0]!;
      expect(entry.conditionMatched).toBe(false);
      expect(entry.nonApplicableReasons).toEqual(['condition_not_matched']);
    });

    // T6: unsupported_feature Statement
    it('T6: unsupported_feature generates trace entry preserving unsupportedFeatures', () => {
      const matchResults: readonly MatchResult[] = [
        unsupportedMatch('s4', ['NumericEquals', 'DateEquals']),
      ];
      const evalResult = makeEvalResult(matchResults, 'IMPLICIT_DENY', 'INDETERMINATE');
      const statements: readonly StandardStatement[] = [makeStatement('s4')];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toHaveLength(1);
      const entry = trace[0]!;
      expect(entry.nonApplicableReasons).toEqual(['unsupported_feature']);
      expect(entry.unsupportedFeatures).toEqual(['NumericEquals', 'DateEquals']);
    });

    // T7: PathTraceEntry[] preserves statementResults input order
    it('T7: PathTraceEntry[] preserves statementResults input order', () => {
      const matchResults: readonly MatchResult[] = [
        denyMatch('deny-1'),
        allowMatch('allow-1'),
        notApplicableMatch('s1', 'action_not_matched'),
        unsupportedMatch('s2', ['NotAction']),
      ];
      const evalResult = makeEvalResult(matchResults, 'EXPLICIT_DENY', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [
        makeStatement('deny-1', { effect: 'Deny' }),
        makeStatement('allow-1', { effect: 'Allow' }),
        makeStatement('s1'),
        makeStatement('s2'),
      ];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toHaveLength(4);
      expect(trace[0]!.statementId).toBe('deny-1');
      expect(trace[1]!.statementId).toBe('allow-1');
      expect(trace[2]!.statementId).toBe('s1');
      expect(trace[3]!.statementId).toBe('s2');
    });

    // T8: source info correctly mapped from StandardStatement
    it('T8: source info correctly mapped from StandardStatement', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult = makeEvalResult(matchResults);
      const statements: readonly StandardStatement[] = [
        makeStatement('allow-1', {
          sourcePolicyId: 'arn:aws:iam::123456:policy/TestPolicy',
          sourcePolicyPath: '/policies/test.json',
          sourcePolicyIndex: 2,
          sourceStatementIndex: 3,
          sid: 'StatementOne',
        }),
      ];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      const entry = trace[0]!;
      expect(entry.source.sourcePolicyId).toBe('arn:aws:iam::123456:policy/TestPolicy');
      expect(entry.source.sourcePolicyPath).toBe('/policies/test.json');
      expect(entry.source.sourcePolicyIndex).toBe(2);
      expect(entry.source.sourceStatementIndex).toBe(3);
      expect(entry.source.sid).toBe('StatementOne');
    });

    // T9: sid remains undefined when not provided in StandardStatement
    it('T9: sid remains undefined when missing from StandardStatement', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult = makeEvalResult(matchResults);
      const statements: readonly StandardStatement[] = [
        makeStatement('allow-1'), // sid defaults to undefined
      ];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);
      const entry = trace[0]!;

      expect(entry.source.sid).toBeUndefined();
    });

    // T10: sourcePolicyPath as empty string is preserved
    it('T10: empty sourcePolicyPath string is preserved as empty string', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult = makeEvalResult(matchResults);
      const statements: readonly StandardStatement[] = [
        makeStatement('allow-1', { sourcePolicyPath: '' }),
      ];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);
      const entry = trace[0]!;

      expect(entry.source.sourcePolicyPath).toBe('');
    });

    // T11: statementId not found in StandardStatement[] uses default placeholder source
    it('T11: missing statementId uses default placeholder source', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('orphan-stmt')];
      const evalResult = makeEvalResult(matchResults);
      // No matching StandardStatement provided
      const statements: readonly StandardStatement[] = [];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);
      const entry = trace[0]!;

      expect(trace).toHaveLength(1);
      expect(entry.statementId).toBe('orphan-stmt');
      expect(entry.source.sourcePolicyId).toBe('');
      expect(entry.source.sourcePolicyPath).toBe('');
      expect(entry.source.sourcePolicyIndex).toBe(-1);
      expect(entry.source.sourceStatementIndex).toBe(-1);
      expect(entry.source.sid).toBeUndefined();
    });

    // T12: buildPathTrace does not change EvaluationResult.finalDecision
    it('T12: buildPathTrace does not change EvaluationResult.finalDecision', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult = makeEvalResult(matchResults, 'ALLOW', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [
        makeStatement('allow-1'),
      ];

      const beforeDecision = evalResult.finalDecision;
      buildPathTrace(evalResult, statements);
      const afterDecision = evalResult.finalDecision;

      expect(afterDecision).toBe(beforeDecision);
      expect(afterDecision).toBe('ALLOW');
    });

    // T13: buildPathTrace does not change EvaluationResult.decisionStatus
    it('T13: buildPathTrace does not change EvaluationResult.decisionStatus', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult = makeEvalResult(matchResults, 'ALLOW', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [
        makeStatement('allow-1'),
      ];

      const beforeStatus = evalResult.decisionStatus;
      buildPathTrace(evalResult, statements);
      const afterStatus = evalResult.decisionStatus;

      expect(afterStatus).toBe(beforeStatus);
      expect(afterStatus).toBe('DETERMINATE');
    });

    // T14: buildPathTrace does not generate text/json rendering
    it('T14: buildPathTrace returns structured data only, no text/json rendering', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult = makeEvalResult(matchResults);
      const statements: readonly StandardStatement[] = [makeStatement('allow-1')];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      // The result is a plain array of PathTraceEntry objects.
      // Verify that no rendering-related fields exist on the entries.
      expect(trace).toHaveLength(1);
      const entry = trace[0]!;
      expect(typeof entry).toBe('object');

      // Verify the returned type has only the expected keys (no render fields)
      const keys = Object.keys(entry);
      expect(keys.sort()).toEqual([
        'actionMatched',
        'applicable',
        'conditionMatched',
        'effect',
        'nonApplicableReasons',
        'resourceMatched',
        'source',
        'statementId',
        'unsupportedFeatures',
      ].sort());
    });

    // T15: empty statementResults returns empty pathTrace
    it('T15: empty statementResults returns empty pathTrace', () => {
      const evalResult = makeEvalResult([], 'IMPLICIT_DENY', 'DETERMINATE');
      const statements: readonly StandardStatement[] = [];

      const trace: readonly PathTraceEntry[] = buildPathTrace(evalResult, statements);

      expect(trace).toEqual([]);
    });
  });
});