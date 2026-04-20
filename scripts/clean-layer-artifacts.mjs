#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const targets = [
  resolve(projectRoot, 'layers', 'node_modules'),
  resolve(projectRoot, 'layers', '.nuxt'),
];

for (const target of targets) {
  try {
    await rm(target, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors in dev bootstrap.
  }
}
