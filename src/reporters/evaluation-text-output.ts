/**
 * Evaluation text output – Z04-D03: defines structured text report types
 * and a constructor function that converts EvaluationJsonOutput into
 * EvaluationTextOutput.
 *
 * This module consumes the JSON structured result (EvaluationJsonOutput from
 * Z04-D02) as its single source of truth. It does NOT re-compute decisions,
 * re-construct pathTrace, re-evaluate statements, or generate JSON strings.
 *
 * Boundary:
 * - Does not call buildEvaluationJsonOutput() or assembleEvaluationOutput()
 * - Does not re-compute decision, decisionStatus, or summary
 * - Does not call JSON.stringify()
 * - Does not write to stdout/stderr (no console.log, no process.stdout.write)
 * - Does not handle CLI, argv, or exitCode
 * - Does not use `any` type
 * - Does not fabricate fields not present in EvaluationJsonOutput
 */

import type { EvaluationJsonOutput } from './evaluation-json-output.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * A single section in the text report, containing a label and
 * an ordered list of human-readable lines.
 *
 * The label identifies the section kind. Lines are stable strings
 * derived exclusively from the EvaluationJsonOutput input.
 */
export interface TextSection {
  /** Section label, e.g. "decision", "decisionStatus", "summary" */
  readonly label: string;
  /** Human-readable lines for this section, in stable order */
  readonly lines: readonly string[];
}

/**
 * Structured text report output produced by consuming EvaluationJsonOutput.
 *
 * The title is a fixed header. Sections follow the design spec order:
 * 1. decision
 * 2. decisionStatus
 * 3. summary
 * 4. matchedStatements
 * 5. pathTrace
 * 6. diagnostics
 *
 * Each section has a label and lines. Lines contain only data that
 * originates from the EvaluationJsonOutput – no fabrication, no
 * re-computation.
 */
export interface EvaluationTextOutput {
  /** Report title */
  readonly title: string;
  /** Ordered sections following design spec */
  readonly sections: readonly TextSection[];
}

// ─── Internal section builders ────────────────────────────────────────

/**
 * Build the decision section from finalDecision.
 * Line content is the decision value itself – no re-computation.
 */
function buildDecisionSection(json: EvaluationJsonOutput): TextSection {
  return {
    label: 'decision',
    lines: [json.finalDecision],
  };
}

/**
 * Build the decision status section.
 * DETERMINATE → "DETERMINATE"
 * INDETERMINATE → "INDETERMINATE (indeterminate)"
 *
 * Does not change the semantics of decisionStatus.
 */
function buildDecisionStatusSection(json: EvaluationJsonOutput): TextSection {
  const statusLine: string = json.decisionStatus === 'INDETERMINATE'
    ? 'INDETERMINATE (indeterminate)'
    : 'DETERMINATE';

  return {
    label: 'decisionStatus',
    lines: [statusLine],
  };
}

/**
 * Build the summary section.
 * Line content is the summary string from the structured result –
 * no re-computation.
 */
function buildSummarySection(json: EvaluationJsonOutput): TextSection {
  return {
    label: 'summary',
    lines: [json.summary],
  };
}

/**
 * Build the matched statements section.
 * Lists matched deny statement IDs followed by matched allow statement IDs.
 * If both lists are empty, outputs "none".
 */
function buildMatchedStatementsSection(json: EvaluationJsonOutput): TextSection {
  const lines: string[] = [];

  if (json.matchedDenyStatementIds.length > 0) {
    lines.push('deny:');
    for (const id of json.matchedDenyStatementIds) {
      lines.push(`  ${id}`);
    }
  }

  if (json.matchedAllowStatementIds.length > 0) {
    lines.push('allow:');
    for (const id of json.matchedAllowStatementIds) {
      lines.push(`  ${id}`);
    }
  }

  if (lines.length === 0) {
    lines.push('none');
  }

  return {
    label: 'matchedStatements',
    lines,
  };
}

/**
 * Determine the human-readable expression of a PathTraceEntryJson source.
 *
 * When source is a default placeholder (sourcePolicyId="", sourcePolicyIndex=-1,
 * sid=undefined), returns "source: unavailable".
 * Otherwise, returns a string combining policy ID and SID.
 *
 * Does NOT fabricate paths, decisions, or sourceStatement references.
 */
