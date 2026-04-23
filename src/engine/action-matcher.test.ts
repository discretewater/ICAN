import { describe, it, expect } from 'vitest';
import {
  compileActionPattern,
  matchAction,
} from './action-matcher.js';
import type { ActionPattern } from './action-matcher.js';

describe('action-matcher', () => {
  describe('compileActionPattern', () => {
    it('T9: should compile "*" to any pattern', () => {
      const result = compileActionPattern('*');
      expect(result).toEqual({ kind: 'any' } satisfies ActionPattern);
    });

    it('T9: should compile "s3:Get*" to prefix pattern with lowercased prefix', () => {
      const result = compileActionPattern('s3:Get*');
      expect(result).toEqual({
        kind: 'prefix',
        value: 's3:get',
      } satisfies ActionPattern);
    });

    it('T9: should compile "s3:GetObject" to exact pattern with lowercased value', () => {
      const result = compileActionPattern('s3:GetObject');
      expect(result).toEqual({
        kind: 'exact',
        value: 's3:getobject',
      } satisfies ActionPattern);
    });
  });

  describe('matchAction', () => {
    it('T1: should match any action with "*" pattern', () => {
      const patterns: readonly ActionPattern[] = [{ kind: 'any' }];
      const result = matchAction('s3:GetObject', patterns);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('action_matched');
      expect(result.matchedPattern).toEqual({ kind: 'any' });
    });

    it('T2: should match exact pattern when strings are equal (case-insensitive)', () => {
      const patterns: readonly ActionPattern[] = [
        { kind: 'exact', value: 's3:getobject' },
      ];
      const result = matchAction('s3:GetObject', patterns);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('action_matched');
      expect(result.matchedPattern).toEqual({
        kind: 'exact',
        value: 's3:getobject',
      });
    });

    it('T3: should not match exact pattern when strings differ', () => {
      const patterns: readonly ActionPattern[] = [
        { kind: 'exact', value: 's3:getobject' },
      ];
      const result = matchAction('s3:PutObject', patterns);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('action_not_matched');
      expect(result.matchedPattern).toBeUndefined();
    });

    it('T4: should match prefix pattern when action starts with prefix', () => {
      const patterns: readonly ActionPattern[] = [
        { kind: 'prefix', value: 's3:get' },
      ];
      const result = matchAction('s3:GetObject', patterns);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('action_matched');
      expect(result.matchedPattern).toEqual({
        kind: 'prefix',
        value: 's3:get',
      });
    });

    it('T5: should not match prefix pattern when action does not start with prefix', () => {
      const patterns: readonly ActionPattern[] = [
        { kind: 'prefix', value: 's3:get' },
      ];
      const result = matchAction('s3:PutObject', patterns);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('action_not_matched');
      expect(result.matchedPattern).toBeUndefined();
    });

    it('T6: should treat action matching as case-insensitive', () => {
      const patterns: readonly ActionPattern[] = [
        { kind: 'exact', value: 's3:getobject' },
      ];
      const result = matchAction('S3:GETOBJECT', patterns);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('action_matched');
    });

    it('T7: should return matched on first matching pattern in sequence', () => {
      const patterns: readonly ActionPattern[] = [
        { kind: 'exact', value: 's3:putobject' },
        { kind: 'prefix', value: 's3:get' },
        { kind: 'any' },
      ];
      const result = matchAction('s3:GetObject', patterns);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('action_matched');
      expect(result.matchedPattern).toEqual({
        kind: 'prefix',
        value: 's3:get',
      });
    });

    it('T8: should return action_not_matched for empty patterns list', () => {
      const patterns: readonly ActionPattern[] = [];
      const result = matchAction('s3:GetObject', patterns);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('action_not_matched');
      expect(result.matchedPattern).toBeUndefined();
    });
  });
});
