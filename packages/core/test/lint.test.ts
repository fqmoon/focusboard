import assert from 'node:assert/strict';
import test from 'node:test';

import { lint, type Board } from '../src/index.js';

const rect = (id: string, x: number, y: number, w: number, h: number, extra = {}) => ({
  id,
  type: 'rect' as const,
  x,
  y,
  w,
  h,
  ...extra
});

test('reports duplicate ids as errors', () => {
  const result = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 2, 2), rect('a', 4, 0, 2, 2)]
  });
  assert.ok(result.errors.some(error => error.code === 'duplicate_id'));
});

test('reports dangling lines as errors', () => {
  const result = lint({
    tier: 'small',
    elements: [{ id: 'e', type: 'line', a: 'missing', b: 'also-missing' }]
  });
  assert.equal(result.errors.filter(error => error.code === 'dangling_line').length, 2);
});

test('reports out-of-bounds rects as warnings', () => {
  const result = lint({
    tier: 'small',
    elements: [rect('a', 17, 0, 2, 2)]
  });
  assert.ok(result.warnings.some(error => error.code === 'out_of_bounds'));
});

test('reports partial overlap but not strict containment', () => {
  const partial = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 3, 3), rect('b', 2, 2, 3, 3)]
  });
  assert.ok(partial.warnings.some(error => error.code === 'partial_overlap'));

  const nested = lint({
    tier: 'small',
    elements: [rect('outer', 0, 0, 6, 6), rect('inner', 1, 1, 3, 3)]
  });
  assert.equal(nested.warnings.some(error => error.code === 'partial_overlap'), false);
});

test('reports text overflow', () => {
  const result = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 2, 1, { text: '三个字' })]
  });
  assert.ok(result.warnings.some(error => error.code === 'text_overflow'));
});

test('reports text scale misalignment', () => {
  const result = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 3, 2, { text: '字', textScale: 2 })]
  });
  assert.ok(result.warnings.some(error => error.code === 'text_scale_misaligned'));
});

test('shape errors stop geometry checks', () => {
  const result = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 2, 2), { id: 'bad', type: 'circle' }]
  });
  assert.ok(result.errors.length > 0);
  assert.equal(result.warnings.length, 0);
});

test('does not warn about style or layout choices', () => {
  const board: Board = {
    tier: 'small',
    elements: [
      rect('a', 0, 0, 4, 2),
      rect('b', 5, 0, 4, 2),
      { id: 'e', type: 'line', a: 'a', b: 'b', style: 'dashed', arrow: 'both' }
    ]
  };
  const result = lint(board);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});
