/**
 * boundary-golden-cases.ts – Z05-D04: invalid / unsupported / indeterminate
 * boundary golden cases planning.
 *
 * This module defines:
 * 1. BoundaryGoldenCaseCategory – union type of 10 boundary golden case categories
 * 2. BoundaryGoldenCaseOutline – type describing a single boundary golden case's
 *    planning metadata and expected assertions
 * 3. MINIMAL_BOUNDARY_GOLDEN_CASES – minimum set of >=10 boundary golden case
 *    outlines covering invalid, unsupported, indeterminate, diagnostics,
 *    pathTrace, JSON, text, source-unavailable, and empty-collections directions
 *
 * Boundary:
 * - Does NOT create real fixtures directories (test-fixtures/cases/...)
 * - Does NOT generate golden output files (expected-*.json, etc.)
 * - Does NOT introduce real-world IAM Policy samples
 * - Does NOT modify Z01-Z04 frozen modules (parser, engine, reporters)
 * - Does NOT modify Z05-D01 fixture-schema.ts
 * - Does NOT modify Z05-D02 golden-cases.ts
 * - Does NOT modify Z05-D03 output-golden-cases.ts
 * - Does NOT implement CLI, stdout/stderr, or file I/O
 * - Does NOT use `any` type
 * - All exported types use readonly modifiers
 * - Imports from D01 are `import type` only – no runtime dependency
 */
import type {
  ExpectedEvaluation,
  ExpectedPathTraceEntry,
  ExpectedDiagnostics,
} from './fixture-schema.js';

// ═══════════════════════════════════════════════════════════════════════
// 1. BoundaryGoldenCaseCategory
// ═══════════════════════════════════════════════════════════════════════

/**
 * Category of a boundary golden case, representing the boundary focus area.
 *
 * - `invalid-input`: cases where input is structurally or semantically invalid
 *   and cannot be evaluated normally (malformed JSON, missing Statement,
 *   invalid Effect/Action/Resource types, etc.)
 * - `unsupported-feature`: cases where the input structure is recognizable
 *   but uses features explicitly not supported in the first phase
 *   (NotAction, NotResource, variable substitution, etc.)
 * - `unsupported-condition`: cases where a Condition uses an operator
 *   not supported in the first phase (NumericEquals, DateEquals, etc.);
 *   typically triggers INDETERMINATE decision status
 * - `indeterminate-decision`: cases where the engine produces
 *   decisionStatus = INDETERMINATE due to unsupported semantics that
 *   could affect the final result
 * - `diagnostics-output`: cases focused on the diagnostics output
 *   structure (invalidInputs codes, unsupportedFeatures identifiers)
 * - `path-trace-boundary`: cases focused on pathTrace boundary behaviors
 *   (empty trace, unsupportedFeatures in entries, nonApplicableReasons,
 *   source unavailability)
 * - `json-boundary`: cases focused on JSON output boundary behaviors
 *   (decisionStatus field, diagnostics, undefined field handling,
 *   empty collections)
 * - `text-boundary`: cases focused on text/report output boundary
 *   behaviors (diagnostics section, "none" markers, source-unavailable
 *   human-readable expression, indeterminate status phrasing)
 * - `source-unavailable`: cases where source provenance information
 *   is partially or completely unavailable (e.g., invalid policies
 *   where no valid statement source can be determined)
 * - `empty-collections`: cases where output collections are empty
 *   (empty pathTrace, empty matched IDs, "none" markers in text output)
 */
export type BoundaryGoldenCaseCategory =
  | 'invalid-input'
  | 'unsupported-feature'
  | 'unsupported-condition'
  | 'indeterminate-decision'
  | 'diagnostics-output'
  | 'path-trace-boundary'
  | 'json-boundary'
  | 'text-boundary'
  | 'source-unavailable'
  | 'empty-collections';

/**
 * All valid BoundaryGoldenCaseCategory values.
 *
 * Used for runtime validation and test coverage checks.
 */
