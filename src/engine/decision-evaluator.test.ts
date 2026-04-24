import { describe, it, expect } from 'vitest';
import {
  evaluateDecision,
} from './decision-evaluator.js';
import type {
  FinalDecision,
  DecisionStatus,
} from './decision-evaluator.js';
import type { MatchResult } from './statement-evaluator.js';
import type { Diagnostic } from '../parser/error-model.js';
import { createDiagnostic } from '../parser/error-model.js';

// ─── Helpers ─────────────────────────────────────────────────────────

/** Create an applicable Allow MatchResult. */
function allowResult(
  statementId: string,
  unsupportedFeatures: readonly string[] = [],
): MatchResult {
  return {
    statementId,
    effect: 'Allow',
    actionMatched: true,
    resourceMatched: true,
    conditionMatched: unsupportedFeatures.length === 0,
    applicable: unsupportedFeatures.length === 0,
    nonApplicableReasons: unsupportedFeatures.length > 0 ? ['unsupported_feature'] : [],
    unsupportedFeatures,
  };
}

/** Create an applicable Deny MatchResult. */
function denyResult(
  statementId: string,
  unsupportedFeatures: readonly string[] = [],
): MatchResult {
  return {
    statementId,
    effect: 'Deny',
    actionMatched: true,
    resourceMatched: true,
    conditionMatched: unsupportedFeatures.length === 0,
    applicable: unsupportedFeatures.length === 0,
    nonApplicableReasons: unsupportedFeatures.length > 0 ? ['unsupported_feature'] : [],
    unsupportedFeatures,
  };
}

