import { isRect } from './query.js';
import type { Board, Rect } from './schema.js';
import { placeLine, textGrid, wrapText } from './text.js';

export interface LineReport {
  text: string;
  /** Columns this line consumes. */
  columns: number;
  /**
   * Full-width glyphs starting on an odd column, i.e. hanging half a cell off
   * the grid. Harmless, but it is why two CJK columns may not line up.
   */
  hanging: string[];
}

export interface RectReport {
  id: string;
  w: number;
  h: number;
  /** Capacity of one line, in columns. */
  columns: number;
  rows: number;
  lines: LineReport[];
  /** Widest line, in columns. */
  widest: number;
  /** True when a paragraph had to be soft-wrapped by the renderer. */
  rewrapped: boolean;
  /** True when the text needs more rows than the rect has. */
  overflow: boolean;
}

export interface MeasureReport {
  rects: RectReport[];
  lineCount: number;
}

function measureRect(rect: Rect): RectReport {
  const grid = textGrid(rect);
  const text = rect.text ?? '';
  const wrapped = text !== '' && grid.columns >= 1 ? wrapText(text, grid.columns) : [];
  const paragraphs = text === '' ? 0 : text.replace(/\r\n?/g, '\n').split('\n').length;

  const lines = wrapped.map(line => {
    const placed = placeLine(line);
    const last = placed.at(-1);
    return {
      text: line,
      columns: last ? last.x + last.w : 0,
      hanging: placed.filter(glyph => glyph.w > 1 && glyph.x % 2 === 1).map(glyph => glyph.ch)
    };
  });

  return {
    id: rect.id,
    w: rect.w,
    h: rect.h,
    columns: grid.columns,
    rows: grid.rows,
    lines,
    widest: lines.reduce((max, line) => Math.max(max, line.columns), 0),
    rewrapped: wrapped.length > paragraphs,
    overflow: wrapped.length > grid.rows
  };
}

/** Read-only view of how each rect's text fills its cells. No lint, no drawing. */
export function measure(board: Board): MeasureReport {
  const rects = board.elements.filter(isRect).map(measureRect);
  return {
    rects,
    lineCount: rects.reduce((sum, rect) => sum + rect.lines.length, 0)
  };
}
