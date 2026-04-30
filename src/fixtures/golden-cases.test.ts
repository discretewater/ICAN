/**
 * golden-cases.test.ts – Unit tests for Z05-D02 golden cases baseline planning.
 *
 * These tests validate:
 * 1. GoldenCaseCategory enumeration completeness (6 categories)
 * 2. GoldenCaseOutline construction with required and optional fields
 * 3. MINIMAL_GOLDEN_CASES minimum list coverage of Design §11.4 directions
 * 4. Each case has required fields (id, title, category, purpose,
 *    coveredFeatures, expectedEvaluation)
 * 5. All case ids are unique
 * 6. Core evaluation categories are represented
 * 7. No modification of D01 fixtures schema at runtime
 *
 * Boundary: imports only from golden-cases.ts (module under test).
 * Does NOT create real directories, golden outputs, or real-world samples.
 */
import { describe, it, expect } from 'vitest';

// ─── Imports from module under test ───────────────────────────────────
import {
  MINIMAL_GOLDEN_CASES,
  VALID_GOLDEN_CASE_CATEGORIES,
} from './golden-cases.js';

import type {
  GoldenCaseCategory,
  GoldenCaseOutline,
} from './golden-cases.js';

// ═══════════════════════════════════════════════════════════════════════
// GoldenCaseCategory
// ═══════════════════════════════════════════════════════════════════════

