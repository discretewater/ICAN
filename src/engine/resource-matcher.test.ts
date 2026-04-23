import { describe, it, expect } from 'vitest';
import {
  compileResourcePattern,
  matchResource,
} from './resource-matcher.js';
import type {
  ResourcePattern,
  ResourceMatchResult,
} from './resource-matcher.js';

describe('resource-matcher', () => {
  describe('compileResourcePattern', () => {
    it('should compile "*" to any pattern (T10)', () => {
      const result: ResourcePattern = compileResourcePattern('*');
      expect(result).toEqual({ kind: 'any' });
    });

    it('should compile plain string without wildcards to exact pattern (T10)', () => {
      const result: ResourcePattern = compileResourcePattern('arn:aws:s3:::bucket');
      expect(result).toEqual({
        kind: 'exact',
        value: 'arn:aws:s3:::bucket',
      });
    });

    it('should compile string with "*" to wildcard pattern (T10)', () => {
      const result: ResourcePattern = compileResourcePattern('arn:aws:s3:::bucket/*');
      expect(result.kind).toBe('wildcard');
      if (result.kind === 'wildcard') {
        expect(result.regex).toBeInstanceOf(RegExp);
        expect(result.regex.test('arn:aws:s3:::bucket/object.txt')).toBe(true);
      }
    });

    it('should compile string with "?" to wildcard pattern', () => {
      const result: ResourcePattern = compileResourcePattern('arn:aws:s3:::bucket/?bject.txt');
      expect(result.kind).toBe('wildcard');
      if (result.kind === 'wildcard') {
        expect(result.regex).toBeInstanceOf(RegExp);
        expect(result.regex.test('arn:aws:s3:::bucket/object.txt')).toBe(true);
      }
    });

    it('should treat "+" as literal in exact pattern (T11)', () => {
      // A pattern without '*' or '?' compiles to exact, so '+' is naturally literal.
      const result: ResourcePattern = compileResourcePattern('arn:aws:s3:::bucket/a+b');
      expect(result).toEqual({
        kind: 'exact',
        value: 'arn:aws:s3:::bucket/a+b',
      });

      const matchResult = matchResource('arn:aws:s3:::bucket/a+b', [result]);
      expect(matchResult.matched).toBe(true);

      const noMatchResult = matchResource('arn:aws:s3:::bucket/aab', [result]);
      expect(noMatchResult.matched).toBe(false);
    });

    it('should escape "+" in wildcard pattern to avoid regex quantifier behaviour (T11 wildcard)', () => {
      const result: ResourcePattern = compileResourcePattern('arn:aws:s3:::bucket/a+b*');
      expect(result.kind).toBe('wildcard');
      if (result.kind === 'wildcard') {
        // '+' must be escaped so it matches a literal plus sign only.
        expect(result.regex.test('arn:aws:s3:::bucket/a+b')).toBe(true);
        expect(result.regex.test('arn:aws:s3:::bucket/aab')).toBe(false);
      }
    });
  });

  describe('matchResource', () => {
    it('should match any resource with any pattern (T1)', () => {
      const patterns: readonly ResourcePattern[] = [compileResourcePattern('*')];
      const result: ResourceMatchResult = matchResource('arn:aws:s3:::bucket/key', patterns);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('resource_matched');
      expect(result.matchedPattern).toEqual({ kind: 'any' });
    });

    it('should match exact pattern when strings are equal (T2)', () => {
      const patterns: readonly ResourcePattern[] = [compileResourcePattern('arn:aws:s3:::bucket/key')];
      const result: ResourceMatchResult = matchResource('arn:aws:s3:::bucket/key', patterns);
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('resource_matched');
      expect(result.matchedPattern).toEqual({
        kind: 'exact',
        value: 'arn:aws:s3:::bucket/key',
      });
    });

    it('should not match exact pattern when strings differ (T3)', () => {
      const patterns: readonly ResourcePattern[] = [compileResourcePattern('arn:aws:s3:::bucket/key')];
      const result: ResourceMatchResult = matchResource('arn:aws:s3:::bucket/other', patterns);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('resource_not_matched');
      expect(result.matchedPattern).toBeUndefined();
    });

    it('should match wildcard pattern with "*" (T4)', () => {
      const patterns: readonly ResourcePattern[] = [
        compileResourcePattern('arn:aws:s3:::bucket/*'),
      ];
      const result: ResourceMatchResult = matchResource(
        'arn:aws:s3:::bucket/object.txt',
        patterns,
      );
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('resource_matched');
      expect(result.matchedPattern?.kind).toBe('wildcard');
    });

    it('should match wildcard pattern with "?" (T5)', () => {
      const patterns: readonly ResourcePattern[] = [
        compileResourcePattern('arn:aws:s3:::bucket/?bject.txt'),
      ];
      const result: ResourceMatchResult = matchResource(
        'arn:aws:s3:::bucket/object.txt',
        patterns,
      );
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('resource_matched');
      expect(result.matchedPattern?.kind).toBe('wildcard');
    });

    it('should not match wildcard pattern when resource does not fit (T6)', () => {
      const patterns: readonly ResourcePattern[] = [
        compileResourcePattern('arn:aws:s3:::bucket/*'),
      ];
      const result: ResourceMatchResult = matchResource(
        'arn:aws:s3:::other-bucket/object.txt',
        patterns,
      );
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('resource_not_matched');
      expect(result.matchedPattern).toBeUndefined();
    });

    it('should be case-sensitive (T7)', () => {
      const patterns: readonly ResourcePattern[] = [
        compileResourcePattern('arn:aws:s3:::Bucket'),
      ];
      const result: ResourceMatchResult = matchResource(
        'arn:aws:s3:::bucket',
        patterns,
      );
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('resource_not_matched');
    });

    it('should return matched on first hit when scanning multiple patterns (T8)', () => {
      const patterns: readonly ResourcePattern[] = [
        compileResourcePattern('arn:aws:s3:::bucket1/*'),
        compileResourcePattern('arn:aws:s3:::bucket2/*'),
        compileResourcePattern('arn:aws:s3:::bucket3/*'),
      ];
      const result: ResourceMatchResult = matchResource(
        'arn:aws:s3:::bucket2/object.txt',
        patterns,
      );
      expect(result.matched).toBe(true);
      expect(result.reason).toBe('resource_matched');
      expect(result.matchedPattern).toEqual(patterns[1]);
    });

    it('should return not matched for empty patterns list (T9)', () => {
      const patterns: readonly ResourcePattern[] = [];
      const result: ResourceMatchResult = matchResource('arn:aws:s3:::bucket/key', patterns);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('resource_not_matched');
      expect(result.matchedPattern).toBeUndefined();
    });

    it('should respect pattern order and return first match (T8 extended)', () => {
      const patterns: readonly ResourcePattern[] = [
        compileResourcePattern('arn:aws:s3:::bucket/*'),
        compileResourcePattern('*'),
      ];
      const result: ResourceMatchResult = matchResource(
        'arn:aws:s3:::bucket/object.txt',
        patterns,
      );
      expect(result.matched).toBe(true);
      expect(result.matchedPattern).toEqual(patterns[0]);
    });
  });
});