export const VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES: readonly BoundaryGoldenCaseCategory[] = [
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
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 2. BoundaryGoldenCaseOutline
// ═══════════════════════════════════════════════════════════════════════

/**
 * Outline / planning record describing a single boundary golden case.
 *
 * Complements the D02 GoldenCaseOutline and D03 OutputGoldenCaseOutline
 * with boundary-specific focus: invalid input detection, unsupported feature
 * reporting, indeterminate decision handling, diagnostics structure, and
 * output-layer boundary behaviors.
 *
 * Required fields:
 * - id: unique case identifier within the boundary golden cases collection
 * - category: boundary focus area classification
 * - purpose: description of what this case verifies
 * - assertionFields: strong/weak assertion fields this case focuses on
 *   (references STRONG_ASSERTION_FIELDS and WEAK_ASSERTION_FIELDS from D01)
 *
 * Optional fields:
 * - relatedBaseCaseId: references a GoldenCaseOutline.id from D02
 *   MINIMAL_GOLDEN_CASES or an OutputGoldenCaseOutline.id from D03
 *   MINIMAL_OUTPUT_GOLDEN_CASES for input/output provenance
 * - expectedEvaluation: expected evaluation result for this boundary case
 * - expectedPathTrace: expected per-statement path trace entries
 * - expectedDiagnostics: expected diagnostic information (invalid input
 *   codes or unsupported feature identifiers)
 * - notes: free-form planning notes for case authors
 *
 * All fields are readonly. This type extends the D02/D03 outline concept
 * with boundary-specific fields and constraints.
 */
export interface BoundaryGoldenCaseOutline {
  /** Unique case identifier within the boundary golden cases collection */
  readonly id: string;
  /** Boundary focus area classification */
  readonly category: BoundaryGoldenCaseCategory;
  /** Description of what this case verifies */
  readonly purpose: string;
  /** Strong/weak assertion fields this case focuses on */
  readonly assertionFields: readonly string[];
  /** References a base case ID from D02 or D03 for provenance (optional) */
  readonly relatedBaseCaseId?: string;
  /** Expected evaluation result for this boundary case (optional) */
  readonly expectedEvaluation?: ExpectedEvaluation;
  /** Expected per-statement path trace entries (optional) */
  readonly expectedPathTrace?: readonly ExpectedPathTraceEntry[];
  /** Expected diagnostic information (optional) */
  readonly expectedDiagnostics?: ExpectedDiagnostics;
  /** Free-form planning notes (optional) */
  readonly notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. MINIMAL_BOUNDARY_GOLDEN_CASES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Minimum set of >=10 boundary golden case outlines covering:
 *
 * invalid-input directions:
 *   - malformed policy structure (missing Statement, bad JSON)
 *
 * unsupported-feature directions:
 *   - policy with unsupported feature (e.g., NotAction)
 *
 * unsupported-condition directions:
 *   - condition with unsupported operator triggering INDETERMINATE
 *
 * indeterminate-decision directions:
 *   - decisionStatus === INDETERMINATE with diagnostics
 *
 * diagnostics-output directions:
 *   - invalidInputs codes in diagnostics
 *   - unsupportedFeatures in diagnostics
 *
 * path-trace-boundary directions:
 *   - unsupportedFeatures in pathTrace entries
 *   - nonApplicableReasons in pathTrace
 *
 * json-boundary directions:
 *   - decisionStatus field in JSON output
 *   - empty collections in JSON output
 *
 * text-boundary directions:
 *   - diagnostics section in text output
 *   - indeterminate human-readable expression
 *
 * source-unavailable directions:
 *   - source fields unavailable (invalid policy, no valid provenance)
 *
 * empty-collections directions:
 *   - empty arrays and "none" markers across output layers
 *
 * All cases are synthetic planning outlines only – no real-world IAM Policy
 * samples are embedded or referenced. No actual fixture directories or
 * golden output files are created.
 */
export const MINIMAL_BOUNDARY_GOLDEN_CASES: readonly BoundaryGoldenCaseOutline[] = [
  // ═════════════════════════════════════════════════════════════════════
  // 1. invalid-input: malformed policy input boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-invalid-input',
    category: 'invalid-input',
    purpose: 'Verify boundary behavior when input policy is structurally invalid (missing Statement field).',
    assertionFields: [
      'diagnostics.invalidInputs',
      'finalDecision',
      'decisionStatus',
    ],
    relatedBaseCaseId: 'gc-invalid-policy',
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedDiagnostics: {
      invalidInputs: [{ code: 'INVALID_POLICY_STRUCTURE' }],
    },
    notes: 'Boundary case for invalid input: tests that structurally invalid policy produces invalidInputs diagnostics and IMPLICIT_DENY.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 2. unsupported-feature: unsupported policy feature boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-unsupported-feature',
    category: 'unsupported-feature',
    purpose: 'Verify boundary behavior when a policy uses an unsupported feature (e.g., NotAction) that the engine cannot evaluate.',
    assertionFields: [
      'diagnostics.unsupportedFeatures',
      'finalDecision',
      'decisionStatus',
    ],
    expectedDiagnostics: {
      unsupportedFeatures: [{ feature: 'NotAction' }],
    },
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'INDETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    notes: 'Boundary case for unsupported feature: NotAction is structurally recognizable but not supported in the first phase. Triggers INDETERMINATE because the statement could potentially match the requested action.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 3. unsupported-condition: unsupported condition operator boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-unsupported-condition',
    category: 'unsupported-condition',
    purpose: 'Verify boundary behavior when a condition uses an unsupported operator (e.g., NumericEquals) that triggers INDETERMINATE decision status.',
    assertionFields: [
      'diagnostics.unsupportedFeatures',
      'finalDecision',
      'decisionStatus',
    ],
    relatedBaseCaseId: 'gc-unsupported-condition',
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'INDETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedDiagnostics: {
      unsupportedFeatures: [{ feature: 'ConditionOperator:NumericEquals' }],
    },
    notes: 'Boundary case for unsupported condition: NumericEquals is not in the first-phase supported operator set. Decision becomes INDETERMINATE because the condition could potentially grant access if supported.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 4. indeterminate-decision: INDETERMINATE decision status boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-indeterminate-decision',
    category: 'indeterminate-decision',
    purpose: 'Verify boundary behavior of decisionStatus = INDETERMINATE, including that finalDecision is a provisional result based only on supported semantics.',
    assertionFields: [
      'decisionStatus',
      'finalDecision',
      'diagnostics.unsupportedFeatures',
    ],
    relatedBaseCaseId: 'gc-unsupported-condition',
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'INDETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedDiagnostics: {
      unsupportedFeatures: [{ feature: 'ConditionOperator:StringNotEquals' }],
    },
    notes: 'Boundary case for indeterminate decision: verifies that INDETERMINATE status correctly marks a provisional result. The unsupported operator (StringNotEquals) could potentially change the final outcome if supported.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 5. diagnostics-output: diagnostics with invalidInputs boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-diagnostics-invalid',
    category: 'diagnostics-output',
    purpose: 'Verify diagnostics output boundary for invalidInputs: codes are present, structured correctly, and do not leak into other output sections.',
    assertionFields: [
      'diagnostics.invalidInputs',
      'diagnostics.unsupportedFeatures',
    ],
    relatedBaseCaseId: 'gc-invalid-policy',
    expectedDiagnostics: {
      invalidInputs: [
        { code: 'MISSING_FIELD' },
        { code: 'INVALID_FIELD_VALUE' },
      ],
    },
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    notes: 'Boundary case for diagnostics with multiple invalidInputs codes: verifies that multiple validation failures are reported and diagnosable.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 6. diagnostics-output: diagnostics with unsupportedFeatures boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-diagnostics-unsupported',
    category: 'diagnostics-output',
    purpose: 'Verify diagnostics output boundary for unsupportedFeatures: multiple feature identifiers are present and correctly structured.',
    assertionFields: [
      'diagnostics.unsupportedFeatures',
      'decisionStatus',
    ],
    expectedDiagnostics: {
      unsupportedFeatures: [
        { feature: 'ConditionOperator:NumericEquals' },
        { feature: 'NotResource' },
      ],
    },
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'INDETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    notes: 'Boundary case for diagnostics with multiple unsupportedFeatures: verifies that multiple unsupported features are each individually reported.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 7. path-trace-boundary: pathTrace with unsupportedFeatures
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-path-trace-boundary',
    category: 'path-trace-boundary',
    purpose: 'Verify pathTrace boundary: entries with unsupportedFeatures and nonApplicableReasons are correctly structured even in edge cases.',
    assertionFields: [
      'pathTrace',
      'statementId',
      'unsupportedFeatures',
      'nonApplicableReasons',
    ],
    relatedBaseCaseId: 'ogc-pt-unsupported',
    expectedPathTrace: [
      {
        statementId: 'stmt-unsupported-1',
        applicable: false,
        nonApplicableReasons: ['condition_not_matched'],
        unsupportedFeatures: ['ConditionOperator:ArnEquals'],
        source: {
          sourcePolicyId: 'policy-0',
        },
      },
    ],
    notes: 'Boundary case for pathTrace: verifies that unsupportedFeatures in pathTrace entries co-exist with nonApplicableReasons without conflict. Statement is non-applicable because the unsupported condition cannot be evaluated.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 8. json-boundary: JSON output with decisionStatus boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-json-boundary',
    category: 'json-boundary',
    purpose: 'Verify JSON output boundary: decisionStatus field is present, INDETERMINATE is correctly serialized, and diagnostics coexist with evaluation fields.',
    assertionFields: [
      'finalDecision',
      'decisionStatus',
      'diagnostics.unsupportedFeatures',
    ],
    relatedBaseCaseId: 'ogc-json-indeterminate',
    notes: 'Boundary case for JSON output: verifies that decisionStatus = INDETERMINATE coexists with finalDecision = IMPLICIT_DENY in the JSON output, and that unsupportedFeatures diagnostics are present without corrupting core evaluation fields.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 9. text-boundary: text output with diagnostics/INDETERMINATE
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-text-boundary',
    category: 'text-boundary',
    purpose: 'Verify text output boundary: human-readable expression of INDETERMINATE status and diagnostics section content.',
    assertionFields: [
      'textOutput',
      'diagnostics.unsupportedFeatures',
    ],
    relatedBaseCaseId: 'ogc-text-diagnostics',
    notes: 'Boundary case for text output: verifies that the text output includes INDETERMINATE status markers and human-readable diagnostics section content. The text must clearly distinguish "unsupported" from "denied" or "allowed".',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 10. source-unavailable: source fields unavailable boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-source-unavailable',
    category: 'source-unavailable',
    purpose: 'Verify boundary behavior when source provenance information is unavailable: pathTrace is empty, no valid statement IDs can be determined.',
    assertionFields: [
      'pathTrace',
      'diagnostics.invalidInputs',
    ],
    relatedBaseCaseId: 'ogc-source-unavailable',
    expectedPathTrace: [],
    expectedDiagnostics: {
      invalidInputs: [{ code: 'INVALID_POLICY_STRUCTURE' }],
    },
    notes: 'Boundary case for source-unavailable: when the input is invalid, no valid statement sources can be produced. pathTrace should be empty, and diagnostics should explain the invalidity.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // 11. empty-collections: empty arrays/none markers boundary
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'bgc-empty-collections',
    category: 'empty-collections',
    purpose: 'Verify boundary behavior when all output collections are empty: empty matchedDenyStatementIds, matchedAllowStatementIds, and pathTrace.',
    assertionFields: [
      'pathTrace',
      'matchedDenyStatementIds',
      'matchedAllowStatementIds',
      'textOutput',
    ],
    relatedBaseCaseId: 'ogc-empty-output',
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'Boundary case for empty collections: verifies that all collection fields are empty arrays when no statements match. Ensures no undefined or null leakage for collection fields.',
  },
] as const;