/** Create a not-applicable MatchResult (neither Allow nor Deny contributes). */
function notApplicableResult(
  statementId: string,
  unsupportedFeatures: readonly string[] = [],
): MatchResult {
  return {
    statementId,
    effect: 'Allow',
    actionMatched: false,
    resourceMatched: false,
    conditionMatched: false,
    applicable: false,
    nonApplicableReasons: unsupportedFeatures.length > 0
      ? ['unsupported_feature']
      : ['action_not_matched'],
    unsupportedFeatures,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────

describe('decision-evaluator', () => {
  describe('evaluateDecision', () => {
    it('T1: single Deny applicable (no unsupported) → EXPLICIT_DENY / DETERMINATE', () => {
      const results: readonly MatchResult[] = [
        denyResult('deny-1'),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('EXPLICIT_DENY' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
      expect(evaluation.matchedDenyStatementIds).toEqual(['deny-1']);
    });

    it('T2: single Allow applicable (no unsupported) → ALLOW / DETERMINATE', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-1'),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('ALLOW' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
      expect(evaluation.matchedAllowStatementIds).toEqual(['allow-1']);
    });

    it('T3: no applicable Statement (no unsupported) → IMPLICIT_DENY / DETERMINATE', () => {
      const results: readonly MatchResult[] = [
        notApplicableResult('na-1'),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('IMPLICIT_DENY' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
    });

    it('T4: both Deny and Allow applicable → EXPLICIT_DENY (Deny wins)', () => {
      const results: readonly MatchResult[] = [
        denyResult('deny-1'),
        allowResult('allow-1'),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('EXPLICIT_DENY' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
      expect(evaluation.matchedDenyStatementIds).toEqual(['deny-1']);
      expect(evaluation.matchedAllowStatementIds).toEqual(['allow-1']);
    });

    it('T5: multiple Allow, no Deny → ALLOW', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-1'),
        allowResult('allow-2'),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('ALLOW' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
      expect(evaluation.matchedAllowStatementIds).toEqual(['allow-1', 'allow-2']);
    });

    it('T6: applicable Deny + unsupported → EXPLICIT_DENY / DETERMINATE (Deny authority beats unsupported)', () => {
      const results: readonly MatchResult[] = [
        denyResult('deny-1'),
        notApplicableResult('na-unsupported', ['NumericEquals']),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('EXPLICIT_DENY' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
      expect(evaluation.matchedDenyStatementIds).toEqual(['deny-1']);
    });

    it('T7: applicable Allow + unsupported from not applicable Statement → ALLOW / INDETERMINATE', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-1'),
        notApplicableResult('na-unsupported', ['NumericEquals']),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('ALLOW' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('INDETERMINATE' as DecisionStatus);
      expect(evaluation.matchedAllowStatementIds).toEqual(['allow-1']);
    });

    it('T8: empty MatchResult[] → IMPLICIT_DENY / DETERMINATE', () => {
      const results: readonly MatchResult[] = [];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('IMPLICIT_DENY' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
      expect(evaluation.matchedDenyStatementIds).toEqual([]);
      expect(evaluation.matchedAllowStatementIds).toEqual([]);
    });

    it('T9: matchedDenyStatementIds preserves input order', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-1'),
        denyResult('deny-b'),
        denyResult('deny-a'),
        allowResult('allow-2'),
      ];
      const evaluation = evaluateDecision(results);

      // Deny IDs should appear in input order: deny-b, deny-a
      expect(evaluation.matchedDenyStatementIds).toEqual(['deny-b', 'deny-a']);
    });

    it('T10: matchedAllowStatementIds preserves input order', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-2'),
        allowResult('allow-1'),
      ];
      const evaluation = evaluateDecision(results);

      // Allow IDs should appear in input order: allow-2, allow-1
      expect(evaluation.matchedAllowStatementIds).toEqual(['allow-2', 'allow-1']);
    });

    it('T11: statementResults equals input MatchResult array', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-1'),
        denyResult('deny-1'),
        notApplicableResult('na-1'),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.statementResults).toEqual(results);
      // Verify referential transparency – same length & same objects
      expect(evaluation.statementResults.length).toBe(3);
    });

    it('T12: diagnostics passthrough (passed Diagnostic)', () => {
      const diag: Diagnostic = createDiagnostic(
        [{ code: 'MISSING_FIELD', message: 'Action is required', path: 'action' }],
        [{ feature: 'NotAction', detail: 'Not supported in phase 1' }],
      );
      const results: readonly MatchResult[] = [allowResult('allow-1')];
      const evaluation = evaluateDecision(results, diag);

      expect(evaluation.diagnostics).toBe(diag);
    });

    it('T13: diagnostics default empty (no Diagnostic passed)', () => {
      const results: readonly MatchResult[] = [allowResult('allow-1')];
      const evaluation = evaluateDecision(results);

      expect(evaluation.diagnostics.hasInvalid).toBe(false);
      expect(evaluation.diagnostics.hasUnsupported).toBe(false);
      expect(evaluation.diagnostics.invalidInputs).toEqual([]);
      expect(evaluation.diagnostics.unsupportedFeatures).toEqual([]);
    });

    it('T14: IMPLICIT_DENY + unsupported → IMPLICIT_DENY / INDETERMINATE', () => {
      const results: readonly MatchResult[] = [
        notApplicableResult('na-1', ['NumericEquals']),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('IMPLICIT_DENY' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('INDETERMINATE' as DecisionStatus);
    });

    it('T15: mixed: 1 Deny applicable + 1 Allow applicable + 1 not-applicable with unsupported → EXPLICIT_DENY / DETERMINATE', () => {
      const results: readonly MatchResult[] = [
        denyResult('deny-1'),
        allowResult('allow-1'),
        notApplicableResult('na-1', ['NumericEquals']),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.finalDecision).toBe('EXPLICIT_DENY' as FinalDecision);
      expect(evaluation.decisionStatus).toBe('DETERMINATE' as DecisionStatus);
      expect(evaluation.matchedDenyStatementIds).toEqual(['deny-1']);
      expect(evaluation.matchedAllowStatementIds).toEqual(['allow-1']);
    });

    // ─── Summary spot-checks ───────────────────────────────────────

    it('summary is non-empty for DETERMINATE decisions', () => {
      const results: readonly MatchResult[] = [allowResult('allow-1')];
      const evaluation = evaluateDecision(results);

      expect(evaluation.summary).toBeTruthy();
      expect(typeof evaluation.summary).toBe('string');
    });

    it('summary is non-empty for INDETERMINATE decisions', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-1'),
        notApplicableResult('na-1', ['NumericEquals']),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.summary).toBeTruthy();
      expect(typeof evaluation.summary).toBe('string');
    });

    it('summary mentions INDETERMINATE when decision is indeterminate', () => {
      const results: readonly MatchResult[] = [
        allowResult('allow-1'),
        notApplicableResult('na-1', ['NumericEquals']),
      ];
      const evaluation = evaluateDecision(results);

      expect(evaluation.summary).toContain('INDETERMINATE');
    });
  });
});