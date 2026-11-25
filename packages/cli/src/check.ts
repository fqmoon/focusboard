import { free as freeCells, hit as hitAt, lint, measure, type Board } from '@focusboard/core';
import type { Issue, MeasureReport } from '@focusboard/core';

import type { Query } from './args.js';

export interface FreeAnswer {
  x: number;
  y: number;
  w: number;
  h: number;
  cells: number;
}

export interface HitAnswer {
  x: number;
  y: number;
  ids: string[];
}

export interface CheckResult {
  errors: Issue[];
  warnings: Issue[];
  free: FreeAnswer[];
  hit: HitAnswer[];
  /** Only meaningful when `errors` is empty: a broken board has no shape to measure. */
  report: MeasureReport | null;
}

export function runCheck(input: unknown, queries: readonly Query[] = []): CheckResult {
  const { errors, warnings } = lint(input);

  if (errors.length > 0) {
    return { errors, warnings, free: [], hit: [], report: null };
  }

  const board = input as Board;
  return {
    errors,
    warnings,
    free: queries
      .filter((query): query is Extract<Query, { kind: 'free' }> => query.kind === 'free')
      .map(query => ({
        x: query.x,
        y: query.y,
        w: query.w,
        h: query.h,
        cells: freeCells({ x: query.x, y: query.y, w: query.w, h: query.h }, board.elements)
      })),
    hit: queries
      .filter((query): query is Extract<Query, { kind: 'hit' }> => query.kind === 'hit')
      .map(query => ({ x: query.x, y: query.y, ids: hitAt(query.x, query.y, board.elements) })),
    report: measure(board)
  };
}
