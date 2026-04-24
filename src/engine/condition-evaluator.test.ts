import { describe, it, expect, vi } from 'vitest';
import {
  normalizeConditions,
  evaluateConditions,
} from './condition-evaluator.js';
import type {
  ConditionEntry,
  EvaluationContext,
  RawConditions,
  ConditionEvaluationResult,
} from './condition-evaluator.js';
import * as resourceMatcher from './resource-matcher.js';

describe('condition-evaluator', () => {
  describe('evaluateConditions', () => {
    it('should match StringEquals when value is equal (T1)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringEquals', key: 'aws:username', values: ['alice'] },
      ];
      const context: EvaluationContext = { 'aws:username': 'alice' };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
    });

    it('should not match StringEquals when value differs (T2)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringEquals', key: 'aws:username', values: ['alice'] },
      ];
      const context: EvaluationContext = { 'aws:username': 'bob' };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
    });

    it('should match StringLike with wildcard pattern (T3)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringLike', key: 'aws:username', values: ['al*'] },
      ];
      const context: EvaluationContext = { 'aws:username': 'alice' };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
    });

    it('should match Bool when context value is true and policy expects true (T4)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'Bool', key: 'aws:SecureTransport', values: ['true'] },
      ];
      const context: EvaluationContext = { 'aws:SecureTransport': true };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
    });

    it('should not match Bool when context value is true but policy expects false (T5)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'Bool', key: 'aws:SecureTransport', values: ['false'] },
      ];
      const context: EvaluationContext = { 'aws:SecureTransport': true };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
    });

    it('should match IpAddress when IP is inside CIDR range (T6)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'IpAddress', key: 'aws:SourceIp', values: ['192.168.1.0/24'] },
      ];
      const context: EvaluationContext = { 'aws:SourceIp': '192.168.1.100' };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
    });

    it('should not match IpAddress when IP is outside CIDR range (T7)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'IpAddress', key: 'aws:SourceIp', values: ['192.168.1.0/24'] },
      ];
      const context: EvaluationContext = { 'aws:SourceIp': '10.0.0.1' };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
    });

    it('should require all keys to match (AND logic) (T8)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringEquals', key: 'aws:username', values: ['alice'] },
        { operator: 'Bool', key: 'aws:SecureTransport', values: ['true'] },
      ];

      const allMatch: EvaluationContext = {
        'aws:username': 'alice',
        'aws:SecureTransport': true,
      };
      expect(evaluateConditions(conditions, allMatch)).toEqual({
        matched: true,
        reason: 'conditions_matched',
      });

      const oneFails: EvaluationContext = {
        'aws:username': 'alice',
        'aws:SecureTransport': false,
      };
      expect(evaluateConditions(conditions, oneFails)).toEqual({
        matched: false,
        reason: 'conditions_not_matched',
      });
    });

    it('should pass when any policy value matches (OR logic) (T9)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringEquals', key: 'aws:username', values: ['alice', 'bob'] },
      ];
      const context: EvaluationContext = { 'aws:username': 'bob' };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
    });

    it('should return conditions_not_matched when key is missing (T10)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringEquals', key: 'aws:username', values: ['alice'] },
      ];
      const context: EvaluationContext = {};
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
    });

    it('should return unsupported_feature for unknown operators (T11)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'NumericEquals', key: 'aws:username', values: ['1'] },
      ];
      const context: EvaluationContext = { 'aws:username': '1' };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('unsupported_feature');
      expect(result.unsupportedDetails).toContain('unsupported operator: NumericEquals');
    });

    it('should return conditions_not_matched when context value type is wrong (T12)', () => {
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringEquals', key: 'aws:username', values: ['alice'] },
      ];
      const context: EvaluationContext = { 'aws:username': 123 };
      const result: ConditionEvaluationResult = evaluateConditions(conditions, context);
      expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
    });

    it('should call compileResourcePattern during StringLike evaluation (T15)', () => {
      const spy = vi.spyOn(resourceMatcher, 'compileResourcePattern');
      const conditions: readonly ConditionEntry[] = [
        { operator: 'StringLike', key: 'aws:username', values: ['al*'] },
      ];
      const context: EvaluationContext = { 'aws:username': 'alice' };
      evaluateConditions(conditions, context);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('normalizeConditions', () => {
    it('should flatten nested RawConditions into ConditionEntry array (T13)', () => {
      const raw: RawConditions = {
        StringEquals: {
          'aws:username': 'alice',
          'aws:SourceIp': ['192.168.1.1', '10.0.0.1'],
        },
        Bool: {
          'aws:SecureTransport': true,
        },
      };

      const entries = normalizeConditions(raw);
      expect(entries).toHaveLength(3);
      expect(entries[0]).toEqual({
        operator: 'StringEquals',
        key: 'aws:username',
        values: ['alice'],
      });
      expect(entries[1]).toEqual({
        operator: 'StringEquals',
        key: 'aws:SourceIp',
        values: ['192.168.1.1', '10.0.0.1'],
      });
      expect(entries[2]).toEqual({
        operator: 'Bool',
        key: 'aws:SecureTransport',
        values: ['true'],
      });
    });

    it('should normalise boolean values to "true" / "false" strings (T14)', () => {
      const raw: RawConditions = {
        Bool: {
          'aws:SecureTransport': true,
          'aws:MultiFactorAuthPresent': [true, false],
        },
      };

      const entries = normalizeConditions(raw);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        operator: 'Bool',
        key: 'aws:SecureTransport',
        values: ['true'],
      });
      expect(entries[1]).toEqual({
        operator: 'Bool',
        key: 'aws:MultiFactorAuthPresent',
        values: ['true', 'false'],
      });
    });
  });
});
