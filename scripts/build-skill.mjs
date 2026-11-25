#!/usr/bin/env node
/**
 * Build the skill package: one self-contained CLI + the instructions that tell
 * an agent how to use it, plus a human README and the license. The output is a
 * directory you can hand to anyone — no node_modules, no repo, no npm publish —
 * and a tarball next to it that is what gets attached to a release.
 *
 *   npm run build:skill
 *     -> dist/focusboard-skill/{README.md,SKILL.md,focusboard.mjs,board.example.json,LICENSE}
 *     -> dist/focusboard-skill-<version>.tar.gz
 */
import { execFile } from 'node:child_process';
import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { build } from 'esbuild';

const run = promisify(execFile);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const name = 'focusboard-skill';
const out = join(dist, name);

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const repo = 'https://github.com/fqmoon/focusboard';
const tarball = join(dist, `${name}-${pkg.version}.tar.gz`);

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

// Version and provenance are injected, so the artifact says where it came from
// even after it is copied out of the repo.
const stamp = `focusboard ${pkg.version}`;
for (const file of ['SKILL.md', 'README.md']) {
  const source = await readFile(join(root, 'skill', file), 'utf8');
  await writeFile(join(out, file), source.replace('<!-- version -->', stamp));
}

await cp(join(root, 'skill/board.example.json'), join(out, 'board.example.json'));
await cp(join(root, 'LICENSE'), join(out, 'LICENSE'));

// The tarball is the release asset; the directory is what you copy around when
// you are not packaging. `tar` ships with macOS and Linux, not with node.
try {
  await execFile('tar', ['-C', dist, '-czf', tarball, name]);
} catch {
  console.warn(`  未能打包 tarball（找不到 tar），目录仍然可用：dist/${name}/`);
}

const size = (await stat(bundle)).size;
console.log(`${name} ${pkg.version}`);
console.log(`  focusboard.mjs        ${(size / 1024).toFixed(0)} KB, 单文件、零依赖`);
console.log(`  SKILL.md              给 agent：三步、写板规则、判断`);
console.log(`  README.md             给人：装、用、命令、仓库链接`);
console.log(`  board.example.json    最小板`);
console.log(`  LICENSE               MIT © 2026 fqmoon`);
