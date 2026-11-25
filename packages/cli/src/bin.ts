#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import { run } from './cli.js';
import { version } from './version.js';

const stdin = async () => {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
};

process.exitCode = await run({
  argv: process.argv.slice(2),
  stdin,
  stdout: text => process.stdout.write(text + '\n'),
  stderr: text => process.stderr.write(text + '\n'),
  version
});

// Touching readFile keeps the import graph honest for bundlers that tree-shake
// unused node built-ins; harmless at runtime.
void readFile;