function formatSource(source: {
  readonly sourcePolicyId: string;
  readonly sourcePolicyPath: string;
  readonly sourcePolicyIndex: number;
  readonly sourceStatementIndex: number;
  readonly sid: string | undefined;
}): string {
  const isPlaceholder: boolean =
    source.sourcePolicyId === '' &&
    source.sourcePolicyPath === '' &&
    source.sourcePolicyIndex === -1 &&
    source.sourceStatementIndex === -1 &&
    source.sid === undefined;

  if (isPlaceholder) {
    return 'source: unavailable';
  }

  const parts: string[] = [];
  parts.push(`policyId: ${source.sourcePolicyId}`);
  if (source.sid !== undefined) {
    parts.push(`sid: ${source.sid}`);
  }
  return `source: ${parts.join(', ')}`;
}

/**
 * Build the path trace section.
 * Each PathTraceEntryJson generates an overview line showing statementId,
 * effect, applicability, and source.
 * If pathTrace is empty, outputs "none".
 */
function buildPathTraceSection(json: EvaluationJsonOutput): TextSection {
  if (json.pathTrace.length === 0) {
    return {
      label: 'pathTrace',
      lines: ['none'],
    };
  }

  const lines: string[] = [];
  for (const entry of json.pathTrace) {
    // Stable overview line: statementId, effect, applicable flag, source
    const applicableStr: string = entry.applicable ? 'applicable' : 'not-applicable';
    const sourceStr: string = formatSource(entry.source);
    lines.push(`${entry.statementId}: ${entry.effect} [${applicableStr}] ${sourceStr}`);
  }

  return {
    label: 'pathTrace',
    lines,
  };
}

/**
 * Build the diagnostics section.
 * Lists invalid inputs (with code, message, and path if present) and
 * unsupported features (with feature name and detail if present).
 * If no diagnostics issues, outputs "none".
 *
 * Does not add new permission judgments or infer conclusions.
 */
function buildDiagnosticsSection(json: EvaluationJsonOutput): TextSection {
  const diag = json.diagnostics;
  const lines: string[] = [];

  if (diag.invalidInputs.length > 0) {
    lines.push('invalidInputs:');
    for (const input of diag.invalidInputs) {
      let line: string = `  [${input.code}] ${input.message}`;
      if (input.path !== undefined) {
        line += ` (path: ${input.path})`;
      }
      lines.push(line);
    }
  }

  if (diag.unsupportedFeatures.length > 0) {
    lines.push('unsupportedFeatures:');
    for (const feature of diag.unsupportedFeatures) {
      let line: string = `  ${feature.feature}`;
      if (feature.detail !== undefined) {
        line += `: ${feature.detail}`;
      }
      lines.push(line);
    }
  }

  if (lines.length === 0) {
    lines.push('none');
  }

  return {
    label: 'diagnostics',
    lines,
  };
}

// ─── Core function ────────────────────────────────────────────────────

/**
 * Build an EvaluationTextOutput from an EvaluationJsonOutput.
 *
 * This function:
 * - Consumes EvaluationJsonOutput as its single source of truth
 * - Produces a structured text object with title and ordered sections
 * - Does NOT re-compute decision, decisionStatus, or summary
 * - Does NOT re-construct pathTrace or re-evaluate statements
 * - Does NOT call JSON.stringify()
 * - Does NOT write to stdout/stderr
 * - Does NOT handle CLI, argv, or exitCode
 * - Does NOT use `any` type
 * - Does NOT fabricate fields not present in EvaluationJsonOutput
 *
 * @param jsonOutput  The Z04-D02 EvaluationJsonOutput to convert.
 * @returns EvaluationTextOutput with title and ordered sections.
 */
export function buildEvaluationTextOutput(
  jsonOutput: EvaluationJsonOutput,
): EvaluationTextOutput {
  return {
    title: 'Evaluation Report',
    sections: [
      buildDecisionSection(jsonOutput),
      buildDecisionStatusSection(jsonOutput),
      buildSummarySection(jsonOutput),
      buildMatchedStatementsSection(jsonOutput),
      buildPathTraceSection(jsonOutput),
      buildDiagnosticsSection(jsonOutput),
    ],
  };
}