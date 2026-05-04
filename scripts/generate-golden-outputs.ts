/**
 * Z07-D03: Golden output generation script.
 *
 * Generates expected/ JSON, TXT, and exit-code golden files for
 * all 6 actual fixture cases by calling runCheck() directly.
 *
 * Usage: npx tsx scripts/generate-golden-outputs.ts
 *
 * Safety:
 * - Only writes to test-fixtures/cases/*\/expected/
 * - Does not modify any src/ files
 * - Does not modify actual fixture input files
 */

import { writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCheck } from '../src/cli/main.js';
import type { CheckCommandOptions } from '../src/cli/types.js';

// ─── Resolve project root ─────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const FIXTURES_ROOT = join(PROJECT_ROOT, 'test-fixtures', 'cases');

/** All six case names from Z07-D02. */
const CASE_NAMES = [
  'allow-basic',
  'explicit-deny-basic',
  'implicit-deny-basic',
  'indeterminate-unsupported-condition',
  'invalid-policy-json',
  'multi-policy-precedence',
] as const;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Normalize a string by replacing the absolute project root path
 * with the placeholder `<WORKSHOP_ROOT>/`.
 *
 * This ensures golden outputs are portable across machines and
 * checkout directories.
 */
function normalizePaths(raw: string): string {
  return raw.replaceAll(PROJECT_ROOT, '<WORKSHOP_ROOT>');
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function caseDir(name: string): string {
  return join(FIXTURES_ROOT, name);
}

function expectedDir(name: string): string {
  return join(caseDir(name), 'expected');
}

/**
 * Read all policy file paths from a case's policies/ directory.
 */
function policyPaths(caseName: string): string[] {
  const dir = join(caseDir(caseName), 'policies');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

/**
 * Generate golden outputs for a single case.
 *
 * Reads request.json to get action/resource/context and policies/
 * to get policy file paths, constructs CheckCommandOptions for
 * both JSON and text formats, calls runCheck, and writes the
 * resulting output and exit code to expected/.
 */
async function generateForCase(caseName: string): Promise<void> {
  const dir = caseDir(caseName);

  // Read request
  const reqPath = join(dir, 'request.json');
  const req = readJson(reqPath) as Record<string, unknown>;
  const action = req.action as string;
  const resource = req.resource as string;
  const context = req.context as Record<string, unknown> | undefined;

  // Read policy file paths
  const policies = policyPaths(caseName);

  // Build context JSON string (empty object if no context)
  const contextJson = JSON.stringify(context ?? {});

  const outDir = expectedDir(caseName);
  // Ensure expected/ directory exists
  if (!existsSync(outDir)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(outDir, { recursive: true });
  }

  // ── Generate JSON format output ────────────────────────────
  const jsonOptions: CheckCommandOptions = {
    policies,
    action,
    resource,
    contextJson,
    format: 'json',
  };
  const jsonResult = await runCheck(jsonOptions);
  // For error cases, stderr is non-empty; for success cases, stdout is non-empty
  const jsonRaw = jsonResult.stderr.length > 0 ? jsonResult.stderr : jsonResult.stdout;
  const jsonOutput = normalizePaths(jsonRaw);
  writeFileSync(join(outDir, 'expected.json'), jsonOutput + '\n', 'utf-8');

  // ── Generate Text format output ────────────────────────────
  const textOptions: CheckCommandOptions = { ...jsonOptions, format: 'text' };
  const textResult = await runCheck(textOptions);
  const textRaw = textResult.stderr.length > 0 ? textResult.stderr : textResult.stdout;
  const textOutput = normalizePaths(textRaw);
  writeFileSync(join(outDir, 'expected.txt'), textOutput + '\n', 'utf-8');

  // ── Write exit code ────────────────────────────────────────
  // Always use the text result's exitCode (should be identical)
  writeFileSync(join(outDir, 'expected-exit-code.txt'), String(textResult.exitCode) + '\n', 'utf-8');

  console.log(`  ✓ ${caseName}: exitCode=${textResult.exitCode}`);
  console.log(`      expected.json (${jsonOutput.length} bytes)`);
  console.log(`      expected.txt  (${textOutput.length} bytes)`);
}

// ─── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Generating golden outputs for all 6 cases...\n');

  for (const caseName of CASE_NAMES) {
    try {
      await generateForCase(caseName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${caseName}: ${msg}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
