import assert from 'node:assert/strict';
import test from 'node:test';

import {
  charGrid,
  charWidth,
  placeLine,
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

test('charWidth gives full-width glyphs one cell and the rest half', () => {
  assert.equal(charWidth('缓'), 1);
  assert.equal(charWidth('：'), 1);
  assert.equal(charWidth('（'), 1);
  assert.equal(charWidth('a'), 0.5);
  assert.equal(charWidth(' '), 0.5);
  assert.equal(charWidth('→'), 0.5);
  assert.equal(charWidth('🙂'), 1);
});

test('wrapText breaks by accumulated cell width', () => {
  assert.deepEqual(wrapText('缓存层', 3), ['缓存层']);
  assert.deepEqual(wrapText('缓存层呢', 3), ['缓存层', '呢']);
  assert.deepEqual(wrapText('a\nb', 3), ['a', 'b']);
  assert.deepEqual(wrapText('a\n\nb', 3), ['a', '', 'b']);
  assert.deepEqual(wrapText('a\r\nb', 3), ['a', 'b']);
  assert.deepEqual(wrapText('abcdef', 3), ['abcdef']);
  assert.deepEqual(wrapText('abcdefg', 3), ['abcdef', 'g']);
  assert.deepEqual(wrapText('缓存abc', 3), ['缓存ab', 'c']);
  assert.deepEqual(wrapText('ab缓', 3), ['ab缓']);
  assert.deepEqual(wrapText('abc缓', 3), ['abc缓']);
  assert.deepEqual(wrapText('abc缓缓', 3), ['abc缓', '缓']);
});

test('wrapText counts code points, not UTF-16 units', () => {
  assert.deepEqual(wrapText('🙂🙂🙂', 2), ['🙂🙂', '🙂']);
});

test('placeLine advances half a cell per narrow glyph', () => {
  assert.deepEqual(placeLine('ab'), [
    { ch: 'a', x: 0, w: 0.5 },
    { ch: 'b', x: 0.5, w: 0.5 }
  ]);
});

test('a full-width glyph after an odd half-width run snaps to the next cell', () => {
  assert.deepEqual(placeLine('a缓'), [
    { ch: 'a', x: 0, w: 0.5 },
    { ch: '缓', x: 1, w: 1 }
  ]);
  assert.deepEqual(placeLine('ab缓b缓'), [
    { ch: 'a', x: 0, w: 0.5 },
    { ch: 'b', x: 0.5, w: 0.5 },
    { ch: '缓', x: 1, w: 1 },
    { ch: 'b', x: 2, w: 0.5 },
    { ch: '缓', x: 3, w: 1 }
  ]);
});

test('every full-width glyph sits inside a whole cell', () => {
  for (const glyph of placeLine('abc缓（Ajv）缓def 缓，好')) {
    if (glyph.w === 1) assert.equal(Number.isInteger(glyph.x), true, glyph.ch);
  }
});

test('visibleTextLines clips extra rows', () => {
  assert.deepEqual(visibleTextLines(rect({ text: '123456789' })), ['123456', '789']);
});

test('textFits uses wrapped line count', () => {
  assert.equal(textFits(rect({ text: '123456789012' })), true);
  assert.equal(textFits(rect({ text: '1234567890123' })), false);
  assert.equal(textFits(rect({ text: '缓存层呢', textScale: 2, w: 4, h: 2 })), false);
});
