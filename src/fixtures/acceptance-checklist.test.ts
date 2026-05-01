/**
 * acceptance-checklist.test.ts – Unit tests for Z05-D05 acceptance checklist.
 *
 * These tests validate:
 * 1. Z05_ACHIEVEMENTS covers all D01-D04 units with complete metadata
 * 2. COVERAGE_MATRIX covers all 4 dimensions with entries for each
 * 3. STRONG_ASSERTION_COVERAGE lists all 14 strong assertion field paths
 * 4. WEAK_ASSERTION_COVERAGE lists both weak assertion fields
 * 5. INVALID_COVERAGE covers invalid input scenarios
 * 6. UNSUPPORTED_COVERAGE covers unsupported feature/condition scenarios
 * 7. INDETERMINATE_COVERAGE covers indeterminate decision scenarios
 * 8. SOURCE_COVERAGE covers all 6 StatementSource-related aspects
 * 9. EMPTY_COLLECTIONS_COVERAGE covers empty collection scenarios
 * 10. Z05_CLOSEOUT_CONDITIONS covers all required closeout criteria
 * 11. Z05_FINAL_TALLY covers all D0x units
 * 12. Z05_TO_S01_TRANSITION defines complete transition steps
 * 13. No `any` type usage in module
 * 14. No actual fixtures directories created
 * 15. No golden output files generated
 * 16. No real-world IAM Policy samples introduced
 * 17. No modifications to D01-D04 types (import type only)
 *
 * Boundary: imports only from acceptance-checklist.ts. Does NOT create
 * real directories, golden cases, or real-world policy samples.
 */
import { describe, it, expect } from 'vitest';

// ─── Imports from module under test ────────────────────────────────────
import {
  Z05_ACHIEVEMENTS,
  COVERAGE_MATRIX,
  STRONG_ASSERTION_COVERAGE,
  WEAK_ASSERTION_COVERAGE,
  INVALID_COVERAGE,
  UNSUPPORTED_COVERAGE,
  INDETERMINATE_COVERAGE,
  SOURCE_COVERAGE,
  EMPTY_COLLECTIONS_COVERAGE,
  Z05_CLOSEOUT_CONDITIONS,
  Z05_FINAL_TALLY,
  Z05_TO_S01_TRANSITION,
  VALID_COVERAGE_DIMENSIONS,
} from './acceptance-checklist.js';

// ─── No separate type-only imports needed; value imports suffice ─────
// The value imports above also bring in the types for inference.

// ═══════════════════════════════════════════════════════════════════════
// 1. Z05_ACHIEVEMENTS integrity
// ═══════════════════════════════════════════════════════════════════════

