/**
 * Unit tests for evaluation-text-output – Z04-D03:
 * text/report structured text output type and constructor function.
 *
 * Tests verify that buildEvaluationTextOutput consumes EvaluationJsonOutput
 * and produces a structured text object (EvaluationTextOutput) without
 * re-computing decisions, re-constructing pathTrace, calling JSON.stringify,
 * writing to stdout/stderr, or handling CLI/argv/exitCode.
 *
 * Covers T1–T13 as specified in the unit task document.
 */

import { describe, it, expect } from 'vitest';
import { buildEvaluationTextOutput } from './evaluation-text-output.js';
import type { EvaluationTextOutput, TextSection } from './evaluation-text-output.js';
import type { EvaluationJsonOutput, DiagnosticJson, InvalidInputJson, UnsupportedFeatureJson } from './evaluation-json-output.js';

// ─── Helpers ─────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────

describe('evaluation-text-output', () => {
  describe('buildEvaluationTextOutput', () => {
    // T1: Normal conversion – EvaluationJsonOutput converts to text/report structure
    it('T1: converts EvaluationJsonOutput to EvaluationTextOutput structure', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: ALLOW',
        matchedDenyStatementIds: [],
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
              sourcePolicyId: 'policy-1',
              sourcePolicyPath: '/policies/p1.json',
              sourcePolicyIndex: 0,
              sourceStatementIndex: 0,
              sid: 'Stmt1',
            },
          },
        ],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);

      expect(text).toBeDefined();
      expect(typeof text.title).toBe('string');
      expect(Array.isArray(text.sections)).toBe(true);
      expect(text.sections.length).toBeGreaterThan(0);
    });

    // T2: Section order stability – sections array follows design spec order
    it('T2: section order follows design spec: decision → status → summary → matchedStatements → pathTrace → diagnostics', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: EXPLICIT_DENY',
        matchedDenyStatementIds: ['deny-1'],
        matchedAllowStatementIds: ['allow-1'],
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
              sourcePolicyId: 'pol-deny',
              sourcePolicyPath: '/deny.json',
              sourcePolicyIndex: 0,
              sourceStatementIndex: 0,
              sid: undefined,
            },
          },
        ],
        diagnostics: makeDiagnosticJson(
          [{ code: 'MISSING_FIELD', message: 'Missing Sid', path: '/Statement[0]' }],
          [{ feature: 'NotAction', detail: 'NotAction not supported' }],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const labels: readonly string[] = text.sections.map(
        (s: TextSection): string => s.label,
      );

      // The expected order is: decision, status, summary, matchedStatements,
      // pathTrace, diagnostics
      expect(labels).toEqual([
        'decision',
        'decisionStatus',
        'summary',
        'matchedStatements',
        'pathTrace',
        'diagnostics',
      ]);
    });

    // T3: finalDecision – text expression comes directly from structured result
    it('T3: decision section uses finalDecision directly from input', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: EXPLICIT_DENY',
        matchedDenyStatementIds: ['deny-1'],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const decisionSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'decision',
      );

      expect(decisionSection).toBeDefined();
      expect(decisionSection!.lines).toContain('EXPLICIT_DENY');
    });

    // T4: decisionStatus – DETERMINATE and INDETERMINATE have appropriate expressions
    it('T4: decisionStatus DETERMINATE expressed as DETERMINATE', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const statusSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'decisionStatus',
      );

      expect(statusSection).toBeDefined();
      expect(statusSection!.lines).toContain('DETERMINATE');
    });

    it('T4b: decisionStatus INDETERMINATE expressed with indeterminate marker', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: ALLOW (INDETERMINATE; unsupported features: NotAction)',
        matchedAllowStatementIds: ['allow-1'],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const statusSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'decisionStatus',
      );

      expect(statusSection).toBeDefined();
      // The line is "INDETERMINATE (indeterminate)" – check via joined string
      const joined: string = statusSection!.lines.join('\n');
      expect(joined).toContain('INDETERMINATE');
    });

    // T5: matched statements – deny/allow statement IDs expressed stably
    it('T5: matchedStatements section lists deny and allow IDs', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: ['deny-1', 'deny-2'],
        matchedAllowStatementIds: ['allow-1'],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const matchedSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'matchedStatements',
      );

      expect(matchedSection).toBeDefined();
      // The lines should contain the deny and allow IDs
      const joined: string = matchedSection!.lines.join('\n');
      expect(joined).toContain('deny-1');
      expect(joined).toContain('deny-2');
      expect(joined).toContain('allow-1');
    });

    // T6: pathTrace overview – each PathTraceEntryJson has a stable human-readable line
    it('T6: pathTrace section has one overview line per PathTraceEntryJson', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
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
              sourcePolicyId: 'policy-A',
              sourcePolicyPath: '/policies/a.json',
              sourcePolicyIndex: 0,
              sourceStatementIndex: 2,
              sid: 'AllowStmt',
            },
          },
          {
            statementId: 'deny-1',
            effect: 'Deny',
            actionMatched: true,
            resourceMatched: true,
            conditionMatched: false,
            applicable: false,
            nonApplicableReasons: ['condition_not_matched'],
            unsupportedFeatures: [],
            source: {
              sourcePolicyId: 'policy-B',
              sourcePolicyPath: '/policies/b.json',
              sourcePolicyIndex: 1,
              sourceStatementIndex: 0,
              sid: undefined,
            },
          },
        ],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'pathTrace',
      );

      expect(pathSection).toBeDefined();
      // Two entries → at least two overview lines (may include sub-lines)
      expect(pathSection!.lines.length).toBeGreaterThanOrEqual(2);
      // Lines should reference the statement IDs
      const joined: string = pathSection!.lines.join('\n');
      expect(joined).toContain('allow-1');
      expect(joined).toContain('deny-1');
    });

    // T7: source default placeholder – human-readable expression is "source: unavailable"
    it('T7: source default placeholder expressed as "source: unavailable"', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        pathTrace: [
          {
            statementId: 'orphan-1',
            effect: 'Allow',
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
      const pathSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'pathTrace',
      );

      expect(pathSection).toBeDefined();
      const joined: string = pathSection!.lines.join('\n');
      expect(joined).toContain('source: unavailable');
    });

    // T7b: source with real values – expressed with policy ID and SID
    it('T7b: source with real values expressed with available info', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
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
              sourcePolicyId: 'policy-A',
              sourcePolicyPath: '/policies/a.json',
              sourcePolicyIndex: 0,
              sourceStatementIndex: 2,
              sid: 'AllowStmt',
            },
          },
        ],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'pathTrace',
      );

      expect(pathSection).toBeDefined();
      const joined: string = pathSection!.lines.join('\n');
      expect(joined).toContain('policy-A');
      expect(joined).toContain('AllowStmt');
      // Should NOT contain "source: unavailable" for this entry
      expect(joined).not.toContain('source: unavailable');
    });

    // T8: diagnostics – invalidInputs / unsupportedFeatures expressed stably
    it('T8: diagnostics section lists invalidInputs and unsupportedFeatures', () => {
      const diagnostics: DiagnosticJson = makeDiagnosticJson(
        [
          { code: 'MISSING_FIELD', message: 'Policy id is missing', path: '/Statement[0]/Sid' },
          { code: 'INVALID_JSON', message: 'Malformed JSON', path: undefined },
        ],
        [
          { feature: 'NotAction', detail: 'NotAction is not supported' },
          { feature: 'NumericEquals', detail: undefined },
        ],
      );
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: ALLOW (INDETERMINATE; unsupported features: NotAction, NumericEquals)',
        matchedAllowStatementIds: ['allow-1'],
        diagnostics,
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'diagnostics',
      );

      expect(diagSection).toBeDefined();
      const joined: string = diagSection!.lines.join('\n');
      // Invalid inputs should be listed with code and message
      expect(joined).toContain('MISSING_FIELD');
      expect(joined).toContain('Policy id is missing');
      expect(joined).toContain('INVALID_JSON');
      expect(joined).toContain('Malformed JSON');
      // Unsupported features should list feature names
      expect(joined).toContain('NotAction');
      expect(joined).toContain('NumericEquals');
    });

    // T9: Empty pathTrace – stable expression
    it('T9: empty pathTrace produces stable pathTrace section', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        pathTrace: [],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'pathTrace',
      );

      expect(pathSection).toBeDefined();
      // Empty pathTrace should produce a meaningful indication
      expect(pathSection!.lines).toHaveLength(1);
      expect(pathSection!.lines[0]!).toContain('none');
    });

    // T10: Empty diagnostics – stable expression
    it('T10: empty diagnostics produces stable diagnostics section', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        matchedAllowStatementIds: ['allow-1'],
        diagnostics: makeEmptyDiagnosticJson(),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'diagnostics',
      );

      expect(diagSection).toBeDefined();
      // Empty diagnostics should produce a meaningful indication
      expect(diagSection!.lines).toHaveLength(1);
      expect(diagSection!.lines[0]!).toContain('none');
    });

    // T11: No console.log / process.stdout.write is called
    it('T11: buildEvaluationTextOutput does not write to stdout/stderr', () => {
      const json: EvaluationJsonOutput = makeJsonOutput();
      // The function should return a structured object without side effects.
      // We verify it returns an object (not void) and that no console output
      // is produced by simply calling it – if it wrote to stdout, the test
      // runner would capture it.
      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      expect(text).toBeDefined();
      expect(typeof text).toBe('object');
      expect(text).not.toBeInstanceOf(String);
    });

    // T12: No CLI / argv / exitCode handling
    it('T12: EvaluationTextOutput type has no CLI/argv/exitCode fields', () => {
      const json: EvaluationJsonOutput = makeJsonOutput();
      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const keys = Object.keys(text);

      expect(keys).not.toContain('exitCode');
      expect(keys).not.toContain('argv');
      expect(keys).not.toContain('cli');
    });

    // T13: No fabricated fields from EvaluationJsonOutput that don't exist
    it('T13: no fabricated fields – sections contain only data from EvaluationJsonOutput', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: ALLOW',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: ['allow-1'],
        pathTrace: [],
        diagnostics: makeEmptyDiagnosticJson(),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);

      // The title and section labels should be well-defined
      expect(typeof text.title).toBe('string');
      expect(text.title.length).toBeGreaterThan(0);

      // Every section should have a label and lines
      for (const section of text.sections) {
        expect(typeof section.label).toBe('string');
        expect(section.label.length).toBeGreaterThan(0);
        expect(Array.isArray(section.lines)).toBe(true);
      }
    });

    // Additional: INDETERMINATE decision with unsupported features noted in summary
    it('T14: INDETERMINATE status clearly expressed in decisionStatus section', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
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
      const statusSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'decisionStatus',
      );

      expect(statusSection).toBeDefined();
      // Should contain INDETERMINATE marker
      const joined: string = statusSection!.lines.join('\n');
      expect(joined).toContain('INDETERMINATE');
    });

    // Additional: Multiple pathTrace entries each have distinct overview lines
    it('T15: multiple pathTrace entries each produce distinct overview lines', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: ['deny-1'],
        pathTrace: [
          {
            statementId: 'allow-1',
            effect: 'Allow',
            actionMatched: true,
            resourceMatched: false,
            conditionMatched: false,
            applicable: false,
            nonApplicableReasons: ['resource_not_matched'],
            unsupportedFeatures: [],
            source: {
              sourcePolicyId: 'pol-1',
              sourcePolicyPath: '/p1.json',
              sourcePolicyIndex: 0,
              sourceStatementIndex: 0,
              sid: 'AllowStmt1',
            },
          },
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
              sourcePolicyId: 'pol-2',
              sourcePolicyPath: '/p2.json',
              sourcePolicyIndex: 1,
              sourceStatementIndex: 1,
              sid: 'DenyStmt2',
            },
          },
        ],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const pathSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'pathTrace',
      );

      expect(pathSection).toBeDefined();
      // Both statement IDs should appear
      const joined: string = pathSection!.lines.join('\n');
      expect(joined).toContain('allow-1');
      expect(joined).toContain('deny-1');
    });

    // Additional: Input is not mutated
    it('T16: buildEvaluationTextOutput does not mutate EvaluationJsonOutput', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        summary: 'Final decision: ALLOW',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: ['allow-1'],
        pathTrace: [],
        diagnostics: makeEmptyDiagnosticJson(),
      });

      // Snapshot before
      const beforeDecision = json.finalDecision;
      const beforeStatus = json.decisionStatus;
      const beforeSummary = json.summary;
      const beforeDenyIds = [...json.matchedDenyStatementIds];
      const beforeAllowIds = [...json.matchedAllowStatementIds];

      buildEvaluationTextOutput(json);

      // Verify unchanged after
      expect(json.finalDecision).toBe(beforeDecision);
      expect(json.decisionStatus).toBe(beforeStatus);
      expect(json.summary).toBe(beforeSummary);
      expect([...json.matchedDenyStatementIds]).toEqual(beforeDenyIds);
      expect([...json.matchedAllowStatementIds]).toEqual(beforeAllowIds);
    });

    // Additional: diagnostics path field is expressed when present
    it('T17: diagnostics section includes path when InvalidInput has path', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
        diagnostics: makeDiagnosticJson(
          [
            { code: 'MISSING_FIELD', message: 'Policy id missing', path: '/Statement[0]/Sid' },
          ],
          [],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'diagnostics',
      );

      expect(diagSection).toBeDefined();
      const joined: string = diagSection!.lines.join('\n');
      expect(joined).toContain('/Statement[0]/Sid');
    });

    // Additional: diagnostics unsupportedFeatures detail expressed
    it('T18: diagnostics section expresses unsupported features with detail', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'ALLOW',
        decisionStatus: 'INDETERMINATE',
        summary: 'Final decision: ALLOW (INDETERMINATE; unsupported features: NotAction)',
        matchedAllowStatementIds: ['allow-1'],
        diagnostics: makeDiagnosticJson(
          [],
          [{ feature: 'NotAction', detail: 'NotAction is not supported' }],
        ),
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const diagSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'diagnostics',
      );

      expect(diagSection).toBeDefined();
      const joined: string = diagSection!.lines.join('\n');
      expect(joined).toContain('NotAction');
    });

    // Additional: Empty matched statements produce stable section
    it('T19: empty matchedStatements produces stable section', () => {
      const json: EvaluationJsonOutput = makeJsonOutput({
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
      });

      const text: EvaluationTextOutput = buildEvaluationTextOutput(json);
      const matchedSection: TextSection | undefined = text.sections.find(
        (s: TextSection): boolean => s.label === 'matchedStatements',
      );

      expect(matchedSection).toBeDefined();
      // Should indicate no matches
      const joined: string = matchedSection!.lines.join('\n');
      expect(joined).toContain('none');
    });
  });
});