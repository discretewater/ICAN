/**
 * Policy Normalizer Tests - D02 Implementation.
 *
 * Tests cover:
 * 1. sourcePolicyId generation (file input, non-file input, stability)
 * 2. statementId generation (Sid unique, Sid not unique, duplicates)
 * 3. normalizePolicy function (single statement, array statement)
 * 4. actions/resources normalization to arrays
 * 5. Source tracing fields preservation
 * 6. Pure function nature
 */

import { describe, it, expect } from 'vitest';
import {
  normalizePolicy,
  generateSourcePolicyId,
  generateStatementId,
} from './policy-normalizer.js';
import type { NormalizationInput } from './policy-normalizer.js';
import type { InputPolicyDocument } from './policy-types.js';

// ============================================================================
// Helper Functions
// ============================================================================

function createInput(
  statement: InputPolicyDocument['Statement'],
): InputPolicyDocument {
  return {
    Version: '2012-10-17',
    Statement: statement,
    Id: 'test-policy',
  };
}

function createNormalizationInput(
  policy: InputPolicyDocument,
  options: {
    sourcePolicyPath?: string;
    sourceDescription?: string;
    sourcePolicyIndex?: number;
  } = {},
): NormalizationInput {
  return {
    policy,
    sourcePolicyPath: options.sourcePolicyPath ?? '',
    sourceDescription: options.sourceDescription ?? 'inline',
    sourcePolicyIndex: options.sourcePolicyIndex ?? 0,
  };
}

// ============================================================================
// Test Suites
// ============================================================================

describe('generateSourcePolicyId', () => {
  // -------------------------------------------------------------------------
  // File input scenarios
  // -------------------------------------------------------------------------
  describe('file input scenarios', () => {
    it('should generate stable sourcePolicyId for file input', () => {
      const id1 = generateSourcePolicyId('/path/to/policy.json', '', 0);
      const id2 = generateSourcePolicyId('/path/to/policy.json', '', 0);
      expect(id1).toBe(id2);
    });

    it('should generate different sourcePolicyId for different paths', () => {
      const id1 = generateSourcePolicyId('/path/to/policy1.json', '', 0);
      const id2 = generateSourcePolicyId('/path/to/policy2.json', '', 0);
      expect(id1).not.toBe(id2);
    });

    it('should generate different sourcePolicyId for different indices', () => {
      const id1 = generateSourcePolicyId('/path/to/policy.json', '', 0);
      const id2 = generateSourcePolicyId('/path/to/policy.json', '', 1);
      expect(id1).not.toBe(id2);
    });

    it('should use stabilized path descriptor (filename) for stability', () => {
      const id = generateSourcePolicyId('/path/to/policy.json', '', 0);
      expect(id).toBe('policy.json:0');
    });
  });

  // -------------------------------------------------------------------------
  // Non-file input scenarios
  // -------------------------------------------------------------------------
  describe('non-file input scenarios', () => {
    it('should use sourceDescription for non-file input', () => {
      const id = generateSourcePolicyId('', 'inline-policy', 0);
      expect(id).toBe('inline-policy:0');
    });

    it('should generate stable sourcePolicyId for same non-file input', () => {
      const id1 = generateSourcePolicyId('', 'inline-policy', 0);
      const id2 = generateSourcePolicyId('', 'inline-policy', 0);
      expect(id1).toBe(id2);
    });

    it('should generate different sourcePolicyId for different descriptions', () => {
      const id1 = generateSourcePolicyId('', 'policy-a', 0);
      const id2 = generateSourcePolicyId('', 'policy-b', 0);
      expect(id1).not.toBe(id2);
    });
  });

  // -------------------------------------------------------------------------
  // Stability and reproducibility
  // -------------------------------------------------------------------------
  describe('stability and reproducibility', () => {
    it('should be reproducible with same input', () => {
      const id1 = generateSourcePolicyId('/path/to/policy.json', '', 5);
      const id2 = generateSourcePolicyId('/path/to/policy.json', '', 5);
      expect(id1).toBe(id2);
    });

    it('should not use random values', () => {
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) {
        ids.push(generateSourcePolicyId('/path/to/policy.json', '', 0));
      }
      // All IDs should be identical (no randomness)
      expect(ids.every(id => id === ids[0])).toBe(true);
    });
  });
});

