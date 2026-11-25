import type { Element, Rect } from './schema.js';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export function centerOf(region: Region): Point {
  return { x: region.x + region.w / 2, y: region.y + region.h / 2 };
}

/**
 * Point where a ray from the region's centre toward `toward` leaves the
 * border. Lines are drawn between these points, so the middle of a line can
 * still land on top of a third rect; see `crossesInterior`.
 */
export function borderExit(region: Region, toward: Point): Point {
  const from = centerOf(region);
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  if (dx === 0 && dy === 0) return from;

  let t = Number.POSITIVE_INFINITY;
  if (dx > 0) t = Math.min(t, (region.x + region.w - from.x) / dx);
  if (dx < 0) t = Math.min(t, (region.x - from.x) / dx);
  if (dy > 0) t = Math.min(t, (region.y + region.h - from.y) / dy);
  if (dy < 0) t = Math.min(t, (region.y - from.y) / dy);

  if (!Number.isFinite(t) || t <= 0) return from;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

export function inside(point: Point, region: Region): boolean {
  return (
    point.x >= region.x &&
    point.x <= region.x + region.w &&
    point.y >= region.y &&
    point.y <= region.y + region.h
  );
}

/**
 * Does the segment pass through the *interior* of `region`? Grazing an edge or
 * a corner is not a crossing: the rect is shrunk by `eps` first, so a line that
 * runs exactly along a border stays clean.
 */
export function crossesInterior(from: Point, to: Point, region: Region, eps = 1e-9): boolean {
  const x1 = region.x + eps;
  const y1 = region.y + eps;
  const x2 = region.x + region.w - eps;
  const y2 = region.y + region.h - eps;
  if (x2 <= x1 || y2 <= y1) return false;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t0 = 0;
  let t1 = 1;

  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  if (!clip(-dx, from.x - x1)) return false;
  if (!clip(dx, x2 - from.x)) return false;
  if (!clip(-dy, from.y - y1)) return false;
  if (!clip(dy, y2 - from.y)) return false;
  return t1 - t0 > 0;
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
