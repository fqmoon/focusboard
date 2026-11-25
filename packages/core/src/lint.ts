import { borderExit, centerOf, contains, crossesInterior, inside, isRect, overlaps, rectOf } from './query.js';
import type { Element, Line, Rect } from './schema.js';
import { TIERS } from './tier.js';
import { textGrid, wrapText } from './text.js';
import type { Issue, LintResult } from './types.js';
import { validateBoard } from './validate.js';

function issue(code: Issue['code'], ids: string[], message: string): Issue {
  return { code, ids, message };
}

function sortIssues(issues: Issue[]): Issue[] {
  return issues.sort((a, b) => {
    const byCode = a.code.localeCompare(b.code);
    if (byCode !== 0) return byCode;
    return a.ids.join(',').localeCompare(b.ids.join(','));
  });
}

export function lint(input: unknown): LintResult {
  const result = validateBoard(input);
  if (!result.ok) return { errors: sortIssues(result.errors), warnings: [] };

  const board = result.board;
  const elements = board.elements;
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  const byId = new Map<string, Element>();
  for (const element of elements) {
    if (byId.has(element.id)) {
      errors.push(issue('duplicate_id', [element.id], `id ${element.id} 重复`));
    } else {
      byId.set(element.id, element);
    }
  }

  const rects = elements.filter(isRect);
  const page = TIERS[board.tier];

  for (const rect of rects) {
    if (rect.x < 0 || rect.y < 0 || rect.x + rect.w > page.cols || rect.y + rect.h > page.rows) {
      warnings.push(
        issue('out_of_bounds', [rect.id], `${rect.id} 超出 ${page.cols}×${page.rows} 的页面`)
      );
    }

    const scale = rect.textScale ?? 1;
    if (rect.w % scale !== 0 || rect.h % scale !== 0) {
      warnings.push(
        issue(
          'text_scale_misaligned',
          [rect.id],
          `${rect.id} 的 ${rect.w}×${rect.h} 不是字格 ${scale}×${scale} 的整数倍`
        )
      );
    }

    if (rect.text) {
      const grid = textGrid(rect);
      if (grid.columns < 1 || grid.rows < 1) {
        warnings.push(issue('text_overflow', [rect.id], `${rect.id} 放不下任何字格`));
      } else {
        const lines = wrapText(rect.text, grid.columns).length;
        if (lines > grid.rows) {
          warnings.push(
            issue('text_overflow', [rect.id], `${rect.id} 文字溢出（${lines} 行 > ${grid.rows} 行）`)
          );
        }
      }
    }
  }

  for (const element of elements) {
    if (element.type !== 'line') continue;
    const line: Line = element;
    const a = byId.get(line.a);
    const b = byId.get(line.b);

    if (!a || a.type !== 'rect') {
      errors.push(issue('dangling_line', [line.id], `${line.id} 的 a 指向不存在的 rect ${line.a}`));
    }
    if (!b || b.type !== 'rect') {
      errors.push(issue('dangling_line', [line.id], `${line.id} 的 b 指向不存在的 rect ${line.b}`));
    }
  }

  for (const element of elements) {
    if (element.type !== 'line') continue;
    const line: Line = element;
    const from = byId.get(line.a);
    const to = byId.get(line.b);
    if (!from || from.type !== 'rect' || !to || to.type !== 'rect') continue;

    const regionFrom = rectOf(from);
    const regionTo = rectOf(to);
    const start = borderExit(regionFrom, centerOf(regionTo));
    const end = borderExit(regionTo, centerOf(regionFrom));

    for (const rect of rects) {
      if (rect.id === from.id || rect.id === to.id) continue;
      const region = rectOf(rect);
      // A line living entirely inside a box is a normal enclosing box, not a
      // line cutting through something.
      if (inside(start, region) && inside(end, region)) continue;
      if (!crossesInterior(start, end, region)) continue;
      warnings.push(
        issue(
          'line_crosses_rect',
          [line.id, rect.id],
          `${line.id}（${from.id}→${to.id}）穿过 ${rect.id}`
        )
      );
    }
  }

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a: Rect | undefined = rects[i];
      const b: Rect | undefined = rects[j];
      if (!a || !b) continue;
      if (!overlaps(rectOf(a), rectOf(b))) continue;
      if (contains(rectOf(a), rectOf(b)) || contains(rectOf(b), rectOf(a))) continue;
      warnings.push(issue('partial_overlap', [a.id, b.id], `${a.id} 与 ${b.id} 部分重叠`));
    }
  }

  return {
    errors: sortIssues(errors),
    warnings: sortIssues(warnings)
  };
}
