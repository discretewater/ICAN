/**
 * Error Model - Structured error and unsupported feature expressions.
 *
 * This module provides the D04 error representation types:
 * - UnsupportedFeature: features not supported in phase 1
 * - InvalidInput: input validation failures
 * - Diagnostic: unified diagnostic container
 */

/**
 * UnsupportedFeature - unsupported feature expression
 * Carries identification information for features not supported in phase 1.
 */
export interface UnsupportedFeature {
  /** Feature identifier, e.g. "NotAction", "NumericEquals" */
  readonly feature: string;
  /** Optional detail description */
  readonly detail?: string;
}

/**
 * InvalidInput - structured invalid input expression
 * Represents input that fails validation due to structure/type/format issues.
 */
export interface InvalidInput {
  /** Error code, e.g. "INVALID_JSON", "MISSING_FIELD" */
  readonly code: string;
  /** Human-readable error message */
  readonly message: string;
  /** Optional path to the invalid field */
  readonly path?: string;
}

/**
 * Diagnostic - unified diagnostic expression
 * Combines invalid inputs and unsupported features into a structured format.
 */
export interface Diagnostic {
  /** Indicates if there are invalid inputs */
  readonly hasInvalid: boolean;
  /** List of invalid input errors */
  readonly invalidInputs: readonly InvalidInput[];
  /** Indicates if there are unsupported features */
  readonly hasUnsupported: boolean;
  /** List of unsupported features */
  readonly unsupportedFeatures: readonly UnsupportedFeature[];
}

/**
 * Create an UnsupportedFeature.
 */
export function createUnsupportedFeature(
  feature: string,
  detail?: string
): UnsupportedFeature {
  return detail !== undefined
    ? { feature, detail }
    : { feature };
}

/**
 * Create an InvalidInput.
 */
export function createInvalidInput(
  code: string,
  message: string,
  path?: string
): InvalidInput {
  return path !== undefined
    ? { code, message, path }
    : { code, message };
}

/**
 * Create a Diagnostic from invalid inputs and unsupported features.
 */
export function createDiagnostic(
  invalidInputs: readonly InvalidInput[] = [],
  unsupportedFeatures: readonly UnsupportedFeature[] = []
): Diagnostic {
  return {
    hasInvalid: invalidInputs.length > 0,
    invalidInputs,
    hasUnsupported: unsupportedFeatures.length > 0,
    unsupportedFeatures,
  };
}

import type { InputInvalidResult, InputUnsupportedResult } from './policy-types.js';
import type { EvaluationRequest } from './evaluation-request-types.js';

/**
 * Create a Diagnostic from an InputInvalidResult (D01).
 * This is the minimum bridge from D01's invalid classification to D04's error model.
 */
export function fromInputInvalid(result: InputInvalidResult): Diagnostic {
  return {
    hasInvalid: true,
    invalidInputs: [{
      code: result.reason,
      message: result.detail ?? result.reason,
    }],
    hasUnsupported: false,
    unsupportedFeatures: [],
  };
}

/**
 * Create a Diagnostic from an InputUnsupportedResult (D01).
 * This is the minimum bridge from D01's unsupported_feature classification to D04's error model.
 */
export function fromInputUnsupported(result: InputUnsupportedResult): Diagnostic {
  return {
    hasInvalid: false,
    invalidInputs: [],
    hasUnsupported: true,
    unsupportedFeatures: [{
      feature: result.feature,
      detail: result.detail,
    }],
  };
}

/**
 * EvaluatorInput - combines evaluation request with optional diagnostic.
 * This is the minimum bridge from D03 (EvaluationRequest) and D04 (Diagnostic)
 * to downstream evaluation stages.
 */
/**
 * Check if a Diagnostic has any issues.
 */
export function hasIssues(diagnostic: Diagnostic): boolean {
  return diagnostic.hasInvalid || diagnostic.hasUnsupported;
}

/**
 * EvaluatorInput - combines evaluation request with optional diagnostic.
 * This is the minimum bridge from D03 (EvaluationRequest) and D04 (Diagnostic)
 * to downstream evaluation stages.
 */
export interface EvaluatorInput {
  readonly request: EvaluationRequest;
  readonly diagnostic: Diagnostic;
}

/**
 * Create an EvaluatorInput from an EvaluationRequest and Diagnostic.
 * This is the minimum bridge from D03 to D04 and beyond.
 */
export function createEvaluatorInput(
  request: EvaluationRequest,
  diagnostic: Diagnostic
): EvaluatorInput {
  return { request, diagnostic };
}
