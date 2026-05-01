/**
 * acceptance-checklist.ts – Z05-D05: acceptance checklist and final wrap-up.
 *
 * This module defines:
 * 1. Z05Achievement – a type for describing each D01-D04 achievement unit
 * 2. Z05_ACHIEVEMENTS – a readonly constant listing all Z05-D01 through D04
 *    achievements with their boundaries and deliverable counts
 * 3. AcceptanceCoverageMatrix – a type for describing acceptance coverage
 *    entries across four dimensions (fixtures / core / output / boundary)
 * 4. COVERAGE_MATRIX – a readonly constant capturing the full acceptance
 *    coverage matrix for the Z05 topic
 * 5. STRONG_ASSERTION_COVERAGE – strong assertion coverage checklist
 * 6. WEAK_ASSERTION_COVERAGE – weak assertion coverage checklist
 * 7. INVALID_COVERAGE, UNSUPPORTED_COVERAGE, INDETERMINATE_COVERAGE,
 *    SOURCE_COVERAGE, EMPTY_COLLECTIONS_COVERAGE – dimension-specific
 *    coverage checklists
 * 8. Z05_CLOSEOUT_CONDITIONS – Z05 topic closeout conditions
 * 9. Z05_FINAL_TALLY – final tally of deliverables across D01-D05
 *
 * Boundary:
 * - Does NOT create real fixtures directories (test-fixtures/cases/...)
 * - Does NOT generate golden output files
 * - Does NOT introduce real-world IAM Policy samples
 * - Does NOT modify Z01-Z04 frozen modules (parser, engine, reporters)
 * - Does NOT modify Z05-D01 fixture-schema.ts
 * - Does NOT modify Z05-D02 golden-cases.ts
 * - Does NOT modify Z05-D03 output-golden-cases.ts
 * - Does NOT modify Z05-D04 boundary-golden-cases.ts
 * - Does NOT implement CLI, stdout/stderr, or file I/O
 * - Does NOT mark Z05 topic as Completed
 * - Does NOT start S01 stage closeout
 * - Does NOT use `any` type
 * - All exported types use readonly modifiers
 * - Imports from D01 are `import type` only – no runtime dependency
 */

// ─── No frozen D01-D04 type imports needed at runtime ─────────────
// All types in this module are standalone.
// The coverage matrix references D01-D04 unit task IDs textually,
// not via type-level imports that would create compilation dependencies.

// ═══════════════════════════════════════════════════════════════════════
// 1. Z05Achievement – describing one D0x unit's deliverables
// ═══════════════════════════════════════════════════════════════════════

/**
 * Describes the achievements of a single Z05 unit task.
 *
 * Each D0x unit task produces certain deliverables (types, constants,
 * test cases, etc.) and has a defined boundary of what it does not
 * produce. This type captures both the achievement summary and the
 * boundary constraints for acceptance tracking.
 *
 * All fields are readonly.
 */
