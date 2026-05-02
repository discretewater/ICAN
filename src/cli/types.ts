/**
 * Z06-D01: CLI parameter model types.
 *
 * Defines the typed parameter model for the `ican check` command.
 * All types are intentionally CLI-layer only; no engine, parser,
 * or reporter types are imported or referenced here.
 *
 * Boundaries:
 * - Does NOT define EvaluationRequest, StandardStatement, or
 *   any engine-level type.
 * - CheckCommandOptions is the typed output of argument parsing;
 *   downstream D02/D03 tasks will consume this to build engine inputs.
 */

/** Valid output format values for --format. */
export type OutputFormat = 'text' | 'json';

/** All valid format strings as a readonly array for validation. */
export const VALID_FORMATS: readonly OutputFormat[] = ['text', 'json'];

/**
 * Parsed and validated options for the `ican check` subcommand.
 *
 * Required fields:
 * - policies: at least one policy file path (--policy).
 * - action: the IAM action to evaluate (--action).
 * - resource: the target resource ARN (--resource).
 *
 * Optional fields:
 * - contextJson: inline JSON context string (--context-json).
 *   Mutually exclusive with contextFile.
 * - contextFile: path to a JSON context file (--context-file).
 *   Mutually exclusive with contextJson.
 * - format: output format; defaults to "text" (--format).
 */
export interface CheckCommandOptions {
  readonly policies: readonly string[];
  readonly action: string;
  readonly resource: string;
  readonly contextJson?: string;
  readonly contextFile?: string;
  readonly format: OutputFormat;
}

/** Known CLI parameter names, used for validation and error messages. */
export const KNOWN_FLAGS: readonly string[] = [
  '--policy',
  '--action',
  '--resource',
  '--context-json',
  '--context-file',
  '--format',
  '--help',
];

/** Flags that accept exactly one value argument. */
export const VALUED_FLAGS: ReadonlySet<string> = new Set([
  '--policy',
  '--action',
  '--resource',
  '--context-json',
  '--context-file',
  '--format',
]);

/** Flags that accept no value (boolean flags). */
export const BOOLEAN_FLAGS: ReadonlySet<string> = new Set([
  '--help',
]);

/**
 * Error codes for parameter validation failures.
 *
 * - missing_required: a required parameter was not provided.
 * - invalid_format: --format value is not "text" or "json".
 * - mutually_exclusive: two incompatible flags were used together.
 * - unknown_flag: an unrecognized flag was provided.
 * - missing_value: a valued flag was provided without its required value.
 * - duplicate_flag: a single-value flag was specified more than once.
 * - unexpected_positional: a non-flag positional argument was provided.
 */
export type ParamErrorCode =
  | 'missing_required'
  | 'invalid_format'
  | 'mutually_exclusive'
  | 'unknown_flag'
  | 'missing_value'
  | 'duplicate_flag'
  | 'unexpected_positional';

/**
 * Structured parameter error.
 */
export interface ParamError {
  readonly code: ParamErrorCode;
  readonly message: string;
}

/**
 * Result of parsing and validating CLI arguments for `ican check`.
 *
 * Variants:
 * - success: parsing succeeded; options contains validated parameters.
 * - error: one or more validation errors were found; see errors array.
 * - help: --help was requested; helpText contains the help message.
 */
export type ParseResult =
  | { readonly kind: 'success'; readonly options: CheckCommandOptions }
  | { readonly kind: 'error'; readonly errors: readonly ParamError[] }
  | { readonly kind: 'help'; readonly helpText: string };

/**
 * Result of dispatching a top-level subcommand.
 *
 * Variants:
 * - parse_result: a recognized subcommand was dispatched; the
 *   subcommand's ParseResult is carried through.
 * - help: no subcommand, or top-level --help requested.
 * - error: unknown subcommand or dispatch-level error.
 */
export type DispatchResult =
  | { readonly kind: 'parse_result'; readonly parseResult: ParseResult }
  | { readonly kind: 'help'; readonly helpText: string }
  | { readonly kind: 'error'; readonly message: string };
