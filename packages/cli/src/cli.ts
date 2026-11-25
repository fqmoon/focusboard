import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { parseArgs, UsageError } from './args.js';
import { runCheck } from './check.js';
import { checkText } from './report.js';
import { runSubmit } from './submit.js';

export interface Io {
  argv: readonly string[];
  stdin: () => Promise<string>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  cwd?: string;
  version?: string;
}

const readBoard = async (file: string, io: Io): Promise<{ input: unknown; source: string }> => {
  const source = file === '-' ? 'stdin' : file;
  let raw: string;
  if (file === '-') {
    raw = await io.stdin();
  } else {
    try {
      raw = await readFile(resolve(io.cwd ?? process.cwd(), file), 'utf8');
    } catch {
      throw new UsageError(`读不到板文件 ${file}`);
    }
  }

  try {
    return { input: JSON.parse(raw), source };
  } catch (error) {
    throw new UsageError(`板不是合法 JSON：${String(error)}`);
  }
};

/** One command in, one receipt out. Returns the exit code. */
export async function run(io: Io): Promise<number> {
  let command;
  try {
    command = parseArgs(io.argv);
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(`focusboard: ${error.message}`);
      io.stderr('试试 focusboard --help');
      return 2;
    }
    throw error;
  }

  if (command.kind === 'help') {
    io.stdout(command.text);
    return 0;
  }
  if (command.kind === 'version') {
    io.stdout(io.version ?? '0.0.0');
    return 0;
  }

  try {
    if (command.kind === 'check') {
      const { file, text, queries } = command.options;
      const { input, source } = await readBoard(file, io);
      const result = runCheck(input, queries);

      if (text) {
        const name = source === 'stdin' ? 'stdin' : basename(source);
        io.stdout(checkText(result, name));
      } else {
        io.stdout(JSON.stringify(result, null, 2));
      }
      return result.errors.length > 0 ? 1 : 0;
    }

    const { file, out, page, text } = command.options;
    const { input } = await readBoard(file, io);
    const result = await runSubmit(input, out, page);

    if (text) {
      if (result.rendered) {
        io.stdout(result.wrote.join('\n'));
      } else {
        io.stdout(`不渲染：${result.errors.map(error => error.message).join('; ')}`);
      }
      for (const warning of result.warnings) io.stderr(`warning ${warning.code}: ${warning.message}`);
    } else {
      io.stdout(JSON.stringify(result, null, 2));
    }
    return result.errors.length > 0 ? 1 : 0;
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr(`focusboard: ${error.message}`);
      return 2;
    }
    throw error;
  }
}
