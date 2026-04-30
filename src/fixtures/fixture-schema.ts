/**
 * fixture-schema.ts – Z05-D01: fixtures directory structure and sample schema.
 *
 * This module defines:
 * 1. Case metadata types (CaseMetadata, OriginType)
 * 2. Case input types (CaseInput) referencing frozen Z01 types
 * 3. Expected output types (ExpectedEvaluation, ExpectedPathTraceEntry,
 *    ExpectedJsonOutput, ExpectedTextOutput, ExpectedDiagnostics)
 * 4. Assertion kind type (AssertionKind)
 * 5. Directory and filename constants for fixtures organization
 * 6. Strong/weak assertion field lists
 * 7. Type guard and constructor helper functions
 *
 * Boundary:
 * - Does NOT create real fixtures directories
 * - Does NOT generate golden cases or expected.json files
 * - Does NOT introduce real-world IAM Policy samples
 * - Does NOT modify Z01-Z04 frozen structures (import type only)
 * - Does NOT implement CLI, stdout/stderr, or file I/O
 * - Does NOT use `any` type
 * - All exported types use readonly modifiers
 */

// ─── Import frozen types (type-only, no runtime dependency) ───────────
import type { FinalDecision, DecisionStatus } from '../engine/decision-evaluator.js';
import type { InputPolicyDocument } from '../parser/policy-schema.js';
import type { EvaluationRequest } from '../parser/evaluation-request-types.js';

// ═══════════════════════════════════════════════════════════════════════
// 1. OriginType
// ═══════════════════════════════════════════════════════════════════════

/**
 * Origin type of a fixture case.
 *
 * - `synthetic`: hand-crafted minimal case for testing specific semantics
 * - `official`: derived from official AWS documentation samples
 * - `open-source`: derived from open-source community IAM policies
 */
export type OriginType = 'synthetic' | 'official' | 'open-source';

/**
 * All valid OriginType values.
 */
export const VALID_ORIGIN_TYPES: readonly OriginType[] = [
  'synthetic',
  'official',
  'open-source',
] as const;

/**
 * Type guard: check if a value is a valid OriginType.
 *
 * Performs runtime validation; returns false for null, undefined,
 * or any string not in the allowed set.
 *
 * @param value  The value to check.
 * @returns true if value is a valid OriginType.
 */
