#!/usr/bin/env node
/**
 * Build the skill package: one self-contained CLI + the instructions that tell
 * an agent how to use it. The output is a directory you can hand to anyone —
 * no node_modules, no repo, no npm publish.
 *
 *   npm run build:skill   ->  dist/skill/{SKILL.md,focusboard.mjs,board.example.json}
 */
import { build } from 'esbuild';
import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist/skill');

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// Bundle from source, so the artifact never drifts from what the tests cover.
// The entry keeps its own shebang; esbuild preserves it, a banner would double it.
await build({
  entryPoints: [join(root, 'packages/cli/src/bin.ts')],
  outfile: join(out, 'focusboard.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  minify: true,
  legalComments: 'none',
  define: { 'process.env.FOCUSBOARD_VERSION': JSON.stringify(pkg.version) },
  alias: {
    '@focusboard/core': join(root, 'packages/core/src/index.ts'),
    '@focusboard/svg-render': join(root, 'packages/svg-render/src/index.ts')
  }
});

const bundle = join(out, 'focusboard.mjs');
await chmod(bundle, 0o755);

const skill = await readFile(join(root, 'skill/SKILL.md'), 'utf8');
await writeFile(
  join(out, 'SKILL.md'),
  skill.replace('<!-- version -->', `<!-- focusboard ${pkg.version} -->`)
);
await cp(join(root, 'skill/board.example.json'), join(out, 'board.example.json'));

const size = (await stat(bundle)).size;
console.log(`dist/skill/  focusboard ${pkg.version}`);
console.log(`  focusboard.mjs        ${(size / 1024).toFixed(0)} KB, 单文件、零依赖`);
console.log(`  SKILL.md`);
console.log(`  board.example.json`);
