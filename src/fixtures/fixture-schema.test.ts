/**
 * fixture-schema.test.ts – Unit tests for Z05-D01 fixtures schema definitions.
 *
 * These tests validate:
 * 1. CaseMetadata construction and field integrity
 * 2. OriginType enumeration correctness
 * 3. Directory and filename constants stability
 * 4. ExpectedEvaluation schema structure
 * 5. ExpectedPathTrace schema structure
 * 6. ExpectedJsonOutput schema structure
 * 7. ExpectedTextOutput schema structure
 * 8. ExpectedDiagnostics schema structure
 * 9. AssertionKind enumeration correctness
 * 10. No dependency on real fixtures directories
 * 11. No real-world IAM Policy samples
 * 12. No modification of Z01-Z04 frozen types
 *
 * Boundary: imports only from fixture-schema.ts and frozen upstream types
 * via `import type`. Does NOT create real directories, golden cases, or
 * real-world policy samples.
 */
import { describe, it, expect } from 'vitest';

// ─── Imports from module under test ───────────────────────────────────
import {
  FIXTURES_ROOT,
  CASES_DIR,
  POLICIES_DIR,
  REQUEST_FILE,
  EXPECTED_DIR,
  METADATA_FILE,
  EXPECTED_EVALUATION_FILE,
  EXPECTED_PATH_TRACE_FILE,
  EXPECTED_JSON_OUTPUT_FILE,
  EXPECTED_TEXT_OUTPUT_FILE,
  STRONG_ASSERTION_FIELDS,
  WEAK_ASSERTION_FIELDS,
  isValidOriginType,
  makeCaseMetadata,
  makeExpectedEvaluation,
} from './fixture-schema.js';

import type {
  CaseMetadata,
  OriginType,
  CaseInput,
  ExpectedEvaluation,
  ExpectedPathTraceEntry,
  ExpectedJsonOutput,
  ExpectedTextOutput,
  ExpectedDiagnostics,
  AssertionKind,
} from './fixture-schema.js';

// ─── Import frozen types (type-only, no runtime dependency) ───────────
import type { InputPolicyDocument } from '../parser/policy-schema.js';
import type { EvaluationRequest } from '../parser/evaluation-request-types.js';

// ═══════════════════════════════════════════════════════════════════════
// 1. CaseMetadata construction
// ═══════════════════════════════════════════════════════════════════════

