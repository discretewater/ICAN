/**
 * Error model tests for condition-evaluator.
 *
 * These tests verify and freeze the error model of the Condition subsystem:
 *
 *   - Three reason types: conditions_matched, conditions_not_matched,
 *     unsupported_feature – each with a well-defined output field contract.
 *   - Reason priority: unsupported_feature > conditions_not_matched >
 *     conditions_matched.
 *   - unsupportedDetails: format, granularity, ordering, and stability.
 *
 * Principle: these tests document the error model contract; they must NOT
 * change semantics or introduce new operators.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateConditions,
  normalizeConditions,
} from '../../src/engine/condition-evaluator.js';
import type {
  ConditionEntry,
  EvaluationContext,
  ConditionEvaluationResult,
  RawConditions,
} from '../../src/engine/condition-evaluator.js';

// ─── 1. Output field contract per reason type ────────────────────────────

describe('error-model: output field contract', () => {
  it('conditions_matched result has exactly { matched, reason } with no unsupportedDetails', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: 'v' });
    expect(result.matched).toBe(true);
    expect(result.reason).toBe('conditions_matched');
    // unsupportedDetails must be absent (undefined), not an empty array
    expect(result.unsupportedDetails).toBeUndefined();
    // Verify the complete set of own enumerable keys
    expect(Object.keys(result)).toEqual(['matched', 'reason']);
  });

  it('conditions_not_matched result has exactly { matched, reason } with no unsupportedDetails', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: 'other' });
    expect(result.matched).toBe(false);
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.unsupportedDetails).toBeUndefined();
    expect(Object.keys(result)).toEqual(['matched', 'reason']);
  });

  it('unsupported_feature result has exactly { matched, reason, unsupportedDetails }', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'k', values: ['1'] },
    ];
    const result = evaluateConditions(conditions, { k: 1 });
    expect(result.matched).toBe(false);
    expect(result.reason).toBe('unsupported_feature');
    expect(Array.isArray(result.unsupportedDetails)).toBe(true);
    expect(result.unsupportedDetails!.length).toBeGreaterThan(0);
    expect(Object.keys(result)).toEqual(['matched', 'reason', 'unsupportedDetails']);
  });

  it('empty conditions yields { matched, reason } with no unsupportedDetails', () => {
    const result = evaluateConditions([], {});
    expect(result.matched).toBe(true);
    expect(result.reason).toBe('conditions_matched');
    expect(result.unsupportedDetails).toBeUndefined();
    expect(Object.keys(result)).toEqual(['matched', 'reason']);
  });
});

// ─── 2. Reason priority matrix ──────────────────────────────────────────

describe('error-model: reason priority', () => {
  it('unsupported_feature takes priority over conditions_matched (all supported would match)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'NumericEquals', key: 'count', values: ['10'] },
    ];
    const result = evaluateConditions(conditions, { user: 'alice', count: 10 });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
  });

  it('unsupported_feature takes priority over conditions_not_matched (value mismatch)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'NumericEquals', key: 'count', values: ['10'] },
    ];
    // 'user' is 'bob' which would not match, but unsupported still wins
    const result = evaluateConditions(conditions, { user: 'bob', count: 10 });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
  });

  it('unsupported_feature takes priority over missing context key', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'missingKey', values: ['v'] },
      { operator: 'NumericEquals', key: 'count', values: ['10'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
  });

  it('unsupported_feature takes priority over type mismatch', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
      { operator: 'NumericEquals', key: 'n', values: ['1'] },
    ];
    // k is a number (type mismatch for StringEquals), but unsupported wins
    const result = evaluateConditions(conditions, { k: 123, n: 1 });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
  });

  it('unsupported_feature takes priority when all conditions are unsupported', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'DateEquals', key: 'b', values: ['2024-01-01'] },
    ];
    const result = evaluateConditions(conditions, { a: 1, b: '2024-01-01' });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
    expect(result.unsupportedDetails).toHaveLength(2);
  });

  it('conditions_matched when all supported conditions pass', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { user: 'alice', secure: true });
    expect(result.reason).toBe('conditions_matched');
    expect(result.matched).toBe(true);
  });

  it('conditions_not_matched when one supported condition fails', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { user: 'alice', secure: false });
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });
});

// ─── 3. unsupportedDetails format, granularity, and stability ───────────

describe('error-model: unsupportedDetails expression', () => {
  it('format is "unsupported operator: {operator}" for each unknown operator', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'ArnEquals', key: 'k', values: ['arn:x'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.unsupportedDetails).toEqual(['unsupported operator: ArnEquals']);
  });

  it('collects details in ConditionEntry appearance order', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'DateEquals', key: 'b', values: ['2024'] },
      { operator: 'ArnEquals', key: 'c', values: ['arn:x'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
      'unsupported operator: DateEquals',
      'unsupported operator: ArnEquals',
    ]);
  });

  it('includes only unsupported operators (skips supported ones)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'a', values: ['v'] },
      { operator: 'NumericEquals', key: 'b', values: ['1'] },
      { operator: 'Bool', key: 'c', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { a: 'v', b: 1, c: true });
    // StringEquals and Bool are supported, only NumericEquals is unsupported
    expect(result.unsupportedDetails).toEqual(['unsupported operator: NumericEquals']);
  });

  it('repeated unsupported operator appears multiple times in details', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'NumericEquals', key: 'b', values: ['2'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
      'unsupported operator: NumericEquals',
    ]);
  });

  it('unsupportedDetails is stable across multiple calls with same conditions', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'DateEquals', key: 'b', values: ['2024'] },
    ];
    const result1 = evaluateConditions(conditions, {});
    const result2 = evaluateConditions(conditions, {});
    expect(result1.unsupportedDetails).toEqual(result2.unsupportedDetails);
    expect(result1.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
      'unsupported operator: DateEquals',
    ]);
  });

  it('unsupportedDetails does not change across different context values', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
    ];
    const result1 = evaluateConditions(conditions, { a: 1 });
    const result2 = evaluateConditions(conditions, { a: 999 });
    const result3 = evaluateConditions(conditions, {});
    // unsupportedDetails is determined solely by condition entries, not context
    expect(result1.unsupportedDetails).toEqual(result2.unsupportedDetails);
    expect(result2.unsupportedDetails).toEqual(result3.unsupportedDetails);
    expect(result1.unsupportedDetails).toEqual(['unsupported operator: NumericEquals']);
  });

  it('unsupportedDetails is a non-empty string array when reason is unsupported_feature', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Null', key: 'k', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toBeDefined();
    expect(result.unsupportedDetails).toBeInstanceOf(Array);
    expect(result.unsupportedDetails!.length).toBeGreaterThan(0);
    for (const detail of result.unsupportedDetails!) {
      expect(typeof detail).toBe('string');
      expect(detail).toMatch(/^unsupported operator: /);
    }
  });
});

// ─── 4. Reason semantics boundary ───────────────────────────────────────

describe('error-model: reason semantics boundary', () => {
  it('conditions_matched: empty conditions always matches', () => {
    const result = evaluateConditions([], {});
    expect(result.reason).toBe('conditions_matched');
    expect(result.matched).toBe(true);
  });

  it('conditions_matched: all supported operators evaluate to true', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'a', values: ['v1'] },
      { operator: 'StringLike', key: 'b', values: ['pre*'] },
      { operator: 'Bool', key: 'c', values: ['true'] },
      { operator: 'IpAddress', key: 'd', values: ['10.0.0.0/8'] },
    ];
    const ctx: EvaluationContext = { a: 'v1', b: 'prefix', c: true, d: '10.1.2.3' };
    const result = evaluateConditions(conditions, ctx);
    expect(result.reason).toBe('conditions_matched');
    expect(result.matched).toBe(true);
  });

  it('conditions_not_matched: missing key triggers not-matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'absent', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });

  it('conditions_not_matched: null value triggers not-matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: null });
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });

  it('conditions_not_matched: undefined value triggers not-matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'k', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { k: undefined });
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });

  it('conditions_not_matched: type mismatch triggers not-matched (StringEquals)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['123'] },
    ];
    const result = evaluateConditions(conditions, { k: 123 });
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });

  it('conditions_not_matched: value mismatch triggers not-matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['expected'] },
    ];
    const result = evaluateConditions(conditions, { k: 'different' });
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });

  it('unsupported_feature: any unsupported operator triggers it', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericLessThan', key: 'k', values: ['10'] },
    ];
    const result = evaluateConditions(conditions, { k: 5 });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
  });

  it('unsupported_feature: found even with empty context', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'ForAllValues:StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
  });
});

// ─── 5. Multi-condition AND semantics ───────────────────────────────────

describe('error-model: multi-condition AND semantics', () => {
  it('all conditions match → conditions_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'region', values: ['us-east-1'] },
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { region: 'us-east-1', secure: true });
    expect(result.reason).toBe('conditions_matched');
    expect(result.matched).toBe(true);
  });

  it('one condition fails → conditions_not_matched (AND)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'region', values: ['us-east-1'] },
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { region: 'us-east-1', secure: false });
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });

  it('mixed supported+unsupported → unsupported_feature (ignores AND result)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'NumericEquals', key: 'count', values: ['1'] },
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { user: 'alice', count: 1, secure: true });
    // Even though StringEquals would match and Bool would match,
    // unsupported takes priority over AND evaluation
    expect(result.reason).toBe('unsupported_feature');
    expect(result.matched).toBe(false);
  });
});

// ─── 6. Multi-value OR semantics ────────────────────────────────────────

describe('error-model: multi-value OR semantics', () => {
  it('StringEquals: any value matches → conditions_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'region', values: ['us-east-1', 'us-west-2', 'eu-west-1'] },
    ];
    const result = evaluateConditions(conditions, { region: 'us-west-2' });
    expect(result.reason).toBe('conditions_matched');
    expect(result.matched).toBe(true);
  });

  it('StringEquals: no value matches → conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'region', values: ['us-east-1', 'us-west-2'] },
    ];
    const result = evaluateConditions(conditions, { region: 'ap-south-1' });
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.matched).toBe(false);
  });

  it('Bool: any policy value matches → conditions_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'flag', values: ['true', 'false'] },
    ];
    expect(evaluateConditions(conditions, { flag: true }).reason).toBe('conditions_matched');
    expect(evaluateConditions(conditions, { flag: false }).reason).toBe('conditions_matched');
  });

  it('IpAddress: any CIDR matches → conditions_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8', '172.16.0.0/12'] },
    ];
    expect(evaluateConditions(conditions, { ip: '10.1.2.3' }).reason).toBe('conditions_matched');
    expect(evaluateConditions(conditions, { ip: '172.16.5.5' }).reason).toBe('conditions_matched');
  });
});

// ─── 7. normalizeConditions error-model interaction ────────────────────

describe('error-model: normalizeConditions preserves unsupported operators', () => {
  it('preserves unsupported operator names for evaluateConditions to detect', () => {
    const raw: RawConditions = {
      NumericEquals: { count: '10' },
      StringEquals: { region: 'us-east-1' },
    };
    const entries = normalizeConditions(raw);
    const result = evaluateConditions(entries, { count: 10, region: 'us-east-1' });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual(['unsupported operator: NumericEquals']);
  });

  it('preserves multiple unsupported operators through normalize→evaluate', () => {
    const raw: RawConditions = {
      NumericEquals: { a: '1' },
      DateEquals: { b: '2024-01-01' },
      StringLike: { c: 'prefix*' },
    };
    const entries = normalizeConditions(raw);
    const result = evaluateConditions(entries, { a: 1, b: '2024-01-01', c: 'prefixValue' });
    expect(result.reason).toBe('unsupported_feature');
    // Only unsupported operators appear in details; StringLike is supported
    expect(result.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
      'unsupported operator: DateEquals',
    ]);
  });
});

// ─── 8. Regression spot checks (D02 boundaries preserved) ───────────────

describe('error-model: regression spot checks', () => {
  it('Bool: "true" string matches policy "true" (D02 regression check)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    expect(evaluateConditions(conditions, { secure: 'true' })).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('Bool: illegal string "yes" yields conditions_not_matched (D02 regression check)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    expect(evaluateConditions(conditions, { secure: 'yes' })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('IpAddress: invalid CIDR yields conditions_not_matched (D02 regression check)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['not-a-cidr'] },
    ];
    expect(evaluateConditions(conditions, { ip: '10.0.0.1' })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('StringEquals: non-string context yields conditions_not_matched (D02 regression check)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    expect(evaluateConditions(conditions, { k: 123 })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('StringLike: non-string context yields conditions_not_matched (D02 regression check)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'k', values: ['*'] },
    ];
    expect(evaluateConditions(conditions, { k: 42 })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });
});