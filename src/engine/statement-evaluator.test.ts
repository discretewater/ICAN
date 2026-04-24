import { describe, it, expect } from 'vitest';
import {
  evaluateStatement,
  evaluateStatements,
} from './statement-evaluator.js';

import type { StandardStatement } from '../parser/policy-types.js';
import type { EvaluationRequest } from '../parser/evaluation-request-types.js';

/**
 * Helper: create a minimal StandardStatement.
 * Defaults to Allow effect with wildcard action/resource and empty conditions.
 */
function makeStatement(overrides: Partial<StandardStatement> = {}): StandardStatement {
  return {
    statementId: 'stmt-001',
    sourcePolicyId: 'policy-001',
    sourcePolicyPath: '',
    sourcePolicyIndex: 0,
    sourceStatementIndex: 0,
    sid: undefined,
    effect: 'Allow',
    actions: ['*'],
    resources: ['*'],
    conditions: {},
    raw: null,
    ...overrides,
  };
}

/**
 * Helper: create a minimal EvaluationRequest.
 */
function makeRequest(overrides: Partial<EvaluationRequest> = {}): EvaluationRequest {
  return {
    action: 's3:GetObject',
    resource: 'arn:aws:s3:::my-bucket/my-key',
    context: {},
    ...overrides,
  };
}

