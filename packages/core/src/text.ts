import type { Rect } from './schema.js';

export interface CharGrid {
  scale: number;
  cols: number;
  rows: number;
}

export function charGrid(rect: Pick<Rect, 'w' | 'h' | 'textScale'>): CharGrid {
  const scale = rect.textScale ?? 1;
  return {
    scale,
    cols: Math.floor(rect.w / scale),
    rows: Math.floor(rect.h / scale)
  };
}

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
    for (let i = 0; i < chars.length; i += cols) {
      lines.push(chars.slice(i, i + cols).join(''));
    }
  }
  return lines;
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
