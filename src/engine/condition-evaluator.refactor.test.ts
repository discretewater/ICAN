/**
 * Refactoring protection tests (characterization tests) for condition-evaluator.
 *
 * These tests lock down the exact observable behavior of normalizeConditions()
 * and evaluateConditions() so that structural refactoring cannot silently
 * change semantics.  They supplement the existing unit tests by covering edge
 * cases and cross-operator interactions that were previously implicit.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeConditions,
  evaluateConditions,
} from './condition-evaluator.js';
import type {
  ConditionEntry,
  EvaluationContext,
  RawConditions,
} from './condition-evaluator.js';

// ─── normalizeConditions characterization ─────────────────────────────

describe('normalizeConditions – characterization', () => {
  it('preserves operator string exactly as given', () => {
    const raw: RawConditions = {
      CustomOperator: { 'my:key': 'val' },
    };
    const entries = normalizeConditions(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.operator).toBe('CustomOperator');
  });

  it('normalizes a single string value into string[]', () => {
    const raw: RawConditions = {
      StringEquals: { 'aws:username': 'alice' },
    };
    const entries = normalizeConditions(raw);
    expect(entries[0]!.values).toEqual(['alice']);
  });

  it('preserves a string[] value as-is', () => {
    const raw: RawConditions = {
      StringEquals: { 'aws:username': ['alice', 'bob'] },
    };
    const entries = normalizeConditions(raw);
    expect(entries[0]!.values).toEqual(['alice', 'bob']);
  });

  it('normalizes a boolean true to ["true"]', () => {
    const raw: RawConditions = {
      Bool: { 'aws:SecureTransport': true },
    };
    const entries = normalizeConditions(raw);
    expect(entries[0]!.values).toEqual(['true']);
  });

  it('normalizes a boolean false to ["false"]', () => {
    const raw: RawConditions = {
      Bool: { 'aws:SecureTransport': false },
    };
    const entries = normalizeConditions(raw);
    expect(entries[0]!.values).toEqual(['false']);
  });

  it('normalizes a boolean[] to string[]', () => {
    const raw: RawConditions = {
      Bool: { 'aws:flags': [true, false, true] },
    };
    const entries = normalizeConditions(raw);
    expect(entries[0]!.values).toEqual(['true', 'false', 'true']);
  });

  it('handles entries with multiple operators', () => {
    const raw: RawConditions = {
      StringEquals: { 'k1': 'v1' },
      Bool: { 'k2': true },
      IpAddress: { 'k3': '10.0.0.0/8' },
    };
    const entries = normalizeConditions(raw);
    expect(entries).toHaveLength(3);
    const ops = entries.map((e) => e.operator);
    expect(ops).toContain('StringEquals');
    expect(ops).toContain('Bool');
    expect(ops).toContain('IpAddress');
  });

  it('round-trips through existing supported operator names unchanged', () => {
    const raw: RawConditions = {
      StringEquals: { 'k': 'v' },
      StringLike: { 'k': 'v*' },
      Bool: { 'k': true },
      IpAddress: { 'k': '0.0.0.0/0' },
    };
    const entries = normalizeConditions(raw);
    const ops = entries.map((e) => e.operator);
    expect(ops.sort()).toEqual(['Bool', 'IpAddress', 'StringEquals', 'StringLike']);
  });
});

// ─── evaluateConditions – StringEquals characterization ───────────────

describe('evaluateConditions – StringEquals characterization', () => {
  it('matches when context equals one of several policy values (OR)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'region', values: ['us-east-1', 'us-west-2'] },
    ];
    const ctx: EvaluationContext = { region: 'us-west-2' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('does not match when context differs from all policy values', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'region', values: ['us-east-1', 'us-west-2'] },
    ];
    const ctx: EvaluationContext = { region: 'eu-west-1' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('is case-sensitive: "Alice" does not match "alice"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
    ];
    const ctx: EvaluationContext = { user: 'Alice' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('rejects non-string context (number)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['123'] },
    ];
    const ctx: EvaluationContext = { user: 123 };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('rejects non-string context (boolean)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'flag', values: ['true'] },
    ];
    const ctx: EvaluationContext = { flag: true };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });
});

// ─── evaluateConditions – StringLike characterization ─────────────────

describe('evaluateConditions – StringLike characterization', () => {
  it('matches exact pattern without wildcards', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'path', values: ['home'] },
    ];
    const ctx: EvaluationContext = { path: 'home' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('does not match when exact pattern differs', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'path', values: ['home'] },
    ];
    const ctx: EvaluationContext = { path: 'away' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('matches wildcard pattern "*" (any)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'path', values: ['*'] },
    ];
    const ctx: EvaluationContext = { path: 'anything' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('matches prefix wildcard "prefix*"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'path', values: ['dev-*'] },
    ];
    const ctx: EvaluationContext = { path: 'dev-east' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('matches suffix wildcard "*suffix"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'path', values: ['*-us'] },
    ];
    const ctx: EvaluationContext = { path: 'region-us' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('rejects non-string context value', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringLike', key: 'path', values: ['*'] },
    ];
    const ctx: EvaluationContext = { path: 42 };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });
});

// ─── evaluateConditions – Bool characterization ──────────────────────

describe('evaluateConditions – Bool characterization', () => {
  it('matches when context is boolean true and policy says true', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const ctx: EvaluationContext = { secure: true };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('matches when context is boolean false and policy says false', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['false'] },
    ];
    const ctx: EvaluationContext = { secure: false };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('does not match when context boolean differs from policy', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const ctx: EvaluationContext = { secure: false };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('matches context string "true" against policy "true"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const ctx: EvaluationContext = { secure: 'true' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('matches context string "false" against policy "false"', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['false'] },
    ];
    const ctx: EvaluationContext = { secure: 'false' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('rejects non-boolean non-"true"/"false" string context', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const ctx: EvaluationContext = { secure: 'yes' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('rejects numeric context', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'secure', values: ['true'] },
    ];
    const ctx: EvaluationContext = { secure: 1 };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('matches any policy value (OR within Bool)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'Bool', key: 'flag', values: ['true', 'false'] },
    ];
    // context has true, which matches policy "true"
    expect(evaluateConditions(conditions, { flag: true })).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
    // context has false, which matches policy "false"
    expect(evaluateConditions(conditions, { flag: false })).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });
});

// ─── evaluateConditions – IpAddress characterization ─────────────────

describe('evaluateConditions – IpAddress characterization', () => {
  it('matches IP within /24 CIDR', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['192.168.1.0/24'] },
    ];
    const ctx: EvaluationContext = { srcIp: '192.168.1.50' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('does not match IP outside /24 CIDR', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['192.168.1.0/24'] },
    ];
    const ctx: EvaluationContext = { srcIp: '192.168.2.1' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('matches IP within /8 CIDR', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['10.0.0.0/8'] },
    ];
    const ctx: EvaluationContext = { srcIp: '10.255.255.255' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('matches /32 exact IP', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['1.2.3.4/32'] },
    ];
    const ctx: EvaluationContext = { srcIp: '1.2.3.4' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('does not match different /32 IP', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['1.2.3.4/32'] },
    ];
    const ctx: EvaluationContext = { srcIp: '1.2.3.5' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('matches /0 (all IPv4)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['0.0.0.0/0'] },
    ];
    const ctx: EvaluationContext = { srcIp: '255.255.255.255' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('matches any CIDR when multiple are provided (OR)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['10.0.0.0/8', '172.16.0.0/12'] },
    ];
    expect(evaluateConditions(conditions, { srcIp: '10.1.2.3' })).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
    expect(evaluateConditions(conditions, { srcIp: '172.16.5.5' })).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
    expect(evaluateConditions(conditions, { srcIp: '192.168.1.1' })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('rejects non-string context value', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['10.0.0.0/8'] },
    ];
    const ctx: EvaluationContext = { srcIp: 3232235770 };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('treats invalid CIDR as non-match (not error)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['not-a-cidr'] },
    ];
    const ctx: EvaluationContext = { srcIp: '10.0.0.1' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('treats invalid context IP as non-match when CIDRs are valid', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'IpAddress', key: 'srcIp', values: ['10.0.0.0/8'] },
    ];
    const ctx: EvaluationContext = { srcIp: 'not-an-ip' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });
});

// ─── evaluateConditions – unsupported operator characterization ─────

describe('evaluateConditions – unsupported operator characterization', () => {
  it('returns unsupported_feature with details for NumericEquals', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'count', values: ['10'] },
    ];
    const result = evaluateConditions(conditions, { count: 10 });
    expect(result.matched).toBe(false);
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual(['unsupported operator: NumericEquals']);
  });

  it('returns unsupported_feature with details for DateEquals', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'DateEquals', key: 'ts', values: ['2024-01-01'] },
    ];
    const result = evaluateConditions(conditions, { ts: '2024-01-01' });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual(['unsupported operator: DateEquals']);
  });

  it('collects all unsupported operators in one pass', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'NumericEquals', key: 'a', values: ['1'] },
      { operator: 'DateEquals', key: 'b', values: ['2024'] },
    ];
    const result = evaluateConditions(conditions, { a: 1, b: '2024' });
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual([
      'unsupported operator: NumericEquals',
      'unsupported operator: DateEquals',
    ]);
  });

  it('mixed supported and unsupported: unsupported takes precedence', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'NumericEquals', key: 'count', values: ['10'] },
    ];
    const ctx: EvaluationContext = { user: 'alice', count: 10 };
    const result = evaluateConditions(conditions, ctx);
    // Even though StringEquals would match, unsupported feature takes precedence
    expect(result.reason).toBe('unsupported_feature');
    expect(result.unsupportedDetails).toEqual(['unsupported operator: NumericEquals']);
    // Note: matched is false
    expect(result.matched).toBe(false);
  });
});

// ─── evaluateConditions – cross-cutting behavior characterization ────

describe('evaluateConditions – cross-cutting characterization', () => {
  it('empty conditions list yields conditions_matched', () => {
    const result = evaluateConditions([], {});
    expect(result).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('null context value is treated as missing key', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const ctx: EvaluationContext = { k: null };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('undefined context value is treated as missing key', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const ctx: EvaluationContext = {};
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('AND logic: all entries must match', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'user', values: ['alice'] },
      { operator: 'Bool', key: 'secure', values: ['true'] },
      { operator: 'IpAddress', key: 'ip', values: ['10.0.0.0/8'] },
    ];
    const ctx: EvaluationContext = {
      user: 'alice',
      secure: true,
      ip: '10.1.2.3',
    };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });

    // If any one fails, entire result is conditions_not_matched
    expect(evaluateConditions(conditions, { user: 'bob', secure: true, ip: '10.1.2.3' })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
    expect(evaluateConditions(conditions, { user: 'alice', secure: false, ip: '10.1.2.3' })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
    expect(evaluateConditions(conditions, { user: 'alice', secure: true, ip: '192.168.1.1' })).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('short-circuits on first non-matching entry (missing key)', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'missingKey', values: ['v'] },
      { operator: 'Bool', key: 'anotherKey', values: ['true'] },
    ];
    const result = evaluateConditions(conditions, {});
    expect(result).toEqual({
      matched: false,
      reason: 'conditions_not_matched',
    });
  });

  it('supports ConditionEntry readonly array input', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] as readonly string[] },
    ];
    const ctx: EvaluationContext = { k: 'v' };
    expect(evaluateConditions(conditions, ctx)).toEqual({
      matched: true,
      reason: 'conditions_matched',
    });
  });

  it('ConditionEvaluationResult has no unsupportedDetails when conditions_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: 'v' });
    expect(result.matched).toBe(true);
    expect(result.reason).toBe('conditions_matched');
    expect(result.unsupportedDetails).toBeUndefined();
  });

  it('ConditionEvaluationResult has no unsupportedDetails when conditions_not_matched', () => {
    const conditions: readonly ConditionEntry[] = [
      { operator: 'StringEquals', key: 'k', values: ['v'] },
    ];
    const result = evaluateConditions(conditions, { k: 'other' });
    expect(result.matched).toBe(false);
    expect(result.reason).toBe('conditions_not_matched');
    expect(result.unsupportedDetails).toBeUndefined();
  });
});