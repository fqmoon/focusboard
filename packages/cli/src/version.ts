import { readFileSync } from 'node:fs';

function fromPackageJson(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * The bundled skill has no package.json next to it, so the build substitutes
 * FOCUSBOARD_VERSION at bundle time; in the repo it comes from package.json.
 */
export const version: string = process.env.FOCUSBOARD_VERSION ?? fromPackageJson();
