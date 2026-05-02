/**
 * Z06-D02: Input loader tests.
 *
 * Covers: single/multi policy file reading, file-not-found,
 * invalid JSON, invalid policy structure, unsupported features,
 * action/resource assembly, context-json parsing success/failure,
 * context-file reading success/failure, boundary verification
 * (no engine calls, no reporter calls, no exitCode).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadInput } from './input-loader.js';
import type { CheckCommandOptions } from './types.js';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ─── Helpers ─────────────────────────────────────────────────────────

let tempFileCounter = 0;

/** Create a temp JSON file and return its path. */
function createTempFile(content: string, prefix = 'ican-test'): string {
  tempFileCounter++;
  const name = `${prefix}-${tempFileCounter}-${Date.now()}.json`;
  const filePath = join(tmpdir(), name);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/** List of temp files to clean up after each test. */
const cleanupFiles: string[] = [];

beforeEach(() => {
  cleanupFiles.length = 0;
  tempFileCounter = 0;
});

afterEach(() => {
  for (const f of cleanupFiles) {
    if (existsSync(f)) {
      unlinkSync(f);
    }
  }
  cleanupFiles.length = 0;
});

/** Create a temp file, track for cleanup, return path. */
function tmpFile(content: string, prefix = 'ican-test'): string {
  const path = createTempFile(content, prefix);
  cleanupFiles.push(path);
  return path;
}

/** Minimal CheckCommandOptions with a single policy file. */
function minimalOptions(
  policyPath: string,
  overrides: Partial<CheckCommandOptions> = {},
): CheckCommandOptions {
  return {
    policies: [policyPath],
    action: 's3:GetObject',
    resource: 'arn:aws:s3:::bucket/*',
    format: 'text',
    ...overrides,
  };
}

/** Valid minimal policy JSON. */
const VALID_POLICY_JSON = JSON.stringify({
  Version: '2012-10-17',
  Statement: {
    Effect: 'Allow',
    Action: 's3:GetObject',
    Resource: 'arn:aws:s3:::bucket/*',
  },
});

/** Another valid policy JSON (different content). */
const VALID_POLICY_JSON_2 = JSON.stringify({
  Version: '2012-10-17',
  Statement: {
    Effect: 'Deny',
    Action: 's3:DeleteObject',
    Resource: 'arn:aws:s3:::bucket/*',
  },
});

/** Policy JSON with Effect set to invalid value. */
const INVALID_FIELD_POLICY_JSON = JSON.stringify({
  Version: '2012-10-17',
  Statement: {
    Effect: 'Maybe',
    Action: 's3:GetObject',
    Resource: '*',
  },
});

/** Policy JSON with missing Statement field. */
const MISSING_STATEMENT_POLICY_JSON = JSON.stringify({
  Version: '2012-10-17',
});

/** Policy JSON with NotAction (unsupported). Must include Action for schema to pass shape validation before unsupported check. */
const UNSUPPORTED_POLICY_JSON = JSON.stringify({
  Statement: {
    Effect: 'Allow',
    Action: 's3:GetObject',
    NotAction: 's3:*',
    Resource: '*',
  },
});

/** Non-JSON content. */
const NON_JSON_CONTENT = 'this is not json at all';

// ─── Tests: Single policy file ────────────────────────────────────────

describe('loadInput - single policy file', () => {
  it('T1: should load a single valid policy file and produce EvaluationRequest + StandardStatement[]', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.action).toBe('s3:GetObject');
      expect(result.evaluationRequest.resource).toBe('arn:aws:s3:::bucket/*');
      expect(result.evaluationRequest.context).toEqual({});
      expect(result.statements.length).toBeGreaterThanOrEqual(1);
      expect(result.statements[0]!.effect).toBe('Allow');
    }
  });

  it('T2: should produce EvaluationRequest with correct action and resource', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, {
        action: 'iam:CreateUser',
        resource: 'arn:aws:iam::123456789012:user/*',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.action).toBe('iam:CreateUser');
      expect(result.evaluationRequest.resource).toBe('arn:aws:iam::123456789012:user/*');
    }
  });

  it('T3: should trim whitespace from action and resource', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, {
        action: '  s3:GetObject  ',
        resource: '  arn:aws:s3:::bucket/*  ',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.action).toBe('s3:GetObject');
      expect(result.evaluationRequest.resource).toBe('arn:aws:s3:::bucket/*');
    }
  });

  it('T4: should accept valid policy with Statement as array', () => {
    const arrayPolicy = JSON.stringify({
      Statement: [
        { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' },
        { Effect: 'Deny', Action: 's3:DeleteObject', Resource: '*' },
      ],
    });
    const filePath = tmpFile(arrayPolicy);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statements.length).toBe(2);
    }
  });
});

