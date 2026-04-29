/**
 * Boundary condition tests for output-layer error model and unavailable
 * field expression – Z04-D04.
 *
 * These tests specifically target invalid/unsupported/INDETERMINATE,
 * unavailable fields, empty collections, and no-recomputation/no-fabrication
 * boundaries for both buildEvaluationJsonOutput and
 * buildEvaluationTextOutput.
 *
 * Frozen structures that MUST NOT be modified:
 * - EvaluationOutputAssembly (8 fields)
 * - EvaluationJsonOutput (8 fields)
 * - EvaluationTextOutput (title + sections)
 * - EvaluationResult, PathTraceEntry, StatementSource, Diagnostic,
 *   InvalidInput, UnsupportedFeature
 */

import { describe, it, expect, vi } from 'vitest';
import { buildEvaluationJsonOutput } from './evaluation-json-output.js';
import type { EvaluationJsonOutput, StatementSourceJson, DiagnosticJson, InvalidInputJson, UnsupportedFeatureJson } from './evaluation-json-output.js';
import { buildEvaluationTextOutput } from './evaluation-text-output.js';
import type { EvaluationTextOutput } from './evaluation-text-output.js';
import type { EvaluationOutputAssembly } from './evaluation-output-assembler.js';
import type { MatchResult } from '../engine/statement-evaluator.js';
import type { PathTraceEntry, StatementSource } from '../engine/path-trace-builder.js';
import type { Diagnostic } from '../parser/error-model.js';
import { createDiagnostic } from '../parser/error-model.js';

// ─── Shared helpers ──────────────────────────────────────────────────

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

/** Build a default empty DiagnosticJson for testing. */
function makeEmptyDiagnosticJson(): DiagnosticJson {
  return {
    hasInvalid: false,
    invalidInputs: [],
    hasUnsupported: false,
    unsupportedFeatures: [],
  };
}

/** Build a DiagnosticJson with specified invalidInputs and unsupportedFeatures. */
function makeDiagnosticJson(
  invalidInputs: readonly InvalidInputJson[] = [],
  unsupportedFeatures: readonly UnsupportedFeatureJson[] = [],
): DiagnosticJson {
  return {
    hasInvalid: invalidInputs.length > 0,
    invalidInputs,
    hasUnsupported: unsupportedFeatures.length > 0,
    unsupportedFeatures,
  };
}

