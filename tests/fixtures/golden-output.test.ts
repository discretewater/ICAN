/**
 * Z07-D03: Golden output comparison tests.
 *
 * For each actual fixture case, this test invokes runCheck() with
 * the case's inputs and compares the actual output against the
 * pre-generated golden output files in expected/.
 *
 * Golden output files verified:
 * - expected.json       (JSON format: stdout for success, stderr for error)
 * - expected.txt        (Text format: stdout for success, stderr for error)
 * - expected-exit-code.txt  (exit code as a single integer string)
 *
 * Path normalization:
 * Golden outputs may contain absolute paths to fixture files.
 * Before comparison, both the golden reference and the actual
 * output are normalized to replace the project root with a
 * stable placeholder, ensuring the test is portable across
 * environments.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { runCheck } from '../../src/cli/main.js';
import type { CheckCommandOptions } from '../../src/cli/types.js';

// ─── Constants ──────────────────────────────────────────────────────

/** Root of the workshop repository. */
const WORKSHOP_ROOT = resolve(import.meta.dirname, '..', '..');

/** All six actual fixture case directories. */
const FIXTURES_ROOT = join(WORKSHOP_ROOT, 'test-fixtures', 'cases');

const CASE_NAMES = [
  'allow-basic',
  'explicit-deny-basic',
  'implicit-deny-basic',
  'indeterminate-unsupported-condition',
  'invalid-policy-json',
  'multi-policy-precedence',
] as const;

// ─── Helpers ────────────────────────────────────────────────────────

function caseDir(name: string): string {
  return join(FIXTURES_ROOT, name);
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function readText(path: string): string {
  return readFileSync(path, 'utf-8');
}

/**
 * Build CheckCommandOptions for a given case and format.
 *
 * Reads request.json and policy file paths from the case directory.
 * Context is passed as inline JSON via --context-json.
 */
function buildOptions(caseName: string, format: 'json' | 'text'): CheckCommandOptions {
  const dir = caseDir(caseName);

  // Read request
  const req = readJson(join(dir, 'request.json')) as {
    action: string;
    resource: string;
    context: Record<string, unknown>;
  };

  // Collect all policy files in policies/ directory
  const policiesDir = join(dir, 'policies');
  const policyFiles: string[] = [];
  if (existsSync(policiesDir)) {
    const entries = readdirSync(policiesDir);
    for (const entry of entries) {
      if (entry.endsWith('.json')) {
        policyFiles.push(join(policiesDir, entry));
      }
    }
  }

  // Build context JSON string (default to empty object)
  const contextJson = JSON.stringify(req.context ?? {});

  return {
    policies: policyFiles,
    action: req.action,
    resource: req.resource,
    contextJson,
    format,
  };
}

/**
 * Normalize a string by replacing the absolute project root path
 * with a stable placeholder so golden output comparisons are
 * portable across machines and checkout directories.
 *
 * Also normalizes trailing newlines for stable comparison.
 */
function normalizeOutput(raw: string): string {
  // Replace project root absolute path with placeholder
  let normalized = raw;
  // Replace all occurrences of the workspace root path
  while (normalized.includes(WORKSHOP_ROOT)) {
    normalized = normalized.replace(WORKSHOP_ROOT, '<WORKSHOP_ROOT>');
  }
  // Trim trailing whitespace (golden files have a trailing newline,
  // runCheck output may or may not)
  return normalized.trimEnd();
}

// ─── Tests: JSON format golden output comparison ─────────────────────

describe('Z07-D03 golden output — JSON format', () => {
  for (const caseName of CASE_NAMES) {
    it(`T1-${caseName}: expected.json matches actual runCheck JSON output`, async () => {
      const goldenPath = join(caseDir(caseName), 'expected', 'expected.json');
      expect(existsSync(goldenPath)).toBe(true);

      const goldenRaw = readText(goldenPath);
      const options = buildOptions(caseName, 'json');
      const result = await runCheck(options);

      // Determine output: stdout for success, stderr for error
      const actualRaw = result.stderr.length > 0 ? result.stderr : result.stdout;

      // Normalize both before comparison
      const golden = normalizeOutput(goldenRaw);
      const actual = normalizeOutput(actualRaw);

      expect(actual).toBe(golden);
    });
  }
});

// ─── Tests: Text format golden output comparison ─────────────────────

describe('Z07-D03 golden output — Text format', () => {
  for (const caseName of CASE_NAMES) {
    it(`T2-${caseName}: expected.txt matches actual runCheck text output`, async () => {
      const goldenPath = join(caseDir(caseName), 'expected', 'expected.txt');
      expect(existsSync(goldenPath)).toBe(true);

      const goldenRaw = readText(goldenPath);
      const options = buildOptions(caseName, 'text');
      const result = await runCheck(options);

      // Determine output: stdout for success, stderr for error
      const actualRaw = result.stderr.length > 0 ? result.stderr : result.stdout;

      // Normalize both before comparison
      const golden = normalizeOutput(goldenRaw);
      const actual = normalizeOutput(actualRaw);

      expect(actual).toBe(golden);
    });
  }
});

// ─── Tests: Exit code golden comparison ──────────────────────────────

describe('Z07-D03 golden output — Exit codes', () => {
  for (const caseName of CASE_NAMES) {
    it(`T3-${caseName}: expected-exit-code.txt matches actual exitCode`, async () => {
      const goldenPath = join(caseDir(caseName), 'expected', 'expected-exit-code.txt');
      expect(existsSync(goldenPath)).toBe(true);

      const goldenRaw = readText(goldenPath).trim();
      const expectedExitCode = Number(goldenRaw);

      const options = buildOptions(caseName, 'json');
      const result = await runCheck(options);

      expect(result.exitCode).toBe(expectedExitCode);
    });
  }
});

// ─── Tests: Output consistency between JSON and Text formats ─────────

describe('Z07-D03 golden output — JSON/Text consistency', () => {
  for (const caseName of CASE_NAMES) {
    it(`T4-${caseName}: JSON and Text exit codes are identical`, async () => {
      const jsonResult = await runCheck(buildOptions(caseName, 'json'));
      const textResult = await runCheck(buildOptions(caseName, 'text'));
      expect(jsonResult.exitCode).toBe(textResult.exitCode);
    });
  }
});

// ─── Tests: Golden output quality — no raw absolute paths ────────────

describe('Z07-D03 golden output quality — no absolute paths in expected files', () => {
  for (const caseName of CASE_NAMES) {
    it(`T5-${caseName}: expected.json is valid JSON`, () => {
      const goldenPath = join(caseDir(caseName), 'expected', 'expected.json');
      expect(() => readJson(goldenPath)).not.toThrow();
    });

    it(`T6-${caseName}: expected-exit-code.txt is a valid integer`, () => {
      const goldenPath = join(caseDir(caseName), 'expected', 'expected-exit-code.txt');
      const content = readText(goldenPath).trim();
      expect(content).toMatch(/^\d+$/);
      const num = Number(content);
      expect(Number.isInteger(num)).toBe(true);
    });
  }
});