describe('statement-evaluator', () => {
  describe('evaluateStatement', () => {
    it('T1: Action matched, other dimensions all pass; applicable=true, actionMatched=true', () => {
      const stmt = makeStatement({
        actions: ['s3:Get*'],
        resources: ['arn:aws:s3:::my-bucket/*'],
        conditions: { StringEquals: { 'aws:username': ['alice'] } },
      });
      const req = makeRequest({
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::my-bucket/my-key',
        context: { 'aws:username': 'alice' },
      });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(true);
      expect(result.conditionMatched).toBe(true);
      expect(result.applicable).toBe(true);
      expect(result.nonApplicableReasons).toEqual([]);
      expect(result.unsupportedFeatures).toEqual([]);
    });

    it('T2: Action not matched; applicable=false, actionMatched=false, reason=action_not_matched', () => {
      const stmt = makeStatement({
        actions: ['s3:PutObject'],
      });
      const req = makeRequest({ action: 's3:GetObject' });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(false);
      expect(result.applicable).toBe(false);
      expect(result.nonApplicableReasons).toEqual(['action_not_matched'] as const);
    });

    it('T3: Resource not matched, Action matched; applicable=false, resourceMatched=false, reason=resource_not_matched', () => {
      const stmt = makeStatement({
        actions: ['s3:Get*'],
        resources: ['arn:aws:s3:::other-bucket/*'],
      });
      const req = makeRequest({
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::my-bucket/my-key',
      });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(false);
      expect(result.applicable).toBe(false);
      expect(result.nonApplicableReasons).toEqual(['resource_not_matched'] as const);
    });

    it('T4: Condition not matched, Action/Resource matched; applicable=false, conditionMatched=false, reason=condition_not_matched', () => {
      const stmt = makeStatement({
        actions: ['s3:Get*'],
        resources: ['*'],
        conditions: { StringEquals: { 'aws:username': ['alice'] } },
      });
      const req = makeRequest({
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::my-bucket/my-key',
        context: { 'aws:username': 'bob' },
      });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(true);
      expect(result.conditionMatched).toBe(false);
      expect(result.applicable).toBe(false);
      expect(result.nonApplicableReasons).toEqual(['condition_not_matched'] as const);
    });

    it('T5: All three dimensions matched; applicable=true, all dimensions true', () => {
      const stmt = makeStatement({
        actions: ['s3:Get*'],
        resources: ['*'],
        conditions: { StringEquals: { 'aws:username': ['alice'] } },
      });
      const req = makeRequest({
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::my-bucket/my-key',
        context: { 'aws:username': 'alice' },
      });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(true);
      expect(result.conditionMatched).toBe(true);
      expect(result.applicable).toBe(true);
      expect(result.nonApplicableReasons).toEqual([]);
      expect(result.unsupportedFeatures).toEqual([]);
    });

    it('T6: Empty conditions implicitly satisfied; conditions={} gives conditionMatched=true', () => {
      const stmt = makeStatement({
        actions: ['*'],
        resources: ['*'],
        conditions: {},
      });
      const req = makeRequest();
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(true);
      expect(result.conditionMatched).toBe(true);
      expect(result.applicable).toBe(true);
    });

    it('T7: Empty actions array; actionMatched=false, applicable=false', () => {
      const stmt = makeStatement({
        actions: [],
        resources: ['*'],
        conditions: {},
      });
      const req = makeRequest();
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(false);
      expect(result.applicable).toBe(false);
      expect(result.nonApplicableReasons).toEqual(['action_not_matched'] as const);
    });

    it('T8: Empty resources array; resourceMatched=false, applicable=false', () => {
      const stmt = makeStatement({
        actions: ['*'],
        resources: [],
        conditions: {},
      });
      const req = makeRequest();
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(false);
      expect(result.applicable).toBe(false);
      expect(result.nonApplicableReasons).toEqual(['resource_not_matched'] as const);
    });

    it('T9: Condition dimension yields unsupported_feature; unsupportedFeatures non-empty, reason=unsupported_feature', () => {
      const stmt = makeStatement({
        actions: ['*'],
        resources: ['*'],
        conditions: { NumericLessThan: { 'aws:age': ['30'] } },
      });
      const req = makeRequest({
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::my-bucket/my-key',
        context: { 'aws:age': 25 },
      });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(true);
      expect(result.conditionMatched).toBe(false);
      expect(result.applicable).toBe(false);
      expect(result.nonApplicableReasons).toEqual(['unsupported_feature'] as const);
      expect(result.unsupportedFeatures.length).toBeGreaterThan(0);
    });

    it('T10: effect passthrough; effect=Deny correctly passed through', () => {
      const stmt = makeStatement({
        effect: 'Deny',
        actions: ['*'],
        resources: ['*'],
        conditions: {},
      });
      const req = makeRequest();
      const result = evaluateStatement(stmt, req);

      expect(result.effect).toBe('Deny');
      expect(result.applicable).toBe(true);
    });

    it('T11: statementId passthrough; statementId correctly passed through', () => {
      const stmt = makeStatement({
        statementId: 'unique-stmt-42',
        actions: ['*'],
        resources: ['*'],
        conditions: {},
      });
      const req = makeRequest();
      const result = evaluateStatement(stmt, req);

      expect(result.statementId).toBe('unique-stmt-42');
    });

    it('T12: Short-circuit when Action not matched; resourceMatched=false, conditionMatched=false', () => {
      const stmt = makeStatement({
        actions: ['s3:PutObject'],
        resources: ['*'],
        conditions: { StringEquals: { 'aws:username': ['alice'] } },
      });
      const req = makeRequest({
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::my-bucket/my-key',
        context: { 'aws:username': 'alice' },
      });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(false);
      expect(result.resourceMatched).toBe(false);
      expect(result.conditionMatched).toBe(false);
      expect(result.applicable).toBe(false);
    });

    it('T13: Short-circuit when Resource not matched; conditionMatched=false', () => {
      const stmt = makeStatement({
        actions: ['s3:Get*'],
        resources: ['arn:aws:s3:::other-bucket/*'],
        conditions: { StringEquals: { 'aws:username': ['alice'] } },
      });
      const req = makeRequest({
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::my-bucket/my-key',
        context: { 'aws:username': 'alice' },
      });
      const result = evaluateStatement(stmt, req);

      expect(result.actionMatched).toBe(true);
      expect(result.resourceMatched).toBe(false);
      expect(result.conditionMatched).toBe(false);
      expect(result.applicable).toBe(false);
    });

    it('T14: Batch helper evaluates each statement independently', () => {
      const stmts: readonly StandardStatement[] = [
        makeStatement({
          statementId: 'stmt-allow',
          effect: 'Allow',
          actions: ['s3:Get*'],
          resources: ['*'],
          conditions: {},
        }),
        makeStatement({
          statementId: 'stmt-deny',
          effect: 'Deny',
          actions: ['s3:Delete*'],
          resources: ['*'],
          conditions: {},
        }),
      ];
      const req = makeRequest({ action: 's3:GetObject' });
      const results = evaluateStatements(stmts, req);

      expect(results).toHaveLength(2);

      // First statement: action matches s3:Get*
      expect(results[0]!.actionMatched).toBe(true);
      expect(results[0]!.applicable).toBe(true);
      expect(results[0]!.effect).toBe('Allow');

      // Second statement: action does NOT match s3:Delete*
      expect(results[1]!.actionMatched).toBe(false);
      expect(results[1]!.applicable).toBe(false);
      expect(results[1]!.effect).toBe('Deny');
    });

    it('T15: Batch helper with empty statements array; returns empty array', () => {
      const req = makeRequest();
      const results = evaluateStatements([], req);

      expect(results).toEqual([]);
    });
  });
});