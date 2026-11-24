import assert from 'node:assert/strict';
import test from 'node:test';

import {
  charGrid,
  textFits,
  visibleTextLines,
  wrapText,
  type Rect
} from '../src/index.js';

const rect = (overrides: Partial<Rect> = {}): Rect => ({
  id: 'r',
  type: 'rect',
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  ...overrides
});

test('charGrid divides by textScale', () => {
  assert.deepEqual(charGrid(rect()), { scale: 1, cols: 3, rows: 2 });
  assert.deepEqual(charGrid(rect({ textScale: 2, w: 6, h: 4 })), {
    scale: 2,
    cols: 3,
    rows: 2
  });
});

test('wrapText breaks by character count', () => {
  assert.deepEqual(wrapText('缓存层', 3), ['缓存层']);
  assert.deepEqual(wrapText('缓存层呢', 3), ['缓存层', '呢']);
  assert.deepEqual(wrapText('a\nb', 3), ['a', 'b']);
  assert.deepEqual(wrapText('a\n\nb', 3), ['a', '', 'b']);
  assert.deepEqual(wrapText('a\r\nb', 3), ['a', 'b']);
});

test('wrapText counts code points, not UTF-16 units', () => {
  assert.deepEqual(wrapText('🙂🙂🙂', 2), ['🙂🙂', '🙂']);
});

test('visibleTextLines clips extra rows', () => {
  assert.deepEqual(visibleTextLines(rect({ text: '1234567' })), ['123', '456']);
});

test('textFits uses wrapped line count', () => {
  assert.equal(textFits(rect({ text: '123456' })), true);
  assert.equal(textFits(rect({ text: '1234567' })), false);
  assert.equal(textFits(rect({ text: '123456', textScale: 2, w: 4, h: 2 })), false);
});
