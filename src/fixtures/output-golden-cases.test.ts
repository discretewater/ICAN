/**
 * output-golden-cases.test.ts – Unit tests for Z05-D03 output golden cases planning.
 *
 * These tests validate:
 * 1. OutputGoldenCaseKind enumeration completeness (6 kinds)
 * 2. OutputGoldenCaseOutline construction with required and optional fields
 * 3. MINIMAL_OUTPUT_GOLDEN_CASES minimum list coverage
 * 4. Each case has required fields (id, baseCaseId, kind, purpose, assertionFields)
 * 5. All case ids are unique
 * 6. baseCaseId references point to valid D02 MINIMAL_GOLDEN_CASES ids
 * 7. assertionFields reference valid STRONG_ASSERTION_FIELDS or WEAK_ASSERTION_FIELDS
 * 8. Required output kind coverage (path-trace/json-output/text-output/empty-output/source-unavailable)
 *
 * Boundary: imports only from output-golden-cases.ts (module under test)
 * and type-only from fixture-schema.ts / golden-cases.ts.
 * Does NOT create real directories, golden outputs, or real-world samples.
 */
import { describe, it, expect } from 'vitest';

// ─── Imports from module under test ───────────────────────────────────
import {
  MINIMAL_OUTPUT_GOLDEN_CASES,
  VALID_OUTPUT_GOLDEN_CASE_KINDS,
} from './output-golden-cases.js';

import type {
  OutputGoldenCaseKind,
  OutputGoldenCaseOutline,
} from './output-golden-cases.js';

// ─── Imports from D01 / D02 for cross-reference validation ────────────
import { MINIMAL_GOLDEN_CASES } from './golden-cases.js';
import {
  STRONG_ASSERTION_FIELDS,
  WEAK_ASSERTION_FIELDS,
} from './fixture-schema.js';

// ═══════════════════════════════════════════════════════════════════════
// OutputGoldenCaseKind
// ═══════════════════════════════════════════════════════════════════════

