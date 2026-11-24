import {
  CELL,
  pageOf,
  placeLine,
  visibleTextLines,
  type Board,
  type Element,
  type Line,
  type Rect
} from '@focusboard/core';

const BOARD_BG = '#1b2723';
const RECT_FILL = 'rgba(255,255,255,0.055)';
const INK = '#e9e4d6';
const LINE_INK = '#8fb3a3';

const INSET = 2;
/** Corner radius in cells: scales with the board, unlike the stroke. */
const RADIUS = CELL * 0.18;
const STROKE = 1.5;
/** Arrow geometry is in cells, so it stays proportional to the board. */
const ARROW_LEN = CELL * 0.55;
const ARROW_HALF = CELL * 0.22;
/** Arrows eat at most this share of a short line. */
const ARROW_MAX_SHARE = 0.4;
/**
 * Font size as a share of the character cell. Full-width glyphs sit a bit
 * smaller so they do not fill the cell; half-width glyphs need a bigger
 * font-size to span their half cell, otherwise Latin drifts apart again.
 */
const GLYPH_RATIO_WIDE = 0.72;
const GLYPH_RATIO_NARROW = 0.78;

const FONT =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Noto Sans Mono CJK SC', monospace";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });
}

function visualRect(rect: Rect): Box {
  return {
    x: rect.x * CELL + INSET,
    y: rect.y * CELL + INSET,
    w: Math.max(1, rect.w * CELL - INSET * 2),
    h: Math.max(1, rect.h * CELL - INSET * 2)
  };
}

function center(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

/**
 * Point where a ray from the box centre toward `toward` leaves the box.
 * Used to crop line ends to the border.
 */
function exitPoint(box: Box, from: Point, toward: Point): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) return from;

  let t = Number.POSITIVE_INFINITY;
  if (dx > 0) t = Math.min(t, (box.x + box.w - from.x) / dx);
  if (dx < 0) t = Math.min(t, (box.x - from.x) / dx);
  if (dy > 0) t = Math.min(t, (box.y + box.h - from.y) / dy);
  if (dy < 0) t = Math.min(t, (box.y - from.y) / dy);

  if (!Number.isFinite(t) || t <= 0) return from;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function arrowPath(tip: Point, toward: Point): string {
  const dx = tip.x - toward.x;
  const dy = tip.y - toward.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return '';

  const size = Math.min(ARROW_LEN, len * ARROW_MAX_SHARE);
  const half = Math.min(ARROW_HALF, size / 2);
  const ux = dx / len;
  const uy = dy / len;
  const baseX = tip.x - ux * size;
  const baseY = tip.y - uy * size;
  const px = -uy;
  const py = ux;

  return (
    `M${tip.x},${tip.y} ` +
    `L${baseX + px * half},${baseY + py * half} ` +
    `L${baseX - px * half},${baseY - py * half} Z`
  );
}

function renderRect(rect: Rect): string {
  const border = rect.border ?? 'solid';
  const box = visualRect(rect);
  const parts: string[] = [];

  if (border !== 'none') {
    const dash = border === 'dashed' ? ' stroke-dasharray="12 8"' : '';
    parts.push(
      `<rect data-id="${esc(rect.id)}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" ` +
        `rx="${RADIUS}" fill="${RECT_FILL}" stroke="${LINE_INK}" stroke-width="${STROKE}"` +
        ` vector-effect="non-scaling-stroke"${dash}/>`
    );
  }

  if (rect.text) {
    const scale = rect.textScale ?? 1;
    const cell = scale * CELL;
    const lines = visibleTextLines(rect);

    for (let row = 0; row < lines.length; row++) {
      const cy = rect.y * CELL + row * cell + cell / 2;
      for (const glyph of placeLine(lines[row] ?? '')) {
        const cx = rect.x * CELL + (glyph.x + glyph.w / 2) * cell;
        const ratio = glyph.w >= 1 ? GLYPH_RATIO_WIDE : GLYPH_RATIO_NARROW;
        const size = cell * ratio;
        parts.push(
          `<text x="${cx}" y="${cy}" font-family="${FONT}" font-size="${size}" ` +
            `fill="${INK}" text-anchor="middle" dominant-baseline="central">${esc(
              glyph.ch
            )}</text>`
        );
      }
    }
  }

  return parts.join('');
}

function renderLine(line: Line, byId: Map<string, Rect>): string {
  const a = byId.get(line.a);
  const b = byId.get(line.b);
  if (!a || !b) return '';

  const boxA = visualRect(a);
  const boxB = visualRect(b);
  const centerA = center(boxA);
  const centerB = center(boxB);
  if (centerA.x === centerB.x && centerA.y === centerB.y) return '';

  const start = exitPoint(boxA, centerA, centerB);
  const end = exitPoint(boxB, centerB, centerA);
  const style = line.style ?? 'solid';
  const dash = style === 'dashed' ? ' stroke-dasharray="14 10"' : '';
  const arrow = line.arrow ?? 'none';

  const parts: string[] = [
    `<path data-id="${esc(line.id)}" d="M${start.x},${start.y} L${end.x},${end.y}" fill="none" stroke="${LINE_INK}" ` +
      `stroke-width="${STROKE}" vector-effect="non-scaling-stroke" stroke-linecap="round"${dash}/>`
  ];

  if (arrow === 'b' || arrow === 'both') {
    const path = arrowPath(end, start);
    if (path) parts.push(`<path d="${path}" fill="${LINE_INK}"/>`);
  }
  if (arrow === 'a' || arrow === 'both') {
    const path = arrowPath(start, end);
    if (path) parts.push(`<path d="${path}" fill="${LINE_INK}"/>`);
  }

  return parts.join('');
}

/**
 * Pure SVG serializer: elements + tier -> string. No DOM, no measurement.
 * Elements are emitted in array order; that order is the paint order.
 */
export function toSVG(board: Board): string {
  const page = pageOf(board.tier);
  const rects = new Map<string, Rect>();
  for (const element of board.elements) {
    if (element.type === 'rect') rects.set(element.id, element);
  }

  const body = board.elements
    .map((element: Element) =>
      element.type === 'rect' ? renderRect(element) : renderLine(element, rects)
    )
    .join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.width} ${page.height}" ` +
    `width="${page.width}" height="${page.height}" data-tier="${board.tier}">` +
    `<rect width="100%" height="100%" fill="${BOARD_BG}"/>` +
    body +
    `</svg>`
  );
}
