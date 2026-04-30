/**
 * golden-cases.ts – Z05-D02: core evaluation golden cases baseline planning.
 *
 * This module defines:
 * 1. GoldenCaseCategory – union type of six evaluation outcome categories
 * 2. GoldenCaseOutline – type describing a single golden case's planning
 *    metadata and expected assertions
 * 3. MINIMAL_GOLDEN_CASES – minimum set of 13 golden case outlines covering
 *    the first batch of case directions from Design §11.4
 *
 * Boundary:
 * - Does NOT create real fixtures directories (test-fixtures/cases/...)
 * - Does NOT generate golden output files (expected-evaluation.json, etc.)
 * - Does NOT introduce real-world IAM Policy samples
 * - Does NOT modify Z01-Z04 frozen modules (parser, engine, reporters)
 * - Does NOT modify Z05-D01 fixture-schema.ts
 * - Does NOT implement CLI, stdout/stderr, or file I/O
 * - Does NOT use `any` type
 * - All exported types use readonly modifiers
 * - Imports from D01 are `import type` only – no runtime dependency
 */

// ─── Import frozen D01 types (type-only, no runtime dependency) ───────
import type {
  ExpectedEvaluation,
  ExpectedPathTraceEntry,
  ExpectedDiagnostics,
} from './fixture-schema.js';

// ═══════════════════════════════════════════════════════════════════════
// 1. GoldenCaseCategory
// ═══════════════════════════════════════════════════════════════════════

/**
 * Category of a golden case, representing the evaluation outcome class.
 *
 * - `allow`: at least one Allow statement matches, no Deny overrides
 * - `explicit-deny`: an explicit Deny statement matches and overrides
 * - `implicit-deny`: no Allow statement matches (default deny)
 * - `indeterminate`: decision cannot be determined due to missing,
 *   ambiguous, or conflicting input (DecisionStatus.INDETERMINATE)
 * - `unsupported`: engine encounters unsupported but non-blocking
 *   features; the evaluation may still produce a decision but with
 *   diagnostics reporting unsupported features
 * - `invalid`: input is structurally or semantically invalid and
 *   cannot be evaluated normally
 */
export type GoldenCaseCategory =
  | 'allow'
  | 'explicit-deny'
  | 'implicit-deny'
  | 'indeterminate'
  | 'unsupported'
  | 'invalid';

/**
 * All valid GoldenCaseCategory values.
 *
 * Used for runtime validation and test coverage checks.
 */
export const VALID_GOLDEN_CASE_CATEGORIES: readonly GoldenCaseCategory[] = [
  'allow',
  'explicit-deny',
  'implicit-deny',
  'indeterminate',
  'unsupported',
  'invalid',
] as const;

// ═══════════════════════════════════════════════════════════════════════
// 2. GoldenCaseOutline
// ═══════════════════════════════════════════════════════════════════════

/**
 * Outline / planning record describing a single golden case.
 *
 * Contains the case identity, classification, purpose, and the expected
 * evaluation assertions that a golden case runner will validate against
 * actual engine output. Does NOT contain actual policy document content,
 * input JSON, or golden output files – only the expected outcome structure
 * and planning metadata.
 *
 * Required fields (from Design §11.3.1 strong assertions):
 * - id, title, category, purpose, coveredFeatures, expectedEvaluation
 *
 * Optional fields:
 * - expectedPathTrace: per-statement expected path trace entries for
 *   strong assertion on path trace output
 * - expectedDiagnostics: expected invalid input codes or unsupported
 *   feature identifiers reported during evaluation
 * - notes: free-form planning notes for case authors
 *
 * All fields are readonly. This type is designed for programmatic
 * construction of golden case outlines and for test-driven validation
 * of case coverage.
 */
