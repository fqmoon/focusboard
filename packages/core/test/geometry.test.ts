import assert from 'node:assert/strict';
import test from 'node:test';

import { bounds, contains, free, hit, overlaps, type Element } from '../src/index.js';

const elements: Element[] = [
  { id: 'a', type: 'rect', x: 0, y: 0, w: 4, h: 3 },
  { id: 'b', type: 'rect', x: 2, y: 1, w: 4, h: 3 },
  { id: 'c', type: 'rect', x: 10, y: 10, w: 2, h: 2 },
  { id: 'e', type: 'line', a: 'a', b: 'b' }
];

test('bounds ignores lines', () => {
  assert.deepEqual(bounds(elements), { x: 0, y: 0, w: 12, h: 12 });
  assert.deepEqual(bounds([]), { x: 0, y: 0, w: 0, h: 0 });
});

test('overlaps uses positive-area intersection', () => {
  assert.equal(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 }), true);
  assert.equal(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 2, y: 0, w: 2, h: 2 }), false);
});

test('contains is strict', () => {
  const outer = { x: 0, y: 0, w: 4, h: 4 };
  assert.equal(contains(outer, { x: 1, y: 1, w: 2, h: 2 }), true);
  assert.equal(contains(outer, outer), false);
});

test('hit returns ids in array order', () => {
  assert.deepEqual(hit(3, 2, elements), ['a', 'b']);
  assert.deepEqual(hit(20, 20, elements), []);
});

test('free counts uncovered cells once', () => {
  assert.equal(free({ x: 0, y: 0, w: 6, h: 4 }, [elements[0]!]), 24 - 12);
  // a and b overlap; covered area must not be counted twice.
  assert.equal(free({ x: 0, y: 0, w: 6, h: 4 }, elements), 24 - 20);
});

test('free clips the region', () => {
  assert.equal(free({ x: 2, y: 1, w: 2, h: 2 }, [elements[0]!]), 0);
});
