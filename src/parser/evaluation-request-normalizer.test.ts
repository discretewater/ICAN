/**
 * Evaluation Request Normalizer Tests - D03 Implementation.
 *
 * Tests cover:
 * 1. normalizeContext with inline-json (valid JSON)
 * 2. normalizeContext with json-file (valid file)
 * 3. normalizeContext with invalid JSON → throws
 * 4. normalizeContext with top-level non-object → throws
 * 5. action empty → throws
 * 6. resource empty → throws
 * 7. context defaults to {} when not provided
 * 8. EvaluationRequest assembly correct
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { normalizeContext, normalizeEvaluationRequest, assembleEvaluationRequest } from './evaluation-request-normalizer.js';
import type { ContextNormalizationInput, AssembleEvaluationRequestInput } from './evaluation-request-types.js';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TEST_FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures');

// Ensure fixtures directory exists
beforeAll(() => {
  if (!existsSync(TEST_FIXTURES_DIR)) {
    mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
  }
});

afterAll(() => {
  // Clean up test files if any were created
});

// ============================================================================
// Helper Functions
// ============================================================================

function createJsonFile(filename: string, content: string): string {
  const filePath = join(TEST_FIXTURES_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ============================================================================
// normalizeContext Tests
// ============================================================================

describe('normalizeContext', () => {
  // -------------------------------------------------------------------------
  // inline-json valid cases
  // -------------------------------------------------------------------------
  describe('inline-json valid cases', () => {
    it('should parse valid inline JSON object', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '{"key": "value", "num": 42}',
      };
      const result = normalizeContext(input);
      expect(result.context).toEqual({ key: 'value', num: 42 });
    });

    it('should return frozen context object', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '{"key": "value"}',
      };
      const result = normalizeContext(input);
      expect(Object.isFrozen(result.context)).toBe(true);
    });

    it('should handle empty object', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '{}',
      };
      const result = normalizeContext(input);
      expect(result.context).toEqual({});
    });

    it('should handle nested objects', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '{"outer": {"inner": "value"}}',
      };
      const result = normalizeContext(input);
      expect(result.context).toEqual({ outer: { inner: 'value' } });
    });
  });

  // -------------------------------------------------------------------------
  // json-file valid cases
  // -------------------------------------------------------------------------
  describe('json-file valid cases', () => {
    it('should read and parse valid JSON file', () => {
      const filePath = createJsonFile('test-context-valid.json', '{"fileKey": "fileValue"}');
      try {
        const input: ContextNormalizationInput = {
          inputType: 'json-file',
          inputValue: filePath,
        };
        const result = normalizeContext(input);
        expect(result.context).toEqual({ fileKey: 'fileValue' });
      } finally {
        unlinkSync(filePath);
      }
    });

    it('should return frozen context from file', () => {
      const filePath = createJsonFile('test-context-frozen.json', '{"key": "value"}');
      try {
        const input: ContextNormalizationInput = {
          inputType: 'json-file',
          inputValue: filePath,
        };
        const result = normalizeContext(input);
        expect(Object.isFrozen(result.context)).toBe(true);
      } finally {
        unlinkSync(filePath);
      }
    });
  });

  // -------------------------------------------------------------------------
  // invalid JSON cases
  // -------------------------------------------------------------------------
  describe('invalid JSON cases', () => {
    it('should throw for invalid inline JSON', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '{invalid json}',
      };
      expect(() => normalizeContext(input)).toThrow('Invalid JSON');
    });

    it('should throw for non-existent json-file', () => {
      const input: ContextNormalizationInput = {
        inputType: 'json-file',
        inputValue: '/non/existent/path.json',
      };
      expect(() => normalizeContext(input)).toThrow('Failed to read or parse JSON file');
    });

    it('should throw for malformed JSON file', () => {
      const filePath = createJsonFile('test-malformed.json', '{not valid json');
      try {
        const input: ContextNormalizationInput = {
          inputType: 'json-file',
          inputValue: filePath,
        };
        expect(() => normalizeContext(input)).toThrow('Failed to read or parse JSON file');
      } finally {
        unlinkSync(filePath);
      }
    });
  });

  // -------------------------------------------------------------------------
  // top-level non-object cases
  // -------------------------------------------------------------------------
  describe('top-level non-object cases', () => {
    it('should throw for top-level array', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '["array", "items"]',
      };
      expect(() => normalizeContext(input)).toThrow('Context must be a plain object');
    });

    it('should throw for top-level string', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '"just a string"',
      };
      expect(() => normalizeContext(input)).toThrow('Context must be a plain object');
    });

    it('should throw for top-level number', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: '12345',
      };
      expect(() => normalizeContext(input)).toThrow('Context must be a plain object');
    });

    it('should throw for top-level boolean', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: 'true',
      };
      expect(() => normalizeContext(input)).toThrow('Context must be a plain object');
    });

    it('should throw for null', () => {
      const input: ContextNormalizationInput = {
        inputType: 'inline-json',
        inputValue: 'null',
      };
      expect(() => normalizeContext(input)).toThrow('Context must be a plain object');
    });
  });
});

// ============================================================================
// normalizeEvaluationRequest Tests
// ============================================================================

describe('normalizeEvaluationRequest', () => {
  // -------------------------------------------------------------------------
  // action validation
  // -------------------------------------------------------------------------
  describe('action validation', () => {
    it('should throw for empty action', () => {
      const input = {
        action: '',
        resource: 'arn:aws:s3:::bucket',
      };
      expect(() => normalizeEvaluationRequest(input)).toThrow('Action must be a non-empty string');
    });

    it('should throw for whitespace-only action', () => {
      const input = {
        action: '   ',
        resource: 'arn:aws:s3:::bucket',
      };
      expect(() => normalizeEvaluationRequest(input)).toThrow('Action must be a non-empty string');
    });
  });

  // -------------------------------------------------------------------------
  // resource validation
  // -------------------------------------------------------------------------
  describe('resource validation', () => {
    it('should throw for empty resource', () => {
      const input = {
        action: 's3:GetObject',
        resource: '',
      };
      expect(() => normalizeEvaluationRequest(input)).toThrow('Resource must be a non-empty string');
    });

    it('should throw for whitespace-only resource', () => {
      const input = {
        action: 's3:GetObject',
        resource: '   ',
      };
      expect(() => normalizeEvaluationRequest(input)).toThrow('Resource must be a non-empty string');
    });
  });

  // -------------------------------------------------------------------------
  // context defaults
  // -------------------------------------------------------------------------
  describe('context defaults', () => {
    it('should default context to {} when not provided', () => {
      const input = {
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket',
      };
      const result = normalizeEvaluationRequest(input);
      expect(result.context).toEqual({});
    });

    it('should return frozen context when defaulting', () => {
      const input = {
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket',
      };
      const result = normalizeEvaluationRequest(input);
      expect(Object.isFrozen(result.context)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // successful normalization
  // -------------------------------------------------------------------------
  describe('successful normalization', () => {
    it('should normalize valid request without context', () => {
      const input = {
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket',
      };
      const result = normalizeEvaluationRequest(input);
      expect(result.action).toBe('s3:GetObject');
      expect(result.resource).toBe('arn:aws:s3:::bucket');
      expect(result.context).toEqual({});
    });

    it('should trim action and resource whitespace', () => {
      const input = {
        action: '  s3:GetObject  ',
        resource: '  arn:aws:s3:::bucket  ',
      };
      const result = normalizeEvaluationRequest(input);
      expect(result.action).toBe('s3:GetObject');
      expect(result.resource).toBe('arn:aws:s3:::bucket');
    });

    it('should normalize request with inline context', () => {
      const input = {
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket',
        contextInput: {
          inputType: 'inline-json' as const,
          inputValue: '{"key": "value"}',
        },
      };
      const result = normalizeEvaluationRequest(input);
      expect(result.context).toEqual({ key: 'value' });
    });
  });
});

// ============================================================================
// assembleEvaluationRequest Tests
// ============================================================================

describe('assembleEvaluationRequest', () => {
  it('should assemble EvaluationRequest correctly', () => {
    const input: AssembleEvaluationRequestInput = {
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket',
      context: Object.freeze({ key: 'value' }),
    };
    const result = assembleEvaluationRequest(input);
    expect(result.action).toBe('s3:GetObject');
    expect(result.resource).toBe('arn:aws:s3:::bucket');
    expect(result.context).toEqual({ key: 'value' });
  });

  it('should return frozen EvaluationRequest', () => {
    const input: AssembleEvaluationRequestInput = {
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket',
      context: Object.freeze({}),
    };
    const result = assembleEvaluationRequest(input);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.context)).toBe(true);
  });

  it('should preserve readonly modifiers', () => {
    const input: AssembleEvaluationRequestInput = {
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket',
      context: Object.freeze({}),
    };
    const result = assembleEvaluationRequest(input);
    // Type-level check: action, resource, context should be readonly
    expect(result.action).toBe('s3:GetObject');
  });
});