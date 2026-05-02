/**
 * Z06-D02: Input Loader — policy file reading, JSON parsing,
 * EvaluationRequest assembly, and context processing.
 *
 * This module bridges the D01 CheckCommandOptions (parsed CLI arguments)
 * to the frozen Z01 input model: it reads policy files from disk,
 * parses and validates them using Z01's policy-schema, normalizes
 * them via Z01's policy-normalizer, and assembles an EvaluationRequest
 * from the action, resource, and context fields.
 *
 * Boundaries:
 * - DOES read policy files from the filesystem.
 * - DOES call Z01 frozen modules (policy-schema, policy-normalizer).
 * - Does NOT call engine, reporter, or produce EvaluationResult.
 * - Does NOT produce exitCode.
 * - Does NOT use `any` types.
 */

import { readFileSync } from 'node:fs';

import { parseAndClassify } from '../parser/policy-schema.js';
import { normalizePolicy } from '../parser/policy-normalizer.js';
import type { NormalizationInput } from '../parser/policy-normalizer.js';
import type { EvaluationRequest } from '../parser/evaluation-request-types.js';
import type { StandardStatement } from '../parser/policy-types.js';
import type { CheckCommandOptions } from './types.js';

// ─── Error Types ──────────────────────────────────────────────────────

/** Error codes for policy file loading failures. */
export type PolicyLoadErrorCode =
  | 'POLICY_FILE_NOT_FOUND'
  | 'POLICY_FILE_READ_ERROR'
  | 'POLICY_INVALID_JSON'
  | 'POLICY_INVALID_SHAPE'
  | 'POLICY_INVALID_FIELD_VALUE'
  | 'POLICY_UNSUPPORTED_FEATURE';

/** Structured error for a single policy file load failure. */
export interface PolicyLoadError {
  /** Path to the policy file that failed. */
  readonly policyPath: string;
  /** Machine-readable error code. */
  readonly code: PolicyLoadErrorCode;
  /** Human-readable error message. */
  readonly message: string;
}

/** Error codes for context loading failures. */
export type ContextLoadErrorCode =
  | 'CONTEXT_INVALID_JSON'
  | 'CONTEXT_FILE_NOT_FOUND'
  | 'CONTEXT_FILE_READ_ERROR'
  | 'CONTEXT_NOT_OBJECT';

/** Structured error for a context load failure. */
export interface ContextLoadError {
  /** Machine-readable error code. */
  readonly code: ContextLoadErrorCode;
  /** Human-readable error message. */
  readonly message: string;
}

/** Error codes for action/resource validation failures. */
export type InputValidationErrorCode =
  | 'ACTION_EMPTY'
  | 'RESOURCE_EMPTY';

/** Structured error for action or resource validation. */
export interface InputValidationError {
  /** Machine-readable error code. */
  readonly code: InputValidationErrorCode;
  /** Human-readable error message. */
  readonly message: string;
}

// ─── Result Types ─────────────────────────────────────────────────────

/** Successful input load result. */
export interface InputLoadSuccess {
  readonly ok: true;
  /** The assembled EvaluationRequest. */
  readonly evaluationRequest: EvaluationRequest;
  /** All normalized statements from all loaded policies. */
  readonly statements: readonly StandardStatement[];
}

/** Failed input load result. */
export interface InputLoadFailure {
  readonly ok: false;
  /** Errors from policy file loading (may be empty if only context/validation fails). */
  readonly policyErrors: readonly PolicyLoadError[];
  /** Context loading error, if any (null if context is okay or absent). */
  readonly contextError: ContextLoadError | null;
  /** Action/resource validation errors. */
  readonly validationErrors: readonly InputValidationError[];
}

/** Union result type for input loading. */
export type InputLoadResult = InputLoadSuccess | InputLoadFailure;

// ─── Internal Discriminated Result Types ──────────────────────────────