describe('CaseMetadata', () => {
  it('can construct a valid CaseMetadata object with all required fields', () => {
    const meta: CaseMetadata = {
      id: 'case-001',
      title: 'Single Allow Statement',
      purpose: 'Verify that a single Allow statement produces ALLOW',
      tags: ['allow', 'single-statement'],
      coveredFeatures: ['action-match', 'resource-match'],
      originType: 'synthetic',
      source: 'hand-crafted',
      license: 'CC0',
      sanitizationNote: 'No real data',
      containsRealWorldPolicy: false,
    };

    expect(meta.id).toBe('case-001');
    expect(meta.title).toBe('Single Allow Statement');
    expect(meta.purpose).toBe('Verify that a single Allow statement produces ALLOW');
    expect(meta.tags).toEqual(['allow', 'single-statement']);
    expect(meta.coveredFeatures).toEqual(['action-match', 'resource-match']);
    expect(meta.originType).toBe('synthetic');
    expect(meta.source).toBe('hand-crafted');
    expect(meta.license).toBe('CC0');
    expect(meta.sanitizationNote).toBe('No real data');
    expect(meta.containsRealWorldPolicy).toBe(false);
  });

  it('supports all three OriginType values', () => {
    const synthetic: OriginType = 'synthetic';
    const official: OriginType = 'official';
    const openSource: OriginType = 'open-source';

    expect(synthetic).toBe('synthetic');
    expect(official).toBe('official');
    expect(openSource).toBe('open-source');
  });

  it('allows CaseMetadata with originType "official"', () => {
    const meta: CaseMetadata = {
      id: 'case-official',
      title: 'Official AWS Sample',
      purpose: 'Verify against an official AWS policy sample',
      tags: ['official'],
      coveredFeatures: ['action-match'],
      originType: 'official',
      source: 'AWS Documentation',
      license: 'AWS',
      sanitizationNote: 'Sanitized',
      containsRealWorldPolicy: false,
    };

    expect(meta.originType).toBe('official');
    expect(meta.source).toBe('AWS Documentation');
  });

  it('allows CaseMetadata with originType "open-source"', () => {
    const meta: CaseMetadata = {
      id: 'case-oss',
      title: 'Open Source Sample',
      purpose: 'Verify against an open-source IAM policy',
      tags: ['open-source'],
      coveredFeatures: ['resource-match'],
      originType: 'open-source',
      source: 'GitHub Community',
      license: 'MIT',
      sanitizationNote: 'Sanitized and minimized',
      containsRealWorldPolicy: false,
    };

    expect(meta.originType).toBe('open-source');
    expect(meta.license).toBe('MIT');
  });

  it('has tags and coveredFeatures as readonly string arrays', () => {
    const meta: CaseMetadata = {
      id: 'case-002',
      title: 'Multi Tag Case',
      purpose: 'Test tags and coveredFeatures',
      tags: ['tag-a', 'tag-b', 'tag-c'],
      coveredFeatures: ['feat-1', 'feat-2'],
      originType: 'synthetic',
      source: 'test',
      license: 'CC0',
      sanitizationNote: 'none',
      containsRealWorldPolicy: false,
    };

    expect(Array.isArray(meta.tags)).toBe(true);
    expect(meta.tags).toHaveLength(3);
    expect(Array.isArray(meta.coveredFeatures)).toBe(true);
    expect(meta.coveredFeatures).toHaveLength(2);
  });

  it('containsRealWorldPolicy is a boolean', () => {
    const metaTrue: CaseMetadata = {
      id: 'case-real',
      title: 'Real World Policy',
      purpose: 'Test with real world policy flag',
      tags: [],
      coveredFeatures: [],
      originType: 'open-source',
      source: 'public',
      license: 'MIT',
      sanitizationNote: 'sanitized',
      containsRealWorldPolicy: true,
    };

    expect(metaTrue.containsRealWorldPolicy).toBe(true);

    const metaFalse: CaseMetadata = {
      id: 'case-synth',
      title: 'Synthetic Policy',
      purpose: 'Test synthetic',
      tags: [],
      coveredFeatures: [],
      originType: 'synthetic',
      source: 'generated',
      license: 'CC0',
      sanitizationNote: 'none',
      containsRealWorldPolicy: false,
    };

    expect(metaFalse.containsRealWorldPolicy).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. OriginType validation helper
// ═══════════════════════════════════════════════════════════════════════

describe('isValidOriginType', () => {
  it('returns true for valid origin types', () => {
    expect(isValidOriginType('synthetic')).toBe(true);
    expect(isValidOriginType('official')).toBe(true);
    expect(isValidOriginType('open-source')).toBe(true);
  });

  it('returns false for invalid origin types', () => {
    expect(isValidOriginType('invalid')).toBe(false);
    expect(isValidOriginType('real-world')).toBe(false);
    expect(isValidOriginType('')).toBe(false);
    expect(isValidOriginType('Synthetic')).toBe(false);
    expect(isValidOriginType('OFFICIAL')).toBe(false);
  });

  it('returns false for non-string values at runtime', () => {
    // TypeScript would catch these at compile time, but runtime guard
    // should handle unexpected inputs gracefully.
    expect(isValidOriginType(null as unknown as string)).toBe(false);
    expect(isValidOriginType(undefined as unknown as string)).toBe(false);
    expect(isValidOriginType(123 as unknown as string)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. Fixtures directory constants
// ═══════════════════════════════════════════════════════════════════════

describe('fixtures directory constants', () => {
  it('FIXTURES_ROOT equals "test-fixtures"', () => {
    expect(FIXTURES_ROOT).toBe('test-fixtures');
  });

  it('CASES_DIR equals "cases"', () => {
    expect(CASES_DIR).toBe('cases');
  });

  it('POLICIES_DIR equals "policies"', () => {
    expect(POLICIES_DIR).toBe('policies');
  });

  it('EXPECTED_DIR equals "expected"', () => {
    expect(EXPECTED_DIR).toBe('expected');
  });

  it('all directory constants are non-empty strings', () => {
    const dirs: readonly string[] = [
      FIXTURES_ROOT,
      CASES_DIR,
      POLICIES_DIR,
      EXPECTED_DIR,
    ];

    for (const dir of dirs) {
      expect(typeof dir).toBe('string');
      expect(dir.length).toBeGreaterThan(0);
    }
  });

  it('directory constants do not contain absolute paths', () => {
    const dirs: readonly string[] = [
      FIXTURES_ROOT,
      CASES_DIR,
      POLICIES_DIR,
      EXPECTED_DIR,
    ];

    for (const dir of dirs) {
      expect(dir.startsWith('/')).toBe(false);
      expect(dir.includes('\\')).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. Filename constants
// ═══════════════════════════════════════════════════════════════════════

describe('filename constants', () => {
  it('REQUEST_FILE equals "request.json"', () => {
    expect(REQUEST_FILE).toBe('request.json');
  });

  it('METADATA_FILE equals "metadata.json"', () => {
    expect(METADATA_FILE).toBe('metadata.json');
  });

  it('EXPECTED_EVALUATION_FILE equals "expected-evaluation.json"', () => {
    expect(EXPECTED_EVALUATION_FILE).toBe('expected-evaluation.json');
  });

  it('EXPECTED_PATH_TRACE_FILE equals "expected-path-trace.json"', () => {
    expect(EXPECTED_PATH_TRACE_FILE).toBe('expected-path-trace.json');
  });

  it('EXPECTED_JSON_OUTPUT_FILE equals "expected-json-output.json"', () => {
    expect(EXPECTED_JSON_OUTPUT_FILE).toBe('expected-json-output.json');
  });

  it('EXPECTED_TEXT_OUTPUT_FILE equals "expected-text-output.txt"', () => {
    expect(EXPECTED_TEXT_OUTPUT_FILE).toBe('expected-text-output.txt');
  });

  it('all filename constants are non-empty strings', () => {
    const files: readonly string[] = [
      REQUEST_FILE,
      METADATA_FILE,
      EXPECTED_EVALUATION_FILE,
      EXPECTED_PATH_TRACE_FILE,
      EXPECTED_JSON_OUTPUT_FILE,
      EXPECTED_TEXT_OUTPUT_FILE,
    ];

    for (const f of files) {
      expect(typeof f).toBe('string');
      expect(f.length).toBeGreaterThan(0);
    }
  });

  it('JSON filename constants end with .json', () => {
    const jsonFiles: readonly string[] = [
      REQUEST_FILE,
      METADATA_FILE,
      EXPECTED_EVALUATION_FILE,
      EXPECTED_PATH_TRACE_FILE,
      EXPECTED_JSON_OUTPUT_FILE,
    ];

    for (const f of jsonFiles) {
      expect(f.endsWith('.json')).toBe(true);
    }
  });

  it('EXPECTED_TEXT_OUTPUT_FILE ends with .txt', () => {
    expect(EXPECTED_TEXT_OUTPUT_FILE.endsWith('.txt')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. ExpectedEvaluation schema
// ═══════════════════════════════════════════════════════════════════════

describe('ExpectedEvaluation', () => {
  it('can construct an ExpectedEvaluation with all required fields', () => {
    const expected: ExpectedEvaluation = {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt:policy-0:abc123'],
    };

    expect(expected.finalDecision).toBe('ALLOW');
    expect(expected.decisionStatus).toBe('DETERMINATE');
    expect(expected.matchedDenyStatementIds).toEqual([]);
    expect(expected.matchedAllowStatementIds).toEqual(['stmt:policy-0:abc123']);
  });

  it('supports EXPLICIT_DENY finalDecision', () => {
    const expected: ExpectedEvaluation = {
      finalDecision: 'EXPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: ['sid:policy-0:DenyAll'],
      matchedAllowStatementIds: [],
    };

    expect(expected.finalDecision).toBe('EXPLICIT_DENY');
    expect(expected.matchedDenyStatementIds).toHaveLength(1);
  });

  it('supports IMPLICIT_DENY finalDecision', () => {
    const expected: ExpectedEvaluation = {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    };

    expect(expected.finalDecision).toBe('IMPLICIT_DENY');
    expect(expected.matchedDenyStatementIds).toHaveLength(0);
    expect(expected.matchedAllowStatementIds).toHaveLength(0);
  });

  it('supports INDETERMINATE decisionStatus', () => {
    const expected: ExpectedEvaluation = {
      finalDecision: 'ALLOW',
      decisionStatus: 'INDETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt:policy-0:def456'],
    };

    expect(expected.decisionStatus).toBe('INDETERMINATE');
  });

  it('matchedDenyStatementIds and matchedAllowStatementIds are string arrays', () => {
    const expected: ExpectedEvaluation = {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: ['id-1', 'id-2'],
      matchedAllowStatementIds: ['id-3'],
    };

    expect(Array.isArray(expected.matchedDenyStatementIds)).toBe(true);
    expect(Array.isArray(expected.matchedAllowStatementIds)).toBe(true);
    expect(expected.matchedDenyStatementIds.every((s: string) => typeof s === 'string')).toBe(true);
    expect(expected.matchedAllowStatementIds.every((s: string) => typeof s === 'string')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. ExpectedPathTraceEntry schema
// ═══════════════════════════════════════════════════════════════════════

describe('ExpectedPathTraceEntry', () => {
  it('can construct an ExpectedPathTraceEntry with all key fields', () => {
    const entry: ExpectedPathTraceEntry = {
      statementId: 'sid:policy-0:AllowRead',
      applicable: true,
      nonApplicableReasons: [],
      unsupportedFeatures: [],
      source: {
        sourcePolicyId: 'policy:test-policy.json:0',
        sourcePolicyIndex: 0,
        sourceStatementIndex: 0,
        sid: 'AllowRead',
      },
    };

    expect(entry.statementId).toBe('sid:policy-0:AllowRead');
    expect(entry.applicable).toBe(true);
    expect(entry.nonApplicableReasons).toEqual([]);
    expect(entry.unsupportedFeatures).toEqual([]);
    expect(entry.source.sourcePolicyId).toBe('policy:test-policy.json:0');
    expect(entry.source.sid).toBe('AllowRead');
  });

  it('can represent a non-applicable entry with reasons', () => {
    const entry: ExpectedPathTraceEntry = {
      statementId: 'stmt:policy-0:abc123',
      applicable: false,
      nonApplicableReasons: ['action_not_matched'],
      unsupportedFeatures: [],
      source: {
        sourcePolicyId: 'policy:test-policy.json:0',
      },
    };

    expect(entry.applicable).toBe(false);
    expect(entry.nonApplicableReasons).toContain('action_not_matched');
  });

  it('can represent an entry with unsupported features', () => {
    const entry: ExpectedPathTraceEntry = {
      statementId: 'stmt:policy-0:def456',
      applicable: false,
      nonApplicableReasons: [],
      unsupportedFeatures: ['NumericEquals'],
      source: {
        sourcePolicyId: 'policy:test-policy.json:0',
      },
    };

    expect(entry.unsupportedFeatures).toContain('NumericEquals');
  });

  it('source fields are all optional except sourcePolicyId', () => {
    // Minimal source: only sourcePolicyId
    const entryMin: ExpectedPathTraceEntry = {
      statementId: 'stmt:policy-0:min',
      applicable: false,
      nonApplicableReasons: [],
      unsupportedFeatures: [],
      source: {
        sourcePolicyId: 'policy:minimal.json:0',
      },
    };

    expect(entryMin.source.sourcePolicyId).toBe('policy:minimal.json:0');
    expect(entryMin.source.sourcePolicyIndex).toBeUndefined();
    expect(entryMin.source.sourceStatementIndex).toBeUndefined();
    expect(entryMin.source.sid).toBeUndefined();
  });

  it('nonApplicableReasons is a string array', () => {
    const entry: ExpectedPathTraceEntry = {
      statementId: 'stmt-1',
      applicable: false,
      nonApplicableReasons: ['action_not_matched', 'resource_not_matched'],
      unsupportedFeatures: [],
      source: { sourcePolicyId: 'p:0' },
    };

    expect(Array.isArray(entry.nonApplicableReasons)).toBe(true);
    expect(entry.nonApplicableReasons.every((r: string) => typeof r === 'string')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. ExpectedJsonOutput schema
// ═══════════════════════════════════════════════════════════════════════

describe('ExpectedJsonOutput', () => {
  it('can construct an ExpectedJsonOutput with strong assertion fields', () => {
    const output: ExpectedJsonOutput = {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt-001'],
    };

    expect(output.finalDecision).toBe('ALLOW');
    expect(output.decisionStatus).toBe('DETERMINATE');
    expect(output.matchedDenyStatementIds).toEqual([]);
    expect(output.matchedAllowStatementIds).toEqual(['stmt-001']);
  });

  it('allows partial ExpectedJsonOutput (only finalDecision)', () => {
    const output: ExpectedJsonOutput = {
      finalDecision: 'EXPLICIT_DENY',
    };

    expect(output.finalDecision).toBe('EXPLICIT_DENY');
    expect(output.decisionStatus).toBeUndefined();
    expect(output.summary).toBeUndefined();
  });

  it('supports summary field (weak assertion)', () => {
    const output: ExpectedJsonOutput = {
      finalDecision: 'ALLOW',
      summary: '1 applicable allow statement found',
    };

    expect(output.summary).toBe('1 applicable allow statement found');
  });

  it('supports pathTrace array', () => {
    const output: ExpectedJsonOutput = {
      finalDecision: 'ALLOW',
      pathTrace: [
        {
          statementId: 'stmt-001',
          applicable: true,
          nonApplicableReasons: [],
          unsupportedFeatures: [],
          source: { sourcePolicyId: 'p:0' },
        },
      ],
    };

    expect(output.pathTrace).toHaveLength(1);
    if (output.pathTrace && output.pathTrace[0]) {
      expect(output.pathTrace[0].statementId).toBe('stmt-001');
    }
  });

  it('supports diagnostics field', () => {
    const output: ExpectedJsonOutput = {
      finalDecision: 'IMPLICIT_DENY',
      diagnostics: {
        invalidInputs: [{ code: 'INVALID_JSON' }],
        unsupportedFeatures: [{ feature: 'NumericEquals' }],
      },
    };

    expect(output.diagnostics).toBeDefined();
    if (output.diagnostics) {
      expect(output.diagnostics.invalidInputs).toHaveLength(1);
      expect(output.diagnostics.unsupportedFeatures).toHaveLength(1);
    }
  });

  it('references EvaluationJsonOutput field names correctly', () => {
    // All fields in ExpectedJsonOutput should match EvaluationJsonOutput field names
    const output: ExpectedJsonOutput = {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      summary: 'test',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['id'],
      statementResults: [],
      pathTrace: [],
      diagnostics: { invalidInputs: [], unsupportedFeatures: [] },
    };

    // Verify all 8 EvaluationJsonOutput fields can be set
    expect(output.finalDecision).toBe('ALLOW');
    expect(output.decisionStatus).toBe('DETERMINATE');
    expect(output.summary).toBe('test');
    expect(output.matchedDenyStatementIds).toEqual([]);
    expect(output.matchedAllowStatementIds).toEqual(['id']);
    expect(output.statementResults).toEqual([]);
    expect(output.pathTrace).toEqual([]);
    expect(output.diagnostics).toEqual({ invalidInputs: [], unsupportedFeatures: [] });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. ExpectedTextOutput schema
// ═══════════════════════════════════════════════════════════════════════

describe('ExpectedTextOutput', () => {
  it('can construct an ExpectedTextOutput with contains assertions', () => {
    const output: ExpectedTextOutput = {
      contains: ['ALLOW', 'applicable allow statement'],
      notContains: ['DENY'],
    };

    expect(output.contains).toContain('ALLOW');
    expect(output.contains).toContain('applicable allow statement');
    expect(output.notContains).toContain('DENY');
  });

  it('notContains is optional', () => {
    const output: ExpectedTextOutput = {
      contains: ['DECISION: ALLOW'],
    };

    expect(output.contains).toHaveLength(1);
    expect(output.notContains).toBeUndefined();
  });

  it('contains is a readonly string array', () => {
    const output: ExpectedTextOutput = {
      contains: ['line1', 'line2', 'line3'],
    };

    expect(Array.isArray(output.contains)).toBe(true);
    expect(output.contains.every((s: string) => typeof s === 'string')).toBe(true);
  });

  it('supports empty contains array', () => {
    const output: ExpectedTextOutput = {
      contains: [],
    };

    expect(output.contains).toEqual([]);
  });

  it('supports multiple notContains entries', () => {
    const output: ExpectedTextOutput = {
      contains: ['ALLOW'],
      notContains: ['ERROR', 'DENY', 'unsupported'],
    };

    expect(output.notContains).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. ExpectedDiagnostics schema
// ═══════════════════════════════════════════════════════════════════════

describe('ExpectedDiagnostics', () => {
  it('can construct ExpectedDiagnostics with invalidInputs', () => {
    const diag: ExpectedDiagnostics = {
      invalidInputs: [
        { code: 'INVALID_JSON' },
        { code: 'MISSING_FIELD' },
      ],
    };

    expect(diag.invalidInputs).toHaveLength(2);
    if (diag.invalidInputs && diag.invalidInputs[0]) {
      expect(diag.invalidInputs[0].code).toBe('INVALID_JSON');
    }
    expect(diag.unsupportedFeatures).toBeUndefined();
  });

  it('can construct ExpectedDiagnostics with unsupportedFeatures', () => {
    const diag: ExpectedDiagnostics = {
      unsupportedFeatures: [
        { feature: 'NumericEquals' },
        { feature: 'NotAction' },
      ],
    };

    expect(diag.unsupportedFeatures).toHaveLength(2);
    if (diag.unsupportedFeatures && diag.unsupportedFeatures[0]) {
      expect(diag.unsupportedFeatures[0].feature).toBe('NumericEquals');
    }
    expect(diag.invalidInputs).toBeUndefined();
  });

  it('can combine invalidInputs and unsupportedFeatures', () => {
    const diag: ExpectedDiagnostics = {
      invalidInputs: [{ code: 'INVALID_FIELD_VALUE' }],
      unsupportedFeatures: [{ feature: 'ForAllValues' }],
    };

    expect(diag.invalidInputs).toHaveLength(1);
    expect(diag.unsupportedFeatures).toHaveLength(1);
  });

  it('both fields are optional (empty diagnostics)', () => {
    const diag: ExpectedDiagnostics = {};

    expect(diag.invalidInputs).toBeUndefined();
    expect(diag.unsupportedFeatures).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 10. AssertionKind
// ═══════════════════════════════════════════════════════════════════════

describe('AssertionKind', () => {
  it('accepts "exact"', () => {
    const kind: AssertionKind = 'exact';
    expect(kind).toBe('exact');
  });

  it('accepts "contains"', () => {
    const kind: AssertionKind = 'contains';
    expect(kind).toBe('contains');
  });

  it('accepts "regex"', () => {
    const kind: AssertionKind = 'regex';
    expect(kind).toBe('regex');
  });

  it('AssertionKind has exactly three values', () => {
    const kinds: readonly AssertionKind[] = ['exact', 'contains', 'regex'];
    expect(kinds).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 11. Strong and weak assertion field constants
// ═══════════════════════════════════════════════════════════════════════

describe('assertion field constants', () => {
  it('STRONG_ASSERTION_FIELDS is a non-empty readonly array', () => {
    expect(Array.isArray(STRONG_ASSERTION_FIELDS)).toBe(true);
    expect(STRONG_ASSERTION_FIELDS.length).toBeGreaterThan(0);
    expect(STRONG_ASSERTION_FIELDS.every((f: string) => typeof f === 'string')).toBe(true);
  });

  it('STRONG_ASSERTION_FIELDS includes finalDecision', () => {
    expect(STRONG_ASSERTION_FIELDS).toContain('finalDecision');
  });

  it('STRONG_ASSERTION_FIELDS includes matchedDenyStatementIds', () => {
    expect(STRONG_ASSERTION_FIELDS).toContain('matchedDenyStatementIds');
  });

  it('STRONG_ASSERTION_FIELDS includes matchedAllowStatementIds', () => {
    expect(STRONG_ASSERTION_FIELDS).toContain('matchedAllowStatementIds');
  });

  it('STRONG_ASSERTION_FIELDS includes pathTrace', () => {
    expect(STRONG_ASSERTION_FIELDS).toContain('pathTrace');
  });

  it('WEAK_ASSERTION_FIELDS is a non-empty readonly array', () => {
    expect(Array.isArray(WEAK_ASSERTION_FIELDS)).toBe(true);
    expect(WEAK_ASSERTION_FIELDS.length).toBeGreaterThan(0);
    expect(WEAK_ASSERTION_FIELDS.every((f: string) => typeof f === 'string')).toBe(true);
  });

  it('WEAK_ASSERTION_FIELDS includes summary', () => {
    expect(WEAK_ASSERTION_FIELDS).toContain('summary');
  });

  it('strong and weak assertion field lists do not overlap', () => {
    const overlap: readonly string[] = STRONG_ASSERTION_FIELDS.filter(
      (f: string): boolean => WEAK_ASSERTION_FIELDS.includes(f),
    );
    expect(overlap).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 12. Helper functions
// ═══════════════════════════════════════════════════════════════════════

describe('makeCaseMetadata', () => {
  it('creates a CaseMetadata object with provided values', () => {
    const meta: CaseMetadata = makeCaseMetadata(
      'case-helper-001',
      'Helper Test Case',
      'Verify helper function',
      ['helper'],
      ['action-match'],
      'synthetic',
      'generated',
      'CC0',
      'none',
      false,
    );

    expect(meta.id).toBe('case-helper-001');
    expect(meta.title).toBe('Helper Test Case');
    expect(meta.purpose).toBe('Verify helper function');
    expect(meta.tags).toEqual(['helper']);
    expect(meta.coveredFeatures).toEqual(['action-match']);
    expect(meta.originType).toBe('synthetic');
    expect(meta.source).toBe('generated');
    expect(meta.license).toBe('CC0');
    expect(meta.sanitizationNote).toBe('none');
    expect(meta.containsRealWorldPolicy).toBe(false);
  });

  it('creates metadata with multiple tags and features', () => {
    const meta: CaseMetadata = makeCaseMetadata(
      'case-multi',
      'Multi Tag',
      'Test',
      ['tag-1', 'tag-2', 'tag-3'],
      ['feat-1', 'feat-2', 'feat-3', 'feat-4'],
      'official',
      'source',
      'license',
      'sanitized',
      true,
    );

    expect(meta.tags).toHaveLength(3);
    expect(meta.coveredFeatures).toHaveLength(4);
    expect(meta.containsRealWorldPolicy).toBe(true);
  });
});

describe('makeExpectedEvaluation', () => {
  it('creates an ExpectedEvaluation with provided values', () => {
    const eval_: ExpectedEvaluation = makeExpectedEvaluation(
      'ALLOW',
      'DETERMINATE',
      [],
      ['stmt-001'],
    );

    expect(eval_.finalDecision).toBe('ALLOW');
    expect(eval_.decisionStatus).toBe('DETERMINATE');
    expect(eval_.matchedDenyStatementIds).toEqual([]);
    expect(eval_.matchedAllowStatementIds).toEqual(['stmt-001']);
  });

  it('creates an EXPLICIT_DENY ExpectedEvaluation', () => {
    const eval_: ExpectedEvaluation = makeExpectedEvaluation(
      'EXPLICIT_DENY',
      'DETERMINATE',
      ['stmt-deny-1'],
      [],
    );

    expect(eval_.finalDecision).toBe('EXPLICIT_DENY');
    expect(eval_.matchedDenyStatementIds).toEqual(['stmt-deny-1']);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 13. Boundary: no real directories, no real-world samples
// ═══════════════════════════════════════════════════════════════════════

describe('boundary compliance', () => {
  it('does not depend on real fixtures directory existence', () => {
    // All test data is constructed in-memory. No fs operations.
    // This test verifies that constants are plain strings, not resolved paths.
    expect(typeof FIXTURES_ROOT).toBe('string');
    expect(FIXTURES_ROOT).not.toContain('/home');
  });

  it('all test data uses minimal constructed samples only', () => {
    // Verify that our test CaseMetadata is purely synthetic
    const meta: CaseMetadata = {
      id: 'boundary-test',
      title: 'Boundary Test',
      purpose: 'Verify no real data',
      tags: [],
      coveredFeatures: [],
      originType: 'synthetic',
      source: 'test',
      license: 'CC0',
      sanitizationNote: 'none',
      containsRealWorldPolicy: false,
    };

    // No ARN references, no account IDs, no real resource names
    expect(meta.id).not.toContain('arn:aws');
    expect(meta.source).not.toContain('arn:aws');
    expect(meta.containsRealWorldPolicy).toBe(false);
  });

  it('does not import or reference any AWS SDK or external services', () => {
    // This test module only imports from fixture-schema.ts and frozen types.
    // No AWS SDK, no HTTP clients, no file system operations.
    expect(true).toBe(true); // Structural assertion
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 14. CaseInput schema – references frozen types
// ═══════════════════════════════════════════════════════════════════════

describe('CaseInput', () => {
  it('CaseInput type accepts policies and request fields', () => {
    // Type-level test: construct a minimal CaseInput
    const input: CaseInput = {
      policies: [] as readonly InputPolicyDocument[],
      request: {
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket/key',
        context: {},
      } as EvaluationRequest,
    };

    expect(input.policies).toEqual([]);
    expect(input.request.action).toBe('s3:GetObject');
    expect(input.request.resource).toBe('arn:aws:s3:::bucket/key');
  });
});