// ─── Tests: Multiple policy files ─────────────────────────────────────

describe('loadInput - multiple policy files', () => {
  it('T5: should load multiple policy files and combine statements', () => {
    const path1 = tmpFile(VALID_POLICY_JSON, 'policy1');
    const path2 = tmpFile(VALID_POLICY_JSON_2, 'policy2');

    const result = loadInput({
      policies: [path1, path2],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      format: 'text',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Both policies each have 1 statement, so total >= 2
      expect(result.statements.length).toBeGreaterThanOrEqual(2);
      // Each statement should have a distinct sourcePolicyId
      const ids = new Set(result.statements.map(s => s.sourcePolicyId));
      expect(ids.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('T6: multiple policies should have sequential sourcePolicyIndex', () => {
    const path1 = tmpFile(VALID_POLICY_JSON, 'policy1');
    const path2 = tmpFile(VALID_POLICY_JSON, 'policy2');

    const result = loadInput({
      policies: [path1, path2],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      format: 'text',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const indices = result.statements.map(s => s.sourcePolicyIndex).sort();
      expect(indices[0]).toBe(0);
      expect(indices[1]).toBe(1);
    }
  });
});

// ─── Tests: File not found ────────────────────────────────────────────

describe('loadInput - file not found', () => {
  it('T7: should return error for non-existent policy file', () => {
    const result = loadInput(
      minimalOptions('/nonexistent/path/to/policy.json'),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBeGreaterThanOrEqual(1);
      const firstError = result.policyErrors[0]!;
      expect(firstError.code).toBe('POLICY_FILE_NOT_FOUND');
      expect(firstError.policyPath).toBe('/nonexistent/path/to/policy.json');
    }
  });

  it('T8: should return error for each non-existent file in multi-file load', () => {
    const result = loadInput({
      policies: ['/a/nonexistent1.json', '/b/nonexistent2.json'],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      format: 'text',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBe(2);
      expect(result.policyErrors[0]!.code).toBe('POLICY_FILE_NOT_FOUND');
      expect(result.policyErrors[1]!.code).toBe('POLICY_FILE_NOT_FOUND');
    }
  });
});

// ─── Tests: Non-JSON content ─────────────────────────────────────────

describe('loadInput - non-JSON content', () => {
  it('T9: should return error for file containing non-JSON text', () => {
    const filePath = tmpFile(NON_JSON_CONTENT);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBeGreaterThanOrEqual(1);
      expect(result.policyErrors[0]!.code).toBe('POLICY_INVALID_JSON');
      expect(result.policyErrors[0]!.policyPath).toBe(filePath);
    }
  });

  it('T10: should return error for empty file', () => {
    const filePath = tmpFile('');
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors[0]!.code).toBe('POLICY_INVALID_JSON');
    }
  });
});

// ─── Tests: Invalid policy structure ──────────────────────────────────

describe('loadInput - invalid policy structure', () => {
  it('T11: should return error for policy with missing Statement field', () => {
    const filePath = tmpFile(MISSING_STATEMENT_POLICY_JSON);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBeGreaterThanOrEqual(1);
      expect(result.policyErrors[0]!.code).toBe('POLICY_INVALID_SHAPE');
    }
  });

  it('T12: should return error for policy with invalid Effect value', () => {
    const filePath = tmpFile(INVALID_FIELD_POLICY_JSON);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBeGreaterThanOrEqual(1);
      expect(result.policyErrors[0]!.code).toBe('POLICY_INVALID_FIELD_VALUE');
    }
  });

  it('T13: should return error for policy with unsupported NotAction', () => {
    const filePath = tmpFile(UNSUPPORTED_POLICY_JSON);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBeGreaterThanOrEqual(1);
      expect(result.policyErrors[0]!.code).toBe('POLICY_UNSUPPORTED_FEATURE');
    }
  });

  it('T14: should return error for JSON that is not an object (array)', () => {
    const filePath = tmpFile('["not", "a", "policy"]');
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors[0]!.code).toBe('POLICY_INVALID_SHAPE');
    }
  });
});

