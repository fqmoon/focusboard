/**
 * Submit a board: write it, lint it, render it if lint allows, and print the
 * receipt. stdout is JSON only, so a caller (agent or script) can read it:
 *
 *   node examples/host/build.mjs [board.json]
 *
 * { errors, warnings, rendered, wrote }  — this is the whole tool contract.
 * How the board gets here (file, HTTP, copy-paste) is the caller's business.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lint } from '@focusboard/core';
import { toSVG } from '@focusboard/svg-render';

const here = dirname(fileURLToPath(import.meta.url));
const boardPath = resolve(process.argv[2] ?? resolve(here, 'board.json'));
const board = JSON.parse(await readFile(boardPath, 'utf8'));

const { errors, warnings } = lint(board);

// Nothing is rendered while errors stand, so a broken submission leaves the
// page as it was instead of replacing it with a half-drawn board.
if (errors.length > 0) {
  console.log(JSON.stringify({ errors, warnings, rendered: false }, null, 2));
  process.exit(1);
}

const svg = toSVG(board);
const out = resolve(here, 'out');
await mkdir(out, { recursive: true });
const svgPath = resolve(out, 'board.svg');
const htmlPath = resolve(out, 'index.html');
await writeFile(svgPath, svg);
await writeFile(
  htmlPath,
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

console.log(JSON.stringify({ errors, warnings, rendered: true, wrote: [svgPath, htmlPath] }, null, 2));
