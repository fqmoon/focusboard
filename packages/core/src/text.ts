import type { Rect } from './schema.js';

export interface CharGrid {
  scale: number;
  cols: number;
  rows: number;
}

/** A glyph placed on the text grid; `x` and `w` are in cells. */
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
 * Cells a character occupies: one for full-width glyphs, half for everything
 * else. Half cells are why capacity is counted in cells, not characters.
 */
export function charWidth(ch: string): number {
  const codePoint = ch.codePointAt(0) ?? 0;
  return isWide(codePoint) ? 1 : 0.5;
}

export function charGrid(rect: Pick<Rect, 'w' | 'h' | 'textScale'>): CharGrid {
  const scale = rect.textScale ?? 1;
  return {
    scale,
    cols: Math.floor(rect.w / scale),
    rows: Math.floor(rect.h / scale)
  };
}

/**
 * Cursor after placing `ch` at `x`. A full-width glyph must sit inside a whole
 * cell, so it snaps forward to the next cell: an odd run of half-width glyphs
 * leaves a half cell of slack, and the CJK that follows starts on the grid.
 */
function advance(x: number, ch: string): number {
  const w = charWidth(ch);
  return w >= 1 ? Math.ceil(x) + w : x + w;
}

/**
 * Wraps by accumulated cell width, so `cols` is a width budget, not a
 * character count: six Latin characters or three CJK fit three cells.
 */
export function wrapText(text: string, cols: number): string[] {
  if (cols < 1) return [];

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
      const next = advance(used, ch);
      if (line !== '' && next > cols) {
        lines.push(line);
        line = '';
        used = 0;
      }
      used = advance(used, ch);
      line += ch;
    }
    if (line !== '') lines.push(line);
  }
  return lines;
}

/** Glyph positions of one line, in cells from the rect's left edge. */
export function placeLine(line: string): GlyphPlacement[] {
  const placements: GlyphPlacement[] = [];
  let x = 0;
  for (const ch of Array.from(line)) {
    const w = charWidth(ch);
    const end = advance(x, ch);
    placements.push({ ch, x: end - w, w });
    x = end;
  }
  return placements;
}

export function textFits(rect: Rect): boolean {
  if (!rect.text) return true;
  const { cols, rows } = charGrid(rect);
  if (cols < 1 || rows < 1) return false;
  return wrapText(rect.text, cols).length <= rows;
}

/** Lines that actually fit; extra lines are clipped by the renderer. */
export function visibleTextLines(rect: Rect): string[] {
  if (!rect.text) return [];
  const { cols, rows } = charGrid(rect);
  if (cols < 1 || rows < 1) return [];
  return wrapText(rect.text, cols).slice(0, rows);
}
