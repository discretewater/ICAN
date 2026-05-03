/**
 * Z06-D05: CLI end-to-end orchestration for `ican check`.
 *
 * This module implements the full pipeline from parsed CLI options
 * (CheckCommandOptions) to structured result (RunResult), plus a
 * `runCli` function that handles the complete argv→stdout/stderr/exitCode
 * flow.
 *
 * Pipeline (runCheck):
 *   1. loadInput(options) → InputLoadResult (D02)
 *   2. evaluateStatements(statements, request) → MatchResult[] (Z01 engine)
 *   3. evaluateDecision(matchResults) → EvaluationResult (Z01 engine)
 *   4. buildPathTrace(evaluationResult, statements) → PathTraceEntry[] (Z01 engine)
 *   5. assembleEvaluationOutput(evaluationResult, pathTrace) (Z04-D01)
 *   6. formatEvaluationOutput(assembly, format) → FormattedEvaluationOutput (D03)
 *   7. mapDecisionToExitCode(finalDecision, decisionStatus) → ExitCode (D04)
 *   8. serialize → stdout string, return RunResult
 *
 * IO discipline:
 * - `runCheck` is a pure orchestrator: it does NOT write to stdout/stderr,
 *   does NOT call process.exit, does NOT use process.argv.
 * - `runCli` bridges argv to real IO: it calls dispatch, runCheck, and
 *   writes to process.stdout/stderr, then sets process.exitCode.
 * - Neither function uses `any`.
 * - Neither function calls process.exit() directly (only process.exitCode).
 */

import { loadInput } from './input-loader.js';
import { formatEvaluationOutput, formatErrorOutput } from './output-formatter.js';
import { mapDecisionToExitCode, mapErrorsToExitCode } from './exit-code.js';
import { dispatch } from './index.js';

import { evaluateStatements } from '../engine/statement-evaluator.js';
import { evaluateDecision } from '../engine/decision-evaluator.js';
import { buildPathTrace } from '../engine/path-trace-builder.js';
import { assembleEvaluationOutput } from '../reporters/evaluation-output-assembler.js';

import type { CheckCommandOptions } from './types.js';
import type { ExitCode } from './exit-code.js';
import type { ErrorEntry, FormattedEvaluationOutput, FormattedErrorOutput } from './output-formatter.js';
import type { EvaluationTextOutput } from '../reporters/evaluation-text-output.js';

// ─── Public types ────────────────────────────────────────────────────

/**
 * Structured end-to-end run result without IO side effects.
 *
 * All output strings are fully formed; the caller is responsible for
 * writing them to real stdout/stderr and setting process.exitCode.
 */
export interface RunResult {
  readonly exitCode: ExitCode;
  readonly stdout: string;
  readonly stderr: string;
}

// ─── Internal serialization helpers ──────────────────────────────────

/**
 * Serialize a text-format EvaluationTextOutput to a multi-line string.
 *
 * Format:
 *   title
 *   ---
 *   label1:
 *     line1
 *     line2
 *   label2:
 *     line3
 *
 * @param textOutput The structured text output to serialize.
 * @returns A multi-line string suitable for terminal display.
 */
function serializeTextOutput(textOutput: EvaluationTextOutput): string {
  const lines: string[] = [];
  lines.push(textOutput.title);
  lines.push('---');

  for (const section of textOutput.sections) {
    lines.push(`${section.label}:`);
    for (const line of section.lines) {
      lines.push(`  ${line}`);
    }
  }

  return lines.join('\n');
}

/**
 * Serialize a FormattedEvaluationOutput to its string representation.
 *
 * - JSON format: JSON.stringify(data, null, 2) for readable indentation.
 * - Text format: multi-line text report via {@link serializeTextOutput}.
 *
 * @param output The formatted evaluation output to serialize.
 * @returns A string (JSON or human-readable text).
 */
function serializeEvaluationOutput(output: FormattedEvaluationOutput): string {
  if (output.format === 'json') {
    return JSON.stringify(output.data, null, 2);
  }

  return serializeTextOutput(output.data);
}

/**
 * Serialize a FormattedErrorOutput to its string representation.
 *
 * - JSON format: { "errors": [...] } wrapped object with indentation.
 * - Text format: the message string directly.
 *
 * @param output The formatted error output to serialize.
 * @returns A string (JSON or human-readable text).
 */
function serializeErrorOutput(output: FormattedErrorOutput): string {
  if (output.format === 'json') {
    return JSON.stringify({ errors: output.errors }, null, 2);
  }

  return output.message;
}

// ─── Core orchestration ──────────────────────────────────────────────

/**
 * Execute the complete `ican check` pipeline from parsed CLI options.
 *
 * Takes already-parsed and validated {@link CheckCommandOptions}
 * (the output of D01's parseCheckArgs) and runs the full evaluation
 * pipeline: input loading (D02), engine evaluation (Z01 D04/D05/D06),
 * output assembly (Z04-D01), output formatting (D03), and exit code
 * determination (D04).
 *
 * This function is a pure orchestrator:
 * - Does NOT write to process.stdout or process.stderr.
 * - Does NOT call process.exit().
 * - Does NOT read process.argv.
 * - Does NOT use `any`.
 *
 * Marked `async` for future extensibility (file I/O may become async);
 * all current operations are synchronous.
 *
 * @param options Parsed CLI options from Z06-D01.
 * @returns A {@link RunResult} with fully-formed stdout, stderr and exitCode.
 */
