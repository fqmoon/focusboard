import assert from 'node:assert/strict';
import test from 'node:test';

import { validateBoard } from '../src/index.js';

test('accepts a valid board', () => {
  const result = validateBoard({
    tier: 'small',
    elements: [
      { id: 'a', type: 'rect', x: 0, y: 0, w: 3, h: 2, text: '缓存层' },
      { id: 'b', type: 'rect', x: 4, y: 0, w: 3, h: 2 },
      { id: 'e', type: 'line', a: 'a', b: 'b', arrow: 'b' }
    ]
  });
  assert.equal(result.ok, true);
});

test('rejects a missing required field', () => {
  const result = validateBoard({
    tier: 'small',
    elements: [{ id: 'a', type: 'rect', x: 0, y: 0, w: 2 }]
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some(error => error.code === 'missing_field'));
  }
});

test('rejects an unknown element type', () => {
  const result = validateBoard({
    tier: 'small',
    elements: [{ id: 'a', type: 'circle', x: 0, y: 0, w: 2, h: 2 }]
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some(error => error.code === 'unknown_type'));
  }
});

test('rejects an invalid enum value', () => {
  const result = validateBoard({ tier: 'huge', elements: [] });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some(error => error.code === 'invalid_enum'));
  }
});

test('rejects non-integer coordinates', () => {
  const result = validateBoard({
    tier: 'small',
    elements: [{ id: 'a', type: 'rect', x: 1.5, y: 0, w: 2, h: 2 }]
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some(error => error.code === 'not_integer'));
  }
});

test('rejects unknown fields', () => {
  const result = validateBoard({
    tier: 'small',
    elements: [{ id: 'a', type: 'rect', x: 0, y: 0, w: 2, h: 2, color: 'red' }]
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some(error => error.code === 'unknown_field'));
  }
});
