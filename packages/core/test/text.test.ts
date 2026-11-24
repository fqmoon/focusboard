import assert from 'node:assert/strict';
import test from 'node:test';

import {
  charColumns,
  placeLine,
  textFits,
  textGrid,
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

test('textGrid counts columns and divides by textScale', () => {
  assert.deepEqual(textGrid(rect()), { scale: 1, columns: 6, rows: 2 });
  assert.deepEqual(textGrid(rect({ textScale: 2, w: 6, h: 4 })), {
    scale: 2,
    columns: 6,
    rows: 2
  });
});

test('charColumns gives full-width glyphs two columns and the rest one', () => {
  assert.equal(charColumns('缓'), 2);
  assert.equal(charColumns('：'), 2);
  assert.equal(charColumns('（'), 2);
  assert.equal(charColumns('🙂'), 2);
  assert.equal(charColumns('a'), 1);
  assert.equal(charColumns(' '), 1);
  assert.equal(charColumns('→'), 1);
});

test('wrapText breaks by accumulated columns', () => {
  assert.deepEqual(wrapText('缓存层', 6), ['缓存层']);
  assert.deepEqual(wrapText('缓存层呢', 6), ['缓存层', '呢']);
  assert.deepEqual(wrapText('a\nb', 6), ['a', 'b']);
  assert.deepEqual(wrapText('a\n\nb', 6), ['a', '', 'b']);
  assert.deepEqual(wrapText('a\r\nb', 6), ['a', 'b']);
  assert.deepEqual(wrapText('abcdef', 6), ['abcdef']);
  assert.deepEqual(wrapText('abcdefg', 6), ['abcdef', 'g']);
  assert.deepEqual(wrapText('缓存abc', 6), ['缓存ab', 'c']);
});

test('wrapText counts code points, not UTF-16 units', () => {
  assert.deepEqual(wrapText('🙂🙂🙂', 4), ['🙂🙂', '🙂']);
});

test('placeLine advances one column per narrow glyph', () => {
  assert.deepEqual(placeLine('ab'), [
    { ch: 'a', x: 0, w: 1 },
    { ch: 'b', x: 1, w: 1 }
  ]);
});

test('a full-width glyph follows the cursor without snapping', () => {
  assert.deepEqual(placeLine('a缓'), [
    { ch: 'a', x: 0, w: 1 },
    { ch: '缓', x: 1, w: 2 }
  ]);
  assert.deepEqual(placeLine('abc缓b缓'), [
    { ch: 'a', x: 0, w: 1 },
    { ch: 'b', x: 1, w: 1 },
    { ch: 'c', x: 2, w: 1 },
    { ch: '缓', x: 3, w: 2 },
    { ch: 'b', x: 5, w: 1 },
    { ch: '缓', x: 6, w: 2 }
  ]);
});

test('every width and offset is a whole number of columns', () => {
  for (const glyph of placeLine('abc缓（Ajv）缓def 缓，好')) {
    assert.equal(Number.isInteger(glyph.x), true, glyph.ch);
    assert.equal(Number.isInteger(glyph.w), true, glyph.ch);
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