export async function runCheck(options: CheckCommandOptions): Promise<RunResult> {
  // ── Step 2: Load input (D02) ──────────────────────────────────
  const loaded = loadInput(options);

  if (!loaded.ok) {
    // Collect all errors into a flat ErrorEntry[].
    const errorEntries: ErrorEntry[] = [];

    for (const pe of loaded.policyErrors) {
      errorEntries.push({ code: pe.code, message: pe.message });
    }
    if (loaded.contextError !== null) {
      errorEntries.push({ code: loaded.contextError.code, message: loaded.contextError.message });
    }
    for (const ve of loaded.validationErrors) {
      errorEntries.push({ code: ve.code, message: ve.message });
    }

    const formattedErrors = formatErrorOutput(errorEntries, options.format);
    const stderr = serializeErrorOutput(formattedErrors);
    const exitCode = mapErrorsToExitCode(errorEntries);

    return { exitCode, stdout: '', stderr };
  }

  // ── Step 3: Evaluate statements (Z01 engine) ──────────────────
  const matchResults = evaluateStatements(loaded.statements, loaded.evaluationRequest);

  // ── Step 4: Merge decisions (Z01 engine) ─────────────────────
  const evaluationResult = evaluateDecision(matchResults);

  // ── Build path trace (Z01 engine) ────────────────────────────
  const pathTrace = buildPathTrace(evaluationResult, loaded.statements);

  // ── Step 5: Assemble evaluation output (Z04-D01) ─────────────
  const assembly = assembleEvaluationOutput(evaluationResult, pathTrace);

  // ── Step 6: Format output (D03) ──────────────────────────────
  const formattedOutput = formatEvaluationOutput(assembly, options.format);

  // ── Step 7: Map exit code (D04) ──────────────────────────────
  const exitCode = mapDecisionToExitCode(
    evaluationResult.finalDecision,
    evaluationResult.decisionStatus,
  );

  // ── Step 8: Serialize ────────────────────────────────────────
  const stdout = serializeEvaluationOutput(formattedOutput);

  return { exitCode, stdout, stderr: '' };
}

// ─── CLI IO bridge ───────────────────────────────────────────────────

/**
 * Execute the full `ican` CLI pipeline from raw argv through to IO.
 *
 * Pipeline:
 * 1. dispatch(rawArgs) → DispatchResult (D01)
 *    - help → write helpText to stdout, exitCode 0
 *    - error → write error to stderr, exitCode 2
 *    - parse_result → handle ParseResult:
 *      - help → write helpText to stdout, exitCode 0
 *      - error → format ParamError[] as error output to stderr, exitCode via mapErrorsToExitCode
 *      - success → {@link runCheck}(options), write stdout/stderr, set exitCode
 *
 * This function is the only place in `main.ts` that writes to real
 * stdout/stderr and sets process.exitCode. It does NOT call
 * process.exit().
 *
 * @param rawArgs Raw argument strings after the binary name,
 *                i.e., `process.argv.slice(2)`.
 */
export async function runCli(rawArgs: readonly string[]): Promise<void> {
  try {
    const dispatchResult = dispatch(rawArgs);

    // ── Dispatch-level: help ──────────────────────────────────────
    if (dispatchResult.kind === 'help') {
      process.stdout.write(dispatchResult.helpText + '\n');
      process.exitCode = 0;
      return;
    }

    // ── Dispatch-level: unknown subcommand error ─────────────────
    if (dispatchResult.kind === 'error') {
      const errors: ErrorEntry[] = [{ code: 'UNKNOWN_COMMAND', message: dispatchResult.message }];
      const formatted = formatErrorOutput(errors, 'text');
      const stderr = serializeErrorOutput(formatted);
      process.stderr.write(stderr + '\n');
      process.exitCode = mapErrorsToExitCode(errors);
      return;
    }

    // ── Subcommand-level: parse_result ───────────────────────────
    const parseResult = dispatchResult.parseResult;

    if (parseResult.kind === 'help') {
      process.stdout.write(parseResult.helpText + '\n');
      process.exitCode = 0;
      return;
    }

    if (parseResult.kind === 'error') {
      // ParamError[] conforms to ErrorEntry[] structurally.
      const formatted = formatErrorOutput(parseResult.errors, 'text');
      const stderr = serializeErrorOutput(formatted);
      process.stderr.write(stderr + '\n');
      process.exitCode = mapErrorsToExitCode(parseResult.errors);
      return;
    }

    // ── Success: run the full check pipeline ─────────────────────
    const result = await runCheck(parseResult.options);

    if (result.stdout.length > 0) {
      process.stdout.write(result.stdout + '\n');
    }

    if (result.stderr.length > 0) {
      process.stderr.write(result.stderr + '\n');
    }

    process.exitCode = result.exitCode;
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? `Internal error: ${error.message}`
        : 'Internal error: unexpected failure';
    process.stderr.write(message + '\n');
    process.exitCode = 10; // EXIT_CODE.INTERNAL_ERROR
  }
}
