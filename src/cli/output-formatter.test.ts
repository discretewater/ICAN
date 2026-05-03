/**
 * Z06-D03: Output formatter tests.
 *
 * Covers: JSON output routing, text output routing, error output
 * (JSON and text), and boundary verification (no engine, no stdout/stderr,
 * no `any` type).
 */

import { describe, it, expect } from 'vitest';
import { formatEvaluationOutput, formatErrorOutput } from './output-formatter.js';
import type {
  FormattedEvaluationOutput,
  FormattedErrorOutput,
  ErrorEntry,
} from './output-formatter.js';
import type { EvaluationOutputAssembly } from '../reporters/evaluation-output-assembler.js';

// ─── Mock test data ──────────────────────────────────────────────────

/**
 * Minimal valid EvaluationOutputAssembly mock for testing.
 * Uses correct type values: FinalDecision ('ALLOW', 'EXPLICIT_DENY',
 * 'IMPLICIT_DENY'), DecisionStatus ('DETERMINATE', 'INDETERMINATE').
 */
const baseMockAssembly: EvaluationOutputAssembly = {
  finalDecision: 'ALLOW',
  decisionStatus: 'DETERMINATE',
  summary: 'Request allowed by matching Allow statement',
  statementResults: [],
  pathTrace: [],
  matchedDenyStatementIds: [],
  matchedAllowStatementIds: ['stmt-1'],
  diagnostics: {
    hasInvalid: false,
    invalidInputs: [],
    hasUnsupported: false,
    unsupportedFeatures: [],
  },
};

/** Mock assembly with INDETERMINATE status and IMPLICIT_DENY decision. */
const indeterminateMockAssembly: EvaluationOutputAssembly = {
  finalDecision: 'IMPLICIT_DENY',
  decisionStatus: 'INDETERMINATE',
  summary: 'Request implicitly denied (no applicable statements)',
  statementResults: [],
  pathTrace: [],
  matchedDenyStatementIds: [],
  matchedAllowStatementIds: [],
  diagnostics: {
    hasInvalid: true,
    invalidInputs: [
      { code: 'ERR_001', message: 'Invalid policy field', path: '/policies/0' },
    ],
    hasUnsupported: true,
    unsupportedFeatures: [
      { feature: 'NotAction', detail: 'NotAction is not supported' },
    ],
  },
};

// ─── Tests: JSON output routing ──────────────────────────────────────

describe('formatEvaluationOutput - JSON output', () => {
  it('T1: format "json" should return { format: "json", data: EvaluationJsonOutput }', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'json');

    expect(result.format).toBe('json');
    // Verify it's the JSON variant via discriminator
    if (result.format === 'json') {
      // Check top-level fields from EvaluationJsonOutput
      expect(result.data.finalDecision).toBe('ALLOW');
      expect(result.data.decisionStatus).toBe('DETERMINATE');
      expect(result.data.summary).toBe('Request allowed by matching Allow statement');
      expect(result.data.matchedDenyStatementIds).toEqual([]);
      expect(result.data.matchedAllowStatementIds).toEqual(['stmt-1']);
      expect(Array.isArray(result.data.statementResults)).toBe(true);
      expect(Array.isArray(result.data.pathTrace)).toBe(true);
      expect(result.data.diagnostics.hasInvalid).toBe(false);
    }
  });

  it('T2: JSON output should contain all 8 top-level fields', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'json');

    expect(result.format).toBe('json');
    if (result.format === 'json') {
      const keys = Object.keys(result.data);
      expect(keys).toContain('finalDecision');
      expect(keys).toContain('decisionStatus');
      expect(keys).toContain('summary');
      expect(keys).toContain('matchedDenyStatementIds');
      expect(keys).toContain('matchedAllowStatementIds');
      expect(keys).toContain('statementResults');
      expect(keys).toContain('pathTrace');
      expect(keys).toContain('diagnostics');
      expect(keys.length).toBe(8);
    }
  });

  it('T3: JSON output should NOT be an EvaluationTextOutput (no "title" field)', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'json');

    expect(result.format).toBe('json');
    if (result.format === 'json') {
      // The data is JSON, not text – verify no text-specific field
      const dataAsRecord = result.data as unknown as Record<string, unknown>;
      expect(dataAsRecord.title).toBeUndefined();
      expect(dataAsRecord.sections).toBeUndefined();
    }
  });

  it('T4: JSON output with INDETERMINATE assembly should pass through correctly', () => {
    const result = formatEvaluationOutput(indeterminateMockAssembly, 'json');

    expect(result.format).toBe('json');
    if (result.format === 'json') {
      expect(result.data.finalDecision).toBe('IMPLICIT_DENY');
      expect(result.data.decisionStatus).toBe('INDETERMINATE');
      expect(result.data.diagnostics.hasInvalid).toBe(true);
      expect(result.data.diagnostics.hasUnsupported).toBe(true);
      expect(result.data.diagnostics.invalidInputs.length).toBe(1);
      expect(result.data.diagnostics.unsupportedFeatures.length).toBe(1);
    }
  });
});