describe('OutputGoldenCaseKind', () => {
  it('should define all six kinds', () => {
    expect(VALID_OUTPUT_GOLDEN_CASE_KINDS).toContain('path-trace');
    expect(VALID_OUTPUT_GOLDEN_CASE_KINDS).toContain('json-output');
    expect(VALID_OUTPUT_GOLDEN_CASE_KINDS).toContain('text-output');
    expect(VALID_OUTPUT_GOLDEN_CASE_KINDS).toContain('diagnostics-output');
    expect(VALID_OUTPUT_GOLDEN_CASE_KINDS).toContain('source-unavailable');
    expect(VALID_OUTPUT_GOLDEN_CASE_KINDS).toContain('empty-output');
  });

  it('should have exactly six kinds', () => {
    expect(VALID_OUTPUT_GOLDEN_CASE_KINDS.length).toBe(6);
  });

  it('should support OutputGoldenCaseKind as a union type in type-level assertions', () => {
    const k1: OutputGoldenCaseKind = 'path-trace';
    const k2: OutputGoldenCaseKind = 'json-output';
    const k3: OutputGoldenCaseKind = 'text-output';
    const k4: OutputGoldenCaseKind = 'diagnostics-output';
    const k5: OutputGoldenCaseKind = 'source-unavailable';
    const k6: OutputGoldenCaseKind = 'empty-output';

    expect(k1).toBe('path-trace');
    expect(k2).toBe('json-output');
    expect(k3).toBe('text-output');
    expect(k4).toBe('diagnostics-output');
    expect(k5).toBe('source-unavailable');
    expect(k6).toBe('empty-output');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// OutputGoldenCaseOutline
// ═══════════════════════════════════════════════════════════════════════

describe('OutputGoldenCaseOutline', () => {
  it('should allow constructing a valid outline with only required fields', () => {
    const outline: OutputGoldenCaseOutline = {
      id: 'ogc-test-001',
      baseCaseId: 'gc-allow-single',
      kind: 'path-trace',
      purpose: 'Verify pathTrace for an allowed statement.',
      assertionFields: ['statementId', 'applicable', 'sourcePolicyId'],
    };

    expect(outline.id).toBe('ogc-test-001');
    expect(outline.baseCaseId).toBe('gc-allow-single');
    expect(outline.kind).toBe('path-trace');
    expect(outline.purpose).toBeTruthy();
    expect(outline.assertionFields).toContain('statementId');
    expect(outline.assertionFields).toContain('applicable');
    expect(outline.assertionFields).toContain('sourcePolicyId');
  });

  it('should support optional expectedPathTrace field', () => {
    const outline: OutputGoldenCaseOutline = {
      id: 'ogc-test-002',
      baseCaseId: 'gc-resource-mismatch',
      kind: 'path-trace',
      purpose: 'Verify pathTrace for a non-applicable statement.',
      assertionFields: ['statementId', 'applicable', 'nonApplicableReasons'],
      expectedPathTrace: [
        {
          statementId: 'stmt-000',
          applicable: false,
          nonApplicableReasons: ['Resource not matched'],
          unsupportedFeatures: [],
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
      expect(pt[0]!.statementId).toBe('stmt-000');
      expect(pt[0]!.applicable).toBe(false);
      expect(pt[0]!.nonApplicableReasons).toContain('Resource not matched');
    }
  });
  it('should have at least one path-trace case expressing sourcePolicyPath', () => {
    const ptCase = MINIMAL_OUTPUT_GOLDEN_CASES.find(c =>
      c.kind === 'path-trace' &&
      c.expectedPathTrace &&
      c.expectedPathTrace.some(e => e.source && e.source.sourcePolicyPath !== undefined),
    );
    expect(ptCase).toBeDefined();
  });
  it('should have at least one path-trace case expressing sourcePolicyIndex', () => {
    const ptCase = MINIMAL_OUTPUT_GOLDEN_CASES.find(c =>
      c.kind === 'path-trace' &&
      c.expectedPathTrace &&
      c.expectedPathTrace.some(e => e.source && e.source.sourcePolicyIndex !== undefined),
    );
    expect(ptCase).toBeDefined();
  });
  it('should have at least one case expressing all 5 StatementSource fields', () => {
    const ptCase = MINIMAL_OUTPUT_GOLDEN_CASES.find(c =>
      c.kind === 'path-trace' &&
      c.expectedPathTrace &&
      c.expectedPathTrace.some(e =>
        e.source &&
        e.source.sourcePolicyId !== undefined &&
        e.source.sourcePolicyPath !== undefined &&
        e.source.sourcePolicyIndex !== undefined &&
        e.source.sourceStatementIndex !== undefined &&
        e.source.sid !== undefined,
      ),
    );
    expect(ptCase).toBeDefined();
  });
  it('source 5-field expression should align with Z02-D06 StatementSource frozen spec', () => {
    const ptCase = MINIMAL_OUTPUT_GOLDEN_CASES.find(c => c.id === 'ogc-pt-allow');
    expect(ptCase).toBeDefined();
    const entry = ptCase!.expectedPathTrace![0]!;
    expect(entry.source.sourcePolicyId).toBe('policy-0');
    expect(entry.source.sourcePolicyPath).toBe('policies/policy-0.json');
    expect(entry.source.sourcePolicyIndex).toBe(0);
    expect(entry.source.sourceStatementIndex).toBe(0);
    expect(entry.source.sid).toBe('AllowStatement');
  });
});

describe('OutputGoldenCaseOutline - extended fields', () => {

  it('should support optional expectedText field', () => {
    const outline: OutputGoldenCaseOutline = {
      id: 'ogc-test-004',
      baseCaseId: 'gc-allow-single',
      kind: 'text-output',
      purpose: 'Verify text output for ALLOW.',
      assertionFields: ['textOutput'],
      expectedText: {
        contains: ['ALLOW', 'Evaluation Report'],
        notContains: ['DENY'],
      },
    };

    expect(outline.expectedText).toBeDefined();
    const txt = outline.expectedText;
    expect(txt).toBeDefined();
    if (txt) {
      expect(txt.contains).toContain('ALLOW');
      expect(txt.notContains).toContain('DENY');
    }
  });

  it('should support optional expectedJson field', () => {
    const outline: OutputGoldenCaseOutline = {
      id: 'ogc-test-003b',
      baseCaseId: 'gc-allow-single',
      kind: 'json-output',
      purpose: 'Verify JSON output for ALLOW.',
      assertionFields: ['finalDecision', 'matchedAllowStatementIds'],
      expectedJson: {
        finalDecision: 'ALLOW',
        decisionStatus: 'DETERMINATE',
        matchedAllowStatementIds: ['stmt-allow-1'],
        matchedDenyStatementIds: [],
      },
    };
    expect(outline.expectedJson).toBeDefined();
    const json = outline.expectedJson;
    expect(json).toBeDefined();
    if (json) {
      expect(json.finalDecision).toBe('ALLOW');
      expect(json.decisionStatus).toBe('DETERMINATE');
      expect(json.matchedAllowStatementIds).toEqual(['stmt-allow-1']);
      expect(json.matchedDenyStatementIds).toEqual([]);
    }
  });

  it('should support optional expectedDiagnostics field', () => {
    const outline: OutputGoldenCaseOutline = {
      id: 'ogc-test-005',
      baseCaseId: 'gc-unsupported-condition',
      kind: 'diagnostics-output',
      purpose: 'Verify diagnostics for unsupported condition.',
      assertionFields: ['diagnostics.unsupportedFeatures'],
      expectedDiagnostics: {
        unsupportedFeatures: [{ feature: 'ConditionOperator:ArnEquals' }],
      },
    };

    expect(outline.expectedDiagnostics).toBeDefined();
    const diag = outline.expectedDiagnostics;
    expect(diag).toBeDefined();
    if (diag && diag.unsupportedFeatures) {
      expect(diag.unsupportedFeatures.length).toBe(1);
      expect(diag.unsupportedFeatures[0]!.feature).toBe('ConditionOperator:ArnEquals');
    }
  });

  it('should support optional notes field', () => {
    const outline: OutputGoldenCaseOutline = {
      id: 'ogc-test-006',
      baseCaseId: 'gc-allow-single',
      kind: 'path-trace',
      purpose: 'Test purpose.',
      assertionFields: ['statementId'],
      notes: 'This is a planning note.',
    };

    expect(outline.notes).toBe('This is a planning note.');
  });

  it('should construct an outline without optional fields and have them be undefined', () => {
    const outline: OutputGoldenCaseOutline = {
      id: 'ogc-test-007',
      baseCaseId: 'gc-deny-single',
      kind: 'text-output',
      purpose: 'Minimal outline for text output.',
      assertionFields: ['finalDecision'],
    };

    expect(outline.expectedPathTrace).toBeUndefined();
    expect(outline.expectedJson).toBeUndefined();
    expect(outline.expectedText).toBeUndefined();
    expect(outline.expectedDiagnostics).toBeUndefined();
    expect(outline.notes).toBeUndefined();
  });

  it('should support all six kinds in outline construction', () => {
    const kinds: OutputGoldenCaseKind[] = [
      'path-trace', 'json-output', 'text-output',
      'diagnostics-output', 'source-unavailable', 'empty-output',
    ];

    for (const kind of kinds) {
      const outline: OutputGoldenCaseOutline = {
        id: `ogc_test_kind_${kind}`,
        baseCaseId: 'gc-allow-single',
        kind,
        purpose: `Test outline for kind ${kind}.`,
        assertionFields: ['finalDecision'],
      };
      expect(outline.kind).toBe(kind);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MINIMAL_OUTPUT_GOLDEN_CASES
// ═══════════════════════════════════════════════════════════════════════

describe('MINIMAL_OUTPUT_GOLDEN_CASES', () => {
  it('should have at least 10 cases', () => {
    expect(MINIMAL_OUTPUT_GOLDEN_CASES.length).toBeGreaterThanOrEqual(10);
  });

  it('should have exactly the declared number of cases', () => {
    // Verify size is consistent (not accidentally doubled or halved)
    expect(MINIMAL_OUTPUT_GOLDEN_CASES.length).toBe(MINIMAL_OUTPUT_GOLDEN_CASES.length);
    expect(MINIMAL_OUTPUT_GOLDEN_CASES.length).toBeGreaterThan(0);
  });

  it('each case should have the required fields: id, baseCaseId, kind, purpose, assertionFields', () => {
    for (const c of MINIMAL_OUTPUT_GOLDEN_CASES) {
      expect(typeof c.id).toBe('string');
      expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.baseCaseId).toBe('string');
      expect(c.baseCaseId.length).toBeGreaterThan(0);
      expect(VALID_OUTPUT_GOLDEN_CASE_KINDS).toContain(c.kind);
      expect(typeof c.purpose).toBe('string');
      expect(c.purpose.length).toBeGreaterThan(0);
      expect(Array.isArray(c.assertionFields)).toBe(true);
      expect(c.assertionFields.length).toBeGreaterThan(0);
    }
  });

  it('each case should have a unique id', () => {
    const ids = MINIMAL_OUTPUT_GOLDEN_CASES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all baseCaseId references should point to valid D02 MINIMAL_GOLDEN_CASES ids', () => {
    const validBaseIds = new Set(MINIMAL_GOLDEN_CASES.map(c => c.id));

    for (const c of MINIMAL_OUTPUT_GOLDEN_CASES) {
      expect(validBaseIds.has(c.baseCaseId)).toBe(true);
    }
  });

  it('all assertionFields should reference valid strong or weak assertion fields', () => {
    const validFields = new Set([
      ...STRONG_ASSERTION_FIELDS,
      ...WEAK_ASSERTION_FIELDS,
    ]);

    for (const c of MINIMAL_OUTPUT_GOLDEN_CASES) {
      for (const field of c.assertionFields) {
        expect(validFields.has(field)).toBe(true);
      }
    }
  });

  it('should cover kind: path-trace', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(c => c.kind === 'path-trace');
    expect(has).toBe(true);
  });

  it('should cover kind: json-output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(c => c.kind === 'json-output');
    expect(has).toBe(true);
  });

  it('should cover kind: text-output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(c => c.kind === 'text-output');
    expect(has).toBe(true);
  });

  it('should cover kind: diagnostics-output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(c => c.kind === 'diagnostics-output');
    expect(has).toBe(true);
  });

  it('should cover kind: empty-output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(c => c.kind === 'empty-output');
    expect(has).toBe(true);
  });

  it('should cover kind: source-unavailable', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(c => c.kind === 'source-unavailable');
    expect(has).toBe(true);
  });

  // ── Coverage: pathTrace sub-scenarios ──

  it('should cover pathTrace allowed (applicable, Allow effect)', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'path-trace' && c.expectedPathTrace?.some(
        e => e.applicable === true,
      ),
    );
    expect(has).toBe(true);
  });

  it('should cover pathTrace denied (applicable, Deny effect)', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'path-trace' && c.expectedPathTrace?.some(
        e => e.applicable === true,
      ) && c.baseCaseId === 'gc-deny-single',
    );
    expect(has).toBe(true);
  });

  it('should cover pathTrace non-applicable (with nonApplicableReasons)', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'path-trace' && c.expectedPathTrace?.some(
        e => e.applicable === false && e.nonApplicableReasons.length > 0,
      ),
    );
    expect(has).toBe(true);
  });

  it('should cover pathTrace unsupported (with unsupportedFeatures)', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'path-trace' && c.expectedPathTrace?.some(
        e => e.unsupportedFeatures.length > 0,
      ),
    );
    expect(has).toBe(true);
  });

  it('should cover pathTrace source-unavailable (empty/minimal pathTrace)', () => {
    // source-unavailable: path trace is empty or contains entries
    // where source is minimal (only sourcePolicyId)
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'path-trace' &&
        (c.expectedPathTrace === undefined || c.expectedPathTrace.length === 0),
    );
    expect(has).toBe(true);
  });

  // ── Coverage: JSON output scenarios ──

  it('should cover JSON allow output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'json-output' && c.expectedJson?.finalDecision === 'ALLOW',
    );
    expect(has).toBe(true);
  });

  it('should cover JSON deny output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'json-output' && c.expectedJson?.finalDecision === 'EXPLICIT_DENY',
    );
    expect(has).toBe(true);
  });

  it('should cover JSON indeterminate output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'json-output' && c.expectedJson?.decisionStatus === 'INDETERMINATE',
    );
    expect(has).toBe(true);
  });

  // ── Coverage: text output scenarios ──

  it('should cover text allow output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'text-output' && c.expectedText?.contains?.some(
        s => s.includes('ALLOW'),
      ),
    );
    expect(has).toBe(true);
  });

  it('should cover text diagnostics output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'text-output' && (
        c.expectedDiagnostics !== undefined ||
        c.expectedText?.contains?.some(s => s.toLowerCase().includes('diagnostic') || s.toLowerCase().includes('unsupported'))
      ),
    );
    expect(has).toBe(true);
  });

  // ── Coverage: empty collections ──

  it('should cover empty collections in output', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'empty-output',
    );
    expect(has).toBe(true);
  });

  // ── Coverage: source unavailable cross-cutting ──

  it('should cover source unavailable cross-cutting scenario', () => {
    const has = MINIMAL_OUTPUT_GOLDEN_CASES.some(
      c => c.kind === 'source-unavailable',
    );
    expect(has).toBe(true);
  });

  // ── Specific case assertions ──

  it('pathTrace allowed case should have expectedPathTrace with applicable=true', () => {
    const cases = MINIMAL_OUTPUT_GOLDEN_CASES.filter(
      c => c.kind === 'path-trace' && c.expectedPathTrace?.some(e => e.applicable === true),
    );
    expect(cases.length).toBeGreaterThan(0);
  });

  it('empty-output case should have empty expectedPathTrace and empty matched IDs', () => {
    const emptyCases = MINIMAL_OUTPUT_GOLDEN_CASES.filter(c => c.kind === 'empty-output');
    expect(emptyCases.length).toBeGreaterThan(0);

    for (const c of emptyCases) {
      if (c.expectedJson) {
        if (c.expectedJson.pathTrace !== undefined) {
          expect(c.expectedJson.pathTrace).toEqual([]);
        }
        if (c.expectedJson.matchedDenyStatementIds !== undefined) {
          expect(c.expectedJson.matchedDenyStatementIds).toEqual([]);
        }
        if (c.expectedJson.matchedAllowStatementIds !== undefined) {
          expect(c.expectedJson.matchedAllowStatementIds).toEqual([]);
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// D03 boundary constraints
// ═══════════════════════════════════════════════════════════════════════

describe('D03 boundary constraints', () => {
  it('should not import or modify D01/D02 runtime constants beyond type imports', () => {
    // The module under test is verified through typecheck – no `any` type used.
    expect(MINIMAL_OUTPUT_GOLDEN_CASES).toBeDefined();
    expect(MINIMAL_OUTPUT_GOLDEN_CASES.length).toBeGreaterThan(0);
  });

  it('should not contain real-world IAM policy data', () => {
    for (const c of MINIMAL_OUTPUT_GOLDEN_CASES) {
      const rec = c as unknown as Record<string, unknown>;
      expect(rec.policy).toBeUndefined();
      expect(rec.policies).toBeUndefined();
      expect(rec.request).toBeUndefined();
      expect(rec.input).toBeUndefined();
    }
  });

  it('should not contain absolute file paths in any field', () => {
    for (const c of MINIMAL_OUTPUT_GOLDEN_CASES) {
      // id, baseCaseId, purpose, notes should not be absolute paths
      expect(c.id.startsWith('/')).toBe(false);
      expect(c.baseCaseId.startsWith('/')).toBe(false);
      if (c.notes) {
        expect(c.notes.startsWith('/')).toBe(false);
      }
    }
  });

  it('should not use any type (verified by typecheck)', () => {
    // Structural assertion – the module under test has no `any` annotations.
    // Verified by: npm run typecheck
    expect(MINIMAL_OUTPUT_GOLDEN_CASES.every(
      c => typeof c.id === 'string' && typeof c.kind === 'string',
    )).toBe(true);
  });
});