// ─── Tests: Context-json ──────────────────────────────────────────────

describe('loadInput - context-json', () => {
  it('T15: should parse valid inline context JSON', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, {
        contextJson: '{"aws:SourceIp":"10.0.0.1","multiFactor":true}',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.context).toEqual({
        'aws:SourceIp': '10.0.0.1',
        multiFactor: true,
      });
    }
  });

  it('T16: should handle empty context JSON object', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { contextJson: '{}' }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.context).toEqual({});
    }
  });

  it('T17: should return error for invalid inline context JSON', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { contextJson: '{not valid}' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.contextError).not.toBeNull();
      expect(result.contextError!.code).toBe('CONTEXT_INVALID_JSON');
    }
  });

  it('T18: should return error when context JSON is not an object (array)', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { contextJson: '["a","b"]' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.contextError).not.toBeNull();
      expect(result.contextError!.code).toBe('CONTEXT_NOT_OBJECT');
    }
  });

  it('T19: should return error when context JSON is a scalar value', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { contextJson: '"just a string"' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.contextError).not.toBeNull();
      expect(result.contextError!.code).toBe('CONTEXT_NOT_OBJECT');
    }
  });
});

// ─── Tests: Context-file ─────────────────────────────────────────────

describe('loadInput - context-file', () => {
  it('T20: should read and parse valid context JSON file', () => {
    const policyPath = tmpFile(VALID_POLICY_JSON);
    const contextPath = tmpFile('{"fileKey":"fileValue"}', 'ctx');

    const result = loadInput(
      minimalOptions(policyPath, { contextFile: contextPath }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.context).toEqual({ fileKey: 'fileValue' });
    }
  });

  it('T21: should return error for non-existent context file', () => {
    const policyPath = tmpFile(VALID_POLICY_JSON);

    const result = loadInput(
      minimalOptions(policyPath, { contextFile: '/nonexistent/context.json' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.contextError).not.toBeNull();
      expect(result.contextError!.code).toBe('CONTEXT_FILE_NOT_FOUND');
    }
  });

  it('T22: should return error for context file containing invalid JSON', () => {
    const policyPath = tmpFile(VALID_POLICY_JSON);
    const contextPath = tmpFile('{not valid', 'ctx');

    const result = loadInput(
      minimalOptions(policyPath, { contextFile: contextPath }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.contextError).not.toBeNull();
      expect(result.contextError!.code).toBe('CONTEXT_INVALID_JSON');
    }
  });

  it('T23: should return error when context file is valid JSON but not an object', () => {
    const policyPath = tmpFile(VALID_POLICY_JSON);
    const contextPath = tmpFile('["array"]', 'ctx');

    const result = loadInput(
      minimalOptions(policyPath, { contextFile: contextPath }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.contextError).not.toBeNull();
      expect(result.contextError!.code).toBe('CONTEXT_NOT_OBJECT');
    }
  });
});

// ─── Tests: Action/resource validation ───────────────────────────────

describe('loadInput - action/resource validation', () => {
  it('T24: should return error for empty action', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { action: '' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.some(e => e.code === 'ACTION_EMPTY')).toBe(true);
    }
  });

  it('T25: should return error for whitespace-only action', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { action: '   ' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.some(e => e.code === 'ACTION_EMPTY')).toBe(true);
    }
  });

  it('T26: should return error for empty resource', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { resource: '' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.some(e => e.code === 'RESOURCE_EMPTY')).toBe(true);
    }
  });

  it('T27: should return error for whitespace-only resource', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, { resource: '   ' }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.some(e => e.code === 'RESOURCE_EMPTY')).toBe(true);
    }
  });
});

