/**
 * Evaluation JSON output – Z04-D02: defines JSON plain object structures
 * with stable field ordering and a constructor function that converts
 * EvaluationOutputAssembly into EvaluationJsonOutput.
 *
 * This module does NOT re-compute decisions, re-evaluate statements,
 * re-construct pathTrace, call JSON.stringify, or generate text/report
 * output. It only maps existing data from EvaluationOutputAssembly into
 * plain object types with stable field ordering.
 *
 * Boundary:
 * - Does not call assembleEvaluationOutput() or buildPathTrace()
 * - Does not call statement evaluator or decision merger
 * - Does not call JSON.stringify()
 * - Does not generate JSON strings
 * - Does not generate text/report output
 * - Does not handle CLI
 */

import type { EvaluationOutputAssembly } from './evaluation-output-assembler.js';
import type { FinalDecision, DecisionStatus } from '../engine/decision-evaluator.js';
import type { MatchResult } from '../engine/statement-evaluator.js';
import type { PathTraceEntry, StatementSource } from '../engine/path-trace-builder.js';
import type { Diagnostic, InvalidInput, UnsupportedFeature } from '../parser/error-model.js';

// ─── JSON output types (stable field ordering) ───────────────────────

/**
 * JSON plain object representation of MatchResult.
 *
 * Field order matches the original MatchResult definition in
 * statement-evaluator.ts to ensure stable Object.keys() order.
 */
export interface StatementResultJson {
  readonly statementId: string;
  readonly effect: 'Allow' | 'Deny';
  readonly actionMatched: boolean;
  readonly resourceMatched: boolean;
  readonly conditionMatched: boolean;
  readonly applicable: boolean;
  readonly nonApplicableReasons: readonly string[];
  readonly unsupportedFeatures: readonly string[];
}

/**
 * JSON plain object representation of StatementSource.
 *
 * Field order: sourcePolicyId, sourcePolicyPath, sourcePolicyIndex,
 * sourceStatementIndex, sid.
 *
 * When `sid` is undefined, it is preserved as `undefined` in the plain
 * object – NOT rewritten to null or empty string. The key still appears
 * in Object.keys() output.
 */
export interface StatementSourceJson {
  readonly sourcePolicyId: string;
  readonly sourcePolicyPath: string;
  readonly sourcePolicyIndex: number;
  readonly sourceStatementIndex: number;
  readonly sid: string | undefined;
}

/**
 * JSON plain object representation of PathTraceEntry.
 *
 * Field order: statementId, effect, actionMatched, resourceMatched,
 * conditionMatched, applicable, nonApplicableReasons,
 * unsupportedFeatures, source.
 *
 * Does NOT include unfrozen fields such as sourceStatement, path,
 * or decision.
 */
export interface PathTraceEntryJson {
  readonly statementId: string;
  readonly effect: 'Allow' | 'Deny';
  readonly actionMatched: boolean;
  readonly resourceMatched: boolean;
  readonly conditionMatched: boolean;
  readonly applicable: boolean;
  readonly nonApplicableReasons: readonly string[];
  readonly unsupportedFeatures: readonly string[];
  readonly source: StatementSourceJson;
}

/**
 * JSON plain object representation of InvalidInput.
 *
 * Field order: code, message, path.
 *
 * When `path` is undefined, it is preserved as `undefined` – NOT
 * rewritten to null or empty string.
 */
export interface InvalidInputJson {
  readonly code: string;
  readonly message: string;
  readonly path: string | undefined;
}

/**
 * JSON plain object representation of UnsupportedFeature.
 *
 * Field order: feature, detail.
 *
 * When `detail` is undefined, it is preserved as `undefined` – NOT
 * rewritten to null or empty string.
 */
export interface UnsupportedFeatureJson {
  readonly feature: string;
  readonly detail: string | undefined;
}

/**
 * JSON plain object representation of Diagnostic.
 *
 * Field order: hasInvalid, invalidInputs, hasUnsupported,
 * unsupportedFeatures.
 */
export interface DiagnosticJson {
  readonly hasInvalid: boolean;
  readonly invalidInputs: readonly InvalidInputJson[];
  readonly hasUnsupported: boolean;
  readonly unsupportedFeatures: readonly UnsupportedFeatureJson[];
}

/**
 * Top-level JSON plain object output structure.
 *
 * Field order is stable and must remain in the specified sequence:
 * finalDecision, decisionStatus, summary, matchedDenyStatementIds,
 * matchedAllowStatementIds, statementResults, pathTrace, diagnostics.
 *
 * All fields are readonly. This structure does NOT contain text/report
 * output or fabricated fields like sourceStatement, path, or decision.
 */
export interface EvaluationJsonOutput {
  readonly finalDecision: FinalDecision;
  readonly decisionStatus: DecisionStatus;
  readonly summary: string;
  readonly matchedDenyStatementIds: readonly string[];
  readonly matchedAllowStatementIds: readonly string[];
  readonly statementResults: readonly StatementResultJson[];
  readonly pathTrace: readonly PathTraceEntryJson[];
  readonly diagnostics: DiagnosticJson;
}

