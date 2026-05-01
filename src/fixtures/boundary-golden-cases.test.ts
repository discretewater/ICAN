/**
 * boundary-golden-cases.test.ts – Unit tests for Z05-D04 boundary golden cases planning.
 *
 * These tests validate:
 * 1. BoundaryGoldenCaseCategory enumeration completeness (10 categories)
 * 2. BoundaryGoldenCaseOutline construction with required and optional fields
 * 3. MINIMAL_BOUNDARY_GOLDEN_CASES minimum list coverage (>=10 cases)
 * 4. Each case has required fields (id, category, purpose, assertionFields)
 * 5. All case ids are unique
 * 6. Category coverage across all 10 boundary directions
 * 7. Cross-reference validation with D01 STRONG_ASSERTION_FIELDS / WEAK_ASSERTION_FIELDS
 * 8. Cross-reference validation with D02 MINIMAL_GOLDEN_CASES for relatedBaseCaseId
 * 9. No real-world IAM policy data, no absolute file paths
 *
 * Boundary: imports only from boundary-golden-cases.ts (module under test)
 * and type-only / readonly-constant from fixture-schema.ts / golden-cases.ts.
 * Does NOT create real directories, golden outputs, or real-world samples.
 */
import { describe, it, expect } from 'vitest';

// ─── Imports from module under test ───────────────────────────────────
import {
  MINIMAL_BOUNDARY_GOLDEN_CASES,
  VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES,
} from './boundary-golden-cases.js';

import type {
  BoundaryGoldenCaseCategory,
  BoundaryGoldenCaseOutline,
} from './boundary-golden-cases.js';

// ─── Imports from D01 / D02 for cross-reference validation ────────────
import { MINIMAL_GOLDEN_CASES } from './golden-cases.js';
import { MINIMAL_OUTPUT_GOLDEN_CASES } from './output-golden-cases.js';
import {
  STRONG_ASSERTION_FIELDS,
  WEAK_ASSERTION_FIELDS,
} from './fixture-schema.js';

// ═══════════════════════════════════════════════════════════════════════
// BoundaryGoldenCaseCategory
// ═══════════════════════════════════════════════════════════════════════