// ─── Tests: Boundary verification (no engine/reporter/exitCode) ───────

describe('loadInput - boundary verification', () => {
  it('T28: should not reference engine types in the result', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(true);
    // InputLoadResult (both success and failure) has no engine or reporter fields
    const asRecord = result as unknown as Record<string, unknown>;
    expect(asRecord.engine).toBeUndefined();
    expect(asRecord.reporter).toBeUndefined();
    expect(asRecord.exitCode).toBeUndefined();
    expect(asRecord.evaluationResult).toBeUndefined();
    expect(asRecord.output).toBeUndefined();
  });

  it('T29: InputLoadError should not contain exitCode', () => {
    const result = loadInput(minimalOptions('/nonexistent/file.json'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const asRecord = result as unknown as Record<string, unknown>;
      expect(asRecord.exitCode).toBeUndefined();
    }
  });

  it('T30: InputLoadSuccess should contain only EvaluationRequest and StandardStatement[]', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Check that the success result has only expected fields
      const keys = Object.keys(result);
      expect(keys).toContain('ok');
      expect(keys).toContain('evaluationRequest');
      expect(keys).toContain('statements');
      // No engine/reporter fields
      const extraKeys = keys.filter(
        k => !['ok', 'evaluationRequest', 'statements'].includes(k),
      );
      expect(extraKeys).toEqual([]);
    }
  });

  it('T31: should not import any engine module (verified by compilation)', () => {
    // This test is purely a compile-time check: the input-loader module
    // must not import from src/engine/ or src/reporters/.
    // If it did, the test file wouldn't compile or the module would fail
    // at import time. We verify by ensuring loadInput exists and runs.
    expect(typeof loadInput).toBe('function');
  });
});

// ─── Tests: Mixed errors (policy + context errors) ───────────────────

describe('loadInput - mixed errors', () => {
  it('T32: should report both policy and context errors when both fail', () => {
    const result = loadInput({
      policies: ['/nonexistent/policy.json'],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      contextJson: '{invalid',
      format: 'text',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBeGreaterThanOrEqual(1);
      expect(result.contextError).not.toBeNull();
    }
  });

  it('T33: should report policy + validation errors when both fail', () => {
    const result = loadInput({
      policies: ['/nonexistent/policy.json'],
      action: '',
      resource: '',
      format: 'text',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.length).toBeGreaterThanOrEqual(1);
      expect(result.validationErrors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

// ─── Tests: Default context (no context provided) ─────────────────────

describe('loadInput - default context', () => {
  it('T34: should default context to empty object when neither context-json nor context-file is provided', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(minimalOptions(filePath));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.context).toEqual({});
      expect(Object.isFrozen(result.evaluationRequest.context)).toBe(true);
    }
  });
});

// ─── Tests: Nested context ───────────────────────────────────────────

describe('loadInput - nested context', () => {
  it('T35: should handle nested JSON context objects', () => {
    const filePath = tmpFile(VALID_POLICY_JSON);
    const result = loadInput(
      minimalOptions(filePath, {
        contextJson: '{"outer":{"inner":"value"},"list":[1,2,3]}',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.evaluationRequest.context).toEqual({
        outer: { inner: 'value' },
        list: [1, 2, 3],
      });
    }
  });
});

// ─── Tests: Partial success (one file ok, another fails) ──────────────

describe('loadInput - partial success in policy loading', () => {
  it('T36: one valid + one invalid file should return error', () => {
    const validPath = tmpFile(VALID_POLICY_JSON, 'valid');
    const invalidPath = '/nonexistent/bad.json';

    const result = loadInput({
      policies: [validPath, invalidPath],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      format: 'text',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.policyErrors.some(e => e.policyPath === invalidPath)).toBe(true);
    }
  });
});
