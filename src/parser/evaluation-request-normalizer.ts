/**
 * Evaluation Request Normalizer - D03 Implementation.
 *
 * Normalizes raw evaluation request inputs into the standardized EvaluationRequest format.
 * Pure functions, no side effects except file system access when reading json-file.
 */

import { readFileSync } from 'node:fs';

import type {
  ContextNormalizationInput,
  ContextNormalizationOutput,
  AssembleEvaluationRequestInput,
  EvaluationRequestNormalizationInput,
  EvaluationRequest,
} from './evaluation-request-types.js';

// ============================================================================
// Errors
// ============================================================================

/**
 * Base error for context normalization failures.
 */
export class ContextNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextNormalizationError';
  }
}

/**
 * Base error for evaluation request normalization failures.
 */
export class EvaluationRequestNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluationRequestNormalizationError';
  }
}

// ============================================================================
// normalizeContext
// ============================================================================

/**
 * Normalize context input to internal format.
 *
 * @param input - ContextNormalizationInput
 * @returns ContextNormalizationOutput
 * @throws ContextNormalizationError If JSON is invalid or top-level is not an object
 */
export function normalizeContext(input: ContextNormalizationInput): ContextNormalizationOutput {
  let parsed: unknown;

  if (input.inputType === 'inline-json') {
    try {
      parsed = JSON.parse(input.inputValue);
    } catch {
      throw new ContextNormalizationError('Invalid JSON in inline context');
    }
  } else if (input.inputType === 'json-file') {
    try {
      const fileContent = readFileSync(input.inputValue, 'utf-8');
      parsed = JSON.parse(fileContent);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new ContextNormalizationError(`Failed to read or parse JSON file: ${msg}`);
    }
  } else {
    throw new ContextNormalizationError(`Unsupported input type: ${input.inputType}`);
  }

  // Validate that parsed result is a plain object
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ContextNormalizationError('Context must be a plain object');
  }

  return Object.freeze({
    context: Object.freeze({ ...parsed }),
  });
}

// ============================================================================
// assembleEvaluationRequest
// ============================================================================

/**
 * Assemble EvaluationRequest from validated inputs.
 *
 * @param input - AssembleEvaluationRequestInput
 * @returns EvaluationRequest
 */
export function assembleEvaluationRequest(
  input: AssembleEvaluationRequestInput,
): EvaluationRequest {
  return Object.freeze({
    action: input.action,
    resource: input.resource,
    context: input.context,
  });
}

// ============================================================================
// normalizeEvaluationRequest
// ============================================================================

/**
 * High-level entry point for EvaluationRequest normalization.
 *
 * @param input - EvaluationRequestNormalizationInput
 * @returns EvaluationRequest
 * @throws EvaluationRequestNormalizationError If action is empty
 * @throws EvaluationRequestNormalizationError If resource is empty
 */
export function normalizeEvaluationRequest(
  input: EvaluationRequestNormalizationInput,
): EvaluationRequest {
  const action = input.action;
  if (!action || typeof action !== 'string' || action.trim() === '') {
    throw new EvaluationRequestNormalizationError('Action must be a non-empty string');
  }

  const resource = input.resource;
  if (!resource || typeof resource !== 'string' || resource.trim() === '') {
    throw new EvaluationRequestNormalizationError('Resource must be a non-empty string');
  }

  const context: Readonly<Record<string, unknown>> =
    input.contextInput !== undefined
      ? normalizeContext(input.contextInput).context
      : Object.freeze({});

  return assembleEvaluationRequest({
    action: action.trim(),
    resource: resource.trim(),
    context,
  });
}