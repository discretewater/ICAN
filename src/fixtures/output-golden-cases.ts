/**
 * output-golden-cases.ts – Z05-D03: pathTrace / JSON / text output golden cases planning.
 *
 * This module defines:
 * 1. OutputGoldenCaseKind – union type of six output golden case kinds
 * 2. OutputGoldenCaseOutline – type describing a single output golden case's planning
 *    metadata and expected assertions
 * 3. MINIMAL_OUTPUT_GOLDEN_CASES – minimum set of output golden case outlines covering
 *    pathTrace (allowed/denied/non-applicable/unsupported/source-unavailable),
 *    JSON (allow/deny/indeterminate), text (allow/diagnostics),
 *    empty collections, and source-unavailable scenarios
 *
 * Boundary:
 * - Does NOT create real fixtures directories (test-fixtures/cases/...)
 * - Does NOT generate golden output files (expected-json-output.json, etc.)
 * - Does NOT introduce real-world IAM Policy samples
 * - Does NOT modify Z01-Z04 frozen modules (parser, engine, reporters)
 * - Does NOT modify Z05-D01 fixture-schema.ts
 * - Does NOT modify Z05-D02 golden-cases.ts
 * - Does NOT implement CLI, stdout/stderr, or file I/O
 * - Does NOT use `any` type
 * - All exported types use readonly modifiers
 * - Imports from D01 are `import type` only – no runtime dependency
 */

// ─── Import frozen D01 types (type-only, no runtime dependency) ───────
import type {
  ExpectedPathTraceEntry,
  ExpectedJsonOutput,
  ExpectedTextOutput,
  ExpectedDiagnostics,
} from './fixture-schema.js';

// ═══════════════════════════════════════════════════════════════════════
// 1. OutputGoldenCaseKind
// ═══════════════════════════════════════════════════════════════════════

/**
 * Kind of an output golden case, representing the output layer focus.
 *
 * - `path-trace`: focuses on pathTrace output assertions
 *   (statementId, applicable, nonApplicableReasons, unsupportedFeatures, source)
 * - `json-output`: focuses on JSON output structure assertions
 *   (finalDecision, decisionStatus, summary, matched IDs, diagnostics)
 * - `text-output`: focuses on human-readable text/report output assertions
 *   (title, section ordering, decision/summary/diagnostics text, "none")
 * - `diagnostics-output`: focuses on diagnostic output assertions
 *   (invalid input codes, unsupported feature identifiers)
 * - `source-unavailable`: focuses on cross-cutting source field unavailability
 *   (source fields may be undefined or empty)
 * - `empty-output`: focuses on empty collection / "none" output expressions
 *   (empty arrays in JSON, "none" markers in text)
 */
export type OutputGoldenCaseKind =
  | 'path-trace'
  | 'json-output'
  | 'text-output'
  | 'diagnostics-output'
  | 'source-unavailable'
  | 'empty-output';

/**
 * All valid OutputGoldenCaseKind values.
 *
 * Used for runtime validation and test coverage checks.
 */
