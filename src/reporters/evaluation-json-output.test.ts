/**
 * Unit tests for evaluation-json-output – Z04-D02:
 * JSON plain object output structure with stable field ordering.
 *
 * Covers T1–T11 as specified in the unit task document.
 */

import { describe, it, expect } from 'vitest';
import { buildEvaluationJsonOutput } from './evaluation-json-output.js';
import type { EvaluationJsonOutput, StatementResultJson, StatementSourceJson } from './evaluation-json-output.js';
import type { EvaluationOutputAssembly } from './evaluation-output-assembler.js';
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
    actionMatched: reason !== 'action_not_matched',
    resourceMatched: reason === 'resource_not_matched' ? false : (reason === 'action_not_matched' ? false : true),
    conditionMatched: false,
    applicable: false,
    nonApplicableReasons: [reason],
    unsupportedFeatures: reason === 'unsupported_feature' ? ['NumericEquals'] : [],
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

/** Build a minimal EvaluationOutputAssembly for testing. */
function makeAssembly(overrides: Partial<EvaluationOutputAssembly> = {}): EvaluationOutputAssembly {
  return {
    finalDecision: overrides.finalDecision ?? 'ALLOW',
    decisionStatus: overrides.decisionStatus ?? 'DETERMINATE',
    summary: overrides.summary ?? 'Final decision: ALLOW',
    matchedDenyStatementIds: overrides.matchedDenyStatementIds ?? [],
    matchedAllowStatementIds: overrides.matchedAllowStatementIds ?? [],
    statementResults: overrides.statementResults ?? [allowMatch('allow-1')],
    pathTrace: overrides.pathTrace ?? [makeTraceEntry('allow-1')],
    diagnostics: overrides.diagnostics ?? createDiagnostic(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('evaluation-json-output', () => {
  describe('buildEvaluationJsonOutput', () => {
    // T1: Normal conversion – EvaluationOutputAssembly converts to JSON plain object
    it('T1: converts EvaluationOutputAssembly to EvaluationJsonOutput plain object', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: EXPLICIT_DENY',
        matchedDenyStatementIds: ['deny-1'],
        matchedAllowStatementIds: ['allow-1'],
        statementResults: [denyMatch('deny-1'), allowMatch('allow-1')],
        pathTrace: [
          makeTraceEntry('deny-1', { effect: 'Deny', source: makeSource({ sourcePolicyId: 'pol-deny' }) }),
          makeTraceEntry('allow-1', { source: makeSource({ sourcePolicyId: 'pol-allow' }) }),
        ],
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);

      expect(json).toBeDefined();
      expect(json.finalDecision).toBe('EXPLICIT_DENY');
      expect(json.decisionStatus).toBe('DETERMINATE');
      expect(json.summary).toBe('Final decision: EXPLICIT_DENY');
      expect(json.matchedDenyStatementIds).toEqual(['deny-1']);
      expect(json.matchedAllowStatementIds).toEqual(['allow-1']);
      expect(json.statementResults).toHaveLength(2);
      expect(json.pathTrace).toHaveLength(2);
    });

    // T2: Top-level field order – Object.keys() must be stable
    it('T2: top-level field order is finalDecision → decisionStatus → summary → matchedDenyStatementIds → matchedAllowStatementIds → statementResults → pathTrace → diagnostics', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        statementResults: [],
        pathTrace: [],
        diagnostics: createDiagnostic(),
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const keys = Object.keys(json);

      expect(keys).toEqual([
        'finalDecision',
        'decisionStatus',
        'summary',
        'matchedDenyStatementIds',
        'matchedAllowStatementIds',
        'statementResults',
        'pathTrace',
        'diagnostics',
      ]);
    });

    // T3: PathTraceEntryJson field order
    it('T3: PathTraceEntryJson field order is stable', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        pathTrace: [makeTraceEntry('stmt-1')],
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const entryKeys = Object.keys(json.pathTrace[0]!);

      expect(entryKeys).toEqual([
        'statementId',
        'effect',
        'actionMatched',
        'resourceMatched',
        'conditionMatched',
        'applicable',
        'nonApplicableReasons',
        'unsupportedFeatures',
        'source',
      ]);
    });

    // T4: StatementSourceJson field order
    it('T4: StatementSourceJson field order is stable', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        pathTrace: [makeTraceEntry('s1', {
          source: makeSource({
            sourcePolicyId: 'pol-1',
            sourcePolicyPath: '/pol.json',
            sourcePolicyIndex: 2,
            sourceStatementIndex: 3,
            sid: 'StmtSid',
          }),
        })],
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const sourceKeys = Object.keys(json.pathTrace[0]!.source);

      expect(sourceKeys).toEqual([
        'sourcePolicyId',
        'sourcePolicyPath',
        'sourcePolicyIndex',
        'sourceStatementIndex',
        'sid',
      ]);
    });

    // T5: Source default placeholder – empty string, -1 index, undefined sid
    it('T5: source default placeholders preserve empty string, -1 index, and undefined sid', () => {
      const defaultSource: StatementSource = {
        sourcePolicyId: '',
        sourcePolicyPath: '',
        sourcePolicyIndex: -1,
        sourceStatementIndex: -1,
        sid: undefined,
      };

      const assembly: EvaluationOutputAssembly = makeAssembly({
        pathTrace: [makeTraceEntry('orphan', { source: defaultSource })],
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const sourceJson: StatementSourceJson = json.pathTrace[0]!.source;

      expect(sourceJson.sourcePolicyId).toBe('');
      expect(sourceJson.sourcePolicyPath).toBe('');
      expect(sourceJson.sourcePolicyIndex).toBe(-1);
      expect(sourceJson.sourceStatementIndex).toBe(-1);
      // sid must remain undefined, not null or empty string
      expect(sourceJson.sid).toBeUndefined();
      // Ensure 'sid' key exists even when value is undefined
      expect(Object.keys(sourceJson)).toContain('sid');
    });

    // T6: diagnostics preserved as structured DiagnosticJson
    it('T6: diagnostics mapped to DiagnosticJson preserving structure', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [
          { code: 'MISSING_FIELD', message: 'Policy id is missing', path: '/Statement[0]/Sid' },
          { code: 'INVALID_JSON', message: 'Malformed JSON' },
        ],
        [
          { feature: 'NotAction', detail: 'NotAction is not supported' },
          { feature: 'NumericEquals' },
        ],
      );

      const assembly: EvaluationOutputAssembly = makeAssembly({ diagnostics });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);

      expect(json.diagnostics.hasInvalid).toBe(true);
      expect(json.diagnostics.hasUnsupported).toBe(true);
      expect(json.diagnostics.invalidInputs).toHaveLength(2);
      expect(json.diagnostics.unsupportedFeatures).toHaveLength(2);

      // InvalidInputJson field order
      const invalidKeys = Object.keys(json.diagnostics.invalidInputs[0]!);
      expect(invalidKeys).toEqual(['code', 'message', 'path']);

      // First invalid input has path
      expect(json.diagnostics.invalidInputs[0]!.code).toBe('MISSING_FIELD');
      expect(json.diagnostics.invalidInputs[0]!.path).toBe('/Statement[0]/Sid');

      // Second invalid input – path should be undefined, not null or empty string
      expect(json.diagnostics.invalidInputs[1]!.code).toBe('INVALID_JSON');
      expect(json.diagnostics.invalidInputs[1]!.message).toBe('Malformed JSON');
      expect(json.diagnostics.invalidInputs[1]!.path).toBeUndefined();
      expect(Object.keys(json.diagnostics.invalidInputs[1]!)).toContain('path');

      // UnsupportedFeatureJson field order
      const unsupKeys = Object.keys(json.diagnostics.unsupportedFeatures[0]!);
      expect(unsupKeys).toEqual(['feature', 'detail']);

      expect(json.diagnostics.unsupportedFeatures[0]!.feature).toBe('NotAction');
      expect(json.diagnostics.unsupportedFeatures[0]!.detail).toBe('NotAction is not supported');
      expect(json.diagnostics.unsupportedFeatures[1]!.feature).toBe('NumericEquals');
      expect(json.diagnostics.unsupportedFeatures[1]!.detail).toBeUndefined();
      expect(Object.keys(json.diagnostics.unsupportedFeatures[1]!)).toContain('detail');
    });

    // T7: Empty pathTrace boundary
    it('T7: handles empty pathTrace correctly', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        pathTrace: [],
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);

      expect(json.pathTrace).toEqual([]);
    });

    // T8: Empty statementResults boundary
    it('T8: handles empty statementResults correctly', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        statementResults: [],
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        finalDecision: 'IMPLICIT_DENY',
        summary: 'Final decision: IMPLICIT_DENY',
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);

      expect(json.statementResults).toEqual([]);
      expect(json.matchedDenyStatementIds).toEqual([]);
      expect(json.matchedAllowStatementIds).toEqual([]);
    });

    // T9: Output is not a string (no JSON.stringify)
    it('T9: output is a plain object, not a JSON string', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly();
      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);

      expect(typeof json).toBe('object');
      expect(json).not.toBeInstanceOf(String);
      expect(typeof json).not.toBe('string');
    });

    // T10: No text/report artifacts in output
    it('T10: output contains no text or report fields', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly();
      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const keys = Object.keys(json);

      expect(keys).not.toContain('text');
      expect(keys).not.toContain('report');
      expect(keys).not.toContain('textReport');
      expect(keys).not.toContain('reportText');
    });

    // T11: No fabricated fields like sourceStatement/path/decision
    it('T11: output contains no fabricated fields like sourceStatement, path, or decision', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly();
      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);

      // Top-level: no fabricated fields
      const topKeys = Object.keys(json);
      expect(topKeys).not.toContain('sourceStatement');
      expect(topKeys).not.toContain('path');
      expect(topKeys).not.toContain('decision');

      // StatementResultJson: no fabricated fields
      for (const sr of json.statementResults) {
        const srKeys = Object.keys(sr);
        expect(srKeys).not.toContain('sourceStatement');
        expect(srKeys).not.toContain('path');
        expect(srKeys).not.toContain('decision');
      }

      // PathTraceEntryJson: no fabricated fields beyond the specified ones
      for (const pt of json.pathTrace) {
        const ptKeys = Object.keys(pt);
        expect(ptKeys).not.toContain('sourceStatement');
        expect(ptKeys).not.toContain('path');
        expect(ptKeys).not.toContain('decision');
      }
    });

    // Additional: StatementResultJson field order matches MatchResult
    it('T12: StatementResultJson field order matches MatchResult field order', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        statementResults: [allowMatch('s1')],
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const srKeys = Object.keys(json.statementResults[0]!);

      expect(srKeys).toEqual([
        'statementId',
        'effect',
        'actionMatched',
        'resourceMatched',
        'conditionMatched',
        'applicable',
        'nonApplicableReasons',
        'unsupportedFeatures',
      ]);
    });

    // Additional: DiagnosticJson field order
    it('T13: DiagnosticJson field order is stable', () => {
      const diagnostics: Diagnostic = createDiagnostic();
      const assembly: EvaluationOutputAssembly = makeAssembly({ diagnostics });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const diagKeys = Object.keys(json.diagnostics);

      expect(diagKeys).toEqual([
        'hasInvalid',
        'invalidInputs',
        'hasUnsupported',
        'unsupportedFeatures',
      ]);
    });

    // Additional: MatchResult values are correctly mapped to StatementResultJson
    it('T14: MatchResult values mapped correctly to StatementResultJson', () => {
      // unsupported_feature: action and resource matched, but condition phase
      // short-circuited with unsupported operator. This matches the actual
      // behaviour in statement-evaluator.ts where actionMatched and
      // resourceMatched are true for unsupported_feature scenarios.
      const matchResult: MatchResult = notApplicableMatch('s-unsup', 'unsupported_feature', 'Deny');
      const assembly: EvaluationOutputAssembly = makeAssembly({
        statementResults: [matchResult],
        finalDecision: 'EXPLICIT_DENY',
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      const sr: StatementResultJson = json.statementResults[0]!;

      expect(sr.statementId).toBe('s-unsup');
      expect(sr.effect).toBe('Deny');
      expect(sr.actionMatched).toBe(true);
      expect(sr.resourceMatched).toBe(true);
      expect(sr.conditionMatched).toBe(false);
      expect(sr.applicable).toBe(false);
      expect(sr.nonApplicableReasons).toEqual(['unsupported_feature']);
      expect(sr.unsupportedFeatures).toEqual(['NumericEquals']);
    });

    // Additional: Check that sid with a real value is preserved
    it('T15: sid with a real value is preserved in StatementSourceJson', () => {
      const assembly: EvaluationOutputAssembly = makeAssembly({
        pathTrace: [makeTraceEntry('s1', {
          source: makeSource({ sid: 'MyStatementSid' }),
        })],
      });

      const json: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
      expect(json.pathTrace[0]!.source.sid).toBe('MyStatementSid');
    });
  });
});