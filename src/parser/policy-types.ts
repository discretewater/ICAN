/**
 * Input layer types for ICAN policy parsing.
 *
 * These types define the raw input structures BEFORE schema validation.
 * Only after passing through the input schema (policy-schema.ts) can
 * external JSON be considered valid input and proceed to normalization.
 *
 * This layer intentionally reserves fields that will be needed in later
 * stages (StandardStatement, sourcePolicyId, statementId, etc.) but does
 * NOT implement their generation logic here.
 */

/**
 * Effect values accepted in the first phase.
 * Any other value should be treated as invalid_field_value.
 */
export type InputEffect = 'Allow' | 'Deny';

/**
 * Represents the raw structure of a Statement in the input policy document.
 *
 * Statement can be either:
 * - A single object with Effect, Action, Resource (and optional fields)
 * - An array of such objects
 *
 * This type captures the shape we ACCEPT at the input layer, before
 * normalization. Field value validation happens in the schema layer.
 */
export interface InputStatement {
  /** Optional statement identifier */
  Sid?: string;
  /** Effect must be 'Allow' or 'Deny' */
  Effect: InputEffect;
  /** Action can be a single string or an array of strings */
  Action: string | string[];
  /** Resource can be a single string or an array of strings */
  Resource: string | string[];
  /** Optional condition block */
  Condition?: InputCondition;
  /** NotAction is not supported in phase 1 */
  NotAction?: unknown;
  /** NotResource is not supported in phase 1 */
  NotResource?: unknown;
  /** Principal is not supported in phase 1 */
  Principal?: unknown;
}

/**
 * Raw Condition structure from input policy.
 * We accept the object shape but will validate operators later.
 */
export interface InputCondition {
  [operator: string]: {
    [key: string]: string | string[] | boolean | boolean[] | number | number[];
  };
}

/**
 * The top-level PolicyDocument structure.
 * Must be a JSON object with a Statement field.
 */
export interface InputPolicyDocument {
  /** Optional Version field */
  Version?: string;
  /** Statement is required - can be single object or array */
  Statement: InputStatement | InputStatement[];
  /** Optional Id field */
  Id?: string;
}

/**
 * Result of parsing and validating an input JSON string.
 * This is the output of the first-stage input classification.
 */
export type InputValidationResult =
  | InputValidResult
  | InputInvalidResult
  | InputUnsupportedResult;

/**
 * Input passed schema validation and classification.
 * Can proceed to normalization.
 */
export interface InputValidResult {
  readonly ok: true;
  readonly policy: InputPolicyDocument;
}

/**
 * Input failed validation - structure or field value is invalid.
 */
export interface InputInvalidResult {
  readonly ok: false;
  readonly classification: 'invalid';
  readonly reason: InvalidReason;
  readonly detail?: string;
}

/**
 * Specific invalid reasons at the input layer.
 */
export type InvalidReason =
  /** Raw JSON could not be parsed */
  | 'invalid_json'
  /** JSON is valid but overall structure doesn't match PolicyDocument or Statement */
  | 'invalid_shape'
  /** Field exists but its value doesn't match the allowed form for phase 1 */
  | 'invalid_field_value';

/**
 * Input structure is recognizable but uses semantics not supported in phase 1.
 */
export interface InputUnsupportedResult {
  readonly ok: false;
  readonly classification: 'unsupported_feature';
  readonly reason: 'unsupported_feature';
  readonly feature: string;
  readonly detail?: string;
}

/**
 * Supported Condition operators in phase 1.
 */
export const SUPPORTED_CONDITION_OPERATORS = [
  'StringEquals',
  'StringLike',
  'Bool',
  'IpAddress',
] as const;

/**
 * Unsupported but recognizable features that should be classified as unsupported
 * rather than invalid.
 */
export const UNSUPPORTED_FEATURES = [
  'NotAction',
  'NotResource',
  'Principal',
  'NumericEquals',
  'NumericNotEquals',
  'NumericLessThan',
  'NumericGreaterThan',
  'DateEquals',
  'DateNotEquals',
  'IpAddress', // if used with Not prefix
  'Null',
  'ForAllValues',
  'ForAnyValue',
  'IfExists',
] as const;

/**
 * Check if a feature name represents an unsupported but recognizable feature.
 */
export function isRecognizableUnsupportedFeature(fieldName: string): boolean {
  return UNSUPPORTED_FEATURES.includes(fieldName as typeof UNSUPPORTED_FEATURES[number]);
}

/**
 * Check if a condition operator is not supported in phase 1.
 */
export function isUnsupportedConditionOperator(operator: string): boolean {
  return !SUPPORTED_CONDITION_OPERATORS.includes(operator as typeof SUPPORTED_CONDITION_OPERATORS[number]);
}
