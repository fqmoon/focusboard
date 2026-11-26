import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { run, type Io } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = resolve(here, '../src/bin.js');

const board = {
  tier: 'medium',
  elements: [
    { id: 'a', type: 'rect', x: 1, y: 1, w: 6, h: 2, text: '缓存层' },
    { id: 'b', type: 'rect', x: 1, y: 5, w: 6, h: 2, text: '命中率' },
    { id: 'e', type: 'line', a: 'a', b: 'b', arrow: 'b' }
  ]
};

const broken = {
  tier: 'medium',
  elements: [{ id: 'e', type: 'line', a: 'a', b: 'nope' }]
};

interface Captured {
  code: number;
  out: string;
  err: string;
}

async function call(argv: readonly string[], options: { stdin?: string; cwd?: string } = {}): Promise<Captured> {
  let out = '';
  let err = '';
  const io: Io = {
    argv,
    stdin: async () => options.stdin ?? '',
    stdout: text => {
      out += text + '\n';
    },
    stderr: text => {
      err += text + '\n';
    },
    cwd: options.cwd,
    version: '9.9.9'
  };
  return { code: await run(io), out, err };
}

async function tempBoard(value: unknown): Promise<{ dir: string; file: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'focusboard-'));
  const file = join(dir, 'board.json');
  await writeFile(file, JSON.stringify(value));
  return { dir, file };
}

test('check defaults to JSON', async () => {
  const { file } = await tempBoard(board);
  const { code, out } = await call(['check', file]);
  assert.equal(code, 0);
  const result = JSON.parse(out);
  assert.deepEqual(result.errors, []);
  assert.equal(result.report.rects.length, 2);
});

test('check --text prints the human report', async () => {
  const { file } = await tempBoard(board);
  const { code, out } = await call(['check', file, '--text']);
  assert.equal(code, 0);
  assert.match(out, /a {2}6×2 {2}1\/2 行/);
  assert.match(out, /summary: 2 个框有字，共 2 行，最长 a 1 行/);
  assert.match(out, /errors 0 {2}warnings 0/);
});

test('check answers --free and --hit in argument order', async () => {
  const { file } = await tempBoard(board);
  const { out } = await call([
    'check',
    file,
    '--hit',
    '2,1',
    '--free',
    '1,1,6,2',
    '--hit',
    '20,20'
  ]);
  const result = JSON.parse(out);
  assert.deepEqual(result.hit, [
    { x: 2, y: 1, ids: ['a'] },
    { x: 20, y: 20, ids: [] }
  ]);
  assert.deepEqual(result.free, [{ x: 1, y: 1, w: 6, h: 2, cells: 0 }]);
});

test('check exits 1 and skips the report when lint has errors', async () => {
  const { file } = await tempBoard(broken);
  const { code, out } = await call(['check', file]);
  assert.equal(code, 1);
  const result = JSON.parse(out);
  assert.equal(result.errors.length, 2);
  assert.equal(result.report, null);
});

test('check reads the board from stdin when no file is given', async () => {
  const { code, out } = await call(['check', '--text'], { stdin: JSON.stringify(board) });
  assert.equal(code, 0);
  assert.match(out, /stdin/);
});

test('submit writes only the svg by default', async () => {
  const { dir, file } = await tempBoard(board);
  const out = join(dir, 'out');
  const { code, out: stdout } = await call(['submit', file, '--out', out]);
  assert.equal(code, 0);
  const result = JSON.parse(stdout);
  assert.equal(result.rendered, true);
  assert.deepEqual(result.wrote, [join(out, 'board.svg')]);
  assert.deepEqual(await readdir(out), ['board.svg']);
  assert.match(await readFile(join(out, 'board.svg'), 'utf8'), /^<svg /);
});

test('submit --page also writes an openable page', async () => {
  const { dir, file } = await tempBoard(board);
  const out = join(dir, 'out');
  const { code } = await call(['submit', file, '--out', out, '--page']);
  assert.equal(code, 0);
  assert.deepEqual((await readdir(out)).sort(), ['board.svg', 'index.html']);
  assert.match(await readFile(join(out, 'index.html'), 'utf8'), /<!doctype html>/);
});

test('submit refuses to write when lint has errors', async () => {
  const { dir, file } = await tempBoard(broken);
  const out = join(dir, 'out');
  const { code, out: stdout } = await call(['submit', file, '--out', out]);
  assert.equal(code, 1);
  assert.equal(JSON.parse(stdout).rendered, false);
  await assert.rejects(readdir(out));
});

test('usage errors exit 2', async () => {
  const { file } = await tempBoard(board);
  for (const argv of [
    ['check', file, '--nope'],
    ['draw', file],
    ['check', file, '--free', '1,2,3'],
    ['check', file, '--page'],
    ['submit', file, '--hit', '1,2']
  ]) {
    const { code, err } = await call(argv);
    assert.equal(code, 2, `argv ${argv.join(' ')} should be a usage error`);
    assert.match(err, /focusboard:/);
  }
});

test('unreadable file and bad JSON exit 2', async () => {
  const missing = await call(['check', '/nowhere/board.json']);
  assert.equal(missing.code, 2);

  const dir = await mkdtemp(join(tmpdir(), 'focusboard-'));
  const file = join(dir, 'board.json');
  await writeFile(file, 'not json');
  const bad = await call(['check', file]);
  assert.equal(bad.code, 2);
  assert.match(bad.err, /不是合法 JSON/);
});

test('--version and --help exit 0', async () => {
  const version = await call(['--version']);
  assert.equal(version.code, 0);
  assert.equal(version.out.trim(), '9.9.9');

  const help = await call(['--help']);
  assert.equal(help.code, 0);
  assert.match(help.out, /focusboard check/);
});

test('the bin reads a board from stdin', async () => {
  const child = spawn(process.execPath, [bin, 'check', '--text'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  child.stdin.end(JSON.stringify(board));

  let out = '';
  for await (const chunk of child.stdout) out += String(chunk);
  const code = await new Promise<number | null>(resolveExit => child.on('close', resolveExit));

  assert.equal(code, 0);
  assert.match(out, /2 rects/);
});
