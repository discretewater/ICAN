/**
 * Z06-D01: CLI module entry point.
 *
 * Exports:
 * - Types: CheckCommandOptions, OutputFormat, ParamError,
 *   ParseResult, DispatchResult, and related constants.
 * - Functions: parseCheckArgs (pure argument parser),
 *   dispatch (top-level subcommand routing),
 *   renderHelpText, renderShortUsage, renderParamErrors.
 *
 * This module is the public API surface of the CLI layer.
 * It does NOT import from src/engine/, src/reporters/, or
 * any file-I/O-capable module. It is purely parameter parsing
 * and command routing.
 *
 * The `dispatch` function orchestrates subcommand routing
 * for the ICAN binary. It handles:
 * - No subcommand → show top-level help.
 * - Unknown subcommand → error.
 * - "check" subcommand → delegate to parseCheckArgs.
 *
 * The actual `process.argv` integration and process.exit handling
 * are part of D04 (exit codes) and D05 (end-to-end); they are
 * not included in this module.
 */

import { parseCheckArgs } from './parser.js';
import { renderParamErrors } from './help.js';

import type {
  CheckCommandOptions,
  OutputFormat,
  ParamError,
  ParamErrorCode,
  ParseResult,
  DispatchResult,
} from './types.js';

// Re-export types for consumers (tests, downstream modules)
export type {
  CheckCommandOptions,
  OutputFormat,
  ParamError,
  ParamErrorCode,
  ParseResult,
  DispatchResult,
};

// Re-export constants
export {
  VALID_FORMATS,
  KNOWN_FLAGS,
  VALUED_FLAGS,
  BOOLEAN_FLAGS,
} from './types.js';

// Re-export functions
export { parseCheckArgs } from './parser.js';
export { renderHelpText, renderShortUsage, renderParamErrors } from './help.js';

/**
 * Top-level help text for the `ican` binary.
 *
 * Lists available subcommands and global options.
 * Shown when no subcommand is provided.
 *
 * @returns Help text string.
 */
function renderTopLevelHelp(): string {
  return [
    'ICAN - Local minimum privilege assessment engine.',
    '',
    'USAGE:',
    '  ican <command> [options]',
    '',
    'COMMANDS:',
    '  check     Evaluate an IAM permission request against policies.',
    '',
    'Run "ican check --help" for check subcommand help.',
  ].join('\n');
}

/**
 * Dispatch a top-level subcommand from raw arguments.
 *
 * The input should be the raw argv after the binary name
 * (i.e., process.argv.slice(2)).
 *
 * Routing logic:
 * - [] or ["--help"] → top-level help.
 * - ["check", ...] → delegate to parseCheckArgs.
 * - ["unknown", ...] → error.
 *
 * @param rawArgs Raw argument strings after the binary name.
 * @returns DispatchResult.
 */
export function dispatch(rawArgs: readonly string[]): DispatchResult {
  if (rawArgs.length === 0) {
    return { kind: 'help', helpText: renderTopLevelHelp() };
  }

  const subcommand = rawArgs[0] as string;

  // Handle top-level --help (before subcommand)
  if (subcommand === '--help') {
    return { kind: 'help', helpText: renderTopLevelHelp() };
  }

  if (subcommand === 'check') {
    const checkArgs = rawArgs.slice(1);
    return { kind: 'parse_result', parseResult: parseCheckArgs(checkArgs) };
  }

  // Unknown subcommand
  return {
    kind: 'error',
    message: `Unknown command: ${subcommand}. Available commands: check. Use --help for usage information.`,
  };
}

/**
 * Main CLI entry point for the `ican` binary.
 *
 * Takes process.argv (or equivalent) and produces a string output
 * with the appropriate exit code hint. This function is a thin
 * wrapper around `dispatch` that converts the result to a
 * human-readable string.
 *
 * Note: This function does NOT call process.exit. Exit code mapping
 * is handled by D04.
 *
 * @param argv Full argv array (including node/binary path at [0],[1]).
 * @returns An object containing the output text and a suggested exit code.
 */
export function main(argv: readonly string[]): { readonly output: string; readonly exitCode: number } {
  const rawArgs = argv.slice(2);
  const result = dispatch(rawArgs);

  switch (result.kind) {
    case 'help':
      return { output: result.helpText, exitCode: 0 };
    case 'error':
      return { output: `Error: ${result.message}\n`, exitCode: 2 };
    case 'parse_result':
      if (result.parseResult.kind === 'help') {
        return { output: result.parseResult.helpText, exitCode: 0 };
      }
      if (result.parseResult.kind === 'error') {
        const errorText = renderParamErrors(result.parseResult.errors);
        return { output: errorText, exitCode: 2 };
      }
      // Success: D02 will consume result.parseResult.options
      // For now, return a placeholder message (real output in D03).
      const opts = result.parseResult.options;
      return {
        output: `OK: parsed check command with action=${opts.action}, resource=${opts.resource}, policies=${opts.policies.length}\n`,
        exitCode: 0,
      };
  }
}
