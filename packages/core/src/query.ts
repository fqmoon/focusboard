import type { Element, Rect } from './schema.js';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function isRect(element: Element): element is Rect {
  return element.type === 'rect';
}

export function rectOf(element: Rect): Region {
  return { x: element.x, y: element.y, w: element.w, h: element.h };
}

export function bounds(elements: readonly Element[]): Region {
  const rects = elements.filter(isRect);
  if (rects.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  let x1 = Number.POSITIVE_INFINITY;
  let y1 = Number.POSITIVE_INFINITY;
  let x2 = Number.NEGATIVE_INFINITY;
  let y2 = Number.NEGATIVE_INFINITY;

  for (const rect of rects) {
    x1 = Math.min(x1, rect.x);
    y1 = Math.min(y1, rect.y);
    x2 = Math.max(x2, rect.x + rect.w);
    y2 = Math.max(y2, rect.y + rect.h);
  }

  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/** Positive-area intersection. Touching edges do not count. */
export function overlaps(a: Region, b: Region): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Strict containment: same rectangle is not contained. */
export function contains(a: Region, b: Region): boolean {
  const inside =
    a.x <= b.x &&
    a.y <= b.y &&
    a.x + a.w >= b.x + b.w &&
    a.y + a.h >= b.y + b.h;
  return inside && (a.w > b.w || a.h > b.h);
}

export function hit(x: number, y: number, elements: readonly Element[]): string[] {
  return elements
    .filter(isRect)
    .filter(rect => x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h)
    .map(rect => rect.id);
}

/**
 * Free cells in a region. Rects are clipped to the region and counted once,
 * so overlapping rects cannot make the result negative.
 */
export function free(region: Region, elements: readonly Element[]): number {
  const rx = Math.floor(region.x);
  const ry = Math.floor(region.y);
  const rw = Math.max(0, Math.floor(region.w));
  const rh = Math.max(0, Math.floor(region.h));
  const total = rw * rh;
  if (total === 0) return 0;
  if (total > 2_000_000) throw new RangeError('region too large');

  const covered = new Uint8Array(total);
  for (const element of elements) {
    if (!isRect(element)) continue;

    const x1 = Math.max(rx, element.x);
    const y1 = Math.max(ry, element.y);
    const x2 = Math.min(rx + rw, element.x + element.w);
    const y2 = Math.min(ry + rh, element.y + element.h);

    for (let y = y1; y < y2; y++) {
      const row = (y - ry) * rw;
      for (let x = x1; x < x2; x++) {
        covered[row + (x - rx)] = 1;
      }
    }
  }

  let used = 0;
  for (const value of covered) used += value;
  return total - used;
}
