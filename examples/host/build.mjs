import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lint } from '@focusboard/core';
import { toSVG } from '@focusboard/svg-render';

const here = dirname(fileURLToPath(import.meta.url));
const board = JSON.parse(await readFile(resolve(here, 'board.json'), 'utf8'));

const result = lint(board);
for (const error of result.errors) console.error(`error ${error.code}: ${error.message}`);
for (const warning of result.warnings) console.warn(`warning ${warning.code}: ${warning.message}`);
if (result.errors.length > 0) process.exit(1);

const svg = toSVG(board);
const out = resolve(here, 'out');
await mkdir(out, { recursive: true });
await writeFile(resolve(out, 'board.svg'), svg);
await writeFile(
  resolve(out, 'index.html'),
  `<!doctype html>
<meta charset="utf-8">
<title>focusboard</title>
<style>
  html, body { margin: 0; height: 100%; background: #101715; }
  body { display: grid; place-items: center; }
  svg { max-width: 100vw; max-height: 100vh; height: auto; }
</style>
${svg}
`
);

console.log(`wrote ${resolve(out, 'board.svg')}`);
console.log(`wrote ${resolve(out, 'index.html')}`);
