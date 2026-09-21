#!/usr/bin/env node
/**
 * PostToolUse hook: fast feedback after Claude edits a file.
 *
 * Runs two checks, both scoped to the file that just changed so the loop stays
 * quick:
 *
 *   1. Formatting — Prettier rewrites the file in place. Formatting should never
 *      be a thing anyone thinks about, let alone reviews.
 *   2. Architecture — if the file lives in `packages/core`, dependency-cruiser
 *      verifies the engine has not grown a dependency on Angular or the UI.
 *      Catching that at edit time beats discovering it in CI twenty minutes
 *      later, when the offending import has already been built on.
 *
 * Reads the hook payload as JSON on stdin. Exits non-zero (with an explanation
 * on stderr) when a boundary is violated, so Claude sees the problem
 * immediately; formatting failures are reported but never block.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative, dirname, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FORMATTABLE = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.html',
  '.css',
  '.scss',
  '.yaml',
  '.yml',
]);

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function run(command, args, { cwd = REPO_ROOT } = {}) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', shell: false });
}

const raw = await readStdin();
let payload = {};
try {
  payload = raw.trim() ? JSON.parse(raw) : {};
} catch {
  process.exit(0); // Malformed payload is not the edit's fault; stay out of the way.
}

const filePath = payload?.tool_input?.file_path;
if (!filePath) process.exit(0);

const absolutePath = isAbsolute(filePath) ? filePath : join(REPO_ROOT, filePath);
if (!existsSync(absolutePath)) process.exit(0);

const relativePath = relative(REPO_ROOT, absolutePath);
if (relativePath.startsWith('..')) process.exit(0); // Outside the repo, not ours.

// Skip our own generated report, which is rewritten by the ledger script.
if (relativePath === join('docs', 'internal', 'principle-exceptions.md')) process.exit(0);

// ── 1. Format ───────────────────────────────────────────────────────────────
if (FORMATTABLE.has(extname(absolutePath)) && existsSync(join(REPO_ROOT, 'node_modules'))) {
  const formatted = run('npx', [
    '--no-install',
    'prettier',
    '--write',
    '--log-level',
    'warn',
    relativePath,
  ]);
  if (formatted.status !== 0 && formatted.stderr?.trim()) {
    console.error(`prettier could not format ${relativePath}:\n${formatted.stderr.trim()}`);
  }
}

// ── 2. Architecture boundary ────────────────────────────────────────────────
const touchesEngine =
  relativePath.startsWith(join('packages', 'core')) && /\.m?ts$/.test(relativePath);
const cruiserConfig = join(REPO_ROOT, '.dependency-cruiser.cjs');

if (touchesEngine && existsSync(cruiserConfig) && existsSync(join(REPO_ROOT, 'node_modules'))) {
  const check = run('npx', [
    '--no-install',
    'depcruise',
    'packages/core',
    '--config',
    '.dependency-cruiser.cjs',
    '--output-type',
    'err',
  ]);

  if (check.status !== 0) {
    console.error(
      'Architecture boundary violated in packages/core.\n' +
        'The engine must not depend on Angular, the web app, or DOM-only APIs — ' +
        'it has to run in a Web Worker and under plain Node.\n' +
        'See CLAUDE.md § "The one inviolable boundary".\n\n' +
        `${check.stdout ?? ''}${check.stderr ?? ''}`,
    );
    process.exit(2); // Non-zero surfaces this back to Claude as actionable feedback.
  }
}

process.exit(0);