// ─── Internal mapping helpers ────────────────────────────────────────

/**
 * Map a single MatchResult to StatementResultJson with stable field order.
 *
 * All fields come directly from the input – no re-computation.
 */
function mapStatementResult(mr: MatchResult): StatementResultJson {
  return {
    statementId: mr.statementId,
    effect: mr.effect,
    actionMatched: mr.actionMatched,
    resourceMatched: mr.resourceMatched,
    conditionMatched: mr.conditionMatched,
    applicable: mr.applicable,
    nonApplicableReasons: mr.nonApplicableReasons,
    unsupportedFeatures: mr.unsupportedFeatures,
  };
}

/**
 * Map a single StatementSource to StatementSourceJson with stable field order.
 *
 * Preserves undefined sid without rewriting to null or empty string.
 * The `sid` key is always present in Object.keys() output.
 */
function mapStatementSource(ss: StatementSource): StatementSourceJson {
  // Use __sid trick to ensure `sid` key appears even when undefined.
  // This preserves the key in Object.keys() while keeping the value
  // as undefined, which is the correct plain object representation.
  return {
    sourcePolicyId: ss.sourcePolicyId,
    sourcePolicyPath: ss.sourcePolicyPath,
    sourcePolicyIndex: ss.sourcePolicyIndex,
    sourceStatementIndex: ss.sourceStatementIndex,
    sid: ss.sid,
  };
}

/**
 * Map a single PathTraceEntry to PathTraceEntryJson with stable field order.
 *
 * All fields come directly from the input – no re-computation.
 * Does NOT add unfrozen fields like sourceStatement, path, or decision.
 */
function mapPathTraceEntry(pt: PathTraceEntry): PathTraceEntryJson {
  return {
    statementId: pt.statementId,
    effect: pt.effect,
    actionMatched: pt.actionMatched,
    resourceMatched: pt.resourceMatched,
    conditionMatched: pt.conditionMatched,
    applicable: pt.applicable,
    nonApplicableReasons: pt.nonApplicableReasons,
    unsupportedFeatures: pt.unsupportedFeatures,
    source: mapStatementSource(pt.source),
  };
}

/**
 * Map a single InvalidInput to InvalidInputJson with stable field order.
 *
 * Preserves undefined path without rewriting to null or empty string.
 */
function mapInvalidInput(ii: InvalidInput): InvalidInputJson {
  return {
    code: ii.code,
    message: ii.message,
    path: ii.path,
  };
}

/**
 * Map a single UnsupportedFeature to UnsupportedFeatureJson with stable
 * field order.
 *
 * Preserves undefined detail without rewriting to null or empty string.
 */
function mapUnsupportedFeature(uf: UnsupportedFeature): UnsupportedFeatureJson {
  return {
    feature: uf.feature,
    detail: uf.detail,
  };
}

/**
 * Map Diagnostic to DiagnosticJson with stable field order.
 */
function mapDiagnostic(diag: Diagnostic): DiagnosticJson {
  return {
    hasInvalid: diag.hasInvalid,
    invalidInputs: diag.invalidInputs.map(mapInvalidInput),
    hasUnsupported: diag.hasUnsupported,
    unsupportedFeatures: diag.unsupportedFeatures.map(mapUnsupportedFeature),
  };
}

// ─── Core function ───────────────────────────────────────────────────

/**
 * Build an EvaluationJsonOutput from an EvaluationOutputAssembly.
 *
 * This function:
 * - Maps all fields from the assembly into JSON plain objects
 * - Ensures stable field ordering for Object.keys()
 * - Preserves undefined values (sid, path, detail) without rewriting
 *   to null or empty string
 * - Does NOT call assembleEvaluationOutput() or buildPathTrace()
 * - Does NOT re-compute decision, re-evaluate statements, or
 *   re-construct pathTrace
 * - Does NOT call JSON.stringify()
 * - Does NOT generate text/report output
 *
 * @param assembly  The Z04-D01 EvaluationOutputAssembly to convert.
 * @returns EvaluationJsonOutput with stable field ordering.
 */
export function buildEvaluationJsonOutput(
  assembly: EvaluationOutputAssembly,
): EvaluationJsonOutput {
  return {
    finalDecision: assembly.finalDecision,
    decisionStatus: assembly.decisionStatus,
    summary: assembly.summary,
    matchedDenyStatementIds: assembly.matchedDenyStatementIds,
    matchedAllowStatementIds: assembly.matchedAllowStatementIds,
    statementResults: assembly.statementResults.map(mapStatementResult),
    pathTrace: assembly.pathTrace.map(mapPathTraceEntry),
    diagnostics: mapDiagnostic(assembly.diagnostics),
  };
}