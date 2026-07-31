import { readFile, stat } from 'node:fs/promises';

export const MAX_TEXT_FILE_BYTES = 2_000_000;

export class UnsupportedTextFileError extends Error {}

export async function readTextFile(path: string): Promise<string> {
  const fileStats = await stat(path);
  if (fileStats.size > MAX_TEXT_FILE_BYTES) {
    throw new UnsupportedTextFileError(`File exceeds the ${MAX_TEXT_FILE_BYTES}-byte text limit.`);
  }

  const contents = await readFile(path);
  if (contents.length > MAX_TEXT_FILE_BYTES) {
    throw new UnsupportedTextFileError(`File exceeds the ${MAX_TEXT_FILE_BYTES}-byte text limit.`);
  }
  if (contents.includes(0)) {
    throw new UnsupportedTextFileError('Binary files are not supported.');
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(contents);
  } catch {
    throw new UnsupportedTextFileError('File is not valid UTF-8 text.');
  }
}
