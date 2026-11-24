import assert from 'node:assert/strict';
import test from 'node:test';

import { toSVG } from '../src/index.js';
import type { Board } from '@focusboard/core';

const board = (elements: Board['elements']): Board => ({ tier: 'small', elements });

test('emits an svg with the tier viewBox', () => {
  const svg = toSVG(board([]));
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 1800 2700"/);
  assert.match(svg, /data-tier="small"/);
  assert.match(svg, /<\/svg>$/);
});

test('paints elements in array order', () => {
  const svg = toSVG(
    board([
      { id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 2 },
      { id: 'e', type: 'line', a: 'a', b: 'b' },
      { id: 'b', type: 'rect', x: 4, y: 0, w: 2, h: 2 }
    ])
  );
  const a = svg.indexOf('data-id="a"');
  const e = svg.indexOf('data-id="e"');
  const b = svg.indexOf('data-id="b"');
  assert.ok(a > 0 && e > a && b > e);
});

test('renders text at one character per cell', () => {
  const svg = toSVG(
    board([{ id: 'a', type: 'rect', x: 0, y: 0, w: 3, h: 2, text: '缓存层' }])
  );
  assert.match(svg, />缓</);
  assert.match(svg, />存</);
  assert.match(svg, />层</);
  assert.match(svg, /font-size="82"/);
});

test('textScale enlarges the character cell', () => {
  const svg = toSVG(
    board([
      { id: 'a', type: 'rect', x: 0, y: 0, w: 4, h: 2, text: '缓存', textScale: 2 }
    ])
  );
  assert.match(svg, /font-size="164"/);
});

test('clips text that does not fit', () => {
  const svg = toSVG(
    board([{ id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 1, text: 'abc' }])
  );
  assert.match(svg, />a</);
  assert.match(svg, />b</);
  assert.doesNotMatch(svg, />c</);
});

test('escapes text', () => {
  const svg = toSVG(
    board([{ id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 1, text: '<&' }])
  );
  assert.match(svg, /&lt;/);
  assert.match(svg, /&amp;/);
});

test('border none draws no border or fill', () => {
  const svg = toSVG(
    board([{ id: 'a', type: 'rect', x: 0, y: 0, w: 3, h: 1, text: '说明', border: 'none' }])
  );
  assert.doesNotMatch(svg, /stroke=/);
  assert.match(svg, />说</);
});

test('dashed rect uses a dash pattern', () => {
  const svg = toSVG(
    board([{ id: 'a', type: 'rect', x: 0, y: 0, w: 4, h: 3, border: 'dashed' }])
  );
  assert.match(svg, /stroke-dasharray="12 8"/);
});

test('line ends are cropped to the visual border', () => {
  const svg = toSVG(
    board([
      { id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', type: 'rect', x: 4, y: 0, w: 2, h: 2 },
      { id: 'e', type: 'line', a: 'a', b: 'b' }
    ])
  );
  assert.match(svg, /d="M198,100 L402,100"/);
});

test('arrows are drawn at the requested ends', () => {
  const one = toSVG(
    board([
      { id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', type: 'rect', x: 4, y: 0, w: 2, h: 2 },
      { id: 'e', type: 'line', a: 'a', b: 'b', arrow: 'b' }
    ])
  );
  assert.equal((one.match(/fill="#8fb3a3"/g) ?? []).length, 1);

  const both = toSVG(
    board([
      { id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', type: 'rect', x: 4, y: 0, w: 2, h: 2 },
      { id: 'e', type: 'line', a: 'a', b: 'b', arrow: 'both' }
    ])
  );
  assert.equal((both.match(/fill="#8fb3a3"/g) ?? []).length, 2);
});

test('dashed lines use a dash pattern', () => {
  const svg = toSVG(
    board([
      { id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 2 },
      { id: 'b', type: 'rect', x: 4, y: 0, w: 2, h: 2 },
      { id: 'e', type: 'line', a: 'a', b: 'b', style: 'dashed' }
    ])
  );
  assert.match(svg, /stroke-dasharray="14 10"/);
});