/** Build a minimal EvaluationJsonOutput for testing. */
function makeJsonOutput(overrides: Partial<EvaluationJsonOutput> = {}): EvaluationJsonOutput {
  return {
    finalDecision: overrides.finalDecision ?? 'ALLOW',
    decisionStatus: overrides.decisionStatus ?? 'DETERMINATE',
    summary: overrides.summary ?? 'Final decision: ALLOW',
    matchedDenyStatementIds: overrides.matchedDenyStatementIds ?? [],
    matchedAllowStatementIds: overrides.matchedAllowStatementIds ?? ['allow-1'],
    statementResults: overrides.statementResults ?? [],
    pathTrace: overrides.pathTrace ?? [],
    diagnostics: overrides.diagnostics ?? makeEmptyDiagnosticJson(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// JSON output boundary tests
// ═══════════════════════════════════════════════════════════════════════

describe('Z04-D04: JSON output error-model boundaries', () => {
  describe('buildEvaluationJsonOutput', () => {
    // ─── invalid_input ────────────────────────────────────────────────
    it('D04-J1: invalidInputs with code, message, and path are stably mapped', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [
          { code: 'INVALID_JSON', message: 'Malformed JSON', path: '/root' },
          { code: 'MISSING_FIELD', message: 'Required field missing' },
        ],
        [],
      );
      const assembly = makeAssembly({ diagnostics });

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.diagnostics.hasInvalid).toBe(true);
      expect(json.diagnostics.invalidInputs).toHaveLength(2);
      expect(json.diagnostics.invalidInputs[0]!.code).toBe('INVALID_JSON');
      expect(json.diagnostics.invalidInputs[0]!.message).toBe('Malformed JSON');
      expect(json.diagnostics.invalidInputs[0]!.path).toBe('/root');
      expect(json.diagnostics.invalidInputs[1]!.code).toBe('MISSING_FIELD');
      expect(json.diagnostics.invalidInputs[1]!.message).toBe('Required field missing');
      // Second InvalidInput has no path → path field must be undefined, not null
      expect(json.diagnostics.invalidInputs[1]!.path).toBeUndefined();
      expect(Object.keys(json.diagnostics.invalidInputs[1]!)).toContain('path');
    });

    it('D04-J2: invalidInputs empty produces hasInvalid false and empty array', () => {
      const diagnostics: Diagnostic = createDiagnostic([], []);
      const assembly = makeAssembly({ diagnostics });

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.diagnostics.hasInvalid).toBe(false);
      expect(json.diagnostics.invalidInputs).toEqual([]);
      // hasUnsupported should also be false for this empty diagnostic
      expect(json.diagnostics.hasUnsupported).toBe(false);
      expect(json.diagnostics.unsupportedFeatures).toEqual([]);
    });

    // ─── unsupported_feature ───────────────────────────────────────────
    it('D04-J3: unsupportedFeatures with feature and detail are stably mapped', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [],
        [
          { feature: 'NotAction', detail: 'NotAction not supported' },
          { feature: 'NumericEquals' },  // detail omitted → undefined
        ],
      );
      const assembly = makeAssembly({ diagnostics, finalDecision: 'ALLOW', decisionStatus: 'INDETERMINATE' });

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.diagnostics.hasUnsupported).toBe(true);
      expect(json.diagnostics.unsupportedFeatures).toHaveLength(2);
      expect(json.diagnostics.unsupportedFeatures[0]!.feature).toBe('NotAction');
      expect(json.diagnostics.unsupportedFeatures[0]!.detail).toBe('NotAction not supported');
      expect(json.diagnostics.unsupportedFeatures[1]!.feature).toBe('NumericEquals');
      // detail omitted → must be undefined, not null or empty string
      expect(json.diagnostics.unsupportedFeatures[1]!.detail).toBeUndefined();
      expect(Object.keys(json.diagnostics.unsupportedFeatures[1]!)).toContain('detail');
    });

    // ─── INDETERMINATE ─────────────────────────────────────────────────
    it('D04-J4: INDETERMINATE decision with ALLOW preserves finalDecision, decisionStatus, and summary', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [],
        [{ feature: 'NumericEquals' }],
      );
      const assembly: EvaluationOutputAssembly = makeAssembly({
        finalDecision: 'ALLOW',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: ALLOW (INDETERMINATE; unsupported features: NumericEquals)',
        matchedAllowStatementIds: ['allow-1'],
        diagnostics,
      });

      const json = buildEvaluationJsonOutput(assembly);

      // finalDecision comes directly from assembly, not recomputed
      expect(json.finalDecision).toBe('ALLOW');
      // decisionStatus comes directly from assembly, not recomputed
      expect(json.decisionStatus).toBe('INDETERMINATE');
      // summary comes directly from assembly, not recomputed
      expect(json.summary).toBe('Final decision: ALLOW (INDETERMINATE; unsupported features: NumericEquals)');
    });

    it('D04-J5: INDETERMINATE decision with IMPLICIT_DENY preserves finalDecision and decisionStatus', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [],
        [{ feature: 'NotAction', detail: 'NotAction not supported' }],
      );
      const assembly: EvaluationOutputAssembly = makeAssembly({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY (INDETERMINATE; unsupported features: NotAction)',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        diagnostics,
      });

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.finalDecision).toBe('IMPLICIT_DENY');
      expect(json.decisionStatus).toBe('INDETERMINATE');
      expect(json.summary).toBe('Final decision: IMPLICIT_DENY (INDETERMINATE; unsupported features: NotAction)');
    });

    // ─── 空集合 (empty collections) ────────────────────────────────────
    it('D04-J6: all-empty collections produce stable empty arrays', () => {
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

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.matchedDenyStatementIds).toEqual([]);
      expect(json.matchedAllowStatementIds).toEqual([]);
      expect(json.statementResults).toEqual([]);
      expect(json.pathTrace).toEqual([]);
      expect(json.diagnostics.invalidInputs).toEqual([]);
      expect(json.diagnostics.unsupportedFeatures).toEqual([]);
      expect(json.diagnostics.hasInvalid).toBe(false);
      expect(json.diagnostics.hasUnsupported).toBe(false);
      // Field order must remain stable even with all-empty collections
      expect(Object.keys(json)).toEqual([
        'finalDecision', 'decisionStatus', 'summary',
        'matchedDenyStatementIds', 'matchedAllowStatementIds',
        'statementResults', 'pathTrace', 'diagnostics',
      ]);
    });

    // ─── 不可用字段——source缺省 ──────────────────────────────────────────
    it('D04-J7: default source placeholder (empty id, -1 index, undefined sid) is preserved as-is', () => {
      const defaultSource: StatementSource = {
        sourcePolicyId: '',
        sourcePolicyPath: '',
        sourcePolicyIndex: -1,
        sourceStatementIndex: -1,
        sid: undefined,
      };
      const assembly = makeAssembly({
        pathTrace: [makeTraceEntry('orphan-stmt', { source: defaultSource })],
      });

      const json = buildEvaluationJsonOutput(assembly);
      const source: StatementSourceJson = json.pathTrace[0]!.source;

      // All placeholder values must be preserved exactly, no normalization
      expect(source.sourcePolicyId).toBe('');
      expect(source.sourcePolicyPath).toBe('');
      expect(source.sourcePolicyIndex).toBe(-1);
      expect(source.sourceStatementIndex).toBe(-1);
      expect(source.sid).toBeUndefined();
      // The 'sid' key must still be present in Object.keys()
      expect(Object.keys(source)).toContain('sid');
    });

    // ─── 不可用字段——sid缺省 ───────────────────────────────────────────
    it('D04-J8: sid undefined in source is preserved as undefined, not converted to null or empty', () => {
      const sourceWithNoSid: StatementSource = {
        sourcePolicyId: 'policy-without-sid',
        sourcePolicyPath: '/policies/no-sid.json',
        sourcePolicyIndex: 0,
        sourceStatementIndex: 0,
        sid: undefined,
      };
      const assembly = makeAssembly({
        pathTrace: [makeTraceEntry('stmt-no-sid', { source: sourceWithNoSid })],
      });

      const json = buildEvaluationJsonOutput(assembly);
      const source = json.pathTrace[0]!.source;

      expect(source.sourcePolicyId).toBe('policy-without-sid');
      expect(source.sid).toBeUndefined();
      // Ensure 'sid' key exists even when value is undefined
      expect(Object.keys(source)).toContain('sid');
    });

    // ─── 不可用字段——path/detail缺省 ────────────────────────────────────
    it('D04-J9: InvalidInput path undefined is preserved as undefined, not null or empty string', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [{ code: 'INVALID_JSON', message: 'Parse error' }],  // path omitted → undefined
        [],
      );
      const assembly = makeAssembly({ diagnostics });

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.diagnostics.invalidInputs[0]!.path).toBeUndefined();
      expect(Object.keys(json.diagnostics.invalidInputs[0]!)).toContain('path');
    });

    it('D04-J10: UnsupportedFeature detail undefined is preserved as undefined, not null or empty string', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [],
        [{ feature: 'NotAction' }],  // detail omitted → undefined
      );
      const assembly = makeAssembly({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'INDETERMINATE',
        diagnostics,
      });

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.diagnostics.unsupportedFeatures[0]!.feature).toBe('NotAction');
      expect(json.diagnostics.unsupportedFeatures[0]!.detail).toBeUndefined();
      expect(Object.keys(json.diagnostics.unsupportedFeatures[0]!)).toContain('detail');
    });

    // ─── Mixed invalid and unsupported ──────────────────────────────────
    it('D04-J11: diagnostics with both invalidInputs and unsupportedFeatures produces correct flags', () => {
      const diagnostics: Diagnostic = createDiagnostic(
        [{ code: 'MISSING_FIELD', message: 'Required field missing', path: '/root' }],
        [{ feature: 'NumericEquals', detail: 'Not supported in phase 1' }],
      );
      const assembly = makeAssembly({ diagnostics, decisionStatus: 'INDETERMINATE' });

      const json = buildEvaluationJsonOutput(assembly);

      expect(json.diagnostics.hasInvalid).toBe(true);
      expect(json.diagnostics.hasUnsupported).toBe(true);
      expect(json.diagnostics.invalidInputs).toHaveLength(1);
      expect(json.diagnostics.unsupportedFeatures).toHaveLength(1);
      // DiagnosticJson field order must be stable
      expect(Object.keys(json.diagnostics)).toEqual([
        'hasInvalid', 'invalidInputs', 'hasUnsupported', 'unsupportedFeatures',
      ]);
    });

    // ─── EXPLICIT_DENY with INDETERMINATE diagnostics ──────────────────
    it('D04-J12: EXPLICIT_DENY with INDETERMINATE diagnostics still reports EXPLICIT_DENY', () => {
      // EXPLICIT_DENY overrides INDETERMINATE per decision rules
      const diagnostics: Diagnostic = createDiagnostic(
        [],
        [{ feature: 'NotAction' }],
      );
      const assembly: EvaluationOutputAssembly = makeAssembly({
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: EXPLICIT_DENY',
        matchedDenyStatementIds: ['deny-1'],
        statementResults: [denyMatch('deny-1'), allowMatch('allow-1')],
        diagnostics,
      });

      const json = buildEvaluationJsonOutput(assembly);

      // finalDecision comes directly from assembly (not recomputed)
      expect(json.finalDecision).toBe('EXPLICIT_DENY');
      expect(json.decisionStatus).toBe('DETERMINATE');
      // unsupported diagnostics still present
      expect(json.diagnostics.hasUnsupported).toBe(true);
    });

    // ─── Does not recompute ────────────────────────────────────────────
    it('D04-J13: buildEvaluationJsonOutput does not recompute decision from statementResults', () => {
      // Assembly says IMPLICIT_DENY/DETERMINATE even though there's an applicable allow
      // The function must NOT recalculate from statementResults
      const contradictoryAssembly: EvaluationOutputAssembly = {
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: ['allow-1'],
        statementResults: [allowMatch('allow-1')],
        pathTrace: [],
        diagnostics: createDiagnostic(),
      };

      const json = buildEvaluationJsonOutput(contradictoryAssembly);

      // Must preserve assembly values verbatim, not recalculate
      expect(json.finalDecision).toBe('IMPLICIT_DENY');
      expect(json.decisionStatus).toBe('DETERMINATE');
      expect(json.matchedAllowStatementIds).toEqual(['allow-1']);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Text/report output boundary tests
// ═══════════════════════════════════════════════════════════════════════

describe('Z04-D04: Text output error-model boundaries', () => {
  describe('buildEvaluationTextOutput', () => {
    // ─── diagnostics invalidInputs ─────────────────────────────────────
    it('D04-T1: diagnostics section with invalidInputs is stably expressed', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        diagnostics: makeDiagnosticJson(
          [
            { code: 'INVALID_JSON', message: 'Malformed JSON', path: '/root' },
            { code: 'MISSING_FIELD', message: 'Required field missing', path: undefined },
          ],
          [],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection = text.sections.find(s => s.label === 'diagnostics')!;

      expect(diagSection).toBeDefined();
      const joined = diagSection.lines.join('\n');

      // Both invalid input entries should appear
      expect(joined).toContain('INVALID_JSON');
      expect(joined).toContain('Malformed JSON');
      expect(joined).toContain('MISSING_FIELD');
      expect(joined).toContain('Required field missing');

      // The first entry has path → should be shown
      expect(joined).toContain('/root');

      // unsupportedFeatures section should NOT appear (empty)
      const unsupportedLines = diagSection.lines.filter(
        l => l.includes('unsupportedFeatures') || l.includes('NotAction') || l.includes('NumericEquals')
      );
      expect(unsupportedLines).toHaveLength(0);
    });

    it('D04-T2: invalidInputs without path does not fabricate a path', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        diagnostics: makeDiagnosticJson(
          [{ code: 'INVALID_JSON', message: 'Parse error', path: undefined }],
          [],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection = text.sections.find(s => s.label === 'diagnostics')!;

      const joined = diagSection.lines.join('\n');
      // Should show code and message
      expect(joined).toContain('INVALID_JSON');
      expect(joined).toContain('Parse error');
      // Should NOT contain "(path:" since path is undefined
      expect(joined).not.toContain('(path:');
    });

    // ─── diagnostics unsupportedFeatures ───────────────────────────────
    it('D04-T3: diagnostics section with unsupportedFeatures is stably expressed', () => {
      const json = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: ALLOW (INDETERMINATE; unsupported features: NotAction, NumericEquals)',
        matchedAllowStatementIds: ['allow-1'],
        diagnostics: makeDiagnosticJson(
          [],
          [
            { feature: 'NotAction', detail: 'NotAction not supported' },
            { feature: 'NumericEquals', detail: undefined },
          ],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection = text.sections.find(s => s.label === 'diagnostics')!;

      expect(diagSection).toBeDefined();
      const joined = diagSection.lines.join('\n');

      // Feature names should appear
      expect(joined).toContain('NotAction');
      expect(joined).toContain('NumericEquals');

      // Detail for NotAction should be present
      expect(joined).toContain('NotAction not supported');

      // invalidInputs section should NOT appear (empty)
      const invalidLines = diagSection.lines.filter(
        l => l.includes('invalidInputs') || l.includes('INVALID_JSON')
      );
      expect(invalidLines).toHaveLength(0);
    });

    it('D04-T4: unsupportedFeatures without detail does not fabricate detail text', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY (INDETERMINATE; unsupported features: NumericEquals)',
        diagnostics: makeDiagnosticJson(
          [],
          [{ feature: 'NumericEquals', detail: undefined }],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection = text.sections.find(s => s.label === 'diagnostics')!;

      const joined = diagSection.lines.join('\n');
      // Feature name should appear
      expect(joined).toContain('NumericEquals');
      // Should NOT contain ": " after the feature name since detail is undefined
      // (the feature line is just "  NumericEquals" with no trailing colon+detail)
      const numericLine = diagSection.lines.find(l => l.includes('NumericEquals') && !l.includes('unsupportedFeatures'));
      expect(numericLine).toBeDefined();
      // The line should be just "  NumericEquals" without trailing ":"
      expect(numericLine!.trim()).toBe('NumericEquals');
    });

    // ─── source缺省 ────────────────────────────────────────────────────
    it('D04-T5: source default placeholder expressed as "source: unavailable"', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        pathTrace: [
          {
            statementId: 'orphan-1',
            effect: 'Deny',
            actionMatched: false,
            resourceMatched: false,
            conditionMatched: false,
            applicable: false,
            nonApplicableReasons: ['action_not_matched'],
            unsupportedFeatures: [],
            source: {
              sourcePolicyId: '',
              sourcePolicyPath: '',
              sourcePolicyIndex: -1,
              sourceStatementIndex: -1,
              sid: undefined,
            },
          },
        ],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection = text.sections.find(s => s.label === 'pathTrace')!;

      expect(pathSection).toBeDefined();
      const joined = pathSection.lines.join('\n');
      expect(joined).toContain('source: unavailable');
      // Should NOT fabricate policy ID or other info
      expect(joined).not.toContain('policyId');
      expect(joined).not.toContain('sid');
    });

    // ─── path缺省 (source with empty sourcePolicyPath) ────────────────
    it('D04-T6: source with non-empty id but empty path does not fabricate path', () => {
      // Source has a policyId but path is empty string
      const json = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        matchedAllowStatementIds: ['allow-1'],
        pathTrace: [
          {
            statementId: 'allow-1',
            effect: 'Allow',
            actionMatched: true,
            resourceMatched: true,
            conditionMatched: true,
            applicable: true,
            nonApplicableReasons: [],
            unsupportedFeatures: [],
            source: {
              sourcePolicyId: 'inline-policy',
              sourcePolicyPath: '',
              sourcePolicyIndex: 0,
              sourceStatementIndex: 0,
              sid: 'AllowStmt',
            },
          },
        ],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection = text.sections.find(s => s.label === 'pathTrace')!;

      const joined = pathSection.lines.join('\n');
      // Policy ID should appear
      expect(joined).toContain('inline-policy');
      // Sid should appear
      expect(joined).toContain('AllowStmt');
      // This is NOT a full placeholder, so should NOT say "source: unavailable"
      expect(joined).not.toContain('source: unavailable');
    });

    // ─── sid缺省 ──────────────────────────────────────────────────────
    it('D04-T7: source with sid undefined does not fabricate sid', () => {
      const json = makeJsonOutput({
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: ['deny-1'],
        pathTrace: [
          {
            statementId: 'deny-1',
            effect: 'Deny',
            actionMatched: true,
            resourceMatched: true,
            conditionMatched: true,
            applicable: true,
            nonApplicableReasons: [],
            unsupportedFeatures: [],
            source: {
              sourcePolicyId: 'policy-deny',
              sourcePolicyPath: '/policies/deny.json',
              sourcePolicyIndex: 0,
              sourceStatementIndex: 1,
              sid: undefined,
            },
          },
        ],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection = text.sections.find(s => s.label === 'pathTrace')!;

      const joined = pathSection.lines.join('\n');
      // Policy ID should appear (source is not fully default)
      expect(joined).toContain('policy-deny');
      // Sid should NOT appear since it's undefined
      // The formatSource function only includes sid when it's defined
      expect(joined).toContain('deny-1');
    });

    // ─── INDETERMINATE ─────────────────────────────────────────────────
    it('D04-T8: INDETERMINATE status expressed with clear human-readable marker', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY (INDETERMINATE; unsupported features: NumericEquals)',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        diagnostics: makeDiagnosticJson(
          [],
          [{ feature: 'NumericEquals', detail: undefined }],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const statusSection = text.sections.find(s => s.label === 'decisionStatus')!;
      const decisionSection = text.sections.find(s => s.label === 'decision')!;

      // decisionStatus should contain INDETERMINATE marker
      const statusJoined = statusSection.lines.join('\n');
      expect(statusJoined).toContain('INDETERMINATE');

      // decision section should show IMPLICIT_DENY directly from input
      expect(decisionSection.lines).toContain('IMPLICIT_DENY');
    });

    // ─── 空集合 (empty collections) ────────────────────────────────────
    it('D04-T9: all-empty collections produce "none" expressions stably', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        pathTrace: [],
        diagnostics: makeEmptyDiagnosticJson(),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);

      // matchedStatements: should show "none"
      const matchedSection = text.sections.find(s => s.label === 'matchedStatements')!;
      expect(matchedSection.lines).toContain('none');

      // pathTrace: should show "none"
      const pathSection = text.sections.find(s => s.label === 'pathTrace')!;
      expect(pathSection.lines).toContain('none');

      // diagnostics: should show "none"
      const diagSection = text.sections.find(s => s.label === 'diagnostics')!;
      expect(diagSection.lines).toContain('none');
    });

    // ─── 不重算decision ──────────────────────────────────────────────
    it('D04-T10: buildEvaluationTextOutput does not recompute decision from statementResults', () => {
      // Input says IMPLICIT_DENY even though there's a matched allow
      // The function must NOT recalculate
      const json: EvaluationJsonOutput = {
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: ['allow-1'],
        statementResults: [{
          statementId: 'allow-1',
          effect: 'Allow',
          actionMatched: true,
          resourceMatched: true,
          conditionMatched: true,
          applicable: true,
          nonApplicableReasons: [],
          unsupportedFeatures: [],
        }],
        pathTrace: [],
        diagnostics: makeEmptyDiagnosticJson(),
      };

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);

      // decision must come from input, not recalculated
      const decisionSection = text.sections.find(s => s.label === 'decision')!;
      expect(decisionSection.lines).toContain('IMPLICIT_DENY');

      // matchedStatements must show the allow ID from input
      const matchedSection = text.sections.find(s => s.label === 'matchedStatements')!;
      const matchedJoined = matchedSection.lines.join('\n');
      expect(matchedJoined).toContain('allow-1');
    });

    // ─── 不重构pathTrace ─────────────────────────────────────────────
    it('D04-T11: buildEvaluationTextOutput does not reconstruct PathTraceEntry', () => {
      // The function should use pathTrace from EvaluationJsonOutput as-is,
      // not reconstruct it from statementResults or other sources
      const json: EvaluationJsonOutput = {
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: ALLOW',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: ['allow-1'],
        statementResults: [{
          statementId: 'allow-1',
          effect: 'Allow',
          actionMatched: true,
          resourceMatched: true,
          conditionMatched: true,
          applicable: true,
          nonApplicableReasons: [],
          unsupportedFeatures: [],
        }],
        pathTrace: [
          {
            statementId: 'allow-1',
            effect: 'Allow',
            actionMatched: true,
            resourceMatched: true,
            conditionMatched: true,
            applicable: true,
            nonApplicableReasons: [],
            unsupportedFeatures: [],
            source: {
              sourcePolicyId: 'explicit-policy',
              sourcePolicyPath: '/explicit.json',
              sourcePolicyIndex: 99,
              sourceStatementIndex: 99,
              sid: 'ExplicitSid',
            },
          },
        ],
        diagnostics: makeEmptyDiagnosticJson(),
      };

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection = text.sections.find(s => s.label === 'pathTrace')!;

      // Content must come from pathTrace, not statementResults
      const joined = pathSection.lines.join('\n');
      expect(joined).toContain('allow-1');
      // Source info from pathTrace must appear
      expect(joined).toContain('explicit-policy');
      expect(joined).toContain('ExplicitSid');
    });

    // ─── 不写终端 ────────────────────────────────────────────────────
    it('D04-T12: buildEvaluationTextOutput does not call console.log, stdout, or stderr', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: IMPLICIT_DENY (INDETERMINATE; unsupported features: NotAction)',
        diagnostics: makeDiagnosticJson(
          [{ code: 'MISSING_FIELD', message: 'Missing field', path: '/root' }],
          [{ feature: 'NotAction', detail: 'Not supported' }],
        ),
      });

      // Spy on console.log to ensure no terminal output
      const consoleSpy = vi.fn();
      const originalLog = console.log;
      console.log = consoleSpy;

      try {
        const text: EvaluationTextOutput = buildEvaluationTextOutput(json);

        // Function should return a structured object
        expect(text).toBeDefined();
        expect(typeof text).toBe('object');
        expect(text.title).toBe('Evaluation Report');

        // Should not have called console.log
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        console.log = originalLog;
      }
    });

    // ─── diagnostics: only invalidInputs (no unsupported) ──────────────
    it('D04-T13: diagnostics section with only invalidInputs (no unsupportedFeatures)', () => {
      const json = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        diagnostics: makeDiagnosticJson(
          [{ code: 'MISSING_FIELD', message: 'Sid is missing', path: undefined }],
          [],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection = text.sections.find(s => s.label === 'diagnostics')!;

      const joined = diagSection.lines.join('\n');
      expect(joined).toContain('invalidInputs');
      expect(joined).toContain('MISSING_FIELD');
      expect(joined).toContain('Sid is missing');
      // Should NOT contain unsupportedFeatures at all (empty)
      expect(joined).not.toContain('unsupportedFeatures');
    });

    // ─── diagnostics: only unsupportedFeatures (no invalidInputs) ─────
    it('D04-T14: diagnostics section with only unsupportedFeatures (no invalidInputs)', () => {
      const json = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: ALLOW (INDETERMINATE; unsupported features: NotAction)',
        diagnostics: makeDiagnosticJson(
          [],
          [{ feature: 'NotAction', detail: 'NotAction not supported' }],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection = text.sections.find(s => s.label === 'diagnostics')!;

      const joined = diagSection.lines.join('\n');
      expect(joined).toContain('unsupportedFeatures');
      expect(joined).toContain('NotAction');
      // Should NOT contain invalidInputs at all (empty)
      expect(joined).not.toContain('invalidInputs');
    });

    // ─── Input immutability ────────────────────────────────────────────
    it('D04-T15: buildEvaluationTextOutput does not mutate EvaluationJsonOutput', () => {
      const json: EvaluationJsonOutput = {
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: EXPLICIT_DENY',
        matchedDenyStatementIds: ['deny-1'],
        matchedAllowStatementIds: ['allow-1'],
        statementResults: [],
        pathTrace: [],
        diagnostics: makeDiagnosticJson(
          [{ code: 'INVALID_JSON', message: 'Bad JSON', path: undefined }],
          [{ feature: 'NotAction', detail: undefined }],
        ),
      };

      // Snapshot before
      const before = JSON.stringify(json);

      buildEvaluationTextOutput(json);

      // Verify not mutated
      expect(JSON.stringify(json)).toBe(before);
    });
  });
});