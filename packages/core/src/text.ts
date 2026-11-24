import type { Rect } from './schema.js';

/** Text is measured in columns: one column is half a cell. */
export const COLUMNS_PER_CELL = 2;

export interface TextGrid {
  scale: number;
  /** Usable width in columns. Capacity is a width, not a character count. */
  columns: number;
  rows: number;
}

/** A glyph placed on the text grid; `x` and `w` are in columns. */
export interface GlyphPlacement {
  ch: string;
  x: number;
  w: number;
}

/** Full-width ranges: CJK, kana, hangul, fullwidth forms, emoji. */
function isWide(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2e80 && codePoint <= 0x303e) ||
    (codePoint >= 0x3041 && codePoint <= 0x33ff) ||
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0xa000 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x20000 && codePoint <= 0x3fffd)
  );
}

/**
 * Columns a character occupies: two for full-width glyphs, one for everything
 * else. Columns are the unit because it keeps every width an integer.
 */
export function charColumns(ch: string): number {
  const codePoint = ch.codePointAt(0) ?? 0;
  return isWide(codePoint) ? COLUMNS_PER_CELL : 1;
}

export function textGrid(rect: Pick<Rect, 'w' | 'h' | 'textScale'>): TextGrid {
  const scale = rect.textScale ?? 1;
  return {
    scale,
    columns: Math.floor(rect.w / scale) * COLUMNS_PER_CELL,
    rows: Math.floor(rect.h / scale)
  };
}

/**
 * Wraps by accumulated column width, so `columns` is a width budget, not a
 * character count: six Latin characters or three CJK fill six columns.
 * Nothing is padded, so glyphs land wherever the accumulated width puts them.
 */
export function wrapText(text: string, columns: number): string[] {
  if (columns < 1) return [];

  const lines: string[] = [];
  const normalized = text.replace(/\r\n?/g, '\n');
  for (const paragraph of normalized.split('\n')) {
    const chars = Array.from(paragraph);
    if (chars.length === 0) {
      lines.push('');
      continue;
    }

    let line = '';
    let used = 0;
    for (const ch of chars) {
      const w = charColumns(ch);
      if (line !== '' && used + w > columns) {
        lines.push(line);
        line = '';
        used = 0;
      }
      line += ch;
      used += w;
    }
    if (line !== '') lines.push(line);
  }
  return lines;
}

/** Glyph positions of one line, in columns from the rect's left edge. */
export function placeLine(line: string): GlyphPlacement[] {
  const placements: GlyphPlacement[] = [];
  let x = 0;
  for (const ch of Array.from(line)) {
    const w = charColumns(ch);
    placements.push({ ch, x, w });
    x += w;
  }
  return placements;
}

export function textFits(rect: Rect): boolean {
  if (!rect.text) return true;
  const { columns, rows } = textGrid(rect);
  if (columns < 1 || rows < 1) return false;
  return wrapText(rect.text, columns).length <= rows;
}

/** Lines that actually fit; extra lines are clipped by the renderer. */
export function visibleTextLines(rect: Rect): string[] {
  if (!rect.text) return [];
  const { columns, rows } = textGrid(rect);
  if (columns < 1 || rows < 1) return [];
  return wrapText(rect.text, columns).slice(0, rows);
}