export function isValidOriginType(value: unknown): value is OriginType {
  if (typeof value !== 'string') {
    return false;
  }
  return VALID_ORIGIN_TYPES.includes(value as OriginType);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. CaseMetadata
// ═══════════════════════════════════════════════════════════════════════

/**
 * Metadata for a single fixture case.
 *
 * Describes the identity, purpose, classification, and provenance
 * of a test case. Used for indexing, filtering, and auditability.
 *
 * All fields are readonly. No field is optional – every case must
 * declare its full metadata.
 */
export interface CaseMetadata {
  /** Unique case identifier within the fixtures collection */
  readonly id: string;
  /** Short human-readable case title */
  readonly title: string;
  /** Description of what this case verifies */
  readonly purpose: string;
  /** Classification tags for grouping and filtering */
  readonly tags: readonly string[];
  /** Specific ICAN features covered by this case */
  readonly coveredFeatures: readonly string[];
  /** Origin classification of the policy data */
  readonly originType: OriginType;
  /** Source attribution (e.g. "hand-crafted", "AWS Documentation") */
  readonly source: string;
  /** License under which the policy data is distributed */
  readonly license: string;
  /** Note describing any sanitization applied to the data */
  readonly sanitizationNote: string;
  /** Whether this case contains a real-world-derived policy */
  readonly containsRealWorldPolicy: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. CaseInput
// ═══════════════════════════════════════════════════════════════════════

/**
 * Input data for a single fixture case.
 *
 * References frozen Z01 types (PolicyDocument, EvaluationRequest)
 * via `import type` only – no runtime dependency on parser internals.
 *
 * All fields are readonly.
 */
export interface CaseInput {
  /** One or more policy documents to evaluate */
  readonly policies: readonly InputPolicyDocument[];
  /** The evaluation request (action, resource, context) */
  readonly request: EvaluationRequest;
}

// ═══════════════════════════════════════════════════════════════════════
// 4. ExpectedEvaluation
// ═══════════════════════════════════════════════════════════════════════

/**
 * Expected evaluation result for a fixture case.
 *
 * Strong assertion fields (from Design §11.3.1):
 * - finalDecision
 * - decisionStatus
 * - matchedDenyStatementIds
 * - matchedAllowStatementIds
 *
 * All fields are readonly. All four fields are required –
 * a complete evaluation expectation must declare all of them.
 */
export interface ExpectedEvaluation {
  /** Expected final decision */
  readonly finalDecision: FinalDecision;
  /** Expected decision determinacy status */
  readonly decisionStatus: DecisionStatus;
  /** Expected IDs of applicable Deny statements */
  readonly matchedDenyStatementIds: readonly string[];
  /** Expected IDs of applicable Allow statements */
  readonly matchedAllowStatementIds: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════
// 5. ExpectedPathTraceEntry
// ═══════════════════════════════════════════════════════════════════════

/**
 * Source provenance information in an expected path trace entry.
 *
 * Mirrors StatementSource from Z04 but with optional fields to allow
 * partial assertions. Only sourcePolicyId is required.
 */
export interface ExpectedPathTraceSource {
  /** Source policy document identifier (required) */
  readonly sourcePolicyId: string;
  /** Source policy index (optional for partial assertions) */
  readonly sourcePolicyIndex?: number;
  /** Source statement index (optional for partial assertions) */
  readonly sourceStatementIndex?: number;
  /** Original Sid from the input statement (optional) */
  readonly sid?: string;
}

/**
 * Expected path trace entry for a single statement.
 *
 * Strong assertion fields (from Design §11.3.1):
 * - statementId
 * - applicable
 * - nonApplicableReasons
 * - unsupportedFeatures
 * - source (with sourcePolicyId, sourcePolicyIndex, sourceStatementIndex, sid)
 *
 * All fields are readonly.
 */
export interface ExpectedPathTraceEntry {
  /** Expected stable statement identifier */
  readonly statementId: string;
  /** Whether the statement is expected to be applicable */
  readonly applicable: boolean;
  /** Expected non-applicable reasons (empty when applicable) */
  readonly nonApplicableReasons: readonly string[];
  /** Expected unsupported feature identifiers */
  readonly unsupportedFeatures: readonly string[];
  /** Expected source provenance information */
  readonly source: ExpectedPathTraceSource;
}

// ═══════════════════════════════════════════════════════════════════════
// 6. ExpectedJsonOutput
// ═══════════════════════════════════════════════════════════════════════

/**
 * Expected diagnostics assertion structure.
 *
 * Both fields are optional – a case may assert only invalid inputs,
 * only unsupported features, both, or neither.
 */
export interface ExpectedDiagnostics {
  /** Expected invalid input codes */
  readonly invalidInputs?: readonly { readonly code: string }[];
  /** Expected unsupported feature identifiers */
  readonly unsupportedFeatures?: readonly { readonly feature: string }[];
}

/**
 * Expected JSON output for a fixture case.
 *
 * References EvaluationJsonOutput's field structure from Z04-D02.
 * All fields are optional to support partial assertions – a case
 * may assert only finalDecision, or only pathTrace entries, etc.
 *
 * Strong assertion fields (Design §11.3.1):
 * - finalDecision
 * - matchedDenyStatementIds
 * - matchedAllowStatementIds
 * - pathTrace entries (statementId, applicable, nonApplicableReasons,
 *   unsupportedFeatures)
 *
 * Weak assertion field:
 * - summary
 *
 * All fields are readonly.
 */
export interface ExpectedJsonOutput {
  /** Expected final decision */
  readonly finalDecision?: FinalDecision;
  /** Expected decision determinacy status */
  readonly decisionStatus?: DecisionStatus;
  /** Expected human-readable summary (weak assertion) */
  readonly summary?: string;
  /** Expected applicable Deny statement IDs */
  readonly matchedDenyStatementIds?: readonly string[];
  /** Expected applicable Allow statement IDs */
  readonly matchedAllowStatementIds?: readonly string[];
  /** Expected per-statement results (minimal assertion) */
  readonly statementResults?: readonly {
    readonly statementId: string;
    readonly applicable: boolean;
    readonly nonApplicableReasons?: readonly string[];
  }[];
  /** Expected path trace entries */
  readonly pathTrace?: readonly ExpectedPathTraceEntry[];
  /** Expected diagnostic information */
  readonly diagnostics?: ExpectedDiagnostics;
}

// ═══════════════════════════════════════════════════════════════════════
// 7. ExpectedTextOutput
// ═══════════════════════════════════════════════════════════════════════

/**
 * Expected text/report output for a fixture case.
 *
 * Uses weak (contains/notContains) assertions on the text output,
 * which is primarily human-readable and may be lightly polished.
 *
 * - contains: substrings that must appear in the text output
 * - notContains: substrings that must NOT appear in the text output
 *
 * All fields are readonly.
 */
export interface ExpectedTextOutput {
  /** Substrings that must appear in the text output */
  readonly contains: readonly string[];
  /** Substrings that must NOT appear in the text output (optional) */
  readonly notContains?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════
// 8. AssertionKind
// ═══════════════════════════════════════════════════════════════════════

/**
 * Kind of assertion to apply when comparing expected vs actual values.
 *
 * - `exact`: value must match exactly (used for strong assertions)
 * - `contains`: value must be a substring of the actual (used for weak
 *   assertions on text output)
 * - `regex`: value is a regular expression pattern to match against
 *   the actual
 */
export type AssertionKind = 'exact' | 'contains' | 'regex';

/**
 * All valid AssertionKind values.
 */
export const VALID_ASSERTION_KINDS: readonly AssertionKind[] = [
  'exact',
  'contains',
  'regex',
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 9. Directory and filename constants
// ═══════════════════════════════════════════════════════════════════════

/**
 * Root directory for all test fixtures.
 */
export const FIXTURES_ROOT = 'test-fixtures' as const;

/**
 * Directory containing individual case subdirectories.
 */
export const CASES_DIR = 'cases' as const;

/**
 * Directory within each case for policy document files.
 */
export const POLICIES_DIR = 'policies' as const;

/**
 * Directory within each case for expected output files.
 */
export const EXPECTED_DIR = 'expected' as const;

/**
 * Filename for the evaluation request input file.
 */
export const REQUEST_FILE = 'request.json' as const;

/**
 * Filename for the case metadata file.
 */
export const METADATA_FILE = 'metadata.json' as const;

/**
 * Filename for the expected evaluation result file.
 */
export const EXPECTED_EVALUATION_FILE = 'expected-evaluation.json' as const;

/**
 * Filename for the expected path trace file.
 */
export const EXPECTED_PATH_TRACE_FILE = 'expected-path-trace.json' as const;

/**
 * Filename for the expected JSON output file.
 */
export const EXPECTED_JSON_OUTPUT_FILE = 'expected-json-output.json' as const;

/**
 * Filename for the expected text output file.
 */
export const EXPECTED_TEXT_OUTPUT_FILE = 'expected-text-output.txt' as const;

// ═══════════════════════════════════════════════════════════════════════
// 10. Strong / weak assertion field lists
// ═══════════════════════════════════════════════════════════════════════

/**
 * Strong assertion fields for fixtures expected output.
 *
 * These fields must be asserted with exact or structural matching.
 * Derived from Design §11.3.1:
 * - finalDecision
 * - matchedDenyStatementIds
 * - matchedAllowStatementIds
 * - pathTrace (statementId, applicable, nonApplicableReasons,
 *   unsupportedFeatures, source fields)
 */
export const STRONG_ASSERTION_FIELDS: readonly string[] = [
  'finalDecision',
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
] as const;

/**
 * Weak assertion fields for fixtures expected output.
 *
 * These fields allow limited polishing without breaking assertions.
 * Derived from Design §11.3.1:
 * - summary
 * - text/report natural language sentences
 */
export const WEAK_ASSERTION_FIELDS: readonly string[] = [
  'summary',
  'textOutput',
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 11. Constructor helper functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Construct a CaseMetadata object.
 *
 * Pure constructor function that creates a fully populated CaseMetadata
 * from individual field values. Useful for tests and programmatic case
 * generation.
 *
 * @param id                     Unique case identifier.
 * @param title                  Short human-readable title.
 * @param purpose                Description of what the case verifies.
 * @param tags                   Classification tags.
 * @param coveredFeatures        ICAN features covered.
 * @param originType             Origin classification.
 * @param source                 Source attribution.
 * @param license                Data license.
 * @param sanitizationNote       Sanitization description.
 * @param containsRealWorldPolicy Whether real-world policy data is present.
 * @returns A fully populated CaseMetadata.
 */
export function makeCaseMetadata(
  id: string,
  title: string,
  purpose: string,
  tags: readonly string[],
  coveredFeatures: readonly string[],
  originType: OriginType,
  source: string,
  license: string,
  sanitizationNote: string,
  containsRealWorldPolicy: boolean,
): CaseMetadata {
  return {
    id,
    title,
    purpose,
    tags,
    coveredFeatures,
    originType,
    source,
    license,
    sanitizationNote,
    containsRealWorldPolicy,
  };
}

/**
 * Construct an ExpectedEvaluation object.
 *
 * Pure constructor function for creating expected evaluation results.
 *
 * @param finalDecision             Expected final decision.
 * @param decisionStatus            Expected decision status.
 * @param matchedDenyStatementIds   Expected deny statement IDs.
 * @param matchedAllowStatementIds  Expected allow statement IDs.
 * @returns A fully populated ExpectedEvaluation.
 */
export function makeExpectedEvaluation(
  finalDecision: FinalDecision,
  decisionStatus: DecisionStatus,
  matchedDenyStatementIds: readonly string[],
  matchedAllowStatementIds: readonly string[],
): ExpectedEvaluation {
  return {
    finalDecision,
    decisionStatus,
    matchedDenyStatementIds,
    matchedAllowStatementIds,
  };
}