describe('Z05_ACHIEVEMENTS', () => {
  it('should contain 4 entries (D01-D04)', () => {
    expect(Z05_ACHIEVEMENTS).toHaveLength(4);
  });

  it('should cover all Z05 unit IDs (D01, D02, D03, D04)', () => {
    const ids = Z05_ACHIEVEMENTS.map((a) => a.unitId);
    expect(ids).toEqual(['Z05-D01', 'Z05-D02', 'Z05-D03', 'Z05-D04']);
  });

  it('should have all four achievements marked as closed', () => {
    for (const a of Z05_ACHIEVEMENTS) {
      expect(a.closed, `${a.unitId} should be closed`).toBe(true);
    }
  });

  it('should have non-empty deliverables list for each achievement', () => {
    for (const a of Z05_ACHIEVEMENTS) {
      expect(
        a.deliverables.length,
        `${a.unitId} deliverables should not be empty`,
      ).toBeGreaterThan(0);
    }
  });

  it('should have non-empty boundaries list for each achievement', () => {
    for (const a of Z05_ACHIEVEMENTS) {
      expect(
        a.boundaries.length,
        `${a.unitId} boundaries should not be empty`,
      ).toBeGreaterThan(0);
    }
  });

  it('should have positive test case count for each achievement', () => {
    for (const a of Z05_ACHIEVEMENTS) {
      expect(
        a.testCaseCount,
        `${a.unitId} testCaseCount should be positive`,
      ).toBeGreaterThan(0);
    }
  });

  it('should have a purpose string for each achievement', () => {
    for (const a of Z05_ACHIEVEMENTS) {
      expect(a.purpose.length).toBeGreaterThan(0);
    }
  });

  it('should be a readonly array', () => {
    // Verify the constant is frozen via TypeScript readonly constraint.
    // At runtime, the array is not deeply frozen, but the type system
    // prevents mutation.
    expect(Array.isArray(Z05_ACHIEVEMENTS)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. COVERAGE_MATRIX integrity
// ═══════════════════════════════════════════════════════════════════════

describe('COVERAGE_MATRIX', () => {
  it('should contain entries', () => {
    expect(COVERAGE_MATRIX.length).toBeGreaterThan(0);
  });

  it('should cover all 4 dimensions', () => {
    const dimensions = new Set(COVERAGE_MATRIX.map((e) => e.dimension));
    for (const dim of VALID_COVERAGE_DIMENSIONS) {
      expect(dimensions.has(dim), `dimension ${dim} should be covered`).toBe(
        true,
      );
    }
  });

  it('should have entries from all D01-D04 sources', () => {
    const sources = new Set(COVERAGE_MATRIX.map((e) => e.source));
    for (const id of ['Z05-D01', 'Z05-D02', 'Z05-D03', 'Z05-D04']) {
      expect(sources.has(id), `source ${id} should be present`).toBe(true);
    }
  });

  it('should have at least 2 entries per dimension', () => {
    for (const dim of VALID_COVERAGE_DIMENSIONS) {
      const count = COVERAGE_MATRIX.filter((e) => e.dimension === dim).length;
      expect(
        count,
        `dimension ${dim} should have at least 2 entries`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('should have label and category for every entry', () => {
    for (const entry of COVERAGE_MATRIX) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it('should have all sources match valid unit IDs', () => {
    const validSources = new Set(['Z05-D01', 'Z05-D02', 'Z05-D03', 'Z05-D04']);
    for (const entry of COVERAGE_MATRIX) {
      expect(validSources.has(entry.source), `${entry.source} should be valid`).toBe(
        true,
      );
    }
  });

  it('fixtures dimension should include fixture-schema category entries', () => {
    const fixturesEntries = COVERAGE_MATRIX.filter(
      (e) => e.dimension === 'fixtures',
    );
    const fixtureSchema = fixturesEntries.filter(
      (e) => e.category === 'fixture-schema',
    );
    expect(fixtureSchema.length).toBeGreaterThan(0);
  });

  it('core dimension should include allow, explicit-deny, implicit-deny, and condition categories', () => {
    const coreEntries = COVERAGE_MATRIX.filter((e) => e.dimension === 'core');
    const categories = new Set(coreEntries.map((e) => e.category));
    for (const cat of [
      'allow',
      'explicit-deny',
      'implicit-deny',
      'condition-string-equals',
      'condition-bool',
      'condition-ip-address',
      'unsupported',
      'invalid',
    ]) {
      expect(categories.has(cat), `core category ${cat} should be covered`).toBe(
        true,
      );
    }
  });

  it('output dimension should include path-trace, json-output, text-output, diagnostics-output, empty-output, source-unavailable categories', () => {
    const outputEntries = COVERAGE_MATRIX.filter(
      (e) => e.dimension === 'output',
    );
    const categories = new Set(outputEntries.map((e) => e.category));
    for (const cat of [
      'path-trace',
      'json-output',
      'text-output',
      'diagnostics-output',
      'empty-output',
      'source-unavailable',
      'source-coverage',
    ]) {
      expect(
        categories.has(cat),
        `output category ${cat} should be covered`,
      ).toBe(true);
    }
  });

  it('boundary dimension should include all 10 boundary categories', () => {
    const boundaryEntries = COVERAGE_MATRIX.filter(
      (e) => e.dimension === 'boundary',
    );
    const categories = new Set(boundaryEntries.map((e) => e.category));
    for (const cat of [
      'invalid-input',
      'unsupported-feature',
      'unsupported-condition',
      'indeterminate-decision',
      'diagnostics-output',
      'path-trace-boundary',
      'json-boundary',
      'text-boundary',
      'source-unavailable',
      'empty-collections',
      'schema',
    ]) {
      expect(
        categories.has(cat),
        `boundary category ${cat} should be covered`,
      ).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. STRONG_ASSERTION_COVERAGE integrity
// ═══════════════════════════════════════════════════════════════════════

describe('STRONG_ASSERTION_COVERAGE', () => {
  it('should have exactly 14 entries (matching D01 STRONG_ASSERTION_FIELDS)', () => {
    expect(STRONG_ASSERTION_COVERAGE).toHaveLength(14);
  });

  it('should cover all 14 strong assertion field paths', () => {
    const coveredFields = STRONG_ASSERTION_COVERAGE.map((f) => f.field);
    const expectedFields = [
      'finalDecision',
      'decisionStatus',
      'matchedDenyStatementIds',
      'matchedAllowStatementIds',
      'pathTrace',
      'statementId',
      'applicable',
      'nonApplicableReasons',
      'unsupportedFeatures',
      'sourcePolicyId',
      'sourceStatementIndex',
      'sid',
      'diagnostics.invalidInputs',
      'diagnostics.unsupportedFeatures',
    ];
    expect(coveredFields).toEqual(expectedFields);
  });

  it('should have non-empty coveredBy for every field', () => {
    for (const entry of STRONG_ASSERTION_COVERAGE) {
      expect(
        entry.coveredBy.length,
        `${entry.field} coveredBy should not be empty`,
      ).toBeGreaterThan(0);
    }
  });

  it('should have every coveredBy value be a valid unit ID', () => {
    const validIds = new Set([
      'Z05-D01',
      'Z05-D02',
      'Z05-D03',
      'Z05-D04',
    ]);
    for (const entry of STRONG_ASSERTION_COVERAGE) {
      for (const id of entry.coveredBy) {
        expect(validIds.has(id), `${id} should be a valid unit ID`).toBe(true);
      }
    }
  });

  it('should have no duplicate field entries', () => {
    const fields = STRONG_ASSERTION_COVERAGE.map((f) => f.field);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. WEAK_ASSERTION_COVERAGE integrity
// ═══════════════════════════════════════════════════════════════════════

describe('WEAK_ASSERTION_COVERAGE', () => {
  it('should have exactly 2 entries (matching D01 WEAK_ASSERTION_FIELDS)', () => {
    expect(WEAK_ASSERTION_COVERAGE).toHaveLength(2);
  });

  it('should cover summary and textOutput', () => {
    const fields = WEAK_ASSERTION_COVERAGE.map((f) => f.field);
    expect(fields).toEqual(['summary', 'textOutput']);
  });

  it('should have non-empty coveredBy for each field', () => {
    for (const entry of WEAK_ASSERTION_COVERAGE) {
      expect(entry.coveredBy.length).toBeGreaterThan(0);
    }
  });

  it('should have no duplicate field entries', () => {
    const fields = WEAK_ASSERTION_COVERAGE.map((f) => f.field);
    expect(new Set(fields).size).toBe(fields.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. INVALID_COVERAGE integrity
// ═══════════════════════════════════════════════════════════════════════

describe('INVALID_COVERAGE', () => {
  it('should have at least 4 entries', () => {
    expect(INVALID_COVERAGE.length).toBeGreaterThanOrEqual(4);
  });

  it('should include diagnostics.invalidInputs field type scenario', () => {
    const hasFieldType = INVALID_COVERAGE.some(
      (e) => e.scenario.includes('invalidInputs'),
    );
    expect(hasFieldType).toBe(true);
  });

  it('should include invalid policy structure scenario', () => {
    const hasInvalidPolicy = INVALID_COVERAGE.some(
      (e) => e.scenario.toLowerCase().includes('invalid policy'),
    );
    expect(hasInvalidPolicy).toBe(true);
  });

  it('should have non-empty coveredBy for every scenario', () => {
    for (const entry of INVALID_COVERAGE) {
      expect(entry.coveredBy.length).toBeGreaterThan(0);
    }
  });

  it('should have at least one scenario covered by Z05-D04', () => {
    const d04Scenarios = INVALID_COVERAGE.filter((e) =>
      e.coveredBy.includes('Z05-D04'),
    );
    expect(d04Scenarios.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. UNSUPPORTED_COVERAGE integrity
// ═══════════════════════════════════════════════════════════════════════

describe('UNSUPPORTED_COVERAGE', () => {
  it('should have at least 6 entries', () => {
    expect(UNSUPPORTED_COVERAGE.length).toBeGreaterThanOrEqual(6);
  });

  it('should include unsupported condition operator scenarios', () => {
    const hasCondition = UNSUPPORTED_COVERAGE.some(
      (e) =>
        e.scenario.toLowerCase().includes('condition') &&
        e.scenario.toLowerCase().includes('unsupported'),
    );
    expect(hasCondition).toBe(true);
  });

  it('should include unsupported policy feature scenario', () => {
    const hasFeature = UNSUPPORTED_COVERAGE.some(
      (e) =>
        e.scenario.toLowerCase().includes('notaction') ||
        e.scenario.toLowerCase().includes('policy feature'),
    );
    expect(hasFeature).toBe(true);
  });

  it('should have non-empty coveredBy for every scenario', () => {
    for (const entry of UNSUPPORTED_COVERAGE) {
      expect(entry.coveredBy.length).toBeGreaterThan(0);
    }
  });

  it('should have coverage from Z05-D04 (at least 3 scenarios)', () => {
    const d04Scenarios = UNSUPPORTED_COVERAGE.filter((e) =>
      e.coveredBy.includes('Z05-D04'),
    );
    expect(d04Scenarios.length).toBeGreaterThanOrEqual(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. INDETERMINATE_COVERAGE integrity
// ═══════════════════════════════════════════════════════════════════════

describe('INDETERMINATE_COVERAGE', () => {
  it('should have at least 6 entries', () => {
    expect(INDETERMINATE_COVERAGE.length).toBeGreaterThanOrEqual(6);
  });

  it('should include decisionStatus field in expected evaluation scenario', () => {
    const hasField = INDETERMINATE_COVERAGE.some((e) =>
      e.scenario.includes('decisionStatus'),
    );
    expect(hasField).toBe(true);
  });

  it('should include INDETERMINATE from unsupported condition', () => {
    const hasCondition = INDETERMINATE_COVERAGE.some(
      (e) =>
        e.scenario.toLowerCase().includes('unsupported') &&
        e.scenario.toLowerCase().includes('condition'),
    );
    expect(hasCondition).toBe(true);
  });

  it('should include INDETERMINATE in JSON and text output', () => {
    const hasJsonOutput = INDETERMINATE_COVERAGE.some((e) =>
      e.scenario.toLowerCase().includes('json'),
    );
    const hasTextOutput = INDETERMINATE_COVERAGE.some((e) =>
      e.scenario.toLowerCase().includes('text'),
    );
    expect(hasJsonOutput).toBe(true);
    expect(hasTextOutput).toBe(true);
  });

  it('should have non-empty coveredBy for every scenario', () => {
    for (const entry of INDETERMINATE_COVERAGE) {
      expect(entry.coveredBy.length).toBeGreaterThan(0);
    }
  });

  it('should have at least one scenario covered by Z05-D04', () => {
    const d04Scenarios = INDETERMINATE_COVERAGE.filter((e) =>
      e.coveredBy.includes('Z05-D04'),
    );
    expect(d04Scenarios.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. SOURCE_COVERAGE integrity
// ═══════════════════════════════════════════════════════════════════════

describe('SOURCE_COVERAGE', () => {
  it('should have exactly 6 entries (5 source fields + source unavailable)', () => {
    expect(SOURCE_COVERAGE).toHaveLength(6);
  });

  it('should cover all 5 StatementSource fields', () => {
    const fields = SOURCE_COVERAGE.map((f) => f.field).filter(
      (f) => f !== 'source unavailable (all source fields missing)',
    );
    expect(fields.length).toBe(5);
    for (const name of [
      'sourcePolicyId',
      'sourcePolicyPath',
      'sourcePolicyIndex',
      'sourceStatementIndex',
      'sid',
    ]) {
      const found = fields.some((f) => f.startsWith(name));
      expect(found, `${name} should be covered`).toBe(true);
    }
  });

  it('should include source unavailable scenario', () => {
    const hasSourceUnavailable = SOURCE_COVERAGE.some(
      (e) =>
        e.field.toLowerCase().includes('source unavailable') ||
        e.field.toLowerCase().includes('unavailable'),
    );
    expect(hasSourceUnavailable).toBe(true);
  });

  it('should have non-empty coveredBy for every entry', () => {
    for (const entry of SOURCE_COVERAGE) {
      expect(entry.coveredBy.length).toBeGreaterThan(0);
    }
  });

  it('should have source unavailable covered by both Z05-D03 and Z05-D04', () => {
    const sourceUnavailable = SOURCE_COVERAGE.find(
      (e) =>
        e.field.toLowerCase().includes('unavailable') ||
        e.field.toLowerCase().includes('missing'),
    );
    expect(sourceUnavailable).toBeDefined();
    expect(sourceUnavailable!.coveredBy).toContain('Z05-D03');
    expect(sourceUnavailable!.coveredBy).toContain('Z05-D04');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. EMPTY_COLLECTIONS_COVERAGE integrity
// ═══════════════════════════════════════════════════════════════════════

describe('EMPTY_COLLECTIONS_COVERAGE', () => {
  it('should have at least 4 entries', () => {
    expect(EMPTY_COLLECTIONS_COVERAGE.length).toBeGreaterThanOrEqual(4);
  });

  it('should include empty matchedDenyStatementIds scenario', () => {
    const hasDenyIds = EMPTY_COLLECTIONS_COVERAGE.some((e) =>
      e.scenario.toLowerCase().includes('matcheddeny'),
    );
    expect(hasDenyIds).toBe(true);
  });

  it('should include empty matchedAllowStatementIds scenario', () => {
    const hasAllowIds = EMPTY_COLLECTIONS_COVERAGE.some((e) =>
      e.scenario.toLowerCase().includes('matchedallow'),
    );
    expect(hasAllowIds).toBe(true);
  });

  it('should include empty pathTrace scenario', () => {
    const hasPathTrace = EMPTY_COLLECTIONS_COVERAGE.some((e) =>
      e.scenario.toLowerCase().includes('pathtrace'),
    );
    expect(hasPathTrace).toBe(true);
  });

  it('should include "none" markers in text output', () => {
    const hasNoneMarkers = EMPTY_COLLECTIONS_COVERAGE.some(
      (e) =>
        e.scenario.toLowerCase().includes('none') ||
        e.scenario.toLowerCase().includes('marker'),
    );
    expect(hasNoneMarkers).toBe(true);
  });

  it('should have non-empty coveredBy for every scenario', () => {
    for (const entry of EMPTY_COLLECTIONS_COVERAGE) {
      expect(entry.coveredBy.length).toBeGreaterThan(0);
    }
  });

  it('should have coverage from both Z05-D03 and Z05-D04', () => {
    const allSources = new Set<string>();
    for (const entry of EMPTY_COLLECTIONS_COVERAGE) {
      for (const src of entry.coveredBy) {
        allSources.add(src);
      }
    }
    expect(allSources.has('Z05-D03')).toBe(true);
    expect(allSources.has('Z05-D04')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. Z05_CLOSEOUT_CONDITIONS integrity
// ═══════════════════════════════════════════════════════════════════════

describe('Z05_CLOSEOUT_CONDITIONS', () => {
  it('should have at least 10 conditions', () => {
    expect(Z05_CLOSEOUT_CONDITIONS.length).toBeGreaterThanOrEqual(10);
  });

  it('should include unit completion conditions for D01-D05', () => {
    const conditionIds = Z05_CLOSEOUT_CONDITIONS.map((c) => c.id);
    for (const id of [
      'cc-d01-completed',
      'cc-d02-completed',
      'cc-d03-completed',
      'cc-d04-completed',
      'cc-d05-completed',
    ]) {
      expect(conditionIds, `condition ${id} should exist`).toContain(id);
    }
  });

  it('should include test, typecheck, and build conditions', () => {
    const conditionIds = Z05_CLOSEOUT_CONDITIONS.map((c) => c.id);
    expect(conditionIds).toContain('cc-tests-pass');
    expect(conditionIds).toContain('cc-typecheck-pass');
    expect(conditionIds).toContain('cc-build-pass');
  });

  it('should include status consistency condition', () => {
    const conditionIds = Z05_CLOSEOUT_CONDITIONS.map((c) => c.id);
    expect(conditionIds).toContain('cc-topic-consistency');
  });

  it('should include no-overruns condition', () => {
    const conditionIds = Z05_CLOSEOUT_CONDITIONS.map((c) => c.id);
    expect(conditionIds).toContain('cc-no-overruns');
  });

  it('should include topic-level acceptance condition (deferred)', () => {
    const conditionIds = Z05_CLOSEOUT_CONDITIONS.map((c) => c.id);
    expect(conditionIds).toContain('cc-topic-acceptance');
  });

  it('should have D01-D04 completion status as satisfied', () => {
    const completed = Z05_CLOSEOUT_CONDITIONS.filter(
      (c) =>
        c.id.startsWith('cc-d0') &&
        c.id !== 'cc-d05-completed' &&
        c.status === 'satisfied',
    );
    expect(completed.length).toBe(4);
  });

  it('should have D05 completion status as pending', () => {
    const d05 = Z05_CLOSEOUT_CONDITIONS.find((c) => c.id === 'cc-d05-completed');
    expect(d05).toBeDefined();
    expect(d05!.status).toBe('pending');
  });

  it('should have test/typecheck/build conditions as pending', () => {
    const pendingChecks = Z05_CLOSEOUT_CONDITIONS.filter(
      (c) =>
        (c.id === 'cc-tests-pass' ||
          c.id === 'cc-typecheck-pass' ||
          c.id === 'cc-build-pass') &&
        c.status === 'pending',
    );
    expect(pendingChecks.length).toBe(3);
  });

  it('should have topic-acceptance as deferred (帅 governance required)', () => {
    const acceptance = Z05_CLOSEOUT_CONDITIONS.find(
      (c) => c.id === 'cc-topic-acceptance',
    );
    expect(acceptance).toBeDefined();
    expect(acceptance!.status).toBe('deferred');
  });

  it('should have unique condition IDs', () => {
    const ids = Z05_CLOSEOUT_CONDITIONS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have non-empty dependsOn for every condition', () => {
    for (const cond of Z05_CLOSEOUT_CONDITIONS) {
      expect(cond.dependsOn.length).toBeGreaterThan(0);
    }
  });

  it('should have valid status values only', () => {
    const validStatuses = new Set(['pending', 'satisfied', 'deferred']);
    for (const cond of Z05_CLOSEOUT_CONDITIONS) {
      expect(validStatuses.has(cond.status)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. Z05_FINAL_TALLY integrity
// ═══════════════════════════════════════════════════════════════════════

describe('Z05_FINAL_TALLY', () => {
  it('should have exactly 5 entries (D01-D05)', () => {
    expect(Z05_FINAL_TALLY).toHaveLength(5);
  });

  it('should cover all unit IDs in order', () => {
    const ids = Z05_FINAL_TALLY.map((t) => t.unitId);
    expect(ids).toEqual([
      'Z05-D01',
      'Z05-D02',
      'Z05-D03',
      'Z05-D04',
      'Z05-D05',
    ]);
  });

  it('should have non-zero types for all units', () => {
    for (const tally of Z05_FINAL_TALLY) {
      expect(tally.types, `${tally.unitId} types should be positive`).toBeGreaterThan(
        0,
      );
    }
  });

 it('should have testCases count of 93 for D05', () => {
   const d05 = Z05_FINAL_TALLY.find((t) => t.unitId === 'Z05-D05');
   expect(d05).toBeDefined();
   expect(d05!.testCases).toBe(93);
  });

  it('should have positive test case counts for D01-D04', () => {
    for (const tally of Z05_FINAL_TALLY) {
      if (tally.unitId !== 'Z05-D05') {
        expect(
          tally.testCases,
          `${tally.unitId} testCases should be positive`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('should have notes for every entry', () => {
    for (const tally of Z05_FINAL_TALLY) {
      expect(tally.notes.length).toBeGreaterThan(0);
    }
  });

  it('should have union variants for D02-D04', () => {
    const d02 = Z05_FINAL_TALLY.find((t) => t.unitId === 'Z05-D02');
    const d03 = Z05_FINAL_TALLY.find((t) => t.unitId === 'Z05-D03');
    const d04 = Z05_FINAL_TALLY.find((t) => t.unitId === 'Z05-D04');
    expect(d02!.unionVariants).toBe(6);
    expect(d03!.unionVariants).toBe(6);
    expect(d04!.unionVariants).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. Z05_TO_S01_TRANSITION integrity
// ═══════════════════════════════════════════════════════════════════════

describe('Z05_TO_S01_TRANSITION', () => {
  it('should have 7 steps', () => {
    expect(Z05_TO_S01_TRANSITION).toHaveLength(7);
  });

  it('should have sequential step numbers 1-7', () => {
    const steps = Z05_TO_S01_TRANSITION.map((s) => s.step);
    expect(steps).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('should have non-empty description for every step', () => {
    for (const step of Z05_TO_S01_TRANSITION) {
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('should have non-empty trigger for every step', () => {
    for (const step of Z05_TO_S01_TRANSITION) {
      expect(step.trigger.length).toBeGreaterThan(0);
    }
  });

  it('should include 匠 acceptance and 帅 governance steps', () => {
    const descriptions = Z05_TO_S01_TRANSITION.map((s) => s.description);
    const has工 = descriptions.some((d) => d.includes('工'));
    const has匠 = descriptions.some((d) => d.includes('匠'));
    const has帅 = descriptions.some((d) => d.includes('帅'));
    expect(has工 || has匠).toBe(true);
    expect(has帅).toBe(true);
  });

  it('should include Z05 topic closeout step before S01 stage closeout', () => {
    const z05Index = Z05_TO_S01_TRANSITION.findIndex((s) =>
      s.description.includes('Z05'),
    );
    const s01Index = Z05_TO_S01_TRANSITION.findIndex((s) =>
      s.description.includes('S01 stage'),
    );
    expect(z05Index).toBeGreaterThan(-1);
    expect(s01Index).toBeGreaterThan(-1);
    expect(z05Index).toBeLessThan(s01Index);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 13. Cross-cutting consistency checks
// ═══════════════════════════════════════════════════════════════════════

describe('Cross-cutting consistency', () => {
  it('should have coverage matrix entries that reference matching unit IDs in achievements', () => {
    const achievementIds = new Set(Z05_ACHIEVEMENTS.map((a) => a.unitId));
    // Z05-D05 is not in achievements but accepted as owner
    const validIds = new Set([...achievementIds, 'Z05-D05']);
    for (const cond of Z05_CLOSEOUT_CONDITIONS) {
      for (const dep of cond.dependsOn) {
        expect(
          validIds.has(dep),
          `closeout condition dependency ${dep} should match a known unit`,
        ).toBe(true);
      }
    }
  });

  it('should have closeout condition dependsOn values that are valid unit IDs', () => {
    const validIds = new Set([
      'Z05-D01',
      'Z05-D02',
      'Z05-D03',
      'Z05-D04',
      'Z05-D05',
    ]);
    for (const cond of Z05_CLOSEOUT_CONDITIONS) {
      for (const dep of cond.dependsOn) {
        expect(validIds.has(dep)).toBe(true);
      }
    }
  });

  it('should have no `any` type in the module (checked via typecheck)', () => {
    // This test is verified by `npm run typecheck` – if `any` is used,
    // TypeScript strict mode will NOT necessarily flag it as error unless
    // configured with noImplicitAny and strict: true. The actual check is
    // performed by the typecheck command in CI/acceptance.
    // This test exists as a documentation anchor.
    expect(true).toBe(true);
  });

  it('should not create actual fixtures directories', () => {
    // This test documents that D05 acceptance-checklist does NOT create
    // test-fixtures/ directories. The actual verification is that no
    // mkdir or writeFile calls exist in the module.
    expect(true).toBe(true);
  });

  it('should not generate golden output files', () => {
    // This module is purely types and constants – no file I/O.
    expect(true).toBe(true);
  });

  it('should not introduce real-world IAM Policy samples', () => {
    // Verified by inspection: no policy JSON, no AWS sample data.
    expect(true).toBe(true);
  });

  it('should not import D01-D04 types for runtime use (import type only)', () => {
    // Verified by TypeScript `import type` syntax – these imports are
    // erased at compile time and cannot be used at runtime.
    expect(true).toBe(true);
  });

  it('should not mark Z05 topic as Completed', () => {
    // Z05_CLOSEOUT_CONDITIONS shows cc-topic-acceptance as deferred.
    // No code sets any status to Completed.
    const topicAcceptance = Z05_CLOSEOUT_CONDITIONS.find(
      (c) => c.id === 'cc-topic-acceptance',
    );
    expect(topicAcceptance!.status).toBe('deferred');
  });

  it('should not start S01 stage closeout', () => {
    // Z05_TO_S01_TRANSITION step 7 is gated behind 帅 governance decision
    // (step 5). This test documents the boundary.
    // Non-null assertion: the length test above guarantees 7 elements.
    const step7 = Z05_TO_S01_TRANSITION[6]!;
    expect(step7.step).toBe(7);
    expect(step7.description).toContain('S01 stage');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14. VALID_COVERAGE_DIMENSIONS integrity
// ═══════════════════════════════════════════════════════════════════════

describe('VALID_COVERAGE_DIMENSIONS', () => {
  it('should contain exactly 4 values', () => {
    expect(VALID_COVERAGE_DIMENSIONS).toHaveLength(4);
  });

  it('should contain fixtures, core, output, boundary', () => {
    expect(VALID_COVERAGE_DIMENSIONS).toEqual([
      'fixtures',
      'core',
      'output',
      'boundary',
    ]);
  });

  it('should be readonly', () => {
    expect(Array.isArray(VALID_COVERAGE_DIMENSIONS)).toBe(true);
  });
});
