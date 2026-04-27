/**
 * Unit tests for evaluation-output-assembler – Z04-D01:
 * pathTrace & EvaluationResult output assembly boundary.
 *
 * Covers T1–T17 as specified in the unit task document.
 */

import { describe, it, expect } from 'vitest';
import { assembleEvaluationOutput } from './evaluation-output-assembler.js';
import type { EvaluationOutputAssembly } from './evaluation-output-assembler.js';
import type { EvaluationResult, FinalDecision, DecisionStatus } from '../engine/decision-evaluator.js';
import type { MatchResult } from '../engine/statement-evaluator.js';
import type { PathTraceEntry, StatementSource } from '../engine/path-trace-builder.js';
import type { Diagnostic } from '../parser/error-model.js';
import { createDiagnostic } from '../parser/error-model.js';

// ─── Helpers ─────────────────────────────────────────────────────────

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

/** Create a not-applicable MatchResult. */
function notApplicableMatch(
  statementId: string,
  reason: 'action_not_matched' | 'resource_not_matched' | 'condition_not_matched' | 'unsupported_feature',
  effect: 'Allow' | 'Deny' = 'Allow',
): MatchResult {
  return {
    statementId,
    effect,
    actionMatched: reason === 'action_not_matched' ? false : true,
    resourceMatched: reason === 'resource_not_matched' ? false : (reason === 'action_not_matched' ? false : true),
    conditionMatched: false,
    applicable: false,
    nonApplicableReasons: [reason],
    unsupportedFeatures: reason === 'unsupported_feature' ? ['NumericEquals'] : [],
  };
}

/** Build a minimal EvaluationResult for testing. */
function makeEvalResult(
  statementResults: readonly MatchResult[],
  finalDecision: FinalDecision = 'ALLOW',
  decisionStatus: DecisionStatus = 'DETERMINATE',
  overrides?: Partial<Omit<EvaluationResult, 'finalDecision' | 'decisionStatus' | 'statementResults'>>,
): EvaluationResult {
  const matchedDenyStatementIds = overrides?.matchedDenyStatementIds ?? statementResults
    .filter((r): boolean => r.applicable && r.effect === 'Deny')
    .map((r): string => r.statementId);

  const matchedAllowStatementIds = overrides?.matchedAllowStatementIds ?? statementResults
    .filter((r): boolean => r.applicable && r.effect === 'Allow')
    .map((r): string => r.statementId);

  return {
    finalDecision,
    decisionStatus,
    matchedDenyStatementIds,
    matchedAllowStatementIds,
    statementResults,
    diagnostics: overrides?.diagnostics ?? createDiagnostic(),
    summary: overrides?.summary ?? `Final decision: ${finalDecision}`,
  };
}

/** Build a minimal StatementSource for testing. */
function makeSource(overrides: Partial<StatementSource> = {}): StatementSource {
  return {
    sourcePolicyId: overrides.sourcePolicyId ?? 'policy-1',
    sourcePolicyPath: overrides.sourcePolicyPath ?? '/policies/default.json',
    sourcePolicyIndex: overrides.sourcePolicyIndex ?? 0,
    sourceStatementIndex: overrides.sourceStatementIndex ?? 0,
    sid: overrides.sid,
  };
}