export interface Z05Achievement {
  /** Unit task identifier (e.g. "Z05-D01") */
  readonly unitId: string;
  /** Short description of the unit task's purpose */
  readonly purpose: string;
  /** List of deliverable descriptions */
  readonly deliverables: readonly string[];
  /** List of explicit non-deliverable boundary descriptions */
  readonly boundaries: readonly string[];
  /** Number of test cases in the associated test file */
  readonly testCaseCount: number;
  /** Whether this unit has been formally closed (via 帅 review) */
  readonly closed: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// 2. Z05_ACHIEVEMENTS – full list of D01-D04 achievements
// ═══════════════════════════════════════════════════════════════════════

/**
 * Complete list of Z05-D01 through Z05-D04 achievements.
 *
 * Each entry records the deliverable scope and explicit boundaries of
 * a completed unit task. D05 (this unit) is tracked separately via
 * the closeout conditions rather than appearing in the achievement list.
 *
 * All entries are readonly. This list serves as the authoritative
 * achievement ledger for Z05 topic acceptance.
 */
export const Z05_ACHIEVEMENTS: readonly Z05Achievement[] = [
  {
    unitId: 'Z05-D01',
    purpose: 'Fixtures directory structure and sample schema planning',
    deliverables: [
      'fixture-schema.ts: CaseMetadata, CaseInput, ExpectedEvaluation',
      'ExpectedPathTraceEntry, ExpectedPathTraceSource',
      'ExpectedJsonOutput, ExpectedTextOutput, ExpectedDiagnostics',
      'AssertionKind (exact / contains / regex)',
      '11 directory/filename constants',
      'STRONG_ASSERTION_FIELDS (14 fields)',
      'WEAK_ASSERTION_FIELDS (2 fields)',
      'Type guards and constructor helpers (makeCaseMetadata, makeExpectedEvaluation)',
    ],
    boundaries: [
      'No real fixtures directories',
      'No golden cases or expected.json files',
      'No real-world IAM Policy samples',
      'No modification of Z01-Z04 frozen structures',
      'No CLI, stdout/stderr, or file I/O',
      'No `any` type usage',
    ],
    testCaseCount: 75, // fixture-schema.test.ts static test count at D01 closeout
    closed: true,
  },
  {
    unitId: 'Z05-D02',
    purpose: 'Core evaluation golden cases baseline planning',
    deliverables: [
      'GoldenCaseCategory (6 categories: allow, explicit-deny, implicit-deny, indeterminate, unsupported, invalid)',
      'GoldenCaseOutline interface with planning metadata',
      'MINIMAL_GOLDEN_CASES: 13 golden case outlines',
      'Category coverage: 5 of 6 categories filled (indeterminate deferred to boundary cases)',
      'All core evaluation directions from Design §11.4 covered',
    ],
    boundaries: [
      'No real fixtures directories',
      'No golden output files',
      'No real-world IAM Policy samples',
      'No modification of Z01-Z04 frozen modules',
      'No modification of Z05-D01 fixture-schema.ts',
      'No CLI, stdout/stderr, or file I/O',
      'No `any` type usage',
    ],
    testCaseCount: 30, // golden-cases.test.ts static test count at D02 closeout
    closed: true,
  },
  {
    unitId: 'Z05-D03',
    purpose: 'pathTrace / JSON / text output golden cases planning',
    deliverables: [
      'OutputGoldenCaseKind (6 kinds: path-trace, json-output, text-output, diagnostics-output, source-unavailable, empty-output)',
      'OutputGoldenCaseOutline interface with baseCaseId provenance',
      'MINIMAL_OUTPUT_GOLDEN_CASES: 13 output golden case outlines',
      'pathTrace cases: allowed, denied, non-applicable, unsupported, source-unavailable',
      'JSON output cases: allow, deny, indeterminate',
      'Text output cases: allow, diagnostics',
      'Cross-cutting: empty collections, source unavailable',
      'StatementSource 5 fields coverage (sourcePolicyId, sourcePolicyPath, sourcePolicyIndex, sourceStatementIndex, sid)',
    ],
    boundaries: [
      'No real fixtures directories',
      'No golden output files',
      'No real-world IAM Policy samples',
      'No modification of Z01-Z04 frozen modules',
      'No modification of Z05-D01 fixture-schema.ts',
      'No modification of Z05-D02 golden-cases.ts',
      'No CLI, stdout/stderr, or file I/O',
      'No `any` type usage',
    ],
    testCaseCount: 45, // output-golden-cases.test.ts static test count at D03 closeout
    closed: true,
  },
  {
    unitId: 'Z05-D04',
    purpose: 'Invalid / unsupported / indeterminate boundary golden cases planning',
    deliverables: [
      'BoundaryGoldenCaseCategory (10 categories: invalid-input, unsupported-feature, unsupported-condition, indeterminate-decision, diagnostics-output, path-trace-boundary, json-boundary, text-boundary, source-unavailable, empty-collections)',
      'BoundaryGoldenCaseOutline interface with relatedBaseCaseId provenance',
      'MINIMAL_BOUNDARY_GOLDEN_CASES: 11 boundary golden case outlines',
      'expectedJson / expectedText fields on boundary outlines',
      'invalid input diagnostics coverage (invalidInputs codes)',
      'unsupported feature diagnostics coverage (unsupportedFeatures identifiers)',
      'indeterminate decisionStatus coverage',
    ],
    boundaries: [
      'No real fixtures directories',
      'No golden output files',
      'No real-world IAM Policy samples',
      'No modification of Z01-Z04 frozen modules',
      'No modification of Z05-D01/D02/D03',
      'No CLI, stdout/stderr, or file I/O',
      'No `any` type usage',
    ],
    testCaseCount: 61, // boundary-golden-cases.test.ts static test count at D04 closeout
    closed: true,
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 3. AcceptanceCoverageMatrix dimension
// ═══════════════════════════════════════════════════════════════════════

/**
 * The four inspection dimensions of the Z05 acceptance coverage matrix.
 *
 * - `fixtures`: covers Z05-D01 fixtures schema, directory constants,
 *   assertion kinds, and schema-level testing
 * - `core`: covers Z05-D02 core evaluation golden cases (Allow/Deny/
 *   IMPLICIT_DENY, Action/Resource/Condition match/mismatch)
 * - `output`: covers Z05-D03 output golden cases (pathTrace, JSON,
 *   text, diagnostics, source-unavailable, empty-output)
 * - `boundary`: covers Z05-D04 boundary golden cases (invalid-input,
 *   unsupported-feature, unsupported-condition, indeterminate-decision,
 *   source-unavailable, empty-collections)
 */
export type CoverageDimension = 'fixtures' | 'core' | 'output' | 'boundary';

/**
 * All valid CoverageDimension values.
 */
export const VALID_COVERAGE_DIMENSIONS: readonly CoverageDimension[] = [
  'fixtures',
  'core',
  'output',
  'boundary',
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 4. AcceptanceCoverageEntry
// ═══════════════════════════════════════════════════════════════════════

/**
 * A single entry in the acceptance coverage matrix.
 *
 * Each entry describes one acceptance concern (a specific field,
 * category, or scenario) and maps it to the unit task that covers it.
 *
 * - `label`: human-readable description of what is covered
 * - `dimension`: which of the four dimensions this entry belongs to
 * - `source`: which D0x unit task provides this coverage
 * - `category`: sub-category within the dimension for grouping
 * - `note`: additional contextual information (optional)
 *
 * All fields are readonly.
 */
export interface AcceptanceCoverageEntry {
  /** Human-readable description of the covered item */
  readonly label: string;
  /** The inspection dimension this entry belongs to */
  readonly dimension: CoverageDimension;
  /** The Z05-D0x unit task that provides coverage (e.g. "Z05-D01") */
  readonly source: string;
  /** Sub-category for grouping within the dimension */
  readonly category: string;
  /** Optional contextual note */
  readonly note?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// 5. COVERAGE_MATRIX – full acceptance coverage matrix
// ═══════════════════════════════════════════════════════════════════════

/**
 * Full acceptance coverage matrix for the Z05 topic.
 *
 * Covers four dimensions (fixtures / core / output / boundary) with
 * specific entries mapping each acceptance concern to its source unit
 * task. This matrix serves as the authoritative acceptance checklist
 * for Z05 topic closeout.
 *
 * All entries are readonly.
 */
export const COVERAGE_MATRIX: readonly AcceptanceCoverageEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Fixtures dimension (Z05-D01)
  // ═══════════════════════════════════════════════════════════════════
  {
    label: 'CaseMetadata type and constructor',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
    note: '10 fields: id, title, purpose, tags, coveredFeatures, originType, source, license, sanitizationNote, containsRealWorldPolicy',
  },
  {
    label: 'OriginType enumeration (synthetic/official/open-source)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },
  {
    label: 'CaseInput type (policies + request)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },
  {
    label: 'ExpectedEvaluation type (4 strong assertion fields)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
    note: 'finalDecision, decisionStatus, matchedDenyStatementIds, matchedAllowStatementIds',
  },
  {
    label: 'ExpectedPathTraceEntry type (5 fields + source)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
    note: 'statementId, applicable, nonApplicableReasons, unsupportedFeatures, source',
  },
  {
    label: 'ExpectedPathTraceSource type (5 optional fields)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
    note: 'sourcePolicyId (required), sourcePolicyPath, sourcePolicyIndex, sourceStatementIndex, sid',
  },
  {
    label: 'ExpectedJsonOutput type (8 optional fields)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
    note: 'finalDecision, decisionStatus, summary, matchedDenyStatementIds, matchedAllowStatementIds, statementResults, pathTrace, diagnostics',
  },
  {
    label: 'ExpectedTextOutput type (contains + notContains)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },
  {
    label: 'ExpectedDiagnostics type (invalidInputs + unsupportedFeatures)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },
  {
    label: 'AssertionKind enumeration (exact/contains/regex)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },
  {
    label: '11 directory and filename constants',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },
  {
    label: 'STRONG_ASSERTION_FIELDS (14 field paths)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'assertion-fields',
    note: 'finalDecision, decisionStatus, matchedDenyStatementIds, matchedAllowStatementIds, pathTrace, statementId, applicable, nonApplicableReasons, unsupportedFeatures, sourcePolicyId, sourceStatementIndex, sid, diagnostics.invalidInputs, diagnostics.unsupportedFeatures',
  },
  {
    label: 'WEAK_ASSERTION_FIELDS (2 field paths)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'assertion-fields',
    note: 'summary, textOutput',
  },
  {
    label: 'Type guard (isValidOriginType)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },
  {
    label: 'Constructor helpers (makeCaseMetadata, makeExpectedEvaluation)',
    dimension: 'fixtures',
    source: 'Z05-D01',
    category: 'fixture-schema',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Core dimension (Z05-D02)
  // ═══════════════════════════════════════════════════════════════════
  {
    label: 'Single Allow statement match',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'allow',
  },
  {
    label: 'Single Deny statement match',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'explicit-deny',
  },
  {
    label: 'IMPLICIT_DENY – no statement matches',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'implicit-deny',
  },
  {
    label: 'Action mismatch → IMPLICIT_DENY',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'implicit-deny',
  },
  {
    label: 'Resource mismatch → IMPLICIT_DENY',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'implicit-deny',
  },
  {
    label: 'StringEquals condition hit → ALLOW',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'condition-string-equals',
  },
  {
    label: 'StringEquals condition miss → IMPLICIT_DENY',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'condition-string-equals',
  },
  {
    label: 'Bool condition hit → ALLOW',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'condition-bool',
  },
  {
    label: 'Bool condition miss → IMPLICIT_DENY',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'condition-bool',
  },
  {
    label: 'IpAddress condition hit → ALLOW',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'condition-ip-address',
  },
  {
    label: 'IpAddress condition miss → IMPLICIT_DENY',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'condition-ip-address',
  },
  {
    label: 'Unsupported Condition operator → INDETERMINATE',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'unsupported',
    note: 'ArnEquals operator with INDETERMINATE decisionStatus',
  },
  {
    label: 'Invalid policy structure detection',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'invalid',
    note: 'INVALID_POLICY_STRUCTURE diagnostics',
  },
  {
    label: 'GoldenCaseCategory (6 categories)',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'schema',
  },
  {
    label: 'GoldenCaseOutline type',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'schema',
  },
  {
    label: 'MINIMAL_GOLDEN_CASES (13 outlines)',
    dimension: 'core',
    source: 'Z05-D02',
    category: 'schema',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Output dimension (Z05-D03)
  // ═══════════════════════════════════════════════════════════════════
  {
    label: 'PathTrace for allowed (applicable) statement',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'path-trace',
    note: 'ogc-pt-allow: all 5 StatementSource fields present',
  },
  {
    label: 'PathTrace for denied (applicable) statement',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'path-trace',
    note: 'ogc-pt-deny: Deny effect provenance',
  },
  {
    label: 'PathTrace for non-applicable statement',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'path-trace',
    note: 'ogc-pt-non-applicable: nonApplicableReasons present',
  },
  {
    label: 'PathTrace with unsupportedFeatures',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'path-trace',
    note: 'ogc-pt-unsupported: unsupportedFeatures in entries',
  },
  {
    label: 'PathTrace with source unavailable',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'path-trace',
    note: 'ogc-pt-source-unavailable: empty pathTrace from invalid policy',
  },
  {
    label: 'JSON output for ALLOW decision',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'json-output',
    note: 'ogc-json-allow: finalDecision, decisionStatus, summary',
  },
  {
    label: 'JSON output for EXPLICIT_DENY decision',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'json-output',
    note: 'ogc-json-deny: matchedDenyStatementIds present',
  },
  {
    label: 'JSON output for INDETERMINATE decision',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'json-output',
    note: 'ogc-json-indeterminate: decisionStatus=INDETERMINATE + diagnostics',
  },
  {
    label: 'Text output for ALLOW decision',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'text-output',
    note: 'ogc-text-allow: contains/notContains assertions',
  },
  {
    label: 'Text output with diagnostics',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'text-output',
    note: 'ogc-text-diagnostics: INDETERMINATE + unsupported markers',
  },
  {
    label: 'Diagnostics output for invalid input',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'diagnostics-output',
    note: 'ogc-diagnostics-invalid: invalidInputs codes',
  },
  {
    label: 'Empty collections / "none" markers',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'empty-output',
    note: 'ogc-empty-output: empty arrays in JSON, "none" in text',
  },
  {
    label: 'Source unavailable cross-cutting',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'source-unavailable',
    note: 'ogc-source-unavailable: invalid policy → no source, no trace',
  },
  {
    label: 'StatementSource 5 field coverage',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'source-coverage',
    note: 'sourcePolicyId, sourcePolicyPath, sourcePolicyIndex, sourceStatementIndex, sid',
  },
  {
    label: 'OutputGoldenCaseKind (6 kinds)',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'schema',
  },
  {
    label: 'OutputGoldenCaseOutline type + baseCaseId provenance',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'schema',
  },
  {
    label: 'MINIMAL_OUTPUT_GOLDEN_CASES (13 outlines)',
    dimension: 'output',
    source: 'Z05-D03',
    category: 'schema',
  },

  // ═══════════════════════════════════════════════════════════════════
  // Boundary dimension (Z05-D04)
  // ═══════════════════════════════════════════════════════════════════
  {
    label: 'Invalid input (malformed policy)',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'invalid-input',
    note: 'bgc-invalid-input: diagnostics.invalidInputs',
  },
  {
    label: 'Unsupported feature (NotAction)',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'unsupported-feature',
    note: 'bgc-unsupported-feature: diagnostics.unsupportedFeatures + INDETERMINATE',
  },
  {
    label: 'Unsupported condition (NumericEquals)',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'unsupported-condition',
    note: 'bgc-unsupported-condition: decisionStatus=INDETERMINATE',
  },
  {
    label: 'Indeterminate decision status',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'indeterminate-decision',
    note: 'bgc-indeterminate-decision: provisional result with StringNotEquals',
  },
  {
    label: 'Diagnostics with multiple invalidInputs codes',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'diagnostics-output',
    note: 'bgc-diagnostics-invalid: MISSING_FIELD + INVALID_FIELD_VALUE',
  },
  {
    label: 'Diagnostics with multiple unsupportedFeatures',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'diagnostics-output',
    note: 'bgc-diagnostics-unsupported: 2 unsupported features reported',
  },
  {
    label: 'PathTrace entry with unsupportedFeatures',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'path-trace-boundary',
    note: 'bgc-path-trace-boundary: nonApplicableReasons + unsupportedFeatures coexist',
  },
  {
    label: 'JSON output boundary (INDETERMINATE serialized)',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'json-boundary',
    note: 'bgc-json-boundary: expectedJson with decisionStatus=INDETERMINATE',
  },
  {
    label: 'Text output boundary (INDETERMINATE human-readable)',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'text-boundary',
    note: 'bgc-text-boundary: expectedText with contains/notContains',
  },
  {
    label: 'Source unavailable boundary',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'source-unavailable',
    note: 'bgc-source-unavailable: empty pathTrace, invalidInputs diagnostics',
  },
  {
    label: 'Empty collections boundary',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'empty-collections',
    note: 'bgc-empty-collections: all arrays empty, IMPLICIT_DENY',
  },
  {
    label: 'BoundaryGoldenCaseCategory (10 categories)',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'schema',
  },
  {
    label: 'BoundaryGoldenCaseOutline type + expectedJson/expectedText',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'schema',
  },
  {
    label: 'MINIMAL_BOUNDARY_GOLDEN_CASES (11 outlines)',
    dimension: 'boundary',
    source: 'Z05-D04',
    category: 'schema',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 6. STRONG_ASSERTION_COVERAGE – strong assertion checklist
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coverage checklist for strong assertion fields.
 *
 * Each entry maps a strong assertion field to the D0x unit(s) that
 * provide coverage for it. Uses the canonical strong assertion field
 * paths from D01 STRONG_ASSERTION_FIELDS.
 *
 * All entries are readonly.
 */
export const STRONG_ASSERTION_COVERAGE: readonly {
  readonly field: string;
  readonly coveredBy: readonly string[];
}[] = [
  {
    field: 'finalDecision',
    coveredBy: ['Z05-D01', 'Z05-D02', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'decisionStatus',
    coveredBy: ['Z05-D01', 'Z05-D02', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'matchedDenyStatementIds',
    coveredBy: ['Z05-D01', 'Z05-D02', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'matchedAllowStatementIds',
    coveredBy: ['Z05-D01', 'Z05-D02', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'pathTrace',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'statementId',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'applicable',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'nonApplicableReasons',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'unsupportedFeatures',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'sourcePolicyId',
    coveredBy: ['Z05-D01', 'Z05-D03'],
  },
  {
    field: 'sourceStatementIndex',
    coveredBy: ['Z05-D01', 'Z05-D03'],
  },
  {
    field: 'sid',
    coveredBy: ['Z05-D01', 'Z05-D03'],
  },
  {
    field: 'diagnostics.invalidInputs',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
  {
    field: 'diagnostics.unsupportedFeatures',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 7. WEAK_ASSERTION_COVERAGE – weak assertion checklist
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coverage checklist for weak assertion fields.
 *
 * Uses the canonical weak assertion field paths from D01
 * WEAK_ASSERTION_FIELDS.
 *
 * All entries are readonly.
 */
export const WEAK_ASSERTION_COVERAGE: readonly {
  readonly field: string;
  readonly coveredBy: readonly string[];
}[] = [
  {
    field: 'summary',
    coveredBy: ['Z05-D01', 'Z05-D03'],
  },
  {
    field: 'textOutput',
    coveredBy: ['Z05-D01', 'Z05-D03', 'Z05-D04'],
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 8. INVALID_COVERAGE – invalid input coverage checklist
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coverage checklist for invalid input diagnostics.
 *
 * Tracks which invalid input scenarios are covered by which unit tasks.
 *
 * All entries are readonly.
 */
export const INVALID_COVERAGE: readonly {
  readonly scenario: string;
  readonly coveredBy: readonly string[];
  readonly note?: string;
}[] = [
  {
    scenario: 'diagnostics.invalidInputs field type',
    coveredBy: ['Z05-D01'],
    note: 'ExpectedDiagnostics interface in fixture-schema.ts',
  },
  {
    scenario: 'Invalid policy structure detection',
    coveredBy: ['Z05-D02'],
    note: 'gc-invalid-policy: INVALID_POLICY_STRUCTURE code',
  },
  {
    scenario: 'Invalid input diagnostics in output',
    coveredBy: ['Z05-D03'],
    note: 'ogc-diagnostics-invalid: invalidInputs codes in diagnostics output',
  },
  {
    scenario: 'Malformed policy input boundary',
    coveredBy: ['Z05-D04'],
    note: 'bgc-invalid-input: INVALID_POLICY_STRUCTURE diagnostics',
  },
  {
    scenario: 'Multiple invalidInputs codes',
    coveredBy: ['Z05-D04'],
    note: 'bgc-diagnostics-invalid: MISSING_FIELD + INVALID_FIELD_VALUE',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 9. UNSUPPORTED_COVERAGE – unsupported feature coverage checklist
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coverage checklist for unsupported feature diagnostics.
 *
 * Tracks which unsupported feature scenarios are covered, including
 * unsupported conditions, unsupported policy features, and their
 * impact on decision status.
 *
 * All entries are readonly.
 */
export const UNSUPPORTED_COVERAGE: readonly {
  readonly scenario: string;
  readonly coveredBy: readonly string[];
  readonly note?: string;
}[] = [
  {
    scenario: 'diagnostics.unsupportedFeatures field type',
    coveredBy: ['Z05-D01'],
    note: 'ExpectedDiagnostics interface',
  },
  {
    scenario: 'Unsupported Condition operator (ArnEquals)',
    coveredBy: ['Z05-D02'],
    note: 'gc-unsupported-condition: decisionStatus=INDETERMINATE',
  },
  {
    scenario: 'Unsupported features in pathTrace entries',
    coveredBy: ['Z05-D03'],
    note: 'ogc-pt-unsupported: unsupportedFeatures in trace entry',
  },
  {
    scenario: 'Unsupported condition in JSON indeterminate output',
    coveredBy: ['Z05-D03'],
    note: 'ogc-json-indeterminate: diagnostics + INDETERMINATE',
  },
  {
    scenario: 'Unsupported feature in text diagnostics',
    coveredBy: ['Z05-D03'],
    note: 'ogc-text-diagnostics: "unsupported" marker in text',
  },
  {
    scenario: 'Unsupported policy feature (NotAction)',
    coveredBy: ['Z05-D04'],
    note: 'bgc-unsupported-feature: triggers INDETERMINATE',
  },
  {
    scenario: 'Unsupported condition (NumericEquals)',
    coveredBy: ['Z05-D04'],
    note: 'bgc-unsupported-condition: INDETERMINATE status',
  },
  {
    scenario: 'Multiple unsupportedFeatures reported',
    coveredBy: ['Z05-D04'],
    note: 'bgc-diagnostics-unsupported: 2 features reported',
  },
  {
    scenario: 'Unsupported condition boundary (StringNotEquals)',
    coveredBy: ['Z05-D04'],
    note: 'bgc-indeterminate-decision: provisional result',
  },
  {
    scenario: 'Unsupported + nonApplicableReasons coexist in pathTrace',
    coveredBy: ['Z05-D04'],
    note: 'bgc-path-trace-boundary: both fields present',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 10. INDETERMINATE_COVERAGE – indeterminate decision coverage
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coverage checklist for decisionStatus === INDETERMINATE.
 *
 * Tracks which scenarios lead to indeterminate decision status and
 * how the indeterminate state is expressed across output layers.
 *
 * All entries are readonly.
 */
export const INDETERMINATE_COVERAGE: readonly {
  readonly scenario: string;
  readonly coveredBy: readonly string[];
  readonly note?: string;
}[] = [
  {
    scenario: 'decisionStatus field in ExpectedEvaluation',
    coveredBy: ['Z05-D01'],
    note: 'Part of expected evaluation schema',
  },
  {
    scenario: 'INDETERMINATE from unsupported Condition operator',
    coveredBy: ['Z05-D02'],
    note: 'gc-unsupported-condition: ArnEquals → INDETERMINATE',
  },
  {
    scenario: 'INDETERMINATE in JSON output',
    coveredBy: ['Z05-D03'],
    note: 'ogc-json-indeterminate: decisionStatus=INDETERMINATE serialized',
  },
  {
    scenario: 'INDETERMINATE in text output',
    coveredBy: ['Z05-D03'],
    note: 'ogc-text-diagnostics: "INDETERMINATE" marker in text',
  },
  {
    scenario: 'INDETERMINATE from unsupported feature (NotAction)',
    coveredBy: ['Z05-D04'],
    note: 'bgc-unsupported-feature: structural recognition triggers INDETERMINATE',
  },
  {
    scenario: 'INDETERMINATE from unsupported condition (NumericEquals)',
    coveredBy: ['Z05-D04'],
    note: 'bgc-unsupported-condition: condition-level INDETERMINATE',
  },
  {
    scenario: 'INDETERMINATE as provisional result (StringNotEquals)',
    coveredBy: ['Z05-D04'],
    note: 'bgc-indeterminate-decision: explicit INDETERMINATE boundary',
  },
  {
    scenario: 'INDETERMINATE in JSON boundary output',
    coveredBy: ['Z05-D04'],
    note: 'bgc-json-boundary: expectedJson with INDETERMINATE',
  },
  {
    scenario: 'INDETERMINATE in text boundary output',
    coveredBy: ['Z05-D04'],
    note: 'bgc-text-boundary: human-readable INDETERMINATE expression',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 11. SOURCE_COVERAGE – StatementSource 5-field coverage
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coverage checklist for StatementSource fields and source unavailability.
 *
 * Tracks which StatementSource fields are covered and how the
 * "source unavailable" scenario is handled.
 *
 * All entries are readonly.
 */
export const SOURCE_COVERAGE: readonly {
  readonly field: string;
  readonly coveredBy: readonly string[];
  readonly note?: string;
}[] = [
  {
    field: 'sourcePolicyId (required)',
    coveredBy: ['Z05-D01', 'Z05-D03'],
    note: 'Defined in ExpectedPathTraceSource; covered in ogc-pt-allow, ogc-pt-deny, ogc-pt-non-applicable, ogc-pt-unsupported',
  },
  {
    field: 'sourcePolicyPath (optional)',
    coveredBy: ['Z05-D01', 'Z05-D03'],
    note: 'Only ogc-pt-allow includes all 5 source fields; others include subsets',
  },
  {
    field: 'sourcePolicyIndex (optional)',
    coveredBy: ['Z05-D01', 'Z05-D03'],
    note: 'Defined as optional; ogc-pt-allow provides coverage',
  },
  {
    field: 'sourceStatementIndex (optional)',
    coveredBy: ['Z05-D01', 'Z05-D03'],
    note: 'Defined as optional; ogc-pt-allow provides coverage',
  },
  {
    field: 'sid (optional)',
    coveredBy: ['Z05-D01', 'Z05-D03'],
    note: 'ogc-pt-allow, ogc-pt-deny both include sid',
  },
  {
    field: 'source unavailable (all source fields missing)',
    coveredBy: ['Z05-D03', 'Z05-D04'],
    note: 'ogc-pt-source-unavailable, ogc-source-unavailable, bgc-source-unavailable: empty pathTrace from invalid policy',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 12. EMPTY_COLLECTIONS_COVERAGE – empty collections coverage
// ═══════════════════════════════════════════════════════════════════════

/**
 * Coverage checklist for empty collections and "none" marker expression.
 *
 * Tracks how empty arrays in JSON output and "none" markers in text
 * output are covered across different scenarios.
 *
 * All entries are readonly.
 */
export const EMPTY_COLLECTIONS_COVERAGE: readonly {
  readonly scenario: string;
  readonly coveredBy: readonly string[];
  readonly note?: string;
}[] = [
  {
    scenario: 'Empty matchedDenyStatementIds in JSON',
    coveredBy: ['Z05-D03', 'Z05-D04'],
    note: 'ogc-empty-output, bgc-empty-collections: empty array',
  },
  {
    scenario: 'Empty matchedAllowStatementIds in JSON',
    coveredBy: ['Z05-D03', 'Z05-D04'],
    note: 'ogc-empty-output: empty array',
  },
  {
    scenario: 'Empty pathTrace in JSON',
    coveredBy: ['Z05-D03', 'Z05-D04'],
    note: 'ogc-empty-output, ogc-pt-source-unavailable: empty array',
  },
  {
    scenario: '"none" markers in text output',
    coveredBy: ['Z05-D03'],
    note: 'ogc-empty-output: "none" appears in text for missing statements',
  },
  {
    scenario: 'Empty collections from IMPLICIT_DENY',
    coveredBy: ['Z05-D03', 'Z05-D04'],
    note: 'ogc-empty-output, bgc-empty-collections: no statements match',
  },
  {
    scenario: 'Empty collections from invalid input',
    coveredBy: ['Z05-D03', 'Z05-D04'],
    note: 'ogc-source-unavailable, bgc-source-unavailable: input invalid → all empty',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 13. Z05_CLOSEOUT_CONDITIONS – Z05 topic closeout conditions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Closeout condition for the Z05 topic.
 *
 * Each condition describes a requirement that must be satisfied before
 * the Z05 topic can be formally closed. Conditions cover unit task
 * completion, test pass, typecheck, build, status consistency, and
 * boundary compliance.
 *
 * All fields are readonly.
 */
export interface Z05CloseoutCondition {
  /** Unique condition identifier */
  readonly id: string;
  /** Human-readable condition description */
  readonly description: string;
  /** Current status of this condition */
  readonly status: 'pending' | 'satisfied' | 'deferred';
  /** Which unit task(s) this condition depends on */
  readonly dependsOn: readonly string[];
  /** Optional note for context */
  readonly note?: string;
}

/**
 * Complete list of Z05 topic closeout conditions.
 *
 * These conditions define the formal criteria for Z05 topic closeout
 * acceptance. They are organized in dependency order: D01 → D02 →
 * D03 → D04 → D05 → topic-level.
 *
 * All conditions are readonly. The status field reflects the current
 * state at D05 planning time and will be updated as closeout progresses.
 */
export const Z05_CLOSEOUT_CONDITIONS: readonly Z05CloseoutCondition[] = [
  // ── Unit-level completion ────────────────────────────────────────
  {
    id: 'cc-d01-completed',
    description: 'Z05-D01 fixtures directory structure and sample schema planning is completed and formally closed by 帅.',
    status: 'satisfied',
    dependsOn: ['Z05-D01'],
    note: '14 strong assertion fields + 2 weak assertion fields + 11 directory constants.',
  },
  {
    id: 'cc-d02-completed',
    description: 'Z05-D02 core evaluation golden cases baseline planning is completed and formally closed by 帅.',
    status: 'satisfied',
    dependsOn: ['Z05-D02'],
    note: '6 categories + 13 golden case outlines.',
  },
  {
    id: 'cc-d03-completed',
    description: 'Z05-D03 pathTrace / JSON / text output golden cases planning is completed and formally closed by 帅.',
    status: 'satisfied',
    dependsOn: ['Z05-D03'],
    note: '6 output kinds + 13 output golden case outlines + 5 source field coverage.',
  },
  {
    id: 'cc-d04-completed',
    description: 'Z05-D04 invalid / unsupported / indeterminate boundary golden cases planning is completed and formally closed by 帅.',
    status: 'satisfied',
    dependsOn: ['Z05-D04'],
    note: '10 boundary categories + 11 boundary golden case outlines + expectedJson/expectedText.',
  },
  {
    id: 'cc-d05-completed',
    description: 'Z05-D05 acceptance checklist and final wrap-up is completed and formally closed by 帅.',
    status: 'pending',
    dependsOn: ['Z05-D05'],
    note: 'Current unit task. Will be satisfied after 帅 review.',
  },

  // ── Test and build integrity ─────────────────────────────────────
  {
    id: 'cc-tests-pass',
    description: 'All Z01-Z05 tests pass (651 currently passing at D05 start). D05 must not reduce test count and must not break any existing test.',
    status: 'pending',
    dependsOn: ['Z05-D05'],
    note: 'Must run: npm run test -- --run',
  },
  {
    id: 'cc-typecheck-pass',
    description: 'TypeScript type check passes with zero errors. No `any` type usage in Z05 modules.',
    status: 'pending',
    dependsOn: ['Z05-D05'],
    note: 'Must run: npm run typecheck',
  },
  {
    id: 'cc-build-pass',
    description: 'Build succeeds without errors.',
    status: 'pending',
    dependsOn: ['Z05-D05'],
    note: 'Must run: npm run build',
  },

  // ── Status consistency ───────────────────────────────────────────
  {
    id: 'cc-topic-consistency',
    description: 'Z05 topic book and all unit task books show consistent status (D01-D04 Completed, D05 Active or Completed after closeout).',
    status: 'pending',
    dependsOn: ['Z05-D05'],
    note: 'Verified against 任务索引.org and 当前任务状态总表.org.',
  },

  // ── Boundary compliance ──────────────────────────────────────────
  {
    id: 'cc-no-overruns',
    description: 'Z05 does not change Z01-Z04 frozen modules, does not build actual fixtures directories, does not generate golden output files, does not introduce real-world IAM Policy samples, does not implement CLI.',
    status: 'pending',
    dependsOn: ['Z05-D05'],
    note: 'Verified by inspection of 车间/src/ diff scope and file list.',
  },

  // ── Topic-level acceptance ───────────────────────────────────────
  {
    id: 'cc-topic-acceptance',
    description: 'Z05 topic formal closeout is approved by 帅 via governance review.',
    status: 'deferred',
    dependsOn: ['Z05-D05'],
    note: '帅 must explicitly approve Z05 topic closeout before S01 stage closeout can begin.',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 14. Z05_FINAL_TALLY – final deliverable tally
// ═══════════════════════════════════════════════════════════════════════

/**
 * Final tally of deliverables across all Z05 unit tasks.
 *
 * Provides a numeric summary of what each D0x unit produced and the
 * aggregate totals for the Z05 topic.
 *
 * All fields are readonly.
 */
export interface Z05Tally {
  /** Unit task identifier */
  readonly unitId: string;
  /** Number of types defined */
  readonly types: number;
  /** Number of union type variants */
  readonly unionVariants: number;
  /** Number of constants (not test files) */
  readonly constants: number;
  /** Number of golden case outlines */
  readonly outlines: number;
  /** Number of test cases in associated test file */
  readonly testCases: number;
  /** Additional notable deliverables */
  readonly notes: readonly string[];
}

/**
 * Final tally for the Z05 topic.
 *
 * Aggregate deliverable counts across D01-D05. This serves as the
 * final deliverable record for Z05 topic acceptance.
 */
export const Z05_FINAL_TALLY: readonly Z05Tally[] = [
  {
    unitId: 'Z05-D01',
    types: 9,
    unionVariants: 0,
    constants: 13,
    outlines: 0,
    testCases: 75,
    notes: [
      '9 types: CaseMetadata, OriginType, CaseInput, ExpectedEvaluation, ExpectedPathTraceEntry, ExpectedPathTraceSource, ExpectedJsonOutput, ExpectedTextOutput, ExpectedDiagnostics, AssertionKind',
      '3 union string types: OriginType (3), AssertionKind (3)',
      '11 directory/filename constants + STRONG_ASSERTION_FIELDS (14) + WEAK_ASSERTION_FIELDS (2)',
      'Type guards (isValidOriginType) + constructors (makeCaseMetadata, makeExpectedEvaluation)',
    ],
  },
  {
    unitId: 'Z05-D02',
    types: 2,
    unionVariants: 6,
    constants: 2,
    outlines: 13,
    testCases: 30,
    notes: [
      '2 types: GoldenCaseCategory (6 variants), GoldenCaseOutline',
      'VALID_GOLDEN_CASE_CATEGORIES + MINIMAL_GOLDEN_CASES constants',
      '13 golden case outlines covering 5 of 6 categories',
    ],
  },
  {
    unitId: 'Z05-D03',
    types: 2,
    unionVariants: 6,
    constants: 2,
    outlines: 13,
    testCases: 45,
    notes: [
      '2 types: OutputGoldenCaseKind (6 variants), OutputGoldenCaseOutline',
      'VALID_OUTPUT_GOLDEN_CASE_KINDS + MINIMAL_OUTPUT_GOLDEN_CASES constants',
      '13 output golden case outlines with baseCaseId provenance',
      'StatementSource 5-field coverage + source unavailable',
    ],
  },
  {
    unitId: 'Z05-D04',
    types: 2,
    unionVariants: 10,
    constants: 2,
    outlines: 11,
    testCases: 61,
    notes: [
      '2 types: BoundaryGoldenCaseCategory (10 variants), BoundaryGoldenCaseOutline',
      'VALID_BOUNDARY_GOLDEN_CASE_CATEGORIES + MINIMAL_BOUNDARY_GOLDEN_CASES constants',
      '11 boundary golden case outlines with expectedJson/expectedText',
    ],
  },
  {
    unitId: 'Z05-D05',
    types: 5,
    unionVariants: 1,
   constants: 13,
   outlines: 0,
   testCases: 93,
   notes: [
     '5 types: Z05Achievement, AcceptanceCoverageEntry, CoverageDimension (4 variants), Z05CloseoutCondition, Z05Tally',
     '13 constants: Z05_ACHIEVEMENTS, COVERAGE_MATRIX, VALID_COVERAGE_DIMENSIONS, STRONG_ASSERTION_COVERAGE, WEAK_ASSERTION_COVERAGE, INVALID_COVERAGE, UNSUPPORTED_COVERAGE, INDETERMINATE_COVERAGE, SOURCE_COVERAGE, EMPTY_COLLECTIONS_COVERAGE, Z05_CLOSEOUT_CONDITIONS, Z05_FINAL_TALLY, Z05_TO_S01_TRANSITION',
      'Coverage matrix: 60 entries across 4 dimensions',
    ],
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 15. Subsequent transition plan (Z05 → S01)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Transition plan for Z05 topic closeout to S01 stage acceptance.
 *
 * Defines the sequence of steps required after Z05-D05 completion
 * and before S01 stage closeout can begin. This is purely a planning
 * constant – it does not trigger any actual workflow transitions.
 *
 * All entries are readonly.
 */
export const Z05_TO_S01_TRANSITION: readonly {
  readonly step: number;
  readonly description: string;
  readonly trigger: string;
  readonly note?: string;
}[] = [
  {
    step: 1,
    description: 'Z05-D05 completion and submission to 匠 for execution acceptance.',
    trigger: '工 submits structured completion report.',
  },
  {
    step: 2,
    description: '匠 executes acceptance review: verifies tests pass, typecheck passes, build passes, no overruns.',
    trigger: '匠 reviews completion report and runs verification commands.',
  },
  {
    step: 3,
    description: '匠 submits Z05 topic closeout application to 帅, including acceptance checklist, coverage matrix, and closeout conditions.',
    trigger: '匠 sends 帅 the topic-level complete report.',
  },
  {
    step: 4,
    description: '帅 conducts Z05 topic governance review, verifying boundary compliance, status consistency, and deliverable completeness.',
    trigger: '帅 reviews Z05 closeout application.',
  },
  {
    step: 5,
    description: '帅 issues Z05 topic closeout decision (approve or request revision).',
    trigger: '帅 makes governance decision.',
    note: 'If approved, Z05 topic book status changes to Completed. If revision requested, return to step 1.',
  },
  {
    step: 6,
    description: 'Z05 topic closeout applied: task index updated, topic book marked Completed, dev→main merged for workshop repo.',
    trigger: '匠 executes closeout actions per 帅 approval.',
  },
  {
    step: 7,
    description: 'S01 stage closeout evaluation begins. 帅 reviews all five topics (Z01-Z05) for stage-level readiness.',
    trigger: '帅 initiates S01 stage closeout review.',
    note: 'S01 stage closeout is separate from Z05 topic closeout and requires distinct 帅 governance decision.',
  },
] as const;
