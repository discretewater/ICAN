/**
 * Z06-D03: Output formatter – routes EvaluationOutputAssembly to the
 * appropriate Z04 output builder (JSON or text) and formats error
 * output for CLI consumption.
 *
 * This module acts as an adapter between the CLI layer and the Z04
 * frozen output modules. It does NOT call engine, write to stdout/stderr,
 * or produce exitCode.
 *
 * Boundary:
 * - Does import Z04 type and builder functions (buildEvaluationJsonOutput,
 *   buildEvaluationTextOutput) – this is the correct way to "接入" Z04.
 * - Does NOT call engine, parser, or any module beyond Z04's builders.
 * - Does NOT write to stdout/stderr (no console.log, no process.stdout.write).
 * - Does NOT produce exitCode.
 * - Does NOT use `any` type.
 */

import type { EvaluationOutputAssembly } from '../reporters/evaluation-output-assembler.js';
import { buildEvaluationJsonOutput } from '../reporters/evaluation-json-output.js';
import { buildEvaluationTextOutput } from '../reporters/evaluation-text-output.js';
import type { EvaluationJsonOutput } from '../reporters/evaluation-json-output.js';
import type { EvaluationTextOutput } from '../reporters/evaluation-text-output.js';
import type { OutputFormat } from './types.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * Formatted evaluation output (JSON or text).
 *
 * Variants:
 * - json: data contains the full EvaluationJsonOutput structure.
 * - text: data contains the full EvaluationTextOutput structure.
 */
export type FormattedEvaluationOutput =
  | { readonly format: 'json'; readonly data: EvaluationJsonOutput }
  | { readonly format: 'text'; readonly data: EvaluationTextOutput };

/**
 * A single error entry for JSON error output.
 *
 * Fields correspond to the machine-readable error code and a
 * human-readable message.
 */
export interface ErrorEntry {
  /** Machine-readable error code. */
  readonly code: string;
  /** Human-readable error message. */
  readonly message: string;
}

/**
 * Formatted error output (JSON or text).
 *
 * Variants:
 * - json: errors is the list of ErrorEntry objects.
 * - text: message is the human-readable error string.
 */
export type FormattedErrorOutput =
  | { readonly format: 'json'; readonly errors: readonly ErrorEntry[] }
  | { readonly format: 'text'; readonly message: string };

// ─── Core functions ───────────────────────────────────────────────────

/**
 * Route EvaluationOutputAssembly to the appropriate Z04 output builder
 * based on the requested format.
 *
 * - format 'json': directly calls buildEvaluationJsonOutput(assembly).
 * - format 'text': first builds JSON output, then converts to text via
 *   buildEvaluationTextOutput(jsonOutput).
 *
 * This function does NOT write to stdout/stderr, does NOT call engine,
 * and does NOT produce exitCode.
 *
 * @param assembly  The Z04-D01 EvaluationOutputAssembly to format.
 * @param format    Requested output format ('json' or 'text').
 * @returns FormattedEvaluationOutput with the built JSON or text structure.
 */
export function formatEvaluationOutput(
  assembly: EvaluationOutputAssembly,
  format: OutputFormat,
): FormattedEvaluationOutput {
  if (format === 'json') {
    const jsonOutput: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
    return { format: 'json', data: jsonOutput };
  }

  // format === 'text': build JSON first, then convert to text
  const jsonOutput: EvaluationJsonOutput = buildEvaluationJsonOutput(assembly);
  const textOutput: EvaluationTextOutput = buildEvaluationTextOutput(jsonOutput);
  return { format: 'text', data: textOutput };
}

/**
 * Format error entries as JSON or text output.
 *
 * - format 'json': returns { format: 'json', errors } – the errors
 *   array is passed through as-is.
 * - format 'text': returns { format: 'text', message: <string> }.
 *   For a single error, the message is the error's message field.
 *   For multiple errors, messages are joined with newline ('\n').
 *   For zero errors, the message is an empty string.
 *
 * This function does NOT write to stdout/stderr.
 *
 * @param errors  List of error entries to format.
 * @param format  Requested output format ('json' or 'text').
 * @returns FormattedErrorOutput with the formatted errors.
 */
export function formatErrorOutput(
  errors: readonly ErrorEntry[],
  format: OutputFormat,
): FormattedErrorOutput {
  if (format === 'json') {
    return { format: 'json', errors };
  }

  // format === 'text'
  if (errors.length === 0) {
    return { format: 'text', message: '' };
  }

  if (errors.length === 1) {
    const err = errors[0]!;
    return { format: 'text', message: err.message };
  }

  const lines: string[] = errors.map((e) => e.message);
  return { format: 'text', message: lines.join('\n') };
}
