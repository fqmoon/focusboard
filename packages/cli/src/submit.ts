import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { lint, type Board } from '@focusboard/core';
import type { Issue } from '@focusboard/core';
import { toSVG } from '@focusboard/svg-render';

export interface SubmitResult {
  errors: Issue[];
  warnings: Issue[];
  rendered: boolean;
  wrote: string[];
}

const page = (svg: string): string => `<!doctype html>
<meta charset="utf-8">
<title>focusboard</title>
<style>
  html, body { margin: 0; height: 100%; background: #101715; }
  body { display: grid; place-items: center; }
  svg { max-width: 100vw; max-height: 100vh; height: auto; }
</style>
${svg}
`;

/**
 * Submit a board: lint, then render. Nothing is written while errors stand, so
 * a broken submission leaves the previous page alone.
 */
export async function runSubmit(
  input: unknown,
  out: string,
  withPage: boolean
): Promise<SubmitResult> {
  const { errors, warnings } = lint(input);

  if (errors.length > 0) {
    return { errors, warnings, rendered: false, wrote: [] };
  }

  const svg = toSVG(input as Board);
  const dir = resolve(out);
  await mkdir(dir, { recursive: true });

  const svgPath = join(dir, 'board.svg');
  await writeFile(svgPath, svg);
  const wrote = [svgPath];

  if (withPage) {
    const htmlPath = join(dir, 'index.html');
    await writeFile(htmlPath, page(svg));
    wrote.push(htmlPath);
  }

  return { errors, warnings, rendered: true, wrote };
}