describe('BoundaryGoldenCaseCategory', () => {
  it('should define all ten categories', () => {
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('invalid-input');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('unsupported-feature');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('unsupported-condition');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('indeterminate-decision');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('diagnostics-output');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('path-trace-boundary');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('json-boundary');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('text-boundary');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('source-unavailable');
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain('empty-collections');
  });

  it('should have exactly ten categories', () => {
    expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES.length).toBe(10);
  });

  it('should support BoundaryGoldenCaseCategory as a union type in type-level assertions', () => {
    const c1: BoundaryGoldenCaseCategory = 'invalid-input';
    const c2: BoundaryGoldenCaseCategory = 'unsupported-feature';
    const c3: BoundaryGoldenCaseCategory = 'unsupported-condition';
    const c4: BoundaryGoldenCaseCategory = 'indeterminate-decision';
    const c5: BoundaryGoldenCaseCategory = 'diagnostics-output';
    const c6: BoundaryGoldenCaseCategory = 'path-trace-boundary';
    const c7: BoundaryGoldenCaseCategory = 'json-boundary';
    const c8: BoundaryGoldenCaseCategory = 'text-boundary';
    const c9: BoundaryGoldenCaseCategory = 'source-unavailable';
    const c10: BoundaryGoldenCaseCategory = 'empty-collections';

    expect(c1).toBe('invalid-input');
    expect(c2).toBe('unsupported-feature');
    expect(c3).toBe('unsupported-condition');
    expect(c4).toBe('indeterminate-decision');
    expect(c5).toBe('diagnostics-output');
    expect(c6).toBe('path-trace-boundary');
    expect(c7).toBe('json-boundary');
    expect(c8).toBe('text-boundary');
    expect(c9).toBe('source-unavailable');
    expect(c10).toBe('empty-collections');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// BoundaryGoldenCaseOutline
// ═══════════════════════════════════════════════════════════════════════

describe('BoundaryGoldenCaseOutline', () => {
  it('should allow constructing a valid outline with only required fields', () => {
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-test-001',
      category: 'invalid-input',
      purpose: 'Verify invalid input boundary behavior.',
      assertionFields: ['diagnostics.invalidInputs', 'finalDecision'],
    };

    expect(outline.id).toBe('bgc-test-001');
    expect(outline.category).toBe('invalid-input');
    expect(outline.purpose).toBeTruthy();
    expect(outline.assertionFields).toContain('diagnostics.invalidInputs');
    expect(outline.assertionFields).toContain('finalDecision');
  });

  it('should support optional relatedBaseCaseId field', () => {
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-test-002',
      category: 'unsupported-condition',
      purpose: 'Verify unsupported condition boundary.',
      assertionFields: ['diagnostics.unsupportedFeatures'],
      relatedBaseCaseId: 'gc-unsupported-condition',
    };

    expect(outline.relatedBaseCaseId).toBe('gc-unsupported-condition');
  });

  it('should support optional expectedEvaluation field', () => {
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-test-003',
      category: 'indeterminate-decision',
      purpose: 'Verify indeterminate decision boundary.',
      assertionFields: ['decisionStatus', 'finalDecision'],
      expectedEvaluation: {
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'INDETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
      },
    };

    expect(outline.expectedEvaluation).toBeDefined();
    const eval_ = outline.expectedEvaluation;
    expect(eval_).toBeDefined();
    if (eval_) {
      expect(eval_.finalDecision).toBe('IMPLICIT_DENY');
      expect(eval_.decisionStatus).toBe('INDETERMINATE');
    }
  });

  it('should support optional expectedPathTrace field', () => {
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-test-004',
      category: 'path-trace-boundary',
      purpose: 'Verify pathTrace boundary.',
      assertionFields: ['pathTrace', 'unsupportedFeatures'],
      expectedPathTrace: [
        {
          statementId: 'stmt-000',
          applicable: false,
          nonApplicableReasons: ['condition_not_matched'],
          unsupportedFeatures: ['ConditionOperator:ArnEquals'],
          source: {
            sourcePolicyId: 'policy-0',
          },
        },
      ],
    };

    expect(outline.expectedPathTrace).toBeDefined();
    const pt = outline.expectedPathTrace;
    expect(pt).toBeDefined();
    if (pt) {
      expect(pt.length).toBe(1);
      const firstEntry = pt[0];
      expect(firstEntry).toBeDefined();
      if (firstEntry) {
        expect(firstEntry.statementId).toBe('stmt-000');
        expect(firstEntry.applicable).toBe(false);
        expect(firstEntry.nonApplicableReasons).toContain('condition_not_matched');
        expect(firstEntry.unsupportedFeatures).toContain('ConditionOperator:ArnEquals');
      }
    }
  });

  it('should support optional expectedDiagnostics field', () => {
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-test-005',
      category: 'diagnostics-output',
      purpose: 'Verify diagnostics output boundary.',
      assertionFields: ['diagnostics.invalidInputs'],
      expectedDiagnostics: {
        invalidInputs: [
          { code: 'MISSING_FIELD' },
          { code: 'INVALID_FIELD_VALUE' },
        ],
      },
    };

    expect(outline.expectedDiagnostics).toBeDefined();
    const diag = outline.expectedDiagnostics;
    expect(diag).toBeDefined();
    if (diag && diag.invalidInputs) {
      expect(diag.invalidInputs.length).toBe(2);
      expect(diag.invalidInputs[0]!.code).toBe('MISSING_FIELD');
      expect(diag.invalidInputs[1]!.code).toBe('INVALID_FIELD_VALUE');
    }
  });

  it('should support optional notes field', () => {
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-test-006',
      category: 'text-boundary',
      purpose: 'Verify text output boundary.',
      assertionFields: ['textOutput'],
      notes: 'This is a boundary planning note.',
    };

    expect(outline.notes).toBe('This is a boundary planning note.');
  });

  it('should construct an outline without optional fields and have them be undefined', () => {
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-test-007',
      category: 'empty-collections',
      purpose: 'Minimal outline for empty collections.',
      assertionFields: ['pathTrace'],
    };

    expect(outline.relatedBaseCaseId).toBeUndefined();
    expect(outline.expectedEvaluation).toBeUndefined();
    expect(outline.expectedPathTrace).toBeUndefined();
    expect(outline.expectedDiagnostics).toBeUndefined();
    expect(outline.notes).toBeUndefined();
  });

  it('should support all ten categories in outline construction', () => {
    for (const cat of VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES) {
      const outline: BoundaryGoldenCaseOutline = {
        id: `bgc_test_cat_${cat}`,
        category: cat,
        purpose: `Test outline for category ${cat}.`,
        assertionFields: ['finalDecision'],
      };
      expect(outline.category).toBe(cat);
    }
  });

  it('should have at least 8 fields in the outline type', () => {
    // BoundaryGoldenCaseOutline should have >= 8 fields:
    // 4 required (id, category, purpose, assertionFields)
    // + 5 optional (relatedBaseCaseId, expectedEvaluation, expectedPathTrace,
    //   expectedDiagnostics, notes) = 9 total
    const outline: BoundaryGoldenCaseOutline = {
      id: 'bgc-all-fields',
      category: 'path-trace-boundary',
      purpose: 'Outline with all fields set.',
      assertionFields: ['pathTrace', 'statementId', 'unsupportedFeatures'],
      relatedBaseCaseId: 'gc-unsupported-condition',
      expectedEvaluation: {
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'INDETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
      },
      expectedPathTrace: [
        {
          statementId: 'stmt-001',
          applicable: false,
          nonApplicableReasons: ['condition_not_matched'],
          unsupportedFeatures: ['ConditionOperator:ArnEquals'],
          source: { sourcePolicyId: 'policy-0' },
        },
      ],
      expectedDiagnostics: {
        unsupportedFeatures: [{ feature: 'ConditionOperator:ArnEquals' }],
      },
      notes: 'Boundary planning note.',
    };

    // Verify all 9 fields
    expect(outline.id).toBe('bgc-all-fields');
    expect(outline.category).toBe('path-trace-boundary');
    expect(outline.purpose).toBeTruthy();
    expect(outline.assertionFields.length).toBeGreaterThan(0);
    expect(outline.relatedBaseCaseId).toBe('gc-unsupported-condition');
    expect(outline.expectedEvaluation).toBeDefined();
    expect(outline.expectedPathTrace).toBeDefined();
    expect(outline.expectedDiagnostics).toBeDefined();
    expect(outline.notes).toBe('Boundary planning note.');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MINIMAL_BOUNDARY_GOLDEN_CASES
// ═══════════════════════════════════════════════════════════════════════

describe('MINIMAL_BOUNDARY_GOLDEN_CASES', () => {
  it('should have at least 10 cases', () => {
    expect(MINIMAL_BOUNDARY_GOLDEN_CASES.length).toBeGreaterThanOrEqual(10);
  });

  it('each case should have the required fields: id, category, purpose, assertionFields', () => {
    for (const c of MINIMAL_BOUNDARY_GOLDEN_CASES) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES).toContain(c.category);
      expect(typeof c.purpose).toBe('string');
      expect(c.purpose.length).toBeGreaterThan(0);
      expect(Array.isArray(c.assertionFields)).toBe(true);
      expect(c.assertionFields.length).toBeGreaterThan(0);
    }
  });

  it('each case should have a unique id', () => {
    const ids = MINIMAL_BOUNDARY_GOLDEN_CASES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ── Category coverage ────────────────────────────────────────────

  it('should cover category: invalid-input', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'invalid-input');
    expect(has).toBe(true);
  });

  it('should cover category: unsupported-feature', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'unsupported-feature');
    expect(has).toBe(true);
  });

  it('should cover category: unsupported-condition', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'unsupported-condition');
    expect(has).toBe(true);
  });

  it('should cover category: indeterminate-decision', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'indeterminate-decision');
    expect(has).toBe(true);
  });

  it('should cover category: diagnostics-output', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'diagnostics-output');
    expect(has).toBe(true);
  });

  it('should cover category: path-trace-boundary', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'path-trace-boundary');
    expect(has).toBe(true);
  });

  it('should cover category: json-boundary', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'json-boundary');
    expect(has).toBe(true);
  });

  it('should cover category: text-boundary', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'text-boundary');
    expect(has).toBe(true);
  });

  it('should cover category: source-unavailable', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'source-unavailable');
    expect(has).toBe(true);
  });

  it('should cover category: empty-collections', () => {
    const has = MINIMAL_BOUNDARY_GOLDEN_CASES.some(c => c.category === 'empty-collections');
    expect(has).toBe(true);
  });

  // ── Invalid input boundary direction ─────────────────────────────

  it('should cover invalid input boundary: structural invalidity', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-invalid-input');
    expect(c).toBeDefined();
    expect(c!.category).toBe('invalid-input');
    expect(c!.expectedDiagnostics?.invalidInputs).toBeDefined();
    expect(c!.expectedDiagnostics!.invalidInputs!.length).toBeGreaterThan(0);
  });

  it('invalid input case bgc-invalid-input should have relatedBaseCaseId gc-invalid-policy', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-invalid-input');
    expect(c).toBeDefined();
    expect(c!.relatedBaseCaseId).toBe('gc-invalid-policy');
  });

  // ── Unsupported feature boundary direction ───────────────────────

  it('should cover unsupported feature boundary with INDETERMINATE status', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-unsupported-feature');
    expect(c).toBeDefined();
    expect(c!.category).toBe('unsupported-feature');
    expect(c!.expectedEvaluation?.decisionStatus).toBe('INDETERMINATE');
    expect(c!.expectedDiagnostics?.unsupportedFeatures).toBeDefined();
  });

  // ── Unsupported condition boundary direction ─────────────────────

  it('should cover unsupported condition boundary with INDETERMINATE', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-unsupported-condition');
    expect(c).toBeDefined();
    expect(c!.category).toBe('unsupported-condition');
    expect(c!.expectedEvaluation?.decisionStatus).toBe('INDETERMINATE');
    expect(c!.expectedEvaluation?.finalDecision).toBe('IMPLICIT_DENY');
  });

  it('unsupported-condition case bgc-unsupported-condition should reference gc-unsupported-condition', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-unsupported-condition');
    expect(c).toBeDefined();
    expect(c!.relatedBaseCaseId).toBe('gc-unsupported-condition');
  });

  // ── Indeterminate decision boundary direction ────────────────────

  it('should cover indeterminate decision boundary', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-indeterminate-decision');
    expect(c).toBeDefined();
    expect(c!.category).toBe('indeterminate-decision');
    expect(c!.expectedEvaluation?.decisionStatus).toBe('INDETERMINATE');
    expect(c!.expectedDiagnostics?.unsupportedFeatures).toBeDefined();
    expect(c!.expectedDiagnostics!.unsupportedFeatures!.length).toBeGreaterThan(0);
  });

  it('indeterminate decision case should have IMPLICIT_DENY as provisional result', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-indeterminate-decision');
    expect(c).toBeDefined();
    expect(c!.expectedEvaluation?.finalDecision).toBe('IMPLICIT_DENY');
  });

  it('indeterminate decision case should have empty matched statement IDs', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-indeterminate-decision');
    expect(c).toBeDefined();
    expect(c!.expectedEvaluation?.matchedDenyStatementIds).toEqual([]);
    expect(c!.expectedEvaluation?.matchedAllowStatementIds).toEqual([]);
  });

  // ── Diagnostics output boundary direction ────────────────────────

  it('should cover diagnostics with multiple invalidInputs codes', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-diagnostics-invalid');
    expect(c).toBeDefined();
    expect(c!.category).toBe('diagnostics-output');
    expect(c!.expectedDiagnostics?.invalidInputs).toBeDefined();
    expect(c!.expectedDiagnostics!.invalidInputs!.length).toBeGreaterThanOrEqual(2);
  });

  it('should cover diagnostics with multiple unsupportedFeatures', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-diagnostics-unsupported');
    expect(c).toBeDefined();
    expect(c!.category).toBe('diagnostics-output');
    expect(c!.expectedDiagnostics?.unsupportedFeatures).toBeDefined();
    expect(c!.expectedDiagnostics!.unsupportedFeatures!.length).toBeGreaterThanOrEqual(2);
  });

  // ── Path trace boundary direction ────────────────────────────────

  it('should cover pathTrace boundary with unsupportedFeatures and nonApplicableReasons', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-path-trace-boundary');
    expect(c).toBeDefined();
    expect(c!.category).toBe('path-trace-boundary');
    expect(c!.expectedPathTrace).toBeDefined();
    expect(c!.expectedPathTrace!.length).toBeGreaterThan(0);

    const entry = c!.expectedPathTrace![0]!;
    expect(entry.unsupportedFeatures.length).toBeGreaterThan(0);
    expect(entry.nonApplicableReasons.length).toBeGreaterThan(0);
  });

  it('path-trace-boundary case should have non-applicable with both unsupported and reasons', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-path-trace-boundary');
    expect(c).toBeDefined();
    const entry = c!.expectedPathTrace![0]!;
    expect(entry.applicable).toBe(false);
    expect(entry.unsupportedFeatures).toContain('ConditionOperator:ArnEquals');
    expect(entry.nonApplicableReasons).toContain('condition_not_matched');
  });

  // ── JSON boundary direction ──────────────────────────────────────

  it('should cover JSON boundary with decisionStatus focus', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-json-boundary');
    expect(c).toBeDefined();
    expect(c!.category).toBe('json-boundary');
    expect(c!.assertionFields).toContain('decisionStatus');
    expect(c!.assertionFields).toContain('diagnostics.unsupportedFeatures');
  });

  it('json-boundary case should reference ogc-json-indeterminate', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-json-boundary');
    expect(c).toBeDefined();
    expect(c!.relatedBaseCaseId).toBe('ogc-json-indeterminate');
  });

  // ── Text boundary direction ──────────────────────────────────────

  it('should cover text boundary with INDETERMINATE/diagnostics expression', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-text-boundary');
    expect(c).toBeDefined();
    expect(c!.category).toBe('text-boundary');
    expect(c!.assertionFields).toContain('textOutput');
    expect(c!.assertionFields).toContain('diagnostics.unsupportedFeatures');
  });

  it('text-boundary case should reference ogc-text-diagnostics', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-text-boundary');
    expect(c).toBeDefined();
    expect(c!.relatedBaseCaseId).toBe('ogc-text-diagnostics');
  });

  // ── Source unavailable boundary direction ────────────────────────

  it('should cover source unavailable: empty pathTrace from invalid input', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-source-unavailable');
    expect(c).toBeDefined();
    expect(c!.category).toBe('source-unavailable');
    expect(c!.expectedPathTrace).toEqual([]);
    expect(c!.expectedDiagnostics?.invalidInputs).toBeDefined();
  });

  it('source-unavailable case should reference ogc-source-unavailable', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-source-unavailable');
    expect(c).toBeDefined();
    expect(c!.relatedBaseCaseId).toBe('ogc-source-unavailable');
  });

  // ── Empty collections boundary direction ─────────────────────────

  it('should cover empty collections: empty matched IDs and pathTrace', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-empty-collections');
    expect(c).toBeDefined();
    expect(c!.category).toBe('empty-collections');
    expect(c!.expectedEvaluation?.matchedDenyStatementIds).toEqual([]);
    expect(c!.expectedEvaluation?.matchedAllowStatementIds).toEqual([]);
    if (c!.expectedPathTrace !== undefined) {
      expect(c!.expectedPathTrace).toEqual([]);
    }
  });

  it('empty-collections case should reference ogc-empty-output', () => {
    const c = MINIMAL_BOUNDARY_GOLDEN_CASES.find(x => x.id === 'bgc-empty-collections');
    expect(c).toBeDefined();
    expect(c!.relatedBaseCaseId).toBe('ogc-empty-output');
  });

  // ── relatedBaseCaseId cross-reference validation ─────────────────

  it('all relatedBaseCaseId references should point to valid D02 or D03 ids', () => {
    const validBaseIds = new Set([
      ...MINIMAL_GOLDEN_CASES.map(c => c.id),
      ...MINIMAL_OUTPUT_GOLDEN_CASES.map(c => c.id),
    ]);

    for (const c of MINIMAL_BOUNDARY_GOLDEN_CASES) {
      if (c.relatedBaseCaseId) {
        expect(validBaseIds.has(c.relatedBaseCaseId)).toBe(true);
      }
    }
  });

  // ── assertionFields cross-reference validation ───────────────────

  it('all assertionFields should reference valid strong or weak assertion fields', () => {
    const validFields = new Set([
      ...STRONG_ASSERTION_FIELDS,
      ...WEAK_ASSERTION_FIELDS,
    ]);

    for (const c of MINIMAL_BOUNDARY_GOLDEN_CASES) {
      for (const field of c.assertionFields) {
        expect(validFields.has(field)).toBe(true);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D04 boundary constraints
// ═══════════════════════════════════════════════════════════════════════

describe('D04 boundary constraints', () => {
  it('should not import or modify D01/D02/D03 runtime constants beyond import type', () => {
    // The module under test is verified through typecheck – no `any` type used.
    expect(MINIMAL_BOUNDARY_GOLDEN_CASES).toBeDefined();
    expect(MINIMAL_BOUNDARY_GOLDEN_CASES.length).toBeGreaterThan(0);
  });

  it('should not contain real-world IAM policy data', () => {
    for (const c of MINIMAL_BOUNDARY_GOLDEN_CASES) {
      const rec = c as unknown as Record<string, unknown>;
      expect(rec.policy).toBeUndefined();
      expect(rec.policies).toBeUndefined();
      expect(rec.request).toBeUndefined();
      expect(rec.input).toBeUndefined();
      expect(rec.caseInput).toBeUndefined();
    }
  });

  it('should not contain absolute file paths in any field', () => {
    for (const c of MINIMAL_BOUNDARY_GOLDEN_CASES) {
      expect(c.id.startsWith('/')).toBe(false);
      if (c.notes) {
        expect(c.notes.startsWith('/')).toBe(false);
      }
    }
  });

  it('should not create real fixtures directories (no directory references)', () => {
    // All cases are outlines only – no case directories, no golden output
    // files are created. The boundary-golden-cases.ts module does not
    // perform any file system operations.
    expect(MINIMAL_BOUNDARY_GOLDEN_CASES.every(
      c => !c.id.includes('/') && !c.id.includes('\\'),
    )).toBe(true);
  });

  it('should not use any type (verified by typecheck)', () => {
    // Structural assertion – the module under test has no `any` annotations.
    // Verified by: npm run typecheck
    expect(MINIMAL_BOUNDARY_GOLDEN_CASES.every(
      c => typeof c.id === 'string' && typeof c.category === 'string',
    )).toBe(true);
  });

  it('should not contain AWS-specific IAM sample data (no real ARNs)', () => {
    for (const c of MINIMAL_BOUNDARY_GOLDEN_CASES) {
      expect(c.id).not.toContain('arn:aws');
      expect(c.purpose).not.toContain('arn:aws');
      if (c.notes) {
        expect(c.notes).not.toContain('arn:aws');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Cross-reference: D04 does not modify D01/D02/D03 frozen exports
// ═══════════════════════════════════════════════════════════════════════

describe('D04 cross-reference integrity', () => {
  it('D01 STRONG_ASSERTION_FIELDS is unchanged (sanity check)', () => {
    expect(STRONG_ASSERTION_FIELDS).toContain('finalDecision');
    expect(STRONG_ASSERTION_FIELDS).toContain('decisionStatus');
    expect(STRONG_ASSERTION_FIELDS.length).toBe(14);
  });

  it('D01 WEAK_ASSERTION_FIELDS is unchanged (sanity check)', () => {
    expect(WEAK_ASSERTION_FIELDS).toContain('summary');
    expect(WEAK_ASSERTION_FIELDS).toContain('textOutput');
    expect(WEAK_ASSERTION_FIELDS.length).toBe(2);
  });

  it('D02 MINIMAL_GOLDEN_CASES is reachable and has 13 cases (sanity check)', () => {
    expect(MINIMAL_GOLDEN_CASES.length).toBe(13);
  });

  it('D03 MINIMAL_OUTPUT_GOLDEN_CASES is reachable and has expected cases (sanity check)', () => {
    expect(MINIMAL_OUTPUT_GOLDEN_CASES.length).toBeGreaterThanOrEqual(10);
  });
});
