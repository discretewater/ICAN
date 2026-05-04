/**
 * Z07-D02 / Z07-D03: Actual fixtures structural integrity tests.
 *
 * Verifies that the minimal actual fixtures created in
 * test-fixtures/cases/ are structurally correct:
 * - All 6 expected case directories exist
 * - Each case has a metadata.json with required fields
 * - Each non-invalid case has valid policy JSON files
 * - Each case has a request.json
 * - Golden output files exist (generated in D03)
 * - All cases are marked as synthetic (no real-world samples)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ─── Constants ──────────────────────────────────────────────────────

const FIXTURES_ROOT = join(import.meta.dirname, '..', '..', 'test-fixtures', 'cases');

const EXPECTED_CASES = [
  'allow-basic',
  'explicit-deny-basic',
  'implicit-deny-basic',
  'indeterminate-unsupported-condition',
  'invalid-policy-json',
  'multi-policy-precedence',
] as const;

const REQUIRED_METADATA_FIELDS = [
  'id',
  'category',
  'purpose',
  'source',
  'goldenOutputDeferred',
] as const;

// ─── Helpers ────────────────────────────────────────────────────────

function caseDir(name: string): string {
  return join(FIXTURES_ROOT, name);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

// ─── Tests: Directory structure ──────────────────────────────────────

describe('Z07-D02 fixtures – directory structure', () => {
  it('T1: test-fixtures/cases/ directory exists', () => {
    expect(isDirectory(FIXTURES_ROOT)).toBe(true);
  });

  for (const caseName of EXPECTED_CASES) {
    it(`T2-${caseName}: case directory exists`, () => {
      expect(isDirectory(caseDir(caseName))).toBe(true);
    });

    it(`T3-${caseName}: policies/ directory exists`, () => {
      expect(isDirectory(join(caseDir(caseName), 'policies'))).toBe(true);
    });
  }
});

// ─── Tests: request.json ─────────────────────────────────────────────

describe('Z07-D02 fixtures – request.json', () => {
  for (const caseName of EXPECTED_CASES) {
    it(`T4-${caseName}: request.json exists`, () => {
      const path = join(caseDir(caseName), 'request.json');
      expect(existsSync(path)).toBe(true);
    });

    it(`T5-${caseName}: request.json is valid JSON`, () => {
      const path = join(caseDir(caseName), 'request.json');
      expect(() => readJson(path)).not.toThrow();
    });
  }
});

// ─── Tests: metadata.json ────────────────────────────────────────────

describe('Z07-D02 fixtures – metadata.json', () => {
  for (const caseName of EXPECTED_CASES) {
    it(`T6-${caseName}: metadata.json exists`, () => {
      const path = join(caseDir(caseName), 'metadata.json');
      expect(existsSync(path)).toBe(true);
    });

    it(`T7-${caseName}: metadata.json is valid JSON`, () => {
      const path = join(caseDir(caseName), 'metadata.json');
      expect(() => readJson(path)).not.toThrow();
    });

    it(`T8-${caseName}: metadata has required fields`, () => {
      const path = join(caseDir(caseName), 'metadata.json');
      const meta = readJson(path) as Record<string, unknown>;
      for (const field of REQUIRED_METADATA_FIELDS) {
        expect(meta).toHaveProperty(field);
      }
    });

    it(`T9-${caseName}: metadata source is "synthetic"`, () => {
      const path = join(caseDir(caseName), 'metadata.json');
      const meta = readJson(path) as Record<string, unknown>;
      expect(meta.source).toBe('synthetic');
    });

    it(`T10-${caseName}: metadata goldenOutputDeferred is false (golden outputs generated in D03)`, () => {
      const path = join(caseDir(caseName), 'metadata.json');
      const meta = readJson(path) as Record<string, unknown>;
      expect(meta.goldenOutputDeferred).toBe(false);
    });
  }
});

// ─── Tests: Golden output files exist (D03) ──────────────────────────
//
// Replaces the Z07-D02 "no golden output" check; now that D03 has
// produced golden outputs, we verify the three expected files exist
// per case.

const EXPECTED_GOLDEN_FILES = [
  'expected.json',
  'expected.txt',
  'expected-exit-code.txt',
] as const;

describe('Z07-D03 fixtures – golden output files exist', () => {
  for (const caseName of EXPECTED_CASES) {
    it(`T11-${caseName}: expected/ directory exists`, () => {
      const expectedDir = join(caseDir(caseName), 'expected');
      expect(existsSync(expectedDir)).toBe(true);
    });

    for (const goldenFile of EXPECTED_GOLDEN_FILES) {
      it(`T11-${caseName}-${goldenFile}: ${goldenFile} exists`, () => {
        const path = join(caseDir(caseName), 'expected', goldenFile);
        expect(existsSync(path)).toBe(true);
      });
    }
  }
});

// ─── Tests: Policy files (non-invalid cases only) ────────────────────

describe('Z07-D02 fixtures – policy files (syntactically valid)', () => {
  const validCases = EXPECTED_CASES.filter((c) => c !== 'invalid-policy-json');

  for (const caseName of validCases) {
    it(`T12-${caseName}: at least one policy file exists`, () => {
      const policiesDir = join(caseDir(caseName), 'policies');
      const files = readdirSync(policiesDir).filter((f) => f.endsWith('.json'));
      expect(files.length).toBeGreaterThan(0);
    });

    it(`T13-${caseName}: all policy files are valid JSON`, () => {
      const policiesDir = join(caseDir(caseName), 'policies');
      const files = readdirSync(policiesDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const path = join(policiesDir, file);
        expect(() => readJson(path)).not.toThrow();
      }
    });
  }

  it('T14-invalid: invalid-policy-json has a policy file (even if malformed JSON)', () => {
    const policiesDir = join(caseDir('invalid-policy-json'), 'policies');
    const files = readdirSync(policiesDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
  });
});
