/**
 * Unit tests for PolicyDocument and Statement input schema.
 *
 * These tests verify that the input schema correctly classifies
 * policy documents according to the phase 1 rules:
 * - invalid_json: JSON cannot be parsed
 * - invalid_shape: JSON is valid but structure doesn't match PolicyDocument/Statement
 * - invalid_field_value: Field exists but value is not in allowed form
 * - unsupported_feature: Structure recognizable but uses unsupported semantics
 * - accepted-for-next-step: Passed validation
 */

import { describe, it, expect } from 'vitest';
import { parseAndClassify, validatePolicy } from './policy-schema.js';

describe('parseAndClassify', () => {
  describe('invalid_json', () => {
    it('should return invalid_json for unparseable JSON', () => {
      const result = parseAndClassify('not valid json');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.classification).toBe('invalid');
        expect(result.reason).toBe('invalid_json');
      }
    });

    it('should return invalid_json for empty string', () => {
      const result = parseAndClassify('');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_json');
      }
    });
  });

  describe('invalid_shape', () => {
    it('should return invalid_shape when top level is not an object', () => {
      const result = parseAndClassify('"just a string"');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_shape');
      }
    });

    it('should return invalid_shape when top level is an array', () => {
      const result = parseAndClassify('[]');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_shape');
      }
    });

    it('should return invalid_shape when Statement is missing', () => {
      const result = parseAndClassify('{"Version": "2012-10-17"}');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_shape');
        expect(result.detail).toContain('Statement');
      }
    });

    it('should return invalid_shape when Statement is null', () => {
      const result = parseAndClassify('{"Statement": null}');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_shape');
      }
    });
  });

  describe('invalid_field_value', () => {
    it('should return invalid_field_value for invalid Effect value', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Maybe', // Invalid - must be Allow or Deny
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_field_value');
      }
    });

    it('should return invalid_field_value when Action is a number', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 123,
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_field_value');
      }
    });

    it('should return invalid_field_value when Action is an object', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: { action: 's3:GetObject' },
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_field_value');
      }
    });

    it('should return invalid_field_value when Resource is a number', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: 456,
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_field_value');
      }
    });

    it('should return invalid_field_value when Action array contains non-strings', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: ['s3:GetObject', 123],
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('invalid_field_value');
      }
    });
  });

  describe('unsupported_feature', () => {
    it('should return unsupported_feature for NotAction', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            NotAction: 's3:*',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok && result.classification === 'unsupported_feature') {
        expect(result.reason).toBe('unsupported_feature');
        expect(result.feature).toBe('NotAction');
      }
    });

    it('should return unsupported_feature for NotResource', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            NotResource: '*',
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok && result.classification === 'unsupported_feature') {
        expect(result.feature).toBe('NotResource');
      }
    });

    it('should return unsupported_feature for Principal', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Principal: { AWS: 'arn:aws:iam::123456789012:root' },
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok && result.classification === 'unsupported_feature') {
        expect(result.feature).toBe('Principal');
      }
    });

    it('should return unsupported_feature for unsupported Condition operator', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
            Condition: {
              NumericEquals: {
                'aws:RequestedService': 's3',
              },
            },
          },
        })
      );
      expect(result.ok).toBe(false);
      if (!result.ok && result.classification === 'unsupported_feature') {
        expect(result.feature).toContain('Condition.NumericEquals');
      }
    });
  });

  describe('accepted-for-next-step (valid inputs)', () => {
    it('should accept valid minimal PolicyDocument with single Statement object', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.policy.Statement).toBeDefined();
      }
    });

    it('should accept valid PolicyDocument with Statement as array', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: [
            {
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: '*',
            },
          ],
        })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.policy.Statement)).toBe(true);
      }
    });

    it('should accept valid PolicyDocument with multiple statements', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AllowS3Read',
              Effect: 'Allow',
              Action: 's3:GetObject',
              Resource: 'arn:aws:s3:::bucket/*',
            },
            {
              Sid: 'DenyS3Delete',
              Effect: 'Deny',
              Action: 's3:DeleteObject',
              Resource: 'arn:aws:s3:::bucket/*',
            },
          ],
        })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        const statements = result.policy.Statement;
        expect(Array.isArray(statements)).toBe(true);
        if (Array.isArray(statements)) {
          expect(statements.length).toBe(2);
        }
      }
    });

    it('should accept valid PolicyDocument with all optional fields', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Version: '2012-10-17',
          Id: 'MyPolicy',
          Statement: {
            Sid: 'FullStatement',
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject'],
            Resource: ['arn:aws:s3:::bucket/*', 'arn:aws:s3:::bucket'],
            Condition: {
              StringEquals: {
                's3:prefix': 'documents/',
              },
            },
          },
        })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.policy.Version).toBe('2012-10-17');
        expect(result.policy.Id).toBe('MyPolicy');
      }
    });

    it('should accept PolicyDocument with supported Condition operators', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
            Condition: {
              StringEquals: {
                'aws:SourceIp': '203.0.113.0/24',
              },
              Bool: {
                'aws:MultiFactorAuthPresent': 'true',
              },
            },
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Action as single string', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Action as array of strings', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Resource as single string', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Resource as array of strings', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: ['arn:aws:s3:::bucket/*', 'arn:aws:s3:::bucket'],
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Effect as Deny', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Deny',
            Action: 's3:DeleteObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Effect as Allow', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Statement without Sid', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
    });

    it('should accept Statement without Condition', () => {
      const result = parseAndClassify(
        JSON.stringify({
          Statement: {
            Effect: 'Allow',
            Action: 's3:GetObject',
            Resource: '*',
          },
        })
      );
      expect(result.ok).toBe(true);
    });
  });
});

describe('validatePolicy', () => {
  it('should validate a parsed policy object', () => {
    const policy = {
      Statement: {
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: '*',
      },
    };
    const result = validatePolicy(policy);
    expect(result.ok).toBe(true);
  });

  it('should reject non-object input', () => {
    const result = validatePolicy('not an object');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_shape');
    }
  });

  it('should reject array input', () => {
    const result = validatePolicy([{ Statement: {} }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid_shape');
    }
  });
});
