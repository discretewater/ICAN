/**
 * Boundary tests for condition-evaluator.
 *
 * These tests verify and lock down edge-case / boundary behavior of the four
 * frozen Condition operators (StringEquals, StringLike, Bool, IpAddress) and
 * the evaluateConditions() pipeline, specifically:
 *
 * - unsupported operator collection order and stability
 * - unsupported vs. supported mixing precedence
 * - unsupported vs. missing context key precedence
 * - empty conditions
 * - missing / null / undefined context values
 * - Bool handler: legal strings, illegal strings, non-string values
 * - IpAddress handler: non-string context, invalid IP, invalid CIDR, multi-CIDR OR
 * - StringEquals / StringLike: non-string context value
 *
 * Principle: these tests document and freeze existing behavior; they must NOT
 * change semantics or introduce new operators.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateConditions,
} from '../../src/engine/condition-evaluator.js';
import type {
  ConditionEntry,
  EvaluationContext,
  ConditionEvaluationResult,
} from '../../src/engine/condition-evaluator.js';

// ─── 1. Multiple unsupported operators – stable collection order ───────

describe('boundary: multiple unsupported operators', () => {
  it('collects unsupportedDetails in ConditionEntry appearance order', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'DateEquals', key: 'b', values: ['2024'] },
      { operator: 'ArnEquals', key: 'c', values: ['arn:x'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
      'unsupported operator: DateEquals',
      'unsupported operator: ArnEquals',
    ]);
  });

  it('preserves order even when operators repeat', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'StringEquals', key: 'b', values: ['x'] },
      { operator: 'NumericEquals', key: 'c', values: ['2'] },
    ];
    const result = evaluateConditions(conditions, { b: 'x' });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
      'unsupported operator: NumericEquals',
    ]);
  });
});

// ─── 2. Supported + unsupported mixed – unsupported takes precedence ───

describe('boundary: supported + unsupported mixed', () => {
  it('returns unsupported_feature even when supported entries would match', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'NumericEquals', key: 'count', values: ['10'] },
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const ctx: EvaluationContext = { user: 'alice', count: 10, secure: true };
    const result = evaluateConditions(conditions, ctx);
    expect(result.matched).toBe(false);
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
    ]);
  });

  it('returns unsupported_feature when entire list is unsupported', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'DateEquals', key: 'b', values: ['2024'] },
    ];
    const result = evaluateConditions(conditions, { a: 1, b: '2024' });
    expect(result.matched).toBe(false);
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toHaveLength(2);
  });
});

// ─── 3. Unsupported and missing context key mixed – unsupported wins ───

describe('boundary: unsupported operator vs missing context key', () => {
  it('unsupported operator takes precedence even when context key is missing', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'missingKey', values: ['v'] },
      { operator: 'NumericEquals', key: 'count', values: ['10'] },
    ];
    // 'missingKey' is not in context; normally this would yield
    // conditions_not_matched, but the unsupported operator should win.
    const result = evaluateConditions(conditions, {});
    expect(result.matched).toBe(false);
    expect(result.reason).toBe('unsupported_feature');
  });

  it('only unsupported operators – no context keys needed', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Null', key: 'k', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result.reason).toBe('unsupported_feature');
  });
});

// ─── 4. Empty conditions → conditions_matched ──────────────────────────

describe('boundary: empty conditions array', () => {
  it('evaluateConditions([], context) returns matched=true, reason=conditions_matched', () => {
    const result = evaluateConditions([], {});
    expect(result).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
    expect(result.unsupportedDetails).toBeUndefined();
  });

  it('evaluateConditions([], context) with non-empty context still matches', () => {
    const result = evaluateConditions([], { 'aws:username': 'alice' });
    expect(result).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });
});

// ─── 5. Missing context key → conditions_not_matched ───────────────────

describe('boundary: missing context key', () => {
  it('StringEquals with missing key yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'aws:username', values: ['alice'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('Bool with missing key yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'aws:SecureTransport', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('IpAddress with missing key yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'aws:SourceIp', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });
});

// ─── 6. null context value → conditions_not_matched ────────────────────

describe('boundary: null context value', () => {
  it('StringEquals with null value yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: null });
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('Bool with null value yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: null });
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('IpAddress with null value yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: null });
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });
});

// ─── 7. undefined context value → conditions_not_matched ───────────────

describe('boundary: undefined context value', () => {
  it('StringEquals with undefined value yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    // Explicitly setting k to undefined
    const ctx: EvaluationContext = { k: undefined };
    const result = evaluateConditions(conditions, ctx);
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('Bool with undefined value yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const ctx: EvaluationContext = { secure: undefined };
    const result = evaluateConditions(conditions, ctx);
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('Missing key (implicitly undefined) yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });
});

// ─── 8. Bool: legal strings "true" / "false" ───────────────────────────

describe('boundary: Bool legal strings', () => {
  it('context "true" matches policy "true"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: 'true' });
    expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
  });

  it('context "false" matches policy "false"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['false'] },
    ];
    const result = evaluateConditions(conditions, { secure: 'false' });
    expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
  });

  it('context "true" does not match policy "false"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['false'] },
    ];
    const result = evaluateConditions(conditions, { secure: 'true' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context "false" does not match policy "true"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: 'false' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('boolean true matches policy "true"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: true });
    expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
  });

  it('boolean false matches policy "false"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['false'] },
    ];
    const result = evaluateConditions(conditions, { secure: false });
    expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
  });
});

// ─── 9. Bool: illegal / non-"true"/"false" strings → false ─────────────

describe('boundary: Bool illegal strings', () => {
  it('context "yes" is treated as type mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: 'yes' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context "TRUE" (case-sensitive) is treated as mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: 'TRUE' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context "FALSE" (case-sensitive) is treated as mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['false'] },
    ];
    const result = evaluateConditions(conditions, { secure: 'FALSE' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context empty string "" is treated as mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: '' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});

// ─── 10. Bool: non-string values (number, object, array) → false ───────

describe('boundary: Bool non-string values', () => {
  it('context value 1 (number) is treated as mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: 1 });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context value 0 (number) is treated as mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['false'] },
    ];
    const result = evaluateConditions(conditions, { secure: 0 });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context value as object is treated as mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: { val: true } });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context value as array is treated as mismatch → false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { secure: [true] as unknown as boolean });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});

// ─── 11. IpAddress: non-string context value ───────────────────────────

describe('boundary: IpAddress non-string context value', () => {
  it('number context value for IpAddress yields false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: 3232235770 });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('boolean context value for IpAddress yields false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: true });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('object context value for IpAddress yields false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: { addr: '10.0.0.1' } });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});

// ─── 12. IpAddress: invalid IP in context ───────────────────────────────

describe('boundary: IpAddress invalid context IP', () => {
  it('context value "not-an-ip" yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: 'not-an-ip' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context value "999.999.999.999" yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: '999.999.999.999' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context value "1.2.3" (too few octets) yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: '1.2.3' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('context value empty string yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: '' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});

// ─── 13. IpAddress: invalid CIDR in policy values ──────────────────────

describe('boundary: IpAddress invalid CIDR', () => {
  it('policy value "not-a-cidr" yields conditions_not_matched (try-catch skips)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['not-a-cidr'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.0.0.1' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('policy value with invalid prefix "10.0.0.0/33" yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/33'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.0.0.1' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('policy value with negative prefix "10.0.0.0/-1" yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/-1'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.0.0.1' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('policy value IP only (no /prefix) yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.1'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.0.0.1' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('invalid CIDR with invalid network IP yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['999.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.0.0.1' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});

// ─── 14. IpAddress: multi CIDR OR ─────────────────────────────────────

describe('boundary: IpAddress multi CIDR OR', () => {
  it('matches first CIDR in multi-value list', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8', '172.16.0.0/12'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.1.2.3' });
    expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
  });

  it('matches second CIDR in multi-value list', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8', '172.16.0.0/12'] },
    ];
    const result = evaluateConditions(conditions, { ip: '172.16.5.5' });
    expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
  });

  it('does not match when IP is outside all CIDRs', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8', '172.16.0.0/12'] },
    ];
    const result = evaluateConditions(conditions, { ip: '192.168.1.1' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('skips invalid CIDR and matches valid one (OR fallback)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['not-a-cidr', '10.0.0.0/8'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.1.2.3' });
    expect(result).toEqual({ matched: true, reason: 'conditions_matched' });
  });

  it('all CIDRs invalid yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'ip', values: ['not-a-cidr', 'also-bad'] },
    ];
    const result = evaluateConditions(conditions, { ip: '10.0.0.1' });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});

// ─── 15. StringEquals: non-string context value → false ─────────────────

describe('boundary: StringEquals non-string context value', () => {
  it('number context value for StringEquals yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['123'] },
    ];
    const result = evaluateConditions(conditions, { k: 123 });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('boolean context value for StringEquals yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, { k: true });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('object context value for StringEquals yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: { nested: 'v' } });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('array context value for StringEquals yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: ['v'] as unknown as string });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});

// ─── 16. StringLike: non-string context value → false ──────────────────

describe('boundary: StringLike non-string context value', () => {
  it('number context value for StringLike yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'k', values: ['*'] },
    ];
    const result = evaluateConditions(conditions, { k: 42 });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('boolean context value for StringLike yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'k', values: ['*'] },
    ];
    const result = evaluateConditions(conditions, { k: true });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('null context value for StringLike yields conditions_not_matched (short-circuit at evaluateAllEntries)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'k', values: ['*'] },
    ];
    const result = evaluateConditions(conditions, { k: null });
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });

  it('undefined context value for StringLike yields conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'k', values: ['*'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result).toEqual({ matched: false, reason: 'conditions_not_matched' });
  });
});