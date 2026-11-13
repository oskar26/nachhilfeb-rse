#!/usr/bin/env node
/**
 * Builds the Fumadocs documentation and copies the static export into
 * `dist/docs`, so the normal platform build deploys it on the same host.
 */
import { cp, mkdir, rm, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsSite = join(root, 'docs-site');
const docsOutput = join(root, 'dist', 'docs');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    console.error(`\nDocs build failed: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(join(docsSite, 'node_modules', '.bin', 'react-router')))) {
  console.log('Installing documentation dependencies...');
  run('npm', ['ci', '--include=dev', '--no-audit', '--no-fund'], docsSite);
}

console.log('Building documentation...');
run('npm', ['run', 'build'], docsSite);

const client = join(docsSite, 'build', 'client');

if (!(await exists(join(client, 'docs', 'index.html')))) {
  console.error('Docs build produced no build/client/docs/index.html.');
  process.exit(1);
}

console.log('Copying documentation to dist/docs...');
await rm(docsOutput, { recursive: true, force: true });
await mkdir(docsOutput, { recursive: true });

// Prerendered pages, page data and search index.
await cp(join(client, 'docs'), docsOutput, { recursive: true });
await cp(join(client, 'assets'), join(docsOutput, 'assets'), { recursive: true });
await cp(join(client, 'api'), join(docsOutput, 'api'), { recursive: true });
await cp(join(client, 'docs.data'), join(docsOutput, 'docs.data'));

console.log('Documentation ready: dist/docs');