describe('generateStatementId', () => {
  // -------------------------------------------------------------------------
  // Sid-based generation
  // -------------------------------------------------------------------------
  describe('Sid-based generation (when Sid is present)', () => {
    it('should use Sid format when Sid is valid', () => {
      const id = generateStatementId('MyStatement', 'policy-0', 'abc123', 0);
      expect(id).toBe('sid:policy-0:MyStatement');
    });

    it('should use Sid even with duplicateIndex > 0', () => {
      const id = generateStatementId('MyStatement', 'policy-0', 'abc123', 2);
      expect(id).toBe('sid:policy-0:MyStatement');
    });
  });

  // -------------------------------------------------------------------------
  // Hash-based generation (when Sid is missing)
  // -------------------------------------------------------------------------
  describe('hash-based generation (when Sid is missing/empty)', () => {
    it('should use hash format when Sid is undefined', () => {
      const id = generateStatementId(undefined, 'policy-0', 'abc123', 0);
      expect(id).toBe('stmt:policy-0:abc123');
    });

    it('should use hash format when Sid is null', () => {
      // @ts-expect-error - testing null case
      const id = generateStatementId(null, 'policy-0', 'abc123', 0);
      expect(id).toBe('stmt:policy-0:abc123');
    });

    it('should use hash format when Sid is empty string', () => {
      const id = generateStatementId('', 'policy-0', 'abc123', 0);
      expect(id).toBe('stmt:policy-0:abc123');
    });
  });

  // -------------------------------------------------------------------------
  // Duplicate handling
  // -------------------------------------------------------------------------
  describe('duplicate handling', () => {
    it('should not append dup suffix for first occurrence', () => {
      const id = generateStatementId(undefined, 'policy-0', 'abc123', 0);
      expect(id).toBe('stmt:policy-0:abc123');
    });

    it('should append dup suffix for duplicate occurrences', () => {
      const id = generateStatementId(undefined, 'policy-0', 'abc123', 1);
      expect(id).toBe('stmt:policy-0:abc123:dup1');
    });

    it('should append incremented dup suffix for subsequent duplicates', () => {
      expect(generateStatementId(undefined, 'policy-0', 'abc123', 2)).toBe(
        'stmt:policy-0:abc123:dup2',
      );
      expect(generateStatementId(undefined, 'policy-0', 'abc123', 3)).toBe(
        'stmt:policy-0:abc123:dup3',
      );
    });
  });
});