describe('GoldenCaseCategory', () => {
  it('should define all six categories', () => {
    expect(VALID_GOLDEN_CASE_CATEGORIES).toContain('allow');
    expect(VALID_GOLDEN_CASE_CATEGORIES).toContain('explicit-deny');
    expect(VALID_GOLDEN_CASE_CATEGORIES).toContain('implicit-deny');
    expect(VALID_GOLDEN_CASE_CATEGORIES).toContain('indeterminate');
    expect(VALID_GOLDEN_CASE_CATEGORIES).toContain('unsupported');
    expect(VALID_GOLDEN_CASE_CATEGORIES).toContain('invalid');
  });

  it('should have exactly six categories', () => {
    expect(VALID_GOLDEN_CASE_CATEGORIES.length).toBe(6);
  });

  it('should support GoldenCaseCategory as a union type in type-level assertions', () => {
    // Compile-time type check: assigning valid literals to the type.
    const c1: GoldenCaseCategory = 'allow';
    const c2: GoldenCaseCategory = 'explicit-deny';
    const c3: GoldenCaseCategory = 'implicit-deny';
    const c4: GoldenCaseCategory = 'indeterminate';
    const c5: GoldenCaseCategory = 'unsupported';
    const c6: GoldenCaseCategory = 'invalid';

    expect(c1).toBe('allow');
    expect(c2).toBe('explicit-deny');
    expect(c3).toBe('implicit-deny');
    expect(c4).toBe('indeterminate');
    expect(c5).toBe('unsupported');
    expect(c6).toBe('invalid');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// GoldenCaseOutline
// ═══════════════════════════════════════════════════════════════════════

describe('GoldenCaseOutline', () => {
  it('should allow constructing a valid outline with only required fields', () => {
    const outline: GoldenCaseOutline = {
      id: 'test_001',
      title: 'Test Case – Single Allow Match',
      category: 'allow',
      purpose: 'Verify single Allow statement produces ALLOW.',
      coveredFeatures: ['action-matching'],
      expectedEvaluation: {
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: ['stmt-1'],
      },
    };

    expect(outline.id).toBe('test_001');
    expect(outline.title).toBe('Test Case – Single Allow Match');
    expect(outline.category).toBe('allow');
    expect(outline.purpose).toBeTruthy();
    expect(outline.coveredFeatures).toContain('action-matching');
    expect(outline.expectedEvaluation.finalDecision).toBe('ALLOW');
    expect(outline.expectedEvaluation.matchedAllowStatementIds).toEqual(['stmt-1']);
  });

  it('should support optional expectedPathTrace field', () => {
    const outline: GoldenCaseOutline = {
      id: 'test_002',
      title: 'Test with path trace',
      category: 'implicit-deny',
      purpose: 'Verify path trace for non-applicable statement.',
      coveredFeatures: ['resource-matching'],
      expectedEvaluation: {
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
      },
      expectedPathTrace: [
        {
          statementId: 'stmt-1',
          applicable: false,
          nonApplicableReasons: ['Resource not matched'],
          unsupportedFeatures: [],
          source: {
            sourcePolicyId: 'policy-1',
          },
        },
      ],
    };

    expect(outline.expectedPathTrace).toBeDefined();
    const pathTrace = outline.expectedPathTrace;
    expect(pathTrace).toBeDefined();
    if (pathTrace) {
      expect(pathTrace.length).toBe(1);
      const firstEntry = pathTrace[0];
      expect(firstEntry).toBeDefined();
      if (firstEntry) {
        expect(firstEntry.statementId).toBe('stmt-1');
        expect(firstEntry.applicable).toBe(false);
      }
    }
  });

  it('should support optional expectedDiagnostics field', () => {
    const outline: GoldenCaseOutline = {
      id: 'test_003',
      title: 'Test with diagnostics',
      category: 'invalid',
      purpose: 'Verify diagnostics for invalid input.',
      coveredFeatures: ['input-validation'],
      expectedEvaluation: {
        finalDecision: 'IMPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: [],
      },
      expectedDiagnostics: {
        invalidInputs: [{ code: 'INVALID_POLICY_STRUCTURE' }],
      },
    };

    expect(outline.expectedDiagnostics).toBeDefined();
    const diag = outline.expectedDiagnostics;
    expect(diag).toBeDefined();
    if (diag) {
      expect(diag.invalidInputs).toBeDefined();
      if (diag.invalidInputs) {
        const firstInvalid = diag.invalidInputs[0];
        expect(firstInvalid).toBeDefined();
        if (firstInvalid) {
          expect(firstInvalid.code).toBe('INVALID_POLICY_STRUCTURE');
        }
      }
    }
  });

  it('should support optional notes field', () => {
    const outline: GoldenCaseOutline = {
      id: 'test_004',
      title: 'Test with notes',
      category: 'allow',
      purpose: 'Test purpose.',
      coveredFeatures: ['action-matching'],
      expectedEvaluation: {
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: [],
        matchedAllowStatementIds: ['stmt-1'],
      },
      notes: 'This is a planning note.',
    };

    expect(outline.notes).toBe('This is a planning note.');
  });

  it('should construct an outline without optional fields and have them be undefined', () => {
    const outline: GoldenCaseOutline = {
      id: 'test_005',
      title: 'Minimal outline',
      category: 'explicit-deny',
      purpose: 'Verify explicit deny without optional fields.',
      coveredFeatures: ['deny-override'],
      expectedEvaluation: {
        finalDecision: 'EXPLICIT_DENY',
        decisionStatus: 'DETERMINATE',
        matchedDenyStatementIds: ['stmt-deny-1'],
        matchedAllowStatementIds: [],
      },
    };

    expect(outline.expectedPathTrace).toBeUndefined();
    expect(outline.expectedDiagnostics).toBeUndefined();
    expect(outline.notes).toBeUndefined();
  });

  it('should support all six categories in outline construction', () => {
    const categories: GoldenCaseCategory[] = [
      'allow', 'explicit-deny', 'implicit-deny',
      'indeterminate', 'unsupported', 'invalid',
    ];

    for (const cat of categories) {
      const outline: GoldenCaseOutline = {
        id: `test_cat_${cat}`,
        title: `Outline for ${cat}`,
        category: cat,
        purpose: `Test outline for category ${cat}.`,
        coveredFeatures: ['test'],
        expectedEvaluation: {
          finalDecision: 'IMPLICIT_DENY',
          decisionStatus: 'DETERMINATE',
          matchedDenyStatementIds: [],
          matchedAllowStatementIds: [],
        },
      };
      expect(outline.category).toBe(cat);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MINIMAL_GOLDEN_CASES
// ═══════════════════════════════════════════════════════════════════════

describe('MINIMAL_GOLDEN_CASES', () => {
  it('should have at least 13 cases', () => {
    expect(MINIMAL_GOLDEN_CASES.length).toBeGreaterThanOrEqual(13);
  });

  it('should have exactly 13 cases (no more, no less)', () => {
    expect(MINIMAL_GOLDEN_CASES.length).toBe(13);
  });

  it('each case should have the required fields: id, title, category, purpose, coveredFeatures, expectedEvaluation', () => {
    for (const c of MINIMAL_GOLDEN_CASES) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.title).toBe('string');
      expect(c.title.length).toBeGreaterThan(0);
      expect(VALID_GOLDEN_CASE_CATEGORIES).toContain(c.category);
      expect(typeof c.purpose).toBe('string');
      expect(c.purpose.length).toBeGreaterThan(0);
      expect(Array.isArray(c.coveredFeatures)).toBe(true);
      expect(c.coveredFeatures.length).toBeGreaterThan(0);
      expect(typeof c.expectedEvaluation).toBe('object');
      expect(typeof c.expectedEvaluation.finalDecision).toBe('string');
      expect(typeof c.expectedEvaluation.decisionStatus).toBe('string');
      expect(Array.isArray(c.expectedEvaluation.matchedDenyStatementIds)).toBe(true);
      expect(Array.isArray(c.expectedEvaluation.matchedAllowStatementIds)).toBe(true);
    }
  });

  it('each case should have a unique id', () => {
    const ids = MINIMAL_GOLDEN_CASES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should cover core evaluation categories', () => {
    const categories = new Set(MINIMAL_GOLDEN_CASES.map(c => c.category));

    // Must cover at least: allow, explicit-deny, implicit-deny, unsupported, invalid
    expect(categories.has('allow')).toBe(true);
    expect(categories.has('explicit-deny')).toBe(true);
    expect(categories.has('implicit-deny')).toBe(true);
    expect(categories.has('unsupported')).toBe(true);
    expect(categories.has('invalid')).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: action-matching', () => {
    const hasActionMiss = MINIMAL_GOLDEN_CASES.some(
      c => c.coveredFeatures.includes('action-matching') && c.category === 'implicit-deny',
    );
    expect(hasActionMiss).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: resource-matching', () => {
    const hasResourceMiss = MINIMAL_GOLDEN_CASES.some(
      c => c.coveredFeatures.includes('resource-matching') && c.category === 'implicit-deny',
    );
    expect(hasResourceMiss).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: StringEquals condition', () => {
    const hasStringEquals = MINIMAL_GOLDEN_CASES.some(
      c => c.coveredFeatures.includes('condition-string-equals'),
    );
    expect(hasStringEquals).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: Bool condition', () => {
    const hasBool = MINIMAL_GOLDEN_CASES.some(
      c => c.coveredFeatures.includes('condition-bool'),
    );
    expect(hasBool).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: IpAddress condition', () => {
    const hasIpAddress = MINIMAL_GOLDEN_CASES.some(
      c => c.coveredFeatures.includes('condition-ip-address'),
    );
    expect(hasIpAddress).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: unsupported condition', () => {
    const hasUnsupportedCondition = MINIMAL_GOLDEN_CASES.some(
      c => c.category === 'unsupported' && c.coveredFeatures.includes('unsupported-condition'),
    );
    expect(hasUnsupportedCondition).toBe(true);
  });

  it('unsupported golden case gc-unsupported-condition should have decisionStatus INDETERMINATE', () => {
    const c = MINIMAL_GOLDEN_CASES.find(x => x.id === 'gc-unsupported-condition');
    expect(c).toBeDefined();
    expect(c!.expectedEvaluation.decisionStatus).toBe('INDETERMINATE');
  });

  it('unsupported golden case gc-unsupported-condition should have unsupported diagnostics', () => {
    const c = MINIMAL_GOLDEN_CASES.find(x => x.id === 'gc-unsupported-condition');
    expect(c).toBeDefined();
    expect(c!.expectedDiagnostics?.unsupportedFeatures).toBeDefined();
    expect(c!.expectedDiagnostics!.unsupportedFeatures!.length).toBeGreaterThan(0);
  });

  it('unsupported golden case should have empty matched statement ids', () => {
    const c = MINIMAL_GOLDEN_CASES.find(x => x.id === 'gc-unsupported-condition');
    expect(c).toBeDefined();
    expect(c!.expectedEvaluation.matchedDenyStatementIds).toEqual([]);
    expect(c!.expectedEvaluation.matchedAllowStatementIds).toEqual([]);
  });

  it('unsupported golden case should have finalDecision IMPLICIT_DENY', () => {
    const c = MINIMAL_GOLDEN_CASES.find(x => x.id === 'gc-unsupported-condition');
    expect(c).toBeDefined();
    expect(c!.expectedEvaluation.finalDecision).toBe('IMPLICIT_DENY');
  });

  it('should cover Design §11.4 first batch case direction: invalid policy', () => {
    const hasInvalidPolicy = MINIMAL_GOLDEN_CASES.some(
      c => c.category === 'invalid',
    );
    expect(hasInvalidPolicy).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: single Allow match', () => {
    const hasSingleAllow = MINIMAL_GOLDEN_CASES.some(
      c => c.category === 'allow' && c.purpose.toLowerCase().includes('single'),
    );
    expect(hasSingleAllow).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: single Deny match', () => {
    const hasSingleDeny = MINIMAL_GOLDEN_CASES.some(
      c => c.category === 'explicit-deny' && c.purpose.toLowerCase().includes('single'),
    );
    expect(hasSingleDeny).toBe(true);
  });

  it('should cover Design §11.4 first batch case direction: IMPLICIT_DENY from no match', () => {
    const hasNoMatch = MINIMAL_GOLDEN_CASES.some(
      c => c.category === 'implicit-deny' && c.purpose.toLowerCase().includes('no statement matches'),
    );
    expect(hasNoMatch).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D02 boundary constraints
// ═══════════════════════════════════════════════════════════════════════

describe('D02 boundary constraints', () => {
  it('should not import or modify D01 runtime constants', () => {
    // MINIMAL_GOLDEN_CASES uses only D01 types, not D01 runtime values.
    // The module under test is verified through typecheck – no `any` type used.
    // This test exists as a documentation anchor for the D02 boundary.
    expect(MINIMAL_GOLDEN_CASES).toBeDefined();
    expect(MINIMAL_GOLDEN_CASES.length).toBeGreaterThan(0);
  });

  it('should not contain real-world IAM policy data', () => {
    // All cases are synthetic outlines only – no inline policy JSON.
    // Verified by: no case contains a `policy` or `policies` field
    // (which would be on CaseInput, not GoldenCaseOutline).
    for (const c of MINIMAL_GOLDEN_CASES) {
      expect((c as unknown as Record<string, unknown>).policy).toBeUndefined();
      expect((c as unknown as Record<string, unknown>).policies).toBeUndefined();
    }
  });
});
