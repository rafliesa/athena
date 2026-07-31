import { randomUUID } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export async function createTextFile(path: string, contents: string): Promise<void> {
  try {
    await writeFile(path, contents, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      throw new Error(`File already exists: ${path}`, { cause: error });
    }
    throw error;
  }
}

export async function replaceTextFileAtomically(
  path: string,
  contents: string,
  mode?: number,
): Promise<void> {
  const temporaryPath = join(dirname(path), `.athena-${basename(path)}-${randomUUID()}.tmp`);

  try {
    await writeFile(temporaryPath, contents, {
      encoding: 'utf8',
      flag: 'wx',
      ...(mode === undefined ? {} : { mode }),
    });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'EEXIST'
  );
}
