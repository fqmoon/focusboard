import assert from 'node:assert/strict';
import test from 'node:test';

import { measure, type Board, type Rect } from '../src/index.js';

const board = (rects: Rect[], tier: Board['tier'] = 'large'): Board => ({
  tier,
  elements: rects
});

const rect = (overrides: Partial<Rect> = {}): Rect => ({
  id: 'r',
  type: 'rect',
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  ...overrides
});

test('measure reports capacity and used columns', () => {
  const [first] = measure(board([rect({ text: 'abc' })])).rects;
  assert.ok(first);
  assert.deepEqual(
    { columns: first.columns, rows: first.rows, widest: first.widest },
    { columns: 6, rows: 2, widest: 3 }
  );
  assert.equal(first.lines.length, 1);
  assert.equal(first.overflow, false);
  assert.equal(first.rewrapped, false);
});

test('measure counts CJK as two columns', () => {
  const [first] = measure(board([rect({ text: '缓存层' })])).rects;
  assert.ok(first);
  assert.equal(first.widest, 6);
  assert.equal(first.lines[0]?.columns, 6);
});

test('measure flags overflow past the rect height', () => {
  const [first] = measure(board([rect({ w: 1, h: 1, text: 'abcdef' })])).rects;
  assert.ok(first);
  assert.equal(first.columns, 2);
  assert.equal(first.lines.length, 3);
  assert.equal(first.overflow, true);
  assert.equal(first.rewrapped, true);
});

test('measure flags full-width glyphs hanging off the grid', () => {
  const [first] = measure(board([rect({ text: '42 个用例' })])).rects;
  assert.ok(first);
  assert.deepEqual(first.lines[0]?.hanging, ['个']);
});

test('measure skips rects without text', () => {
  const report = measure(board([rect({ id: 'a' }), rect({ id: 'b', text: 'hi' })]));
  assert.equal(report.rects.length, 2);
  assert.equal(report.rects[0]?.lines.length, 0);
  assert.equal(report.lineCount, 1);
});
