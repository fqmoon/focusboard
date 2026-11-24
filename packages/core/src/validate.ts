import { Ajv2020 } from 'ajv/dist/2020.js';
import type { ErrorObject } from 'ajv';

import { boardSchema, type Board } from './schema.js';
import type { Issue, IssueCode } from './types.js';

export type ValidateResult =
  | { ok: true; board: Board }
  | { ok: false; errors: Issue[] };

const ajv = new Ajv2020({ allErrors: true, strict: true });
const check = ajv.compile(boardSchema);

function codeOf(error: ErrorObject): IssueCode {
  switch (error.keyword) {
    case 'required':
      return 'missing_field';
    case 'type':
      return error.params.type === 'integer' ? 'not_integer' : 'invalid_type';
    case 'enum':
      return 'invalid_enum';
    case 'minimum':
    case 'maximum':
    case 'minLength':
      return 'out_of_range';
    case 'multipleOf':
      return 'not_integer';
    case 'additionalProperties':
      return 'unknown_field';
    case 'oneOf':
    case 'const':
      return 'unknown_type';
    default:
      return 'invalid_type';
  }
}

function messageOf(error: ErrorObject): string {
  const path = error.instancePath || '/';
  if (error.keyword === 'required') {
    return `${path} 缺少 ${String(error.params.missingProperty)}`;
  }
  if (error.keyword === 'additionalProperties') {
    return `${path} 有未知字段 ${String(error.params.additionalProperty)}`;
  }
  return `${path} ${error.message ?? '不合法'}`;
}

export function mapAjvErrors(errors: readonly ErrorObject[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Set<string>();

  for (const error of errors) {
    const path = error.instancePath || '/';
    const code = codeOf(error);
    const message = messageOf(error);
    const key = `${code}:${path}:${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({ code, ids: [], message, path });
  }

  return issues;
}

export function validateBoard(input: unknown): ValidateResult {
  if (check(input)) {
    return { ok: true, board: input as Board };
  }
  return { ok: false, errors: mapAjvErrors(check.errors ?? []) };
}
