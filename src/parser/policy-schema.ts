/**
 * Input Schema for PolicyDocument and Statement.
 *
 * This module defines the validation schema for raw JSON policy input.
 * It classifies input into:
 * - invalid_json: JSON cannot be parsed
 * - invalid_shape: JSON is valid but structure doesn't match PolicyDocument/Statement
 * - invalid_field_value: Field exists but value is not in allowed form
 * - unsupported_feature: Structure recognizable but uses semantics not supported in phase 1
 * - accepted-for-next-step: Passed validation, can proceed to normalization
 *
 * External JSON must pass this schema BEFORE entering any core logic.
 */

import { z } from 'zod';
import type {
  InputValidationResult,
  InputPolicyDocument,
  InputStatement,
  InvalidReason,
  InputUnsupportedResult,
} from './policy-types.js';
import {
  isUnsupportedConditionOperator,
  SUPPORTED_CONDITION_OPERATORS,
} from './policy-types.js';

/**
 * InputCondition type alias for zod schema
 */
type InputCondition = {
  [operator: string]: {
    [key: string]: string | string[] | boolean | boolean[] | number | number[];
  };
};

/**
 * Schema for Condition block.
 * We accept the object shape but will validate operators later.
 */
const InputConditionSchema: z.ZodSchema<InputCondition> = z.record(z.string(), z.record(z.string(), z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
  z.array(z.boolean()),
  z.number(),
  z.array(z.number()),
])));

/**
 * Schema for a single Statement in the input policy.
 *
 * Phase 1 requirements:
 * - Effect must be 'Allow' or 'Deny'
 * - Action must be string or string[]
 * - Resource must be string or string[]
 * - Sid, Condition, Version are optional
 * - NotAction, NotResource, Principal should be flagged as unsupported_feature
 */
const InputStatementSchema: z.ZodSchema<InputStatement> = z.object({
  Sid: z.string().optional(),
  Effect: z.enum(['Allow', 'Deny'], {
    errorMap: () => ({
      message: 'Effect must be "Allow" or "Deny"',
    }),
  }),
  Action: z.union([z.string(), z.array(z.string())]).refine(
    (val) => Array.isArray(val) ? val.every(v => typeof v === 'string') : true,
    { message: 'Action must be a string or an array of strings' }
  ),
  Resource: z.union([z.string(), z.array(z.string())]).refine(
    (val) => Array.isArray(val) ? val.every(v => typeof v === 'string') : true,
    { message: 'Resource must be a string or an array of strings' }
  ),
  Condition: InputConditionSchema.optional(),
  // Unsupported but recognizable fields
  NotAction: z.unknown().optional(),
  NotResource: z.unknown().optional(),
  Principal: z.unknown().optional(),
});

/**
 * Schema for the top-level PolicyDocument.
 *
 * Phase 1 requirements:
 * - Must be a JSON object
 * - Must contain Statement field
 * - Statement can be a single object or an array
 */
const InputPolicyDocumentSchema: z.ZodSchema<InputPolicyDocument> = z.object({
  Version: z.string().optional(),
  Statement: z.union([
    InputStatementSchema,
    z.array(InputStatementSchema),
  ]),
  Id: z.string().optional(),
});

/**
 * Parse raw JSON string and classify the result.
 *
 * @param raw - Raw JSON string from external input
 * @returns InputValidationResult classifying the input
 */
export function parseAndClassify(raw: string): InputValidationResult {
  // Step 1: Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      classification: 'invalid',
      reason: 'invalid_json',
      detail: 'Failed to parse JSON',
    };
  }

  // Step 2: Check if it's an object
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      classification: 'invalid',
      reason: 'invalid_shape',
      detail: 'PolicyDocument must be a JSON object',
    };
  }

  // Step 3: Validate with Zod
  const result = InputPolicyDocumentSchema.safeParse(parsed);

  if (!result.success) {
    // Determine the specific failure reason
    const issues = result.error.issues;

    // Helper to recursively extract all issues with their paths
    interface IssueInfo {
      message: string;
      path: (string | number)[];
    }

    function extractAllIssues(issueList: z.ZodIssue[]): IssueInfo[] {
      const result: IssueInfo[] = [];
      for (const issue of issueList) {
        // @ts-expect-error - unionErrors exists on ZodInvalidUnionIssue but not on base ZodIssue
        if (issue.unionErrors) {
          // @ts-expect-error
          for (const ue of issue.unionErrors) {
            result.push(...extractAllIssues(ue.issues ?? []));
          }
        }
        result.push({ message: issue.message, path: issue.path });
      }
      return result;
    }

    const allIssues = extractAllIssues(issues);
    const allMessages = allIssues.map(i => i.message);

    // Check for missing Statement: Statement field is undefined
    const missingStatement = allMessages.some(m => m.includes('Required'));
    if (missingStatement) {
      return {
        ok: false,
        classification: 'invalid',
        reason: 'invalid_shape',
        detail: 'PolicyDocument must contain a Statement field',
      };
    }

    // Check for Statement-level type errors (not nested in a field)
    // These issues have path = ["Statement"] (length 1), not ["Statement", "Effect"] etc.
    const statementLevelIssues = allIssues.filter(
      i => i.path.length === 1 && i.path[0] === 'Statement'
    );

    // Check for field-level issues (nested inside Statement)
    // These issues have path like ["Statement", "Effect"] or ["Statement", "Action"]
    const fieldLevelIssues = allIssues.filter(
      i => i.path.length >= 2 && i.path[0] === 'Statement'
    );

    if (statementLevelIssues.length > 0 && fieldLevelIssues.length === 0) {
      // Only Statement-level issues, no field-level issues → invalid_shape
      return {
        ok: false,
        classification: 'invalid',
        reason: 'invalid_shape',
        detail: formatZodError(issues),
      };
    }

    // Otherwise, it's a field value error (Effect, Action, Resource problems)
    return {
      ok: false,
      classification: 'invalid',
      reason: 'invalid_field_value',
      detail: formatZodError(issues),
    };
  }

  // Step 4: Check for unsupported features in Statement(s)
  const policy = result.data;
  const unsupportedCheck = checkForUnsupportedFeatures(policy);

  if (unsupportedCheck) {
    return unsupportedCheck;
  }

  // Step 5: All checks passed
  return {
    ok: true,
    policy,
  };
}

