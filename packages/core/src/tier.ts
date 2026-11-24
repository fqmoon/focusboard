export const TIER_NAMES = ['small', 'medium', 'large', 'drawing'] as const;

export type TierName = (typeof TIER_NAMES)[number];

export const TIERS = {
  small: { cols: 18, rows: 27 },
  medium: { cols: 36, rows: 24 },
  large: { cols: 48, rows: 30 },
  drawing: { cols: 96, rows: 60 }
} as const satisfies Record<TierName, { cols: number; rows: number }>;

/** Internal SVG user units per grid cell. Not exposed as a page parameter. */
export const CELL = 100;

export function pageOf(tier: TierName): {
  cols: number;
  rows: number;
  width: number;
  height: number;
} {
  const { cols, rows } = TIERS[tier];
  return { cols, rows, width: cols * CELL, height: rows * CELL };
}