/** Discriminated result for loading a single policy file. */
type SinglePolicyResult =
  | { readonly kind: 'success'; readonly statements: readonly StandardStatement[] }
  | { readonly kind: 'error'; readonly error: PolicyLoadError };

/** Discriminated result for processing context. */
type ContextResult =
  | { readonly kind: 'success'; readonly context: Readonly<Record<string, unknown>> }
  | { readonly kind: 'error'; readonly error: ContextLoadError };

// ─── Internal Helpers ─────────────────────────────────────────────────

/**
 * Try to read and parse a single policy file.
 *
 * @param policyPath - Absolute or relative path to a JSON policy file.
 * @param sourcePolicyIndex - The 0-based index of this policy in the options list.
 * @returns A discriminated {@link SinglePolicyResult}.
 */
function loadSinglePolicy(
  policyPath: string,
  sourcePolicyIndex: number,
): SinglePolicyResult {
  // Step 1: Read the file
  let rawContent: string;
  try {
    rawContent = readFileSync(policyPath, 'utf-8');
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (
      nodeErr !== null &&
      typeof nodeErr === 'object' &&
      (nodeErr as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return {
        kind: 'error',
        error: {
          policyPath,
          code: 'POLICY_FILE_NOT_FOUND',
          message: `Policy file not found: ${policyPath}`,
        },
      };
    }
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return {
      kind: 'error',
      error: {
        policyPath,
        code: 'POLICY_FILE_READ_ERROR',
        message: `Failed to read policy file ${policyPath}: ${msg}`,
      },
    };
  }

  // Step 2: Parse and classify via Z01 policy-schema
  const classification = parseAndClassify(rawContent);

  if (!classification.ok) {
    if (classification.classification === 'invalid') {
      const codeMap: Record<string, PolicyLoadErrorCode> = {
        invalid_json: 'POLICY_INVALID_JSON',
        invalid_shape: 'POLICY_INVALID_SHAPE',
        invalid_field_value: 'POLICY_INVALID_FIELD_VALUE',
      };
      const code: PolicyLoadErrorCode =
        codeMap[classification.reason] ?? 'POLICY_INVALID_JSON';
      return {
        kind: 'error',
        error: {
          policyPath,
          code,
          message:
            classification.detail ??
            `Policy validation failed: ${classification.reason}`,
        },
      };
    }
    // classification === 'unsupported_feature'
    return {
      kind: 'error',
      error: {
        policyPath,
        code: 'POLICY_UNSUPPORTED_FEATURE',
        message:
          classification.detail ??
          `Unsupported feature: ${classification.feature}`,
      },
    };
  }

  // Step 3: Normalize via Z01 policy-normalizer
  const normInput: NormalizationInput = {
    policy: classification.policy,
    sourcePolicyPath: policyPath,
    sourceDescription: '', // file input uses sourcePolicyPath
    sourcePolicyIndex,
  };
  const normalized = normalizePolicy(normInput);

  return { kind: 'success', statements: normalized.statements };
}

/**
 * Process context from CheckCommandOptions.
 *
 * @param options - The parsed CLI options.
 * @returns A discriminated {@link ContextResult}.
 */
function processContext(options: CheckCommandOptions): ContextResult {
  if (options.contextJson !== undefined) {
    // Inline JSON context
    let parsed: unknown;
    try {
      parsed = JSON.parse(options.contextJson);
    } catch {
      return {
        kind: 'error',
        error: {
          code: 'CONTEXT_INVALID_JSON',
          message: 'Invalid JSON in --context-json value',
        },
      };
    }
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {
        kind: 'error',
        error: {
          code: 'CONTEXT_NOT_OBJECT',
          message: '--context-json must be a JSON object',
        },
      };
    }
    return { kind: 'success', context: Object.freeze({ ...parsed }) };
  }

  if (options.contextFile !== undefined) {
    // File-based context
    let rawContent: string;
    try {
      rawContent = readFileSync(options.contextFile, 'utf-8');
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (
        nodeErr !== null &&
        typeof nodeErr === 'object' &&
        (nodeErr as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return {
          kind: 'error',
          error: {
            code: 'CONTEXT_FILE_NOT_FOUND',
            message: `Context file not found: ${options.contextFile}`,
          },
        };
      }
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return {
        kind: 'error',
        error: {
          code: 'CONTEXT_FILE_READ_ERROR',
          message: `Failed to read context file ${options.contextFile}: ${msg}`,
        },
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return {
        kind: 'error',
        error: {
          code: 'CONTEXT_INVALID_JSON',
          message: 'Context file contains invalid JSON',
        },
      };
    }
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {
        kind: 'error',
        error: {
          code: 'CONTEXT_NOT_OBJECT',
          message: 'Context file must contain a JSON object',
        },
      };
    }
    return { kind: 'success', context: Object.freeze({ ...parsed }) };
  }

  // No context provided: default to empty object
  return { kind: 'success', context: Object.freeze({}) };
}

/**
 * Validate action and resource fields.
 *
 * @param action - The action string from options.
 * @param resource - The resource string from options.
 * @returns List of validation errors (may be empty).
 */
function validateActionResource(
  action: string,
  resource: string,
): readonly InputValidationError[] {
  const errors: InputValidationError[] = [];

  if (typeof action !== 'string' || action.trim() === '') {
    errors.push({
      code: 'ACTION_EMPTY',
      message: 'Action must be a non-empty string',
    });
  }

  if (typeof resource !== 'string' || resource.trim() === '') {
    errors.push({
      code: 'RESOURCE_EMPTY',
      message: 'Resource must be a non-empty string',
    });
  }

  return errors;
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Load all inputs from CheckCommandOptions and produce an
 * {@link InputLoadResult}.
 *
 * This is the main entry point for Z06-D02. It reads policy files,
 * validates and normalizes them using Z01 frozen modules, processes
 * context from --context-json or --context-file, and assembles an
 * EvaluationRequest.
 *
 * Error handling strategy:
 * - Policy errors are collected per-file; if any policy fails, the
 *   result is a failure with all policy errors listed.
 * - Context errors are reported as a single error (first failure wins).
 * - Action/resource validation errors are collected independently.
 * - If any category of errors exists, the overall result is failure.
 * - Only when ALL categories pass is a success result produced.
 *
 * @param options - Parsed CLI options from Z06-D01.
 * @returns An {@link InputLoadResult} indicating success or structured failure.
 */
export function loadInput(options: CheckCommandOptions): InputLoadResult {
  const policyErrors: PolicyLoadError[] = [];
  const allStatements: StandardStatement[] = [];

  // ── Load and validate each policy file ──────────────────────────
  for (let i = 0; i < options.policies.length; i++) {
    const policyPath = options.policies[i] as string;
    const result = loadSinglePolicy(policyPath, i);

    if (result.kind === 'success') {
      allStatements.push(...result.statements);
    } else {
      policyErrors.push(result.error);
    }
  }

  // ── Validate action and resource ────────────────────────────────
  const validationErrors = validateActionResource(
    options.action,
    options.resource,
  );

  // ── Process context ─────────────────────────────────────────────
  const contextResult = processContext(options);

  // ── Determine overall result ────────────────────────────────────
  if (
    policyErrors.length > 0 ||
    validationErrors.length > 0 ||
    contextResult.kind === 'error'
  ) {
    return {
      ok: false,
      policyErrors,
      contextError: contextResult.kind === 'error' ? contextResult.error : null,
      validationErrors,
    };
  }

  // ── All checks passed: assemble EvaluationRequest ──────────────
  const evaluationRequest: EvaluationRequest = Object.freeze({
    action: options.action.trim(),
    resource: options.resource.trim(),
    context: contextResult.context,
  });

  return {
    ok: true,
    evaluationRequest,
    statements: allStatements,
  };
}
