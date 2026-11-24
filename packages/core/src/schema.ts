import type { FromSchema } from 'json-schema-to-ts';

import { TIER_NAMES } from './tier.js';

export const RECT_BORDERS = ['solid', 'dashed', 'none'] as const;
export const LINE_STYLES = ['solid', 'dashed'] as const;
export const LINE_ARROWS = ['none', 'a', 'b', 'both'] as const;

/**
 * The only schema. Ajv validates against it and the public types are derived
 * from it, so there is exactly one place where fields and enums are defined.
 */
export const boardSchema = {
  $id: 'https://focusboard.dev/schema/board.json',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['tier', 'elements'],
  additionalProperties: false,
  properties: {
    tier: { type: 'string', enum: TIER_NAMES },
    elements: {
      type: 'array',
      items: {
        oneOf: [{ $ref: '#/$defs/rect' }, { $ref: '#/$defs/line' }]
      }
    }
  },
  $defs: {
    rect: {
      type: 'object',
      required: ['id', 'type', 'x', 'y', 'w', 'h'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        type: { const: 'rect' },
        x: { type: 'integer' },
        y: { type: 'integer' },
        w: { type: 'integer', minimum: 1 },
        h: { type: 'integer', minimum: 1 },
        text: { type: 'string' },
        textScale: { type: 'integer', minimum: 1 },
        border: { type: 'string', enum: RECT_BORDERS }
      }
    },
    line: {
      type: 'object',
      required: ['id', 'type', 'a', 'b'],
      additionalProperties: false,
      properties: {
        id: { type: 'string', minLength: 1 },
        type: { const: 'line' },
        a: { type: 'string', minLength: 1 },
        b: { type: 'string', minLength: 1 },
        style: { type: 'string', enum: LINE_STYLES },
        arrow: { type: 'string', enum: LINE_ARROWS }
      }
    }
  }
} as const;

export type Board = FromSchema<typeof boardSchema>;
export type Element = Board['elements'][number];
export type Rect = Extract<Element, { type: 'rect' }>;
export type Line = Extract<Element, { type: 'line' }>;
export type Border = NonNullable<Rect['border']>;
export type LineStyle = NonNullable<Line['style']>;
export type Arrow = NonNullable<Line['arrow']>;
