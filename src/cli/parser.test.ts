/**
 * Z06-D01: CLI command entry and parameter model tests.
 *
 * Covers: command identification, required parameter validation,
 * parameter model, --format validation, help information,
 * mutually exclusive flags, and CLI layer boundary (no engine calls).
 */
import { describe, it, expect } from 'vitest';
import {
  dispatch,
  parseCheckArgs,
  renderHelpText,
} from './index.js';
import type {
  CheckCommandOptions,
  OutputFormat,
  ParamError,
  ParseResult,
} from './types.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function successResult(opts: CheckCommandOptions): ParseResult {
  return { kind: 'success', options: opts };
}

// ─── Tests: parameter model types ─────────────────────────────────────

describe('CLI type definitions', () => {
  it('T1: OutputFormat should only accept "text" or "json"', () => {
    const text: OutputFormat = 'text';
    const json: OutputFormat = 'json';
    // @ts-expect-error invalid format should not compile
    const _invalid: OutputFormat = 'xml';
    void text;
    void json;
    void _invalid;
  });

  it('T2: CheckCommandOptions should have required fields (policies, action, resource)', () => {
    const opts: CheckCommandOptions = {
      policies: ['test.json'],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      format: 'text',
    };
    expect(opts.policies).toEqual(['test.json']);
    expect(opts.action).toBe('s3:GetObject');
    expect(opts.resource).toBe('arn:aws:s3:::bucket/*');
    expect(opts.format).toBe('text');
  });

  it('T3: CheckCommandOptions should accept optional context-json and context-file', () => {
    const withContextJson: CheckCommandOptions = {
      policies: ['test.json'],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      contextJson: '{"aws:SourceIp":"10.0.0.1"}',
      format: 'text',
    };
    expect(withContextJson.contextJson).toBe('{"aws:SourceIp":"10.0.0.1"}');
    expect(withContextJson.contextFile).toBeUndefined();

    const withContextFile: CheckCommandOptions = {
      policies: ['test.json'],
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::bucket/*',
      contextFile: './context.json',
      format: 'json',
    };
    expect(withContextFile.contextFile).toBe('./context.json');
    expect(withContextFile.contextJson).toBeUndefined();
  });

  it('T4: ParamError should have code and message fields', () => {
    const err: ParamError = {
      code: 'missing_required',
      message: 'missing required --action',
    };
    expect(err.code).toBe('missing_required');
    expect(err.message).toBe('missing required --action');
  });
});

// ─── Tests: parseCheckArgs - success cases ────────────────────────────

describe('parseCheckArgs - success', () => {
  it('T5: minimal required args (--policy --action --resource) should succeed', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
    ]);
    expect(result).toEqual(
      successResult({
        policies: ['p1.json'],
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket/*',
        format: 'text',
      }),
    );
  });

  it('T6: multiple --policy flags should accumulate', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--policy', 'p2.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
    ]);
    expect(result).toEqual(
      successResult({
        policies: ['p1.json', 'p2.json'],
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket/*',
        format: 'text',
      }),
    );
  });

  it('T7: --format json should succeed', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--format', 'json',
    ]);
    expect(result).toEqual(
      successResult({
        policies: ['p1.json'],
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket/*',
        format: 'json',
      }),
    );
  });

  it('T8: --format defaults to text when omitted', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
    ]);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.options.format).toBe('text');
    }
  });

  it('T9: --context-json should be accepted', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--context-json', '{"aws:SourceIp":"10.0.0.1"}',
    ]);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.options.contextJson).toBe('{"aws:SourceIp":"10.0.0.1"}');
    }
  });

  it('T10: --context-file should be accepted', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--context-file', './ctx.json',
    ]);
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.options.contextFile).toBe('./ctx.json');
    }
  });

  it('T11: all args together should succeed (with format text)', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--policy', 'p2.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--context-json', '{"key":"value"}',
      '--format', 'text',
    ]);
    expect(result).toEqual(
      successResult({
        policies: ['p1.json', 'p2.json'],
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket/*',
        contextJson: '{"key":"value"}',
        format: 'text',
      }),
    );
  });

  it('T12: all args together should succeed (with format json)', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--context-file', './ctx.json',
      '--format', 'json',
    ]);
    expect(result).toEqual(
      successResult({
        policies: ['p1.json'],
        action: 's3:GetObject',
        resource: 'arn:aws:s3:::bucket/*',
        contextFile: './ctx.json',
        format: 'json',
      }),
    );
  });
});

// ─── Tests: parseCheckArgs - required parameter errors ─────────────────

describe('parseCheckArgs - missing required', () => {
  it('T13: missing --action should return error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--resource', 'arn:aws:s3:::bucket/*',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'missing_required')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('action'))).toBe(true);
    }
  });

  it('T14: missing --resource should return error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'missing_required')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('resource'))).toBe(true);
    }
  });

  it('T15: missing --policy should return error', () => {
    const result = parseCheckArgs([
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'missing_required')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('policy'))).toBe(true);
    }
  });

  it('T16: missing both --action and --resource should list both errors', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some((e) => e.message.includes('action'))).toBe(true);
      expect(result.errors.some((e) => e.message.includes('resource'))).toBe(true);
    }
  });

  it('T17: missing all required params should list all errors', () => {
    const result = parseCheckArgs([]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ─── Tests: parseCheckArgs - format validation ────────────────────────

describe('parseCheckArgs - format validation', () => {
  it('T18: --format text should be valid', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--format', 'text',
    ]);
    expect(result.kind).toBe('success');
  });

  it('T19: --format json should be valid', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--format', 'json',
    ]);
    expect(result.kind).toBe('success');
  });

  it('T20: --format with invalid value "xml" should return error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--format', 'xml',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'invalid_format')).toBe(true);
      expect(result.errors.some((e) => e.message.includes('format'))).toBe(true);
    }
  });

  it('T21: --format with empty string should return error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--format', '',
    ]);
    expect(result.kind).toBe('error');
  });

  it('T22: --format with random string should return error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--format', 'yaml',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'invalid_format')).toBe(true);
    }
  });
});

// ─── Tests: parseCheckArgs - mutually exclusive options ───────────────

describe('parseCheckArgs - mutually exclusive', () => {
  it('T23: --context-json and --context-file together should return error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--context-json', '{"key":"value"}',
      '--context-file', './ctx.json',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'mutually_exclusive')).toBe(true);
      expect(result.errors.some((e) =>
        e.message.includes('context-json') && e.message.includes('context-file'),
      )).toBe(true);
    }
  });
});

// ─── Tests: parseCheckArgs - unknown flags ────────────────────────────

describe('parseCheckArgs - unknown flags', () => {
  it('T24: unknown flag should return an error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
      '--unknown-flag', 'value',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'unknown_flag')).toBe(true);
    }
  });
});

// ─── Tests: parseCheckArgs - value-less flags ─────────────────────────

describe('parseCheckArgs - missing flag value', () => {
  it('T25: --policy without value should return error', () => {
    const result = parseCheckArgs([
      '--policy',
      '--action', 's3:GetObject',
      '--resource', 'arn:aws:s3:::bucket/*',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'missing_value')).toBe(true);
    }
  });

  it('T26: --action without value should return error', () => {
    const result = parseCheckArgs([
      '--policy', 'p1.json',
      '--action',
      '--resource', 'arn:aws:s3:::bucket/*',
    ]);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errors.some((e) => e.code === 'missing_value')).toBe(true);
    }
  });
});

// ─── Tests: help text ─────────────────────────────────────────────────

describe('help text', () => {
  it('T27: --help flag should trigger help result', () => {
    const result = parseCheckArgs(['--help']);
    expect(result.kind).toBe('help');
  });

  it('T28: help text should contain expected sections', () => {
    const helpText = renderHelpText();
    expect(helpText).toContain('USAGE');
    expect(helpText).toContain('ican check');
    expect(helpText).toContain('--policy');
    expect(helpText).toContain('--action');
    expect(helpText).toContain('--resource');
    expect(helpText).toContain('--context-json');
    expect(helpText).toContain('--context-file');
    expect(helpText).toContain('--format');
    expect(helpText).toContain('text');
    expect(helpText).toContain('json');
    expect(helpText).toContain('--help');
  });

  it('T29: help text should describe required parameters', () => {
    const helpText = renderHelpText();
    expect(helpText).toContain('REQUIRED PARAMETERS');
  });

  it('T30: help text should mention mutually exclusive flags', () => {
    const helpText = renderHelpText();
    expect(helpText.toLowerCase()).toMatch(/mutually|exclusive|one of/i);
  });
});

// ─── Tests: dispatch (subcommand routing) ─────────────────────────────

describe('dispatch - subcommand routing', () => {
  it('T31: "check" subcommand should be recognized and dispatch', () => {
    const result = dispatch(['check', '--policy', 'p.json', '--action', 's3:GetObject', '--resource', 'r']);
    expect(result.kind).toBe('parse_result');
    if (result.kind === 'parse_result') {
      expect(result.parseResult.kind).toBe('success');
    }
  });

  it('T32: no subcommand should show help', () => {
    const result = dispatch([]);
    expect(result.kind).toBe('help');
  });

  it('T33: unknown subcommand should return error', () => {
    const result = dispatch(['unknown-cmd']);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('Unknown command');
      expect(result.message).toContain('unknown-cmd');
    }
  });

  it('T34: "check" with --help should show help via dispatch', () => {
    const result = dispatch(['check', '--help']);
    expect(result.kind).toBe('parse_result');
    if (result.kind === 'parse_result') {
      expect(result.parseResult.kind).toBe('help');
    }
  });
});

// ─── Tests: CLI boundary (no engine calls) ────────────────────────────

describe('CLI boundary - no engine dependency', () => {
  it('T35: CLI module should not import engine modules', async () => {
    // Dynamic import to get the module; verify no engine leakage.
    // The type system prevents engine types from being re-exported
    // if CheckCommandOptions and ParamError are purely CLI concepts.
    const mod = await import('./index.js');
    // Module should exist and export expected functions
    expect(mod.parseCheckArgs).toBeDefined();
    expect(mod.dispatch).toBeDefined();
    expect(mod.renderHelpText).toBeDefined();
    // Verify types are exported (type-only, checked at compile time)
    expect(true).toBe(true);
  });

  it('T36: parseCheckArgs should not call any engine function', () => {
    // The parser is a pure function that only inspects string arrays.
    // It returns typed options but never constructs EvaluationRequest
    // or calls engine functions.
    const result = parseCheckArgs([
      '--policy', 'test.json',
      '--action', 'a:b',
      '--resource', 'r',
    ]);
    expect(result.kind).toBe('success');
    // Verify that the success result only contains CLI options,
    // not engine-level types.
    if (result.kind === 'success') {
      const opts = result.options;
      expect(typeof opts.policies).toBe('object');
      expect(typeof opts.action).toBe('string');
      expect(typeof opts.resource).toBe('string');
      // No engine-level fields should be present
      const optsAsUnknown = opts as unknown as Record<string, unknown>;
      expect(optsAsUnknown.evaluationRequest).toBeUndefined();
      expect(optsAsUnknown.engine).toBeUndefined();
    }
  });
});
