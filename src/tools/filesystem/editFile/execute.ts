import { Buffer } from 'node:buffer';
import { lstat } from 'node:fs/promises';
import type { ToolExecutionContext } from '../../types.js';
import { resolveWorkspaceFile } from '../shared/pathSafety.js';
import { readTextFile } from '../shared/textFile.js';
import { replaceTextFileAtomically } from '../shared/writeTextFile.js';
import type { EditFileInput } from './input.js';

export type EditFileResult = {
  path: string;
  replacements: number;
  bytesWritten: number;
};

export async function executeEditFile(
  input: EditFileInput,
  context: ToolExecutionContext,
): Promise<EditFileResult> {
  const file = await resolveWorkspaceFile(context.cwd, input.path, { allowSymlink: false });
  const contents = await readTextFile(file.targetPath);
  const occurrences = countOccurrences(contents, input.oldText);

  if (occurrences !== input.expectedOccurrences) {
    throw new Error(
      `Expected ${input.expectedOccurrences} occurrence(s) of "oldText" but found ${occurrences}; file was not changed.`,
    );
  }

  const updatedContents = contents.split(input.oldText).join(input.newText);
  const mode = (await lstat(file.targetPath)).mode;
  await replaceTextFileAtomically(file.targetPath, updatedContents, mode);

  return {
    path: file.relativePath,
    replacements: occurrences,
    bytesWritten: Buffer.byteLength(updatedContents, 'utf8'),
  };
}

function countOccurrences(contents: string, query: string): number {
  return contents.split(query).length - 1;
}
