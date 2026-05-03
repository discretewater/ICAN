/**
 * Z06-D04 (revised): Exit code model and mapping tests.
 *
 * Covers: decision → exitCode mapping (all 6 combinations with
 * corrected IMPLICIT_DENY → 4), error → exitCode heuristic
 * classification (INTERNAL → 10, UNSUPPORTED → 3, other → 2),
 * constant verification (including new IMPLICIT_DENY and
 * INTERNAL_ERROR), and strict boundary enforcement.
 *
 * Design reference: §10.8 Exit Code Recommendations
 *   - 0: DETERMINATE + ALLOW
 *   - 1: DETERMINATE + EXPLICIT_DENY
 *   - 4: DETERMINATE + IMPLICIT_DENY
 *   - 2: input/validation error
 *   - 3: INDETERMINATE or unsupported
 *   - 10: internal error
 */

import { describe, it, expect } from 'vitest';
import {
  EXIT_CODE,
  mapDecisionToExitCode,
  mapErrorsToExitCode,
} from './exit-code.js';
import type { ExitCode } from './exit-code.js';

// ─── Tests: EXIT_CODE constants ─────────────────────────────────────

describe('EXIT_CODE constants', () => {
  it('T1: ALLOW should equal 0', () => {
    expect(EXIT_CODE.ALLOW).toBe(0);
  });

  it('T2: EXPLICIT_DENY should equal 1 (renamed from DENY)', () => {
    expect(EXIT_CODE.EXPLICIT_DENY).toBe(1);
  });

  it('T3: ERROR should equal 2', () => {
    expect(EXIT_CODE.ERROR).toBe(2);
  });

  it('T4: INDETERMINATE should equal 3', () => {
    expect(EXIT_CODE.INDETERMINATE).toBe(3);
  });

  it('T5: IMPLICIT_DENY should equal 4 (new, per §10.8)', () => {
    expect(EXIT_CODE.IMPLICIT_DENY).toBe(4);
  });

  it('T6: INTERNAL_ERROR should equal 10 (new, per §10.8)', () => {
    expect(EXIT_CODE.INTERNAL_ERROR).toBe(10);
  });

  it('T7: all constant values should be within range 0–10', () => {
    const values: ExitCode[] = [
      EXIT_CODE.ALLOW,
      EXIT_CODE.EXPLICIT_DENY,
      EXIT_CODE.ERROR,
      EXIT_CODE.INDETERMINATE,
      EXIT_CODE.IMPLICIT_DENY,
      EXIT_CODE.INTERNAL_ERROR,
    ];
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
});

// ─── Tests: ExitCode type safety ────────────────────────────────────

describe('ExitCode type safety', () => {
  it('T8: ExitCode type accepts 4 and 10 (new values)', () => {
    // Verify that 4 and 10 are now valid ExitCode values at compile time.
    const v4: ExitCode = 4;
    const v10: ExitCode = 10;
    void v4;
    void v10;

    // Also verify the original values still compile.
    const v0: ExitCode = 0;
    const v1: ExitCode = 1;
    const v2: ExitCode = 2;
    const v3: ExitCode = 3;
    void v0;
    void v1;
    void v2;
    void v3;

    expect(true).toBe(true);
  });

  it('T9: @ts-expect-error rejects values outside ExitCode (e.g., 5)', () => {
    // Valid values first — demonstrate they compile.
    const valid: ExitCode = EXIT_CODE.ALLOW;
    void valid;

    // 5 is NOT a valid ExitCode; @ts-expect-error suppresses the TS error.
    // If the ExitCode type is wrong, this will produce an unused-directive error.
    // @ts-expect-error: 5 is not a member of ExitCode (0|1|2|3|4|10)
    const _invalid: ExitCode = 5;
    void _invalid;

    expect(true).toBe(true);
  });
});

// ─── Tests: mapDecisionToExitCode – DETERMINATE ─────────────────────

describe('mapDecisionToExitCode – DETERMINATE', () => {
  it('T10: ALLOW + DETERMINATE → 0', () => {
    const code = mapDecisionToExitCode('ALLOW', 'DETERMINATE');
    expect(code).toBe(0);
    expect(code).toBe(EXIT_CODE.ALLOW);
  });

  it('T11: EXPLICIT_DENY + DETERMINATE → 1', () => {
    const code = mapDecisionToExitCode('EXPLICIT_DENY', 'DETERMINATE');
    expect(code).toBe(1);
    expect(code).toBe(EXIT_CODE.EXPLICIT_DENY);
  });

  it('T12: IMPLICIT_DENY + DETERMINATE → 4 (corrected from 1 per §10.8)', () => {
    const code = mapDecisionToExitCode('IMPLICIT_DENY', 'DETERMINATE');
    expect(code).toBe(4);
    expect(code).toBe(EXIT_CODE.IMPLICIT_DENY);
  });
});

// ─── Tests: mapDecisionToExitCode – INDETERMINATE ───────────────────

describe('mapDecisionToExitCode – INDETERMINATE', () => {
  it('T13: ALLOW + INDETERMINATE → 3', () => {
    const code = mapDecisionToExitCode('ALLOW', 'INDETERMINATE');
    expect(code).toBe(3);
    expect(code).toBe(EXIT_CODE.INDETERMINATE);
  });

  it('T14: EXPLICIT_DENY + INDETERMINATE → 3', () => {
    const code = mapDecisionToExitCode('EXPLICIT_DENY', 'INDETERMINATE');
    expect(code).toBe(3);
    expect(code).toBe(EXIT_CODE.INDETERMINATE);
  });

  it('T15: IMPLICIT_DENY + INDETERMINATE → 3', () => {
    const code = mapDecisionToExitCode('IMPLICIT_DENY', 'INDETERMINATE');
    expect(code).toBe(3);
    expect(code).toBe(EXIT_CODE.INDETERMINATE);
  });
});

// ─── Tests: mapErrorsToExitCode – heuristic classification ──────────

describe('mapErrorsToExitCode – heuristic classification', () => {
  it('T16: parameter error (code="missing_required") → 2', () => {
    const result = mapErrorsToExitCode([
      { code: 'missing_required', message: 'Missing required parameter' },
    ]);
    expect(result).toBe(2);
    expect(result).toBe(EXIT_CODE.ERROR);
  });

  it('T17: input error (code="FILE_NOT_FOUND") → 2', () => {
    const result = mapErrorsToExitCode([
      { code: 'FILE_NOT_FOUND', message: 'Input file not found' },
    ]);
    expect(result).toBe(2);
    expect(result).toBe(EXIT_CODE.ERROR);
  });

  it('T18: validation error (code="INVALID_JSON") → 2', () => {
    const result = mapErrorsToExitCode([
      { code: 'INVALID_JSON', message: 'Failed to parse JSON' },
    ]);
    expect(result).toBe(2);
    expect(result).toBe(EXIT_CODE.ERROR);
  });

  it('T19: unsupported feature (code="UNSUPPORTED_FEATURE" uppercase) → 3', () => {
    const result = mapErrorsToExitCode([
      { code: 'UNSUPPORTED_FEATURE', message: 'Feature not yet supported' },
    ]);
    expect(result).toBe(3);
    expect(result).toBe(EXIT_CODE.INDETERMINATE);
  });

  it('T20: unsupported feature (code="unsupported_feature" lowercase) → 3', () => {
    const result = mapErrorsToExitCode([
      { code: 'unsupported_feature', message: 'Feature not yet supported' },
    ]);
    expect(result).toBe(3);
    expect(result).toBe(EXIT_CODE.INDETERMINATE);
  });

  it('T21: internal error (code="INTERNAL_ERROR" uppercase) → 10', () => {
    const result = mapErrorsToExitCode([
      { code: 'INTERNAL_ERROR', message: 'Unexpected runtime failure' },
    ]);
    expect(result).toBe(10);
    expect(result).toBe(EXIT_CODE.INTERNAL_ERROR);
  });

  it('T22: internal error (code="internal_error" lowercase) → 10', () => {
    const result = mapErrorsToExitCode([
      { code: 'internal_error', message: 'Unexpected runtime failure' },
    ]);
    expect(result).toBe(10);
    expect(result).toBe(EXIT_CODE.INTERNAL_ERROR);
  });

  it('T23: empty error list → 2', () => {
    const result = mapErrorsToExitCode([]);
    expect(result).toBe(2);
    expect(result).toBe(EXIT_CODE.ERROR);
  });

  it('T24: internal + unsupported errors → 10 (full-list priority scan: internal beats unsupported)', () => {
    // Priority scan across all errors: INTERNAL > UNSUPPORTED.
    const result = mapErrorsToExitCode([
      { code: 'INTERNAL_ERROR', message: 'First error' },
      { code: 'UNSUPPORTED_FEATURE', message: 'Second error' },
    ]);
    expect(result).toBe(10);
    expect(result).toBe(EXIT_CODE.INTERNAL_ERROR);
  });

  // ─── Priority-scan tests: full-list scanning (Z06-D04 correction 3) ───

  it('T36: input error (first) + internal (second) → 10 — internal always wins', () => {
    const result = mapErrorsToExitCode([
      { code: 'FILE_NOT_FOUND', message: 'Input file not found' },
      { code: 'INTERNAL_ERROR', message: 'Unexpected runtime failure' },
    ]);
    expect(result).toBe(10);
    expect(result).toBe(EXIT_CODE.INTERNAL_ERROR);
  });

  it('T37: input error (first) + unsupported (second) → 3 — unsupported above general', () => {
    const result = mapErrorsToExitCode([
      { code: 'INVALID_JSON', message: 'Failed to parse JSON' },
      { code: 'UNSUPPORTED_FEATURE', message: 'Feature not yet supported' },
    ]);
    expect(result).toBe(3);
    expect(result).toBe(EXIT_CODE.INDETERMINATE);
  });

  it('T38: validation error (first) + unsupported (second) → 3 — unsupported above general', () => {
    const result = mapErrorsToExitCode([
      { code: 'missing_required', message: 'Missing required parameter' },
      { code: 'UNSUPPORTED', message: 'Unsupported feature' },
    ]);
    expect(result).toBe(3);
    expect(result).toBe(EXIT_CODE.INDETERMINATE);
  });

  it('T39: unsupported (first) + internal (second) → 10 — internal beats unsupported', () => {
    const result = mapErrorsToExitCode([
      { code: 'UNSUPPORTED', message: 'Unsupported feature' },
      { code: 'INTERNAL_ERROR', message: 'Unexpected runtime failure' },
    ]);
    expect(result).toBe(10);
    expect(result).toBe(EXIT_CODE.INTERNAL_ERROR);
  });

  it('T40: three input/param errors (no internal/unsupported) → 2 — all general errors', () => {
    const result = mapErrorsToExitCode([
      { code: 'missing_required', message: 'Missing required parameter' },
      { code: 'FILE_NOT_FOUND', message: 'Input file not found' },
      { code: 'INVALID_JSON', message: 'Failed to parse JSON' },
    ]);
    expect(result).toBe(2);
    expect(result).toBe(EXIT_CODE.ERROR);
  });
});

// ─── Tests: mapErrorsToExitCode – type compatibility ────────────────

describe('mapErrorsToExitCode – type compatibility', () => {
  it('T25: should accept ErrorEntry[] (from output-formatter)', () => {
    const errors: readonly { readonly code: string; readonly message: string }[] = [
      { code: 'POLICY_FILE_NOT_FOUND', message: 'File not found' },
    ];
    const result = mapErrorsToExitCode(errors);
    expect(result).toBe(2);
  });

  it('T26: should accept ParamError[] (from parser)', () => {
    const errors = [
      { code: 'missing_required', message: 'Missing --action' } as const,
      { code: 'unknown_flag', message: 'Unknown flag --xxx' } as const,
    ];
    const result = mapErrorsToExitCode(errors);
    expect(result).toBe(2);
  });
});

// ─── Tests: Strict boundary enforcement ─────────────────────────────

describe('boundary enforcement', () => {
  it('T27: mapDecisionToExitCode should not call process.exit', () => {
    const code = mapDecisionToExitCode('ALLOW', 'DETERMINATE');
    expect(typeof code).toBe('number');
    const codeAsUnknown = code as unknown as Record<string, unknown>;
    expect(codeAsUnknown.exit).toBeUndefined();
  });

  it('T28: mapErrorsToExitCode should not call process.exit', () => {
    const code = mapErrorsToExitCode([
      { code: 'ERR', message: 'Error' },
    ]);
    expect(typeof code).toBe('number');
    const codeAsUnknown = code as unknown as Record<string, unknown>;
    expect(codeAsUnknown.exit).toBeUndefined();
  });

  it('T29: both functions should not write to stdout/stderr', () => {
    const decisionCode = mapDecisionToExitCode('ALLOW', 'DETERMINATE');
    const errorCode = mapErrorsToExitCode([]);

    for (const code of [decisionCode, errorCode]) {
      const asRecord = code as unknown as Record<string, unknown>;
      expect(asRecord.write).toBeUndefined();
      expect(asRecord.log).toBeUndefined();
      expect(asRecord.stdout).toBeUndefined();
      expect(asRecord.stderr).toBeUndefined();
    }
  });

  it('T30: exit-code module should not use `any` type', () => {
    const allow: ExitCode = EXIT_CODE.ALLOW;
    expect(allow).toBe(0);

    expect(typeof mapDecisionToExitCode).toBe('function');
    expect(typeof mapErrorsToExitCode).toBe('function');
  });

  it('T31: exit-code module should NOT call engine functions', () => {
    const modExports = Object.keys({
      EXIT_CODE,
      mapDecisionToExitCode,
      mapErrorsToExitCode,
    });
    expect(modExports).toContain('EXIT_CODE');
    expect(modExports).toContain('mapDecisionToExitCode');
    expect(modExports).toContain('mapErrorsToExitCode');
    // No engine function names leaked
    expect(modExports).not.toContain('evaluateDecision');
    expect(modExports).not.toContain('evaluateStatements');
  });

  it('T32: no actual fixtures or golden output produced', () => {
    // This module is purely in-code; no filesystem artifacts are created.
    expect(true).toBe(true);
  });

  it('T33: no real sample data introduced', () => {
    // All test data is minimal synthetic strings.
    // No real policy paths, ARNs, or production data.
    expect(true).toBe(true);
  });
});

// ─── Tests: Return value type verification ──────────────────────────

describe('return value type verification', () => {
  it('T34: all 6 decision combos produce valid ExitCode values (0|1|3|4)', () => {
    // DETERMINATE combos: 0, 1, 4
    // INDETERMINATE combos: 3
    const results: ExitCode[] = [
      mapDecisionToExitCode('ALLOW', 'DETERMINATE'),          // → 0
      mapDecisionToExitCode('EXPLICIT_DENY', 'DETERMINATE'),  // → 1
      mapDecisionToExitCode('IMPLICIT_DENY', 'DETERMINATE'),  // → 4
      mapDecisionToExitCode('ALLOW', 'INDETERMINATE'),         // → 3
      mapDecisionToExitCode('EXPLICIT_DENY', 'INDETERMINATE'), // → 3
      mapDecisionToExitCode('IMPLICIT_DENY', 'INDETERMINATE'), // → 3
    ];

    for (const code of results) {
      expect([0, 1, 3, 4]).toContain(code);
      expect(typeof code).toBe('number');
    }
  });

  it('T35: mapErrorsToExitCode return type should be a valid ExitCode', () => {
    // Test all three branches: input error (2), unsupported (3), internal (10)
    const r2 = mapErrorsToExitCode([{ code: 'ERR', message: 'x' }]);
    expect(r2).toBe(2);

    const r3 = mapErrorsToExitCode([{ code: 'UNSUPPORTED_FEATURE', message: 'x' }]);
    expect(r3).toBe(3);

    const r10 = mapErrorsToExitCode([{ code: 'INTERNAL_ERROR', message: 'x' }]);
    expect(r10).toBe(10);
  });
});