export interface GoldenCaseOutline {
  /** Unique case identifier within the golden cases collection */
  readonly id: string;
  /** Short human-readable case title */
  readonly title: string;
  /** Evaluation outcome category */
  readonly category: GoldenCaseCategory;
  /** Description of what this case verifies */
  readonly purpose: string;
  /** ICAN features covered by this case */
  readonly coveredFeatures: readonly string[];
  /** Expected evaluation result (strong assertion fields) */
  readonly expectedEvaluation: ExpectedEvaluation;
  /** Expected per-statement path trace entries (optional) */
  readonly expectedPathTrace?: readonly ExpectedPathTraceEntry[];
  /** Expected diagnostic information (optional) */
  readonly expectedDiagnostics?: ExpectedDiagnostics;
  /** Free-form planning notes (optional) */
  readonly notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// 3. MINIMAL_GOLDEN_CASES
// ═══════════════════════════════════════════════════════════════════════

/**
 * Minimum set of 13 golden case outlines covering the first batch of
 * core evaluation case directions from Design §11.4.
 *
 * Each case targets one primary semantic point. All cases use synthetic
 * (hand-crafted) minimal policies – no real-world IAM Policy samples are
 * embedded or referenced.
 *
 * The 13 directions:
 * 1.  Single Allow statement match
 * 2.  Single Deny statement match
 * 3.  IMPLICIT_DENY – no statement matches
 * 4.  Action mismatch (action not matched → IMPLICIT_DENY)
 * 5.  Resource mismatch (resource not matched → IMPLICIT_DENY)
 * 6.  StringEquals condition hit (condition matches → Allow)
 * 7.  StringEquals condition miss (condition fails → IMPLICIT_DENY)
 * 8.  Bool condition hit (condition matches → Allow)
 * 9.  Bool condition miss (condition fails → IMPLICIT_DENY)
 * 10. IpAddress condition hit (condition matches → Allow)
 * 11. IpAddress condition miss (condition fails → IMPLICIT_DENY)
 * 12. Unsupported Condition operator (detected and reported)
 * 13. Invalid policy structure (detected and reported)
 *
 * Note: the `indeterminate` category is defined in GoldenCaseCategory
 * for future golden cases (e.g. Z05-D03 path trace cases) but is not
 * represented in this minimal list because indeterminate outcomes
 * require more complex input scenarios that exceed the minimal
 * one-semantic-point-per-case principle of this first batch.
 */
export const MINIMAL_GOLDEN_CASES: readonly GoldenCaseOutline[] = [
  // ── 1. Single Allow match ─────────────────────────────────────────
  {
    id: 'gc-allow-single',
    title: 'Single Allow Statement Match',
    category: 'allow',
    purpose: 'Verify that a single matching Allow statement results in ALLOW.',
    coveredFeatures: ['action-matching', 'resource-matching'],
    expectedEvaluation: {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt-allow-1'],
    },
    expectedPathTrace: [],
    notes: 'Simplest positive case: one policy, one Allow statement, all fields match.',
  },

  // ── 2. Single Deny match ──────────────────────────────────────────
  {
    id: 'gc-deny-single',
    title: 'Single Deny Statement Match',
    category: 'explicit-deny',
    purpose: 'Verify that a single matching Deny statement results in EXPLICIT_DENY.',
    coveredFeatures: ['action-matching', 'resource-matching', 'deny-override'],
    expectedEvaluation: {
      finalDecision: 'EXPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: ['stmt-deny-1'],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'Simplest negative case: one policy, one Deny statement, all fields match.',
  },

  // ── 3. IMPLICIT_DENY (no match) ───────────────────────────────────
  {
    id: 'gc-implicit-deny-no-match',
    title: 'Implicit Deny – No Statement Matches',
    category: 'implicit-deny',
    purpose: 'Verify that when no statement matches, the result is IMPLICIT_DENY.',
    coveredFeatures: ['implicit-deny'],
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'One policy with statements that do not match the request (action/resource mismatch).',
  },

  // ── 4. Action mismatch ────────────────────────────────────────────
  {
    id: 'gc-action-mismatch',
    title: 'Action Mismatch – Implicit Deny',
    category: 'implicit-deny',
    purpose: 'Verify that when the requested action does not match any statement action, the result is IMPLICIT_DENY.',
    coveredFeatures: ['action-matching'],
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'Statement Action is "s3:GetObject", request action is "s3:PutObject".',
  },

  // ── 5. Resource mismatch ──────────────────────────────────────────
  {
    id: 'gc-resource-mismatch',
    title: 'Resource Mismatch – Implicit Deny',
    category: 'implicit-deny',
    purpose: 'Verify that when the requested resource does not match any statement resource, the result is IMPLICIT_DENY.',
    coveredFeatures: ['resource-matching'],
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'Statement Resource is "arn:aws:s3:::bucket-a", request resource is "arn:aws:s3:::bucket-b".',
  },

  // ── 6. StringEquals condition hit ─────────────────────────────────
  {
    id: 'gc-condition-string-equals-hit',
    title: 'StringEquals Condition Hit – Allow',
    category: 'allow',
    purpose: 'Verify that a StringEquals condition that matches the request context produces ALLOW.',
    coveredFeatures: ['action-matching', 'resource-matching', 'condition-string-equals'],
    expectedEvaluation: {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt-allow-string-eq'],
    },
    expectedPathTrace: [],
    notes: 'Condition key "s3:prefix" equals the expected value in request context.',
  },

  // ── 7. StringEquals condition miss ────────────────────────────────
  {
    id: 'gc-condition-string-equals-miss',
    title: 'StringEquals Condition Miss – Implicit Deny',
    category: 'implicit-deny',
    purpose: 'Verify that a StringEquals condition that does not match the request context produces IMPLICIT_DENY.',
    coveredFeatures: ['condition-string-equals'],
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'Condition key "s3:prefix" does not match request context value; statement becomes non-applicable.',
  },

  // ── 8. Bool condition hit ─────────────────────────────────────────
  {
    id: 'gc-condition-bool-hit',
    title: 'Bool Condition Hit – Allow',
    category: 'allow',
    purpose: 'Verify that a Bool condition that matches the request context produces ALLOW.',
    coveredFeatures: ['action-matching', 'resource-matching', 'condition-bool'],
    expectedEvaluation: {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt-allow-bool'],
    },
    expectedPathTrace: [],
    notes: 'Condition key "aws:SecureTransport" equals "true", request context matches.',
  },

  // ── 9. Bool condition miss ────────────────────────────────────────
  {
    id: 'gc-condition-bool-miss',
    title: 'Bool Condition Miss – Implicit Deny',
    category: 'implicit-deny',
    purpose: 'Verify that a Bool condition that does not match the request context produces IMPLICIT_DENY.',
    coveredFeatures: ['condition-bool'],
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'Condition key "aws:SecureTransport" expects "true", request context has "false".',
  },

  // ── 10. IpAddress condition hit ───────────────────────────────────
  {
    id: 'gc-condition-ip-address-hit',
    title: 'IpAddress Condition Hit – Allow',
    category: 'allow',
    purpose: 'Verify that an IpAddress condition that matches the request context produces ALLOW.',
    coveredFeatures: ['action-matching', 'resource-matching', 'condition-ip-address'],
    expectedEvaluation: {
      finalDecision: 'ALLOW',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: ['stmt-allow-ip'],
    },
    expectedPathTrace: [],
    notes: 'Condition key "aws:SourceIp" matches the expected CIDR range in request context.',
  },

  // ── 11. IpAddress condition miss ──────────────────────────────────
  {
    id: 'gc-condition-ip-address-miss',
    title: 'IpAddress Condition Miss – Implicit Deny',
    category: 'implicit-deny',
    purpose: 'Verify that an IpAddress condition that does not match the request context produces IMPLICIT_DENY.',
    coveredFeatures: ['condition-ip-address'],
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'DETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedPathTrace: [],
    notes: 'Condition key "aws:SourceIp" does not match the expected CIDR range.',
  },

  // ── 12. Unsupported Condition ─────────────────────────────────────
  {
    id: 'gc-unsupported-condition',
    title: 'Unsupported Condition Operator',
    category: 'unsupported',
    purpose: 'Verify that an unsupported Condition operator is detected and reported in engine diagnostics.',
    coveredFeatures: ['unsupported-condition'],
    expectedEvaluation: {
      finalDecision: 'IMPLICIT_DENY',
      decisionStatus: 'INDETERMINATE',
      matchedDenyStatementIds: [],
      matchedAllowStatementIds: [],
    },
    expectedDiagnostics: {
      unsupportedFeatures: [{ feature: 'ConditionOperator:ArnEquals' }],
    },
    expectedPathTrace: [],
    notes: 'Condition uses an unsupported operator (e.g. ArnEquals). Statement is treated as non-applicable.',
  },

  // ── 13. Invalid policy structure ──────────────────────────────────
  {
    id: 'gc-invalid-policy',
    title: 'Invalid Policy Structure',
    category: 'invalid',
    purpose: 'Verify that a structurally invalid IAM policy produces appropriate diagnostics.',
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
    expectedPathTrace: [],
    notes: 'Policy JSON is missing the required "Statement" field or has a malformed structure that cannot be parsed.',
  },
] as const;