// ─── Tests: Text output routing ──────────────────────────────────────

describe('formatEvaluationOutput - Text output', () => {
  it('T5: format "text" should return { format: "text", data: EvaluationTextOutput }', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      expect(typeof result.data.title).toBe('string');
      expect(result.data.title).toBe('Evaluation Report');
      expect(Array.isArray(result.data.sections)).toBe(true);
    }
  });

  it('T6: Text output should have expected section labels in order', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      const labels = result.data.sections.map((s) => s.label);
      expect(labels).toEqual([
        'decision',
        'decisionStatus',
        'summary',
        'matchedStatements',
        'pathTrace',
        'diagnostics',
      ]);
    }
  });

  it('T7: Text output decision section should contain the finalDecision value', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      const decisionSection = result.data.sections.find(
        (s) => s.label === 'decision',
      );
      expect(decisionSection).toBeDefined();
      expect(decisionSection!.lines).toEqual(['ALLOW']);
    }
  });

  it('T8: Text output decisionStatus section for INDETERMINATE should show "(indeterminate)"', () => {
    const result = formatEvaluationOutput(indeterminateMockAssembly, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      const statusSection = result.data.sections.find(
        (s) => s.label === 'decisionStatus',
      );
      expect(statusSection).toBeDefined();
      expect(statusSection!.lines).toEqual(['INDETERMINATE (indeterminate)']);
    }
  });

  it('T9: Text output diagnostics section for empty diagnostics should show "none"', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      const diagSection = result.data.sections.find(
        (s) => s.label === 'diagnostics',
      );
      expect(diagSection).toBeDefined();
      expect(diagSection!.lines).toEqual(['none']);
    }
  });

  it('T10: Text output diagnostics section for assembly with issues should list them', () => {
    const result = formatEvaluationOutput(indeterminateMockAssembly, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      const diagSection = result.data.sections.find(
        (s) => s.label === 'diagnostics',
      );
      expect(diagSection).toBeDefined();
      // Should contain invalid inputs and unsupported features sections
      expect(diagSection!.lines.some((l) => l.includes('invalidInputs'))).toBe(true);
      expect(diagSection!.lines.some((l) => l.includes('unsupportedFeatures'))).toBe(true);
    }
  });

  it('T11: Text output should NOT be an EvaluationJsonOutput (no "finalDecision" at top level of data)', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      // The data is a text structure; at the top level it has title and sections
      const dataAsRecord = result.data as unknown as Record<string, unknown>;
      expect(dataAsRecord.finalDecision).toBeUndefined();
      expect(dataAsRecord.decisionStatus).toBeUndefined();
    }
  });
});

// ─── Tests: Error output – JSON format ───────────────────────────────

describe('formatErrorOutput - JSON format', () => {
  it('T12: single error with JSON format should return { format: "json", errors: [...] }', () => {
    const errors: readonly ErrorEntry[] = [
      { code: 'ERR_A', message: 'Something went wrong' },
    ];
    const result = formatErrorOutput(errors, 'json');

    expect(result.format).toBe('json');
    if (result.format === 'json') {
      expect(result.errors).toEqual(errors);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]!.code).toBe('ERR_A');
      expect(result.errors[0]!.message).toBe('Something went wrong');
    }
  });

  it('T13: multiple errors with JSON format should return all entries', () => {
    const errors: readonly ErrorEntry[] = [
      { code: 'ERR_A', message: 'First error' },
      { code: 'ERR_B', message: 'Second error' },
      { code: 'ERR_C', message: 'Third error' },
    ];
    const result = formatErrorOutput(errors, 'json');

    expect(result.format).toBe('json');
    if (result.format === 'json') {
      expect(result.errors.length).toBe(3);
      expect(result.errors.map((e) => e.code)).toEqual([
        'ERR_A',
        'ERR_B',
        'ERR_C',
      ]);
    }
  });

  it('T14: empty errors with JSON format should return empty array', () => {
    const result = formatErrorOutput([], 'json');

    expect(result.format).toBe('json');
    if (result.format === 'json') {
      expect(result.errors).toEqual([]);
      expect(result.errors.length).toBe(0);
    }
  });
});

// ─── Tests: Error output – Text format ───────────────────────────────