export const VALID_OUTPUT_GOLDEN_CASE_KINDS: readonly OutputGoldenCaseKind[] = [
  'path-trace',
  'json-output',
  'text-output',
  'diagnostics-output',
  'source-unavailable',
  'empty-output',
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 2. OutputGoldenCaseOutline
// ═══════════════════════════════════════════════════════════════════════

/**
 * Outline / planning record describing a single output golden case.
 *
 * Extends the D02 GoldenCaseOutline concept to output-layer concerns.
 * Each outline focuses on one output kind and references a D02 base case
 * via baseCaseId to establish input/expected-evaluation provenance.
 *
 * Required fields:
 * - id: unique identifier
 * - baseCaseId: references GoldenCaseOutline.id from D02 MINIMAL_GOLDEN_CASES
 * - kind: output layer focus
 * - purpose: description of what this case verifies
 * - assertionFields: which strong/weak assertion fields this case focuses on
 *   (references STRONG_ASSERTION_FIELDS and WEAK_ASSERTION_FIELDS from D01)
 *
 * Optional fields:
 * - expectedPathTrace: expected per-statement path trace entries
 * - expectedJson: expected JSON output partial assertions
 * - expectedText: expected text/report output assertions (contains/notContains)
 * - expectedDiagnostics: expected diagnostic information
 * - notes: free-form planning notes for case authors
 *
 * All fields are readonly.
 */
export interface OutputGoldenCaseOutline {
  /** Unique case identifier within the output golden cases collection */
  readonly id: string;
  /** References a GoldenCaseOutline.id from D02 MINIMAL_GOLDEN_CASES */
  readonly baseCaseId: string;
  /** Output layer focus of this golden case */
  readonly kind: OutputGoldenCaseKind;
  /** Description of what this case verifies */
  readonly purpose: string;
  /** Strong/weak assertion fields this case focuses on */
  readonly assertionFields: readonly string[];
  /** Expected per-statement path trace entries (optional) */
  readonly expectedPathTrace?: readonly ExpectedPathTraceEntry[];
  /** Expected JSON output partial assertions (optional) */
  readonly expectedJson?: ExpectedJsonOutput;
  /** Expected text/report output assertions (optional) */
  readonly expectedText?: ExpectedTextOutput;
  /** Expected diagnostic information (optional) */
  readonly expectedDiagnostics?: ExpectedDiagnostics;
  /** Free-form planning notes (optional) */
  readonly notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. MINIMAL_OUTPUT_GOLDEN_CASES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Minimum set of output golden case outlines covering:
 *
 * pathTrace scenarios:
 *   - allowed (applicable, Allow effect)
 *   - denied (applicable, Deny effect)
 *   - non-applicable (with nonApplicableReasons)
 *   - unsupported (with unsupportedFeatures)
 *   - source-unavailable (empty/minimal path trace)
 *
 * JSON output scenarios:
 *   - allow (ALLOW finalDecision)
 *   - deny (EXPLICIT_DENY finalDecision)
 *   - indeterminate (INDETERMINATE decisionStatus)
 *
 * Text output scenarios:
 *   - allow (human-readable ALLOW text)
 *   - diagnostics (diagnostics present in text)
 *
 * Cross-cutting scenarios:
 *   - empty collections (empty arrays, "none" markers)
 *   - source unavailable (source fields not available)
 *
 * All cases reference D02 MINIMAL_GOLDEN_CASES for input/evaluation provenance.
 * All cases are synthetic planning outlines only – no real-world IAM Policy
 * samples are embedded or referenced.
 */
export const MINIMAL_OUTPUT_GOLDEN_CASES: readonly OutputGoldenCaseOutline[] = [
  // ═════════════════════════════════════════════════════════════════════
  // pathTrace cases (5)
  // ═════════════════════════════════════════════════════════════════════

  // ── ogc-pt-allow ──
  // pathTrace for an allowed (applicable) statement.
  {
    id: 'ogc-pt-allow',
    baseCaseId: 'gc-allow-single',
    kind: 'path-trace',
    purpose: 'Verify pathTrace output for an allowed, fully applicable Allow statement.',
    assertionFields: [
      'pathTrace',
      'statementId',
      'applicable',
      'sourcePolicyId',
      'sourceStatementIndex',
      'sid',
    ],
    expectedPathTrace: [
      {
        statementId: 'stmt-allow-1',
        applicable: true,
        nonApplicableReasons: [],
        unsupportedFeatures: [],
        source: {
          sourcePolicyId: 'policy-0',
          sourcePolicyPath: 'policies/policy-0.json',
          sourcePolicyIndex: 0,
          sourceStatementIndex: 0,
          sid: 'AllowStatement',
        },
      },
    ],
    notes: 'Simplest positive pathTrace: one entry, applicable, covers all 5 StatementSource fields.',
  },

  // ── ogc-pt-deny ──
  // pathTrace for a denied (applicable) statement.
  {
    id: 'ogc-pt-deny',
    baseCaseId: 'gc-deny-single',
    kind: 'path-trace',
    purpose: 'Verify pathTrace output for an applicable Deny statement that overrides.',
    assertionFields: [
      'pathTrace',
      'statementId',
      'applicable',
      'sourcePolicyId',
      'sid',
    ],
    expectedPathTrace: [
      {
        statementId: 'stmt-deny-1',
        applicable: true,
        nonApplicableReasons: [],
        unsupportedFeatures: [],
        source: {
          sourcePolicyId: 'policy-0',
          sourceStatementIndex: 0,
          sid: 'DenyStatement',
        },
      },
    ],
    notes: 'Deny pathTrace: one entry, applicable with Deny effect. Demonstrates source provenance in deny path.',
  },

  // ── ogc-pt-non-applicable ──
  // pathTrace for a non-applicable statement (resource mismatch).
  {
    id: 'ogc-pt-non-applicable',
    baseCaseId: 'gc-resource-mismatch',
    kind: 'path-trace',
    purpose: 'Verify pathTrace output for a non-applicable statement with nonApplicableReasons.',
    assertionFields: [
      'pathTrace',
      'statementId',
      'applicable',
      'nonApplicableReasons',
    ],
    expectedPathTrace: [
      {
        statementId: 'stmt-resource-1',
        applicable: false,
        nonApplicableReasons: ['Resource not matched'],
        unsupportedFeatures: [],
        source: {
          sourcePolicyId: 'policy-0',
        },
      },
    ],
    notes: 'Non-applicable pathTrace: statement not applicable because resource does not match. Tests nonApplicableReasons presence and content.',
  },

  // ── ogc-pt-unsupported ──
  // pathTrace for a statement with unsupported features.
  {
    id: 'ogc-pt-unsupported',
    baseCaseId: 'gc-unsupported-condition',
    kind: 'path-trace',
    purpose: 'Verify pathTrace output reports unsupportedFeatures when a condition operator is not recognized.',
    assertionFields: [
      'pathTrace',
      'statementId',
      'unsupportedFeatures',
    ],
    expectedPathTrace: [
      {
        statementId: 'stmt-unsupported-1',
        applicable: false,
        nonApplicableReasons: [],
        unsupportedFeatures: ['ConditionOperator:ArnEquals'],
        source: {
          sourcePolicyId: 'policy-0',
        },
      },
    ],
    notes: 'Unsupported pathTrace: statement has an unsupported condition operator reported in unsupportedFeatures. Statement may be treated as non-applicable.',
  },

  // ── ogc-pt-source-unavailable ──
  // pathTrace where source is unavailable (empty pathTrace from invalid policy).
  {
    id: 'ogc-pt-source-unavailable',
    baseCaseId: 'gc-invalid-policy',
    kind: 'path-trace',
    purpose: 'Verify pathTrace output when source information is unavailable (empty trace from invalid policy).',
    assertionFields: [
      'pathTrace',
    ],
    // For invalid policies, pathTrace is expected to be empty
    // since no valid statements could be parsed.
    expectedPathTrace: [],
    notes: 'Source-unavailable pathTrace: invalid policy produces empty path trace. Demonstrates the "source unavailable" pattern where no valid statement provenance can be determined.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // JSON output cases (3)
  // ═════════════════════════════════════════════════════════════════════

  // ── ogc-json-allow ──
  // JSON output for ALLOW decision.
  {
    id: 'ogc-json-allow',
    baseCaseId: 'gc-allow-single',
    kind: 'json-output',
    purpose: 'Verify JSON output structure and field values for an ALLOW decision.',
    assertionFields: [
      'finalDecision',
      'decisionStatus',
      'matchedAllowStatementIds',
      'summary',
    ],
    expectedJson: {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      summary: '1 applicable allow statement found',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt-allow-1'],
    },
    notes: 'JSON allow output: ALLOW with DETERMINATE status, one matched Allow statement, empty deny IDs.',
  },

  // ── ogc-json-deny ──
  // JSON output for EXPLICIT_DENY decision.
  {
    id: 'ogc-json-deny',
    baseCaseId: 'gc-deny-single',
    kind: 'json-output',
    purpose: 'Verify JSON output structure and field values for an EXPLICIT_DENY decision.',
    assertionFields: [
      'finalDecision',
      'decisionStatus',
      'matchedDenyStatementIds',
    ],
    expectedJson: {
      finalDecision: 'EXPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: ['stmt-deny-1'],
      matchedAllowStatementIds: [],
    },
    notes: 'JSON deny output: EXPLICIT_DENY with DETERMINATE status, one matched Deny statement, empty allow IDs.',
  },

  // ── ogc-json-indeterminate ──
  // JSON output for INDETERMINATE decision status.
  {
    id: 'ogc-json-indeterminate',
    baseCaseId: 'gc-unsupported-condition',
    kind: 'json-output',
    purpose: 'Verify JSON output structure when decision status is INDETERMINATE due to unsupported features.',
    assertionFields: [
      'finalDecision',
      'decisionStatus',
      'diagnostics.unsupportedFeatures',
    ],
    expectedJson: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'INDETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
      diagnostics: {
        unsupportedFeatures: [{ feature: 'ConditionOperator:ArnEquals' }],
      },
    },
    notes: 'JSON indeterminate output: INDETERMINATE decision status with unsupported feature diagnostics. Demonstrates how indeterminate states are expressed in the JSON output layer.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // Text output cases (2)
  // ═════════════════════════════════════════════════════════════════════

  // ── ogc-text-allow ──
  // Text/report output for ALLOW decision.
  {
    id: 'ogc-text-allow',
    baseCaseId: 'gc-allow-single',
    kind: 'text-output',
    purpose: 'Verify human-readable text/report output for an ALLOW decision.',
    assertionFields: [
      'textOutput',
    ],
    expectedText: {
      contains: [
        'Evaluation Report',
        'ALLOW',
        'DETERMINATE',
        'applicable allow statement',
      ],
      notContains: ['DENY', 'ERROR', 'unsupported'],
    },
    notes: 'Text allow output: report title, ALLOW decision, DETERMINATE status, matched statement summary. Must not mention deny or errors.',
  },

  // ── ogc-text-diagnostics ──
  // Text/report output with diagnostics present.
  {
    id: 'ogc-text-diagnostics',
    baseCaseId: 'gc-unsupported-condition',
    kind: 'text-output',
    purpose: 'Verify human-readable text/report output includes diagnostic information for unsupported features.',
    assertionFields: [
      'textOutput',
      'diagnostics.unsupportedFeatures',
    ],
    expectedText: {
      contains: [
        'Evaluation Report',
        'INDETERMINATE',
        'unsupported',
      ],
      notContains: ['ALLOW'],
    },
    expectedDiagnostics: {
      unsupportedFeatures: [{ feature: 'ConditionOperator:ArnEquals' }],
    },
    notes: 'Text diagnostics output: report includes INDETERMINATE status and unsupported feature information in diagnostics section.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // Diagnostics output case (1)
  // ═════════════════════════════════════════════════════════════════════

  // ── ogc-diagnostics-invalid ──
  // Diagnostics-focused output for invalid input.
  {
    id: 'ogc-diagnostics-invalid',
    baseCaseId: 'gc-invalid-policy',
    kind: 'diagnostics-output',
    purpose: 'Verify diagnostics output structure when input is structurally invalid, including invalidInputs and unsupported expression in output.',
    assertionFields: [
      'diagnostics.invalidInputs',
      'diagnostics.unsupportedFeatures',
      'textOutput',
    ],
    expectedDiagnostics: {
      invalidInputs: [{ code: 'INVALID_POLICY_STRUCTURE' }],
    },
    expectedJson: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
      diagnostics: {
        invalidInputs: [{ code: 'INVALID_POLICY_STRUCTURE' }],
      },
    },
    expectedText: {
      contains: ['INVALID_POLICY_STRUCTURE'],
    },
    notes: 'Diagnostics output: focuses on what diagnostics look like in output. Invalid input codes drive the diagnostics section content. Demonstrates invalidInputs expression.',
  },

  // ═════════════════════════════════════════════════════════════════════
  // Cross-cutting cases (2)
  // ═════════════════════════════════════════════════════════════════════

  // ── ogc-empty-output ──
  // Empty collections / "none" expressions in output.
  {
    id: 'ogc-empty-output',
    baseCaseId: 'gc-implicit-deny-no-match',
    kind: 'empty-output',
    purpose: 'Verify output structure when all collections are empty (no matches, empty pathTrace, "none" markers).',
    assertionFields: [
      'pathTrace',
      'matchedDenyStatementIds',
      'matchedAllowStatementIds',
      'textOutput',
    ],
    expectedJson: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
      pathTrace: [],
    },
    expectedText: {
      contains: ['none'],
      notContains: ['applicable allow', 'applicable deny'],
    },
    notes: 'Empty collections: IMPLICIT_DENY with empty trace, empty matched IDs, "none" in text output for missing statements.',
  },

  // ── ogc-source-unavailable ──
  // Cross-cutting source unavailable across output layers.
  {
    id: 'ogc-source-unavailable',
    baseCaseId: 'gc-invalid-policy',
    kind: 'source-unavailable',
    purpose: 'Verify output behavior when source information is completely unavailable (invalid input yields minimal output).',
    assertionFields: [
      'pathTrace',
      'diagnostics.invalidInputs',
      'textOutput',
    ],
    expectedJson: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
      pathTrace: [],
      diagnostics: {
        invalidInputs: [{ code: 'INVALID_POLICY_STRUCTURE' }],
      },
    },
    expectedDiagnostics: {
      invalidInputs: [{ code: 'INVALID_POLICY_STRUCTURE' }],
    },
    expectedText: {
      contains: ['INVALID_POLICY_STRUCTURE'],
    },
    notes: 'Source unavailable: invalid policy produces no path trace, no valid source provenance. Demonstrates cross-cutting source-unavailable pattern across JSON, text, and diagnostics.',
  },
] as const;