/** Build a PathTraceEntry for testing. */
function makeTraceEntry(
  statementId: string,
  overrides: Partial<Omit<PathTraceEntry, 'statementId'>> = {},
): PathTraceEntry {
  return {
    statementId,
    effect: overrides.effect ?? 'Allow',
    actionMatched: overrides.actionMatched ?? true,
    resourceMatched: overrides.resourceMatched ?? true,
    conditionMatched: overrides.conditionMatched ?? true,
    applicable: overrides.applicable ?? true,
    nonApplicableReasons: overrides.nonApplicableReasons ?? [],
    unsupportedFeatures: overrides.unsupportedFeatures ?? [],
    source: overrides.source ?? makeSource({ sourcePolicyId: `policy-${statementId}` }),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('evaluation-output-assembler', () => {
  describe('assembleEvaluationOutput', () => {
    // T1: Normal assembly – EvaluationResult + PathTraceEntry[] can be
    //     assembled into output structure
    it('T1: assembles EvaluationResult and PathTraceEntry[] into output structure', () => {
      const matchResults: readonly MatchResult[] = [
        allowMatch('allow-1'),
        denyMatch('deny-1'),
      ];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'EXPLICIT_DENY',
        'DETERMINATE',
      );
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('allow-1'),
        makeTraceEntry('deny-1', { effect: 'Deny' }),
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output).toBeDefined();
      expect(output.finalDecision).toBe('EXPLICIT_DENY');
      expect(output.decisionStatus).toBe('DETERMINATE');
      expect(output.statementResults).toHaveLength(2);
      expect(output.pathTrace).toHaveLength(2);
    });

    // T2: finalDecision comes directly from EvaluationResult
    it('T2: finalDecision directly from EvaluationResult input', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('allow-1')];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'ALLOW',
        'DETERMINATE',
      );
      const pathTrace: readonly PathTraceEntry[] = [makeTraceEntry('allow-1')];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.finalDecision).toBe(evalResult.finalDecision);
      expect(output.finalDecision).toBe('ALLOW');
    });

    // T3: decisionStatus comes directly from EvaluationResult
    it('T3: decisionStatus directly from EvaluationResult input', () => {
      const matchResults: readonly MatchResult[] = [
        notApplicableMatch('s1', 'unsupported_feature'),
      ];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'IMPLICIT_DENY',
        'INDETERMINATE',
      );
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('s1', { applicable: false, conditionMatched: false }),
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.decisionStatus).toBe(evalResult.decisionStatus);
      expect(output.decisionStatus).toBe('INDETERMINATE');
    });

    // T4: statementResults equals input, order preserved
    it('T4: statementResults equal input, order preserved', () => {
      const matchResults: readonly MatchResult[] = [
        denyMatch('deny-1'),
        allowMatch('allow-1'),
        notApplicableMatch('s1', 'action_not_matched'),
      ];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'EXPLICIT_DENY',
        'DETERMINATE',
      );
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('deny-1', { effect: 'Deny' }),
        makeTraceEntry('allow-1'),
        makeTraceEntry('s1', { actionMatched: false, applicable: false, conditionMatched: false }),
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.statementResults).toEqual(evalResult.statementResults);
      expect(output.statementResults[0]!.statementId).toBe('deny-1');
      expect(output.statementResults[1]!.statementId).toBe('allow-1');
      expect(output.statementResults[2]!.statementId).toBe('s1');
    });

    // T5: pathTrace equals input, order preserved
    it('T5: pathTrace equals input pathTrace, order preserved', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('a')];
      const evalResult: EvaluationResult = makeEvalResult(matchResults);

      const entry1: PathTraceEntry = makeTraceEntry('a');
      const entry2: PathTraceEntry = makeTraceEntry('b');
      const pathTrace: readonly PathTraceEntry[] = [entry1, entry2];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.pathTrace).toHaveLength(2);
      expect(output.pathTrace[0]).toBe(entry1);
      expect(output.pathTrace[1]).toBe(entry2);
    });

    // T6: PathTraceEntry.source is preserved as-is, including DEFAULT_SOURCE
    it('T6: PathTraceEntry.source preserved as-is including DEFAULT_SOURCE placeholder values', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('stmt-1')];
      const evalResult: EvaluationResult = makeEvalResult(matchResults);

      const defaultSource: StatementSource = {
        sourcePolicyId: '',
        sourcePolicyPath: '',
        sourcePolicyIndex: -1,
        sourceStatementIndex: -1,
        sid: undefined,
      };
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('stmt-1', { source: defaultSource }),
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      const outputEntry = output.pathTrace[0]!;
      expect(outputEntry.source).toBe(defaultSource);
      expect(outputEntry.source.sourcePolicyId).toBe('');
      expect(outputEntry.source.sourcePolicyPath).toBe('');
      expect(outputEntry.source.sourcePolicyIndex).toBe(-1);
      expect(outputEntry.source.sourceStatementIndex).toBe(-1);
      expect(outputEntry.source.sid).toBeUndefined();
    });

    // T7: Default/placeholder source values are preserved without modification
    it('T7: default placeholder source values preserved without modification', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('stmt-x')];
      const evalResult: EvaluationResult = makeEvalResult(matchResults);

      const placeholderSource: StatementSource = {
        sourcePolicyId: '',
        sourcePolicyPath: '',
        sourcePolicyIndex: -1,
        sourceStatementIndex: -1,
        sid: undefined,
      };
      const pathTrace: readonly PathTraceEntry[] = [
        {
          statementId: 'stmt-x',
          effect: 'Allow',
          actionMatched: false,
          resourceMatched: false,
          conditionMatched: false,
          applicable: false,
          nonApplicableReasons: ['action_not_matched'],
          unsupportedFeatures: [],
          source: placeholderSource,
        },
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.pathTrace[0]!.source).toBe(placeholderSource);
      // Verify specific placeholder values are unchanged
      expect(output.pathTrace[0]!.source.sourcePolicyId).toBe('');
      expect(output.pathTrace[0]!.source.sourcePolicyPath).toBe('');
      expect(output.pathTrace[0]!.source.sourcePolicyIndex).toBe(-1);
      expect(output.pathTrace[0]!.source.sourceStatementIndex).toBe(-1);
      expect(output.pathTrace[0]!.source.sid).toBeUndefined();
    });

    // T8: Field stability – no unfrozen fields like sourceStatement/path/decision
    it('T8: output has only expected fields, no unfrozen extra fields', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('a')];
      const evalResult: EvaluationResult = makeEvalResult(matchResults);
      const pathTrace: readonly PathTraceEntry[] = [makeTraceEntry('a')];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      const keys = Object.keys(output).sort();
      expect(keys).toEqual([
        'decisionStatus',
        'diagnostics',
        'finalDecision',
        'matchedAllowStatementIds',
        'matchedDenyStatementIds',
        'pathTrace',
        'statementResults',
        'summary',
      ].sort());
    });

    // T9: finalDecision is NOT recalculated but taken directly from input
    it('T9: finalDecision is taken directly from input, not recalculated', () => {
      // Use an IMPLICIT_DENY result with no Allow matches
      const matchResults: readonly MatchResult[] = [
        notApplicableMatch('s1', 'action_not_matched'),
      ];
      // The evalResult says ALLOW even though statementResults suggest otherwise.
      // The assembly must NOT recalculate the decision.
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'ALLOW',
        'DETERMINATE',
        {
          matchedAllowStatementIds: ['s1'], // intentionally claiming match
        },
      );
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('s1', { actionMatched: false, applicable: false, conditionMatched: false }),
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      // The assembly must use the input's finalDecision, not recompute it
      expect(output.finalDecision).toBe('ALLOW');
      expect(output.finalDecision).toBe(evalResult.finalDecision);
    });

    // T10: pathTrace entries are the same references as input, not reconstructed
    it('T10: pathTrace entries are same references as input, not reconstructed', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('a')];
      const evalResult: EvaluationResult = makeEvalResult(matchResults);

      const entry1: PathTraceEntry = makeTraceEntry('a');
      const entry2: PathTraceEntry = makeTraceEntry('b');
      const pathTrace: readonly PathTraceEntry[] = [entry1, entry2];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      // References should be preserved (not deep-copied or reconstructed)
      expect(output.pathTrace[0]).toBe(entry1);
      expect(output.pathTrace[1]).toBe(entry2);
    });

    // T11: Output is a structured object, not a JSON/text string
    it('T11: output is a structured object, not a JSON/text string', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('a')];
      const evalResult: EvaluationResult = makeEvalResult(matchResults);
      const pathTrace: readonly PathTraceEntry[] = [makeTraceEntry('a')];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(typeof output).toBe('object');
      expect(output).not.toBeInstanceOf(String);
      // Verify it's not a string
      expect(typeof output).not.toBe('string');
    });

    // T12: Assembly works with empty PathTraceEntry[]
    it('T12: assembly works with empty pathTrace', () => {
      const matchResults: readonly MatchResult[] = [];
      const evalResult: EvaluationResult = makeEvalResult(matchResults, 'IMPLICIT_DENY', 'DETERMINATE');
      const pathTrace: readonly PathTraceEntry[] = [];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.pathTrace).toEqual([]);
      expect(output.statementResults).toEqual([]);
      expect(output.finalDecision).toBe('IMPLICIT_DENY');
    });

    // T13: Assembly works with empty statementResults
    it('T13: assembly works with empty statementResults', () => {
      const evalResult: EvaluationResult = makeEvalResult([], 'IMPLICIT_DENY', 'DETERMINATE');
      const pathTrace: readonly PathTraceEntry[] = [];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.statementResults).toEqual([]);
      expect(output.pathTrace).toEqual([]);
      expect(output.matchedDenyStatementIds).toEqual([]);
      expect(output.matchedAllowStatementIds).toEqual([]);
    });

    // T14: matchedDenyStatementIds and matchedAllowStatementIds preserved
    it('T14: matchedDenyStatementIds and matchedAllowStatementIds preserved', () => {
      const matchResults: readonly MatchResult[] = [
        denyMatch('deny-1'),
        allowMatch('allow-1'),
        denyMatch('deny-2'),
        allowMatch('allow-2'),
      ];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'EXPLICIT_DENY',
        'DETERMINATE',
      );
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('deny-1', { effect: 'Deny' }),
        makeTraceEntry('allow-1'),
        makeTraceEntry('deny-2', { effect: 'Deny' }),
        makeTraceEntry('allow-2'),
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.matchedDenyStatementIds).toEqual(evalResult.matchedDenyStatementIds);
      expect(output.matchedDenyStatementIds).toEqual(['deny-1', 'deny-2']);
      expect(output.matchedAllowStatementIds).toEqual(evalResult.matchedAllowStatementIds);
      expect(output.matchedAllowStatementIds).toEqual(['allow-1', 'allow-2']);
    });

    // T15: diagnostics preserved
    it('T15: diagnostics preserved from input EvaluationResult', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [{ code: 'MISSING_FIELD', message: 'Policy id missing' }],
        [{ feature: 'NotAction', detail: 'NotAction is not supported' }],
      );
      const matchResults: readonly MatchResult[] = [allowMatch('a')];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'ALLOW',
        'INDETERMINATE',
        { diagnostics },
      );
      const pathTrace: readonly PathTraceEntry[] = [makeTraceEntry('a')];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.diagnostics).toBe(diagnostics);
      expect(output.diagnostics.hasInvalid).toBe(true);
      expect(output.diagnostics.hasUnsupported).toBe(true);
      expect(output.diagnostics.invalidInputs).toHaveLength(1);
      expect(output.diagnostics.unsupportedFeatures).toHaveLength(1);
    });

    // T16: summary preserved
    it('T16: summary preserved from input EvaluationResult', () => {
      const customSummary = 'Final decision: EXPLICIT_DENY (INDETERMINATE; unsupported features: NumericEquals)';
      const matchResults: readonly MatchResult[] = [denyMatch('deny-1')];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'EXPLICIT_DENY',
        'DETERMINATE',
        { summary: customSummary },
      );
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('deny-1', { effect: 'Deny' }),
      ];

      const output: EvaluationOutputAssembly = assembleEvaluationOutput(evalResult, pathTrace);

      expect(output.summary).toBe(customSummary);
      expect(output.summary).toBe(evalResult.summary);
    });

    // T17: Input EvaluationResult and PathTraceEntry[] are not mutated
    it('T17: input EvaluationResult and PathTraceEntry[] are not mutated', () => {
      const matchResults: readonly MatchResult[] = [allowMatch('a'), denyMatch('b')];
      const evalResult: EvaluationResult = makeEvalResult(
        matchResults,
        'EXPLICIT_DENY',
        'DETERMINATE',
      );
      const pathTrace: readonly PathTraceEntry[] = [
        makeTraceEntry('a'),
        makeTraceEntry('b', { effect: 'Deny' }),
      ];

      // Snapshot inputs before assembly
      const beforeDecision = evalResult.finalDecision;
      const beforeStatus = evalResult.decisionStatus;
      const beforeDenyIds = [...evalResult.matchedDenyStatementIds];
      const beforeAllowIds = [...evalResult.matchedAllowStatementIds];
      const beforeStatementResults = [...evalResult.statementResults];
      const beforeDiagnostics = evalResult.diagnostics;
      const beforeSummary = evalResult.summary;

      assembleEvaluationOutput(evalResult, pathTrace);

      // Verify inputs are unchanged after assembly
      expect(evalResult.finalDecision).toBe(beforeDecision);
      expect(evalResult.decisionStatus).toBe(beforeStatus);
      expect([...evalResult.matchedDenyStatementIds]).toEqual(beforeDenyIds);
      expect([...evalResult.matchedAllowStatementIds]).toEqual(beforeAllowIds);
      expect([...evalResult.statementResults]).toEqual(beforeStatementResults);
      expect(evalResult.diagnostics).toBe(beforeDiagnostics);
      expect(evalResult.summary).toBe(beforeSummary);

      // Also verify pathTrace array still has same length (not spliced etc.)
      expect(pathTrace).toHaveLength(2);
      expect(pathTrace[0]!.statementId).toBe('a');
      expect(pathTrace[1]!.statementId).toBe('b');
    });
  });
});