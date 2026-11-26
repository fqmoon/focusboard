import type { CheckResult } from './check.js';

/** Human report for `check --text`: per rect, how wide each line is. */
export function checkText(result: CheckResult, source: string): string {
  const lines: string[] = [];
  const report = result.report;

  if (report) {
    lines.push(`${source}  ${report.rects.length} rects  ${report.lineCount} lines`);
  }
  lines.push(`errors ${result.errors.length}  warnings ${result.warnings.length}`);
  for (const issue of result.errors) lines.push(`  error ${issue.code}  ${issue.message}`);
  for (const issue of result.warnings) lines.push(`  warn  ${issue.code}  ${issue.message}`);

  if (report) {
    let rewrapped = 0;
    let hanging = 0;
    let longest: { id: string; lines: number } | undefined;

    for (const rect of report.rects) {
      if (rect.lines.length === 0) continue;

      if (!longest || rect.lines.length > longest.lines) {
        longest = { id: rect.id, lines: rect.lines.length };
      }

      lines.push('');
      lines.push(`${rect.id}  ${rect.w}×${rect.h}  ${rect.lines.length}/${rect.rows} 行  （一行 ${rect.columns} 列）`);

      for (const [index, line] of rect.lines.entries()) {
        lines.push(`  L${index + 1}  ${String(line.columns).padStart(3)} 列   ${line.text}`);
      }

      if (rect.rewrapped) {
        rewrapped += 1;
        lines.push('  ~ 有段落被自动折行（写的时候以为是一行）');
      }
      if (rect.overflow) lines.push('  ! 行数超过框高，超出的行会被裁掉');

      const offGrid = rect.lines.filter(line => line.hanging.length > 0);
      if (offGrid.length > 0) {
        hanging += 1;
        const detail = offGrid
          .map(line => `L${rect.lines.indexOf(line) + 1} ${line.hanging.join('')}`)
          .join('  ');
        lines.push(`  ~ 汉字偏半格（不落整格）：${detail}`);
      }
    }

    lines.push('');
    const filled = report.rects.filter(rect => rect.lines.length > 0).length;
    const most = longest ? `，最长 ${longest.id} ${longest.lines} 行` : '';
    lines.push(
      `summary: ${filled} 个框有字，共 ${report.lineCount} 行${most}；${rewrapped} 处自动折行，${hanging} 个框汉字偏半格`
    );
  }

  if (result.free.length > 0 || result.hit.length > 0) {
    lines.push('');
    for (const answer of result.free) {
      lines.push(`free ${answer.x},${answer.y} ${answer.w}×${answer.h} → ${answer.cells} 格`);
    }
    for (const answer of result.hit) {
      const who = answer.ids.length === 0 ? '(空)' : answer.ids.join(' ');
      lines.push(`hit ${answer.x},${answer.y} → ${who}`);
    }
  }

  return lines.join('\n');
}