describe('normalizePolicy', () => {
  // -------------------------------------------------------------------------
  // Single statement input
  // -------------------------------------------------------------------------
  describe('single statement input', () => {
    it('should normalize single statement to array', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements).toHaveLength(1);
      expect(result.sourcePolicyId).toBe('inline:0');
    });

    it('should preserve sourceStatementIndex starting from 0', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.sourceStatementIndex).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Array statement input
  // -------------------------------------------------------------------------
  describe('array statement input', () => {
    it('should process all statements in array', () => {
      const policy = createInput([
        { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::bucket/*' },
        { Effect: 'Deny', Action: 's3:DeleteObject', Resource: 'arn:aws:s3:::bucket/*' },
      ]);

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements).toHaveLength(2);
    });

    it('should assign sequential sourceStatementIndex', () => {
      const policy = createInput([
        { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::bucket/*' },
        { Effect: 'Deny', Action: 's3:DeleteObject', Resource: 'arn:aws:s3:::bucket/*' },
      ]);

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.sourceStatementIndex).toBe(0);
      expect(result.statements[1]!.sourceStatementIndex).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Actions/resources normalization
  // -------------------------------------------------------------------------
  describe('actions/resources normalization', () => {
    it('should convert single string action to array', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.actions).toEqual(['s3:GetObject']);
    });

    it('should keep array action as array', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.actions).toEqual(['s3:GetObject', 's3:PutObject']);
    });

    it('should convert single string resource to array', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.resources).toEqual(['arn:aws:s3:::bucket/*']);
    });

    it('should keep array resource as array', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: ['arn:aws:s3:::bucket1/*', 'arn:aws:s3:::bucket2/*'],
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.resources).toEqual([
        'arn:aws:s3:::bucket1/*',
        'arn:aws:s3:::bucket2/*',
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Source tracing fields preservation
  // -------------------------------------------------------------------------
  describe('source tracing fields preservation', () => {
    it('should preserve sourcePolicyPath', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(
        createNormalizationInput(policy, { sourcePolicyPath: '/path/to/policy.json' }),
      );

      expect(result.statements[0]!.sourcePolicyPath).toBe('/path/to/policy.json');
    });

    it('should preserve sourcePolicyIndex', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(
        createNormalizationInput(policy, { sourcePolicyIndex: 3 }),
      );

      expect(result.statements[0]!.sourcePolicyIndex).toBe(3);
    });

    it('should preserve sid when present', () => {
      const policy = createInput({
        Sid: 'MyStatementId',
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.sid).toBe('MyStatementId');
    });

    it('should set sid to undefined when not present', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.sid).toBeUndefined();
    });

    it('should preserve raw statement', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.raw).toBeDefined();
      expect(((result.statements[0] as any).raw).Effect).toBe('Allow');
    });
  });

  // -------------------------------------------------------------------------
  // statementId generation scenarios
  // -------------------------------------------------------------------------
  describe('statementId generation scenarios', () => {
    it('should use Sid-based statementId when Sid is unique', () => {
      const policy = createInput({
        Sid: 'UniqueStatement',
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.statementId).toBe('sid:inline:0:UniqueStatement');
    });

    it('should use hash-based statementId when Sid is missing', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.statementId).toMatch(/^stmt:inline:0:[a-f0-9]{8}$/);
    });

    it('should handle duplicate statements with content-based differentiation', () => {
      const policy = createInput([
        { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::bucket/*' },
        { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::bucket/*' },
      ]);

      const result = normalizePolicy(createNormalizationInput(policy));

      // Both should have same content hash
      expect(result.statements[0]!.statementId).toMatch(/^stmt:inline:0:[a-f0-9]{8}$/);
      expect(result.statements[1]!.statementId).toMatch(/^stmt:inline:0:[a-f0-9]{8}:dup1$/);
    });
  });

  // -------------------------------------------------------------------------
  // Effect preservation
  // -------------------------------------------------------------------------
  describe('effect preservation', () => {
    it('should preserve Allow effect', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.effect).toBe('Allow');
    });

    it('should preserve Deny effect', () => {
      const policy = createInput({
        Effect: 'Deny',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.effect).toBe('Deny');
    });
  });

  // -------------------------------------------------------------------------
  // Condition preservation
  // -------------------------------------------------------------------------
  describe('condition preservation', () => {
    it('should preserve StringEquals condition', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
        Condition: {
          StringEquals: { 'aws:SourceVpc': 'vpc-123' },
        },
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.conditions).toEqual({
        StringEquals: { 'aws:SourceVpc': 'vpc-123' },
      });
    });

    it('should normalize number condition values to strings', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
        Condition: {
          NumericLessThan: { 's3:prefixlen': 5 },
        },
      });

      const result = normalizePolicy(createNormalizationInput(policy));

      expect(result.statements[0]!.conditions).toEqual({
        NumericLessThan: { 's3:prefixlen': '5' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Pure function verification
  // -------------------------------------------------------------------------
  describe('pure function nature', () => {
    it('should not modify input policy', () => {
      const policy = createInput({
        Sid: 'OriginalSid',
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const originalStatementCount = Array.isArray(policy.Statement)
        ? policy.Statement.length
        : 1;

      normalizePolicy(createNormalizationInput(policy));

      // Input should be unchanged
      expect(
        Array.isArray(policy.Statement) ? policy.Statement.length : 1,
      ).toBe(originalStatementCount);
    });

    it('should produce same output for same input', () => {
      const policy = createInput({
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::bucket/*',
      });

      const input = createNormalizationInput(policy);
      const result1 = normalizePolicy(input);
      const result2 = normalizePolicy(input);

      expect(result1.sourcePolicyId).toBe(result2.sourcePolicyId);
      expect(result1.statements[0]!.statementId).toBe(result2.statements[0]!.statementId);
    });
  });
});

describe('sourcePolicyId uniqueness', () => {
  it('should generate unique sourcePolicyId for different policies', () => {
    const policy1 = createInput({ Effect: 'Allow', Action: 's3:GetObject', Resource: 'bucket1' });
    const policy2 = createInput({ Effect: 'Allow', Action: 's3:GetObject', Resource: 'bucket2' });

    const result1 = normalizePolicy(
      createNormalizationInput(policy1, { sourcePolicyPath: '/path/policy1.json' }),
    );
    const result2 = normalizePolicy(
      createNormalizationInput(policy2, { sourcePolicyPath: '/path/policy2.json' }),
    );

    expect(result1.sourcePolicyId).not.toBe(result2.sourcePolicyId);
  });

  it('should use sourceDescription for non-file input uniqueness', () => {
    const policy1 = createInput({ Effect: 'Allow', Action: 's3:GetObject', Resource: 'bucket1' });
    const policy2 = createInput({ Effect: 'Allow', Action: 's3:GetObject', Resource: 'bucket2' });

    const result1 = normalizePolicy(
      createNormalizationInput(policy1, { sourceDescription: 'policy-a' }),
    );
    const result2 = normalizePolicy(
      createNormalizationInput(policy2, { sourceDescription: 'policy-b' }),
    );

    expect(result1.sourcePolicyId).not.toBe(result2.sourcePolicyId);
  });
});
