#!/usr/bin/env node
/**
 * Read-only text report for a board: how much of each rect the text actually
 * fills. Prints columns (a cell is two columns), flags soft wraps, overflow and
 * full-width glyphs that hang half a cell off the grid.
 *
 *   npm run check                 # examples/host/board.json
 *   npm run check -- path/to.json
 */
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { lint, measure } from '@focusboard/core';

const path = resolve(process.argv[2] ?? 'examples/host/board.json');
const board = JSON.parse(await readFile(path, 'utf8'));

const { errors, warnings } = lint(board);
const report = measure(board);
const shown = relative(process.cwd(), path);

const page = `${board.tier}`;
console.log(`${shown}  tier=${page}  ${report.rects.length} rects  ${report.lineCount} lines`);
console.log(`errors ${errors.length}  warnings ${warnings.length}`);

for (const issue of errors) console.log(`  error ${issue.code}  ${issue.message}`);
for (const issue of warnings) console.log(`  warn  ${issue.code}  ${issue.message}`);

let rewrapped = 0;
let hanging = 0;

for (const rect of report.rects) {
  if (rect.lines.length === 0) continue;

  console.log('');
  console.log(`${rect.id}  ${rect.w}×${rect.h}  capacity ${rect.columns} 列 × ${rect.rows} 行`);

  for (const [index, line] of rect.lines.entries()) {
    const slack = rect.columns - line.columns;
    const note = slack === 0 ? '满' : `余 ${slack}`;
    console.log(`  L${index + 1}  ${String(line.columns).padStart(3)} 列  ${note}   ${line.text}`);
  }

  console.log(`  widest ${rect.widest}/${rect.columns} 列   ${rect.lines.length}/${rect.rows} 行`);

  if (rect.rewrapped) {
    rewrapped += 1;
    console.log('  ~ 有段落被自动折行（写的时候以为是一行）');
  }
  if (rect.overflow) console.log('  ! 行数超过框高，超出的行会被裁掉');

  const offGrid = rect.lines.filter(line => line.hanging.length > 0);
  if (offGrid.length > 0) {
    hanging += 1;
    const detail = offGrid
      .map(line => `L${rect.lines.indexOf(line) + 1} ${line.hanging.join('')}`)
      .join('  ');
    console.log(`  ~ 汉字偏半格（不落整格）：${detail}`);
  }
}

console.log('');
console.log(`summary: ${rewrapped} 处自动折行, ${hanging} 个框汉字偏半格`);
process.exit(errors.length > 0 ? 1 : 0);