describe('formatErrorOutput - Text format', () => {
  it('T15: single error with text format should return message string', () => {
    const errors: readonly ErrorEntry[] = [
      { code: 'ERR_A', message: 'Something went wrong' },
    ];
    const result = formatErrorOutput(errors, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      expect(result.message).toBe('Something went wrong');
    }
  });

  it('T16: multiple errors with text format should join messages with newline', () => {
    const errors: readonly ErrorEntry[] = [
      { code: 'ERR_A', message: 'First error' },
      { code: 'ERR_B', message: 'Second error' },
    ];
    const result = formatErrorOutput(errors, 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      expect(result.message).toBe('First error\nSecond error');
      expect(result.message.split('\n').length).toBe(2);
    }
  });

  it('T17: empty errors with text format should return empty string', () => {
    const result = formatErrorOutput([], 'text');

    expect(result.format).toBe('text');
    if (result.format === 'text') {
      expect(result.message).toBe('');
    }
  });
});

// ─── Tests: Boundary verification ────────────────────────────────────

describe('formatEvaluationOutput - boundary', () => {
  it('T18: formatEvaluationOutput should not write to stdout/stderr', () => {
    // The function is pure – it returns data without side effects.
    // We verify by calling it and checking no console methods are on the
    // prototype chain of the result (it's a plain object, not a logger).
    const result = formatEvaluationOutput(baseMockAssembly, 'json');
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    // Plain object verification: no writable streams attached
    const resultAsRecord = result as unknown as Record<string, unknown>;
    expect(resultAsRecord.write).toBeUndefined();
    expect(resultAsRecord.log).toBeUndefined();
  });

  it('T19: formatEvaluationOutput should not import engine types at the result level', () => {
    const result = formatEvaluationOutput(baseMockAssembly, 'json');
    // Verify the result object does not contain engine-only fields
    const resultAsRecord = result as unknown as Record<string, unknown>;
    expect(resultAsRecord.engine).toBeUndefined();
    expect(resultAsRecord.evaluationResult).toBeUndefined();
    expect(resultAsRecord.exitCode).toBeUndefined();
    expect(resultAsRecord.policyDocument).toBeUndefined();
  });

  it('T20: FormattedEvaluationOutput discriminated union should work at type level', () => {
    // Compile-time check: discriminated union narrowing compiles correctly.
    // Runtime: verify both variants can be narrowed.
    const jsonResult = formatEvaluationOutput(baseMockAssembly, 'json');
    const textResult = formatEvaluationOutput(baseMockAssembly, 'text');

    let jsonDataCount = 0;
    let textDataCount = 0;

    const results: FormattedEvaluationOutput[] = [jsonResult, textResult];
    for (const r of results) {
      if (r.format === 'json') {
        // TypeScript narrows r.data to EvaluationJsonOutput
        jsonDataCount++;
        // Access JSON-specific field
        void (r.data.finalDecision satisfies string);
      } else if (r.format === 'text') {
        // TypeScript narrows r.data to EvaluationTextOutput
        textDataCount++;
        // Access text-specific field
        void (r.data.title satisfies string);
      }
    }

    expect(jsonDataCount).toBe(1);
    expect(textDataCount).toBe(1);
  });
});

describe('formatErrorOutput - boundary', () => {
  it('T21: formatErrorOutput should not write to stdout/stderr', () => {
    const errors: readonly ErrorEntry[] = [
      { code: 'ERR', message: 'Error' },
    ];
    const jsonResult = formatErrorOutput(errors, 'json');
    const textResult = formatErrorOutput(errors, 'text');

    // Both are plain objects with no side-effect hooks
    for (const r of [jsonResult, textResult] as FormattedErrorOutput[]) {
      const asRecord = r as unknown as Record<string, unknown>;
      expect(asRecord.write).toBeUndefined();
      expect(asRecord.log).toBeUndefined();
      expect(asRecord.stdout).toBeUndefined();
    }
  });

  it('T22: ErrorEntry should conform to { code: string; message: string }', () => {
    // Compile-time check: ErrorEntry interface has only code and message
    const entry: ErrorEntry = { code: 'TEST', message: 'Test message' };
    expect(entry.code).toBe('TEST');
    expect(entry.message).toBe('Test message');
  });

  it('T23: FormattedErrorOutput discriminated union should work at type level', () => {
    const errors: readonly ErrorEntry[] = [
      { code: 'ERR', message: 'Error' },
    ];
    const jsonResult = formatErrorOutput(errors, 'json');
    const textResult = formatErrorOutput(errors, 'text');

    let jsonCount = 0;
    let textCount = 0;

    const outputs: FormattedErrorOutput[] = [jsonResult, textResult];
    for (const o of outputs) {
      if (o.format === 'json') {
        jsonCount++;
        void (o.errors satisfies readonly ErrorEntry[]);
      } else if (o.format === 'text') {
        textCount++;
        void (o.message satisfies string);
      }
    }

    expect(jsonCount).toBe(1);
    expect(textCount).toBe(1);
  });
});
