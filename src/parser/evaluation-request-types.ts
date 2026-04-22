/**
 * EvaluationRequest - normalized request format for downstream processing.
 *
 * This is the output of D03. It contains only:
 * - action: the requested action
 * - resource: the requested resource
 * - context: the evaluation context
 *
 * StandardStatement[] is NOT part of EvaluationRequest - it is received
 * in parallel by the D04 evaluation engine.
 */
export interface EvaluationRequest {
  readonly action: string;
  readonly resource: string;
  readonly context: Readonly<Record<string, unknown>>;
}

/**
 * Context input type enumeration
 */
export type ContextInputType = 'inline-json' | 'json-file';

/**
 * Context normalization input
 */
export interface ContextNormalizationInput {
  readonly inputType: ContextInputType;
  readonly inputValue: string;
}

/**
 * Context normalization output
 */
export interface ContextNormalizationOutput {
  readonly context: Readonly<Record<string, unknown>>;
}

/**
 * AssembleEvaluationRequestInput
 */
export interface AssembleEvaluationRequestInput {
  readonly action: string;
  readonly resource: string;
  readonly context: Readonly<Record<string, unknown>>;
}

/**
 * EvaluationRequestNormalizationInput
 */
export interface EvaluationRequestNormalizationInput {
  readonly action: string;
  readonly resource: string;
  readonly contextInput?: ContextNormalizationInput;
}