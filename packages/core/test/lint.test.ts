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

test('reports a bordered rect that holds a paragraph', () => {
  const result = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 6, 5, { text: '第一行\n第二行\n第三行' })]
  });
  const dense = result.warnings.filter(warning => warning.code === 'text_dense');
  assert.equal(dense.length, 1);
});

test('text_dense leaves labels, legend lines and overflow alone', () => {
  const label = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 6, 3, { text: 'LWW\n最后写入' })]
  });
  assert.equal(label.warnings.some(warning => warning.code === 'text_dense'), false);

  const legend = lint({
    tier: 'small',
    elements: [
      rect('note', 0, 0, 10, 4, { text: '① LWW 最后写入者胜\n② CRDT 冲突自动合并', border: 'none' })
    ]
  });
  assert.equal(legend.warnings.some(warning => warning.code === 'text_dense'), false);

  const overflow = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 6, 2, { text: '第一行\n第二行\n第三行' })]
  });
  assert.deepEqual(
    overflow.warnings.map(warning => warning.code),
    ['text_overflow']
  );
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

test('reports a line that cuts through a third rect', () => {
  const result = lint({
    tier: 'large',
    elements: [
      rect('a', 1, 1, 4, 4),
      rect('mid', 8, 1, 4, 4),
      rect('b', 15, 1, 4, 4),
      { id: 'e', type: 'line', a: 'a', b: 'b' }
    ]
  });
  const crossing = result.warnings.filter(warning => warning.code === 'line_crosses_rect');
  assert.equal(crossing.length, 1);
  assert.deepEqual(crossing[0]?.ids, ['e', 'mid']);
});

test('a line along a rect border is not a crossing', () => {
  const result = lint({
    tier: 'large',
    elements: [
      rect('a', 1, 1, 4, 4),
      rect('below', 1, 5, 4, 4),
      rect('b', 15, 1, 4, 4),
      { id: 'e', type: 'line', a: 'a', b: 'b' }
    ]
  });
  assert.equal(result.warnings.filter(warning => warning.code === 'line_crosses_rect').length, 0);
});

test('a line inside an enclosing rect is not a crossing', () => {
  const result = lint({
    tier: 'large',
    elements: [
      rect('frame', 0, 0, 20, 10),
      rect('a', 2, 4, 2, 2),
      rect('b', 12, 4, 2, 2),
      { id: 'e', type: 'line', a: 'a', b: 'b' }
    ]
  });
  assert.equal(result.warnings.filter(warning => warning.code === 'line_crosses_rect').length, 0);
});

test('the two rects a line connects are never reported', () => {
  const result = lint({
    tier: 'small',
    elements: [rect('a', 0, 0, 3, 3), rect('b', 6, 0, 3, 3), { id: 'e', type: 'line', a: 'a', b: 'b' }]
  });
  assert.equal(result.warnings.filter(warning => warning.code === 'line_crosses_rect').length, 0);
});
