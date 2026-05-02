/**
 * Z06-D01: Help text for the `ican check` command.
 *
 * Generates user-facing help output that describes:
 * - Usage synopsis
 * - Required and optional parameters
 * - Format options
 * - Mutually exclusive constraint notes
 * - Examples
 *
 * This module is purely a string generator with no side effects.
 */

import type { CheckCommandOptions } from './types.js';

/**
 * Render the full help text for `ican check`.
 *
 * The output is a multi-line string suitable for terminal display.
 * It includes USAGE, REQUIRED PARAMETERS, OPTIONAL PARAMETERS,
 * NOTES, and an EXAMPLE section.
 *
 * @returns Formatted help text string.
 */
export function renderHelpText(): string {
  // hardcoding instead of reading from config for standalone clarity
  return [
    'USAGE:',
    '  ican check --policy <path>... --action <action> --resource <resource> [options]',
    '',
    'REQUIRED PARAMETERS:',
    '  --policy <path>       Path to a JSON IAM policy file.',
    '                        May be specified multiple times to load',
    '                        multiple policy documents.',
    '  --action <action>     The IAM action to evaluate, e.g. "s3:GetObject".',
    '  --resource <resource> The target resource ARN, e.g. "arn:aws:s3:::bucket/*".',
    '',
    'OPTIONAL PARAMETERS:',
    '  --context-json <json> Inline JSON context string.',
    '                        Mutually exclusive with --context-file.',
    '  --context-file <path> Path to a JSON context file.',
    '                        Mutually exclusive with --context-json.',
    '  --format <text|json>  Output format. Default: text.',
    '                        text  - Human-readable decision report.',
    '                        json  - Structured JSON output.',
    '  --help                Show this help message and exit.',
    '',
    'NOTES:',
    '  - At least one --policy is required.',
    '  - --context-json and --context-file cannot be used together.',
    '  - --format must be either "text" or "json".',
    '',
    'EXAMPLE:',
    '  ican check \\',
    '    --policy ./policy.json \\',
    '    --action s3:GetObject \\',
    '    --resource arn:aws:s3:::my-bucket/* \\',
    '    --format text',
    '',
    'For more information, see the ICAN documentation.',
  ].join('\n');
}

/**
 * Render a short usage line for error messages.
 *
 * @returns Single-line usage string.
 */
export function renderShortUsage(): string {
  return 'Usage: ican check --policy <path>... --action <action> --resource <resource> [options]';
}

/**
 * Render a parameter error summary suitable for terminal output.
 *
 * @param errors List of parameter validation errors.
 * @param options Optionally include the short usage line prefix.
 * @returns Formatted error string.
 *
 * Note: This function is used by the CLI entry point (D02+)
 * to display errors to the user. It is not invoked by the
 * parser itself; the parser returns structured errors.
 */
export function renderParamErrors(
  errors: readonly { readonly code: string; readonly message: string }[],
  _options?: CheckCommandOptions,
): string {
  const prefix = 'Error: parameter validation failed.\n\n';
  const errorLines = errors.map((e) => `  - ${e.message}`);
  return [prefix, ...errorLines, ''].join('\n');
}