/**
 * Check policy and its statements for unsupported features.
 */
function checkForUnsupportedFeatures(policy: InputPolicyDocument): InputUnsupportedResult | null {
  const statements = Array.isArray(policy.Statement)
    ? policy.Statement
    : [policy.Statement];

  for (const stmt of statements) {
    // Check top-level unsupported fields
    if (stmt.NotAction !== undefined) {
      return {
        ok: false,
        classification: 'unsupported_feature',
        reason: 'unsupported_feature',
        feature: 'NotAction',
        detail: 'NotAction is not supported in phase 1',
      };
    }

    if (stmt.NotResource !== undefined) {
      return {
        ok: false,
        classification: 'unsupported_feature',
        reason: 'unsupported_feature',
        feature: 'NotResource',
        detail: 'NotResource is not supported in phase 1',
      };
    }

    if (stmt.Principal !== undefined) {
      return {
        ok: false,
        classification: 'unsupported_feature',
        reason: 'unsupported_feature',
        feature: 'Principal',
        detail: 'Principal is not supported in phase 1',
      };
    }

    // Check Condition operators
    if (stmt.Condition) {
      for (const operator of Object.keys(stmt.Condition)) {
        if (isUnsupportedConditionOperator(operator)) {
          return {
            ok: false,
            classification: 'unsupported_feature',
            reason: 'unsupported_feature',
            feature: `Condition.${operator}`,
            detail: `Condition operator "${operator}" is not supported in phase 1. Supported: ${SUPPORTED_CONDITION_OPERATORS.join(', ')}`,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Format Zod error issues into a readable string.
 */
function formatZodError(issues: z.ZodIssue[]): string {
  return issues
    .map(i => {
      const path = i.path.length > 0 ? ` at ${i.path.join('.')}` : '';
      return `${i.message}${path}`;
    })
    .join('; ');
}

/**
 * Validate a policy object that has already been parsed.
 * Use this when you have a parsed object but need schema validation.
 *
 * @param policy - Parsed policy object
 * @returns InputValidationResult classifying the input
 */
export function validatePolicy(policy: unknown): InputValidationResult {
  // Check if it's an object
  if (typeof policy !== 'object' || policy === null || Array.isArray(policy)) {
    return {
      ok: false,
      classification: 'invalid',
      reason: 'invalid_shape',
      detail: 'PolicyDocument must be a JSON object',
    };
  }

  // Validate with Zod
  const result = InputPolicyDocumentSchema.safeParse(policy);

  if (!result.success) {
    const issues = result.error.issues;

    if (issues.some(i => i.path.length === 0 && i.message.includes('Required'))) {
      return {
        ok: false,
        classification: 'invalid',
        reason: 'invalid_shape',
        detail: 'PolicyDocument must contain a Statement field',
      };
    }

    if (issues.some(i => i.path.includes('Statement'))) {
      return {
        ok: false,
        classification: 'invalid',
        reason: 'invalid_shape',
        detail: formatZodError(issues),
      };
    }

    return {
      ok: false,
      classification: 'invalid',
      reason: 'invalid_field_value',
      detail: formatZodError(issues),
    };
  }

  // Check for unsupported features
  const unsupportedCheck = checkForUnsupportedFeatures(result.data);

  if (unsupportedCheck) {
    return unsupportedCheck;
  }

  return {
    ok: true,
    policy: result.data,
  };
}

// Re-export types for consumers of this module
export type { InputPolicyDocument, InputStatement, InvalidReason };
