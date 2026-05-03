#!/usr/bin/env node

/**
 * ICAN CLI executable entry point.
 *
 * This file is the binary target for `bin.ican` in package.json.
 * It imports and calls runCli from main.ts, passing process.argv.slice(2)
 * as raw arguments. On unhandled exceptions, it writes a stable error
 * message to stderr and sets process.exitCode to 10 (INTERNAL_ERROR).
 *
 * Does NOT call process.exit().
 */

import { runCli } from './main.js';

async function main(): Promise<void> {
  try {
    await runCli(process.argv.slice(2));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? `Internal error: ${error.message}`
        : 'Internal error: unexpected failure';
    process.stderr.write(message + '\n');
    process.exitCode = 10; // EXIT_CODE.INTERNAL_ERROR
  }
}

void main();
