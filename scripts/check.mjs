#!/usr/bin/env node
/**
 * Read-only inspector for a board. Two modes:
 *
 *   npm run check [file]                 # human report: columns, wraps, overhang
 *   npm run check [file] --free 17,10,15,9 --hit 24,12
 *                                        # JSON answers for point/region queries
 *
 * Query flags take the board as input, exactly like a submission: the board is
 * the thing being asked about, so there is no state to keep in sync. Repeat a
 * flag to batch several queries into one call.
 */
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { free, hit, lint, measure } from '@focusboard/core';

const argv = process.argv.slice(2);

const numbers = (value, count) => {
  const parts = String(value ?? '').split(',').map(part => Number(part.trim()));
  if (parts.length !== count || parts.some(part => !Number.isFinite(part))) {
    throw new Error(`需要 ${count} 个数字，收到 "${value}"`);
  }
  return parts;
};

const regions = [];
const points = [];
let file = 'examples/host/board.json';

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--free') {
    const [x, y, w, h] = numbers(argv[++i], 4);
    regions.push({ x, y, w, h });
  } else if (arg === '--hit') {
    const [x, y] = numbers(argv[++i], 2);
    points.push({ x, y });
  } else if (arg.startsWith('--')) {
    throw new Error(`未知参数 ${arg}`);
  } else {
    file = arg;
  }
}

const path = resolve(file);

const board = JSON.parse(await readFile(path, 'utf8'));
const { errors, warnings } = lint(board);

if (regions.length > 0 || points.length > 0) {
  console.log(
    JSON.stringify(
      {
        errors,
        warnings,
        free: regions.map(region => ({ ...region, cells: free(region, board.elements) })),
        hit: points.map(point => ({ ...point, ids: hit(point.x, point.y, board.elements) }))
      },
      null,
      2
    )
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

const report = measure(board);
const shown = relative(process.cwd(), path);

console.log(`${shown}  tier=${board.tier}  ${report.rects.length} rects  ${report.lineCount} lines`);
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
