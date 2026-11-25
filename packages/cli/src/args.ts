export type Query = { kind: 'free'; x: number; y: number; w: number; h: number } | { kind: 'hit'; x: number; y: number };

export type CheckOptions = { file: string; text: boolean; queries: Query[] };
export type SubmitOptions = { file: string; out: string; page: boolean; text: boolean };

export type Command =
  | { kind: 'check'; options: CheckOptions }
  | { kind: 'submit'; options: SubmitOptions }
  | { kind: 'help'; text: string }
  | { kind: 'version' };

export class UsageError extends Error {}

const numbers = (value: string | undefined, count: number, flag: string): number[] => {
  const parts = String(value ?? '')
    .split(',')
    .map(part => Number(part.trim()));
  if (parts.length !== count || parts.some(part => !Number.isFinite(part))) {
    throw new UsageError(`${flag} 需要 ${count} 个数字，用逗号分隔，收到 "${value}"`);
  }
  return parts;
};

const HELP = `focusboard —— 一块板：查、交。

用法
  focusboard check  [file] [--text] [--free x,y,w,h] [--hit x,y]
  focusboard submit [file] [--out dir] [--page] [--text]

  file 省略或为 - 时从 stdin 读整块板 JSON。

check   只读：文字的列宽与折行、点与区域的查询。不写盘。
submit  提交：lint 通过就写出 SVG（--page 再写一个能直接打开的页面）。有 error 不写盘。

输出
  默认 JSON（给机器读），--text 切换人读。日志走 stderr。

退出码
  0 无 error   1 lint 有 error   2 用法错误`;

export function parseArgs(argv: readonly string[]): Command {
  const [command, ...rest] = argv;

  if (command === undefined || command === '--help' || command === '-h' || command === 'help') {
    return { kind: 'help', text: HELP };
  }
  if (command === '--version' || command === '-v') return { kind: 'version' };

  if (command !== 'check' && command !== 'submit') {
    throw new UsageError(`不认识的命令 "${command}"（只有 check / submit）`);
  }

  let file = '-';
  let text = false;
  let out = 'out';
  let page = false;
  const queries: Query[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i] as string;
    if (arg === '--text') {
      text = true;
    } else if (arg === '--page') {
      if (command !== 'submit') throw new UsageError('--page 只用于 submit');
      page = true;
    } else if (arg === '--out') {
      if (command !== 'submit') throw new UsageError('--out 只用于 submit');
      const value = rest[++i];
      if (!value) throw new UsageError('--out 需要一个目录');
      out = value;
    } else if (arg === '--free') {
      if (command !== 'check') throw new UsageError('--free 只用于 check');
      const [x, y, w, h] = numbers(rest[++i], 4, '--free');
      queries.push({ kind: 'free', x: x as number, y: y as number, w: w as number, h: h as number });
    } else if (arg === '--hit') {
      if (command !== 'check') throw new UsageError('--hit 只用于 check');
      const [x, y] = numbers(rest[++i], 2, '--hit');
      queries.push({ kind: 'hit', x: x as number, y: y as number });
    } else if (arg.startsWith('--')) {
      throw new UsageError(`不认识的参数 ${arg}`);
    } else if (file === '-') {
      file = arg;
    } else {
      throw new UsageError(`只能指定一个板文件，多出来 "${arg}"`);
    }
  }

  return command === 'check'
    ? { kind: 'check', options: { file, text, queries } }
    : { kind: 'submit', options: { file, out, page, text } };
}
