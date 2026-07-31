import { Buffer } from 'node:buffer';
import type { ToolExecutionContext } from '../../types.js';
import { resolveWritableWorkspaceFile } from '../shared/pathSafety.js';
import { createTextFile, replaceTextFileAtomically } from '../shared/writeTextFile.js';
import type { WriteFileInput } from './input.js';

export type WriteFileResult = {
  path: string;
  created: boolean;
  bytesWritten: number;
};

export async function executeWriteFile(
  input: WriteFileInput,
  context: ToolExecutionContext,
): Promise<WriteFileResult> {
  const file = await resolveWritableWorkspaceFile(
    context.cwd,
    input.path,
    input.createParentDirectories,
  );

  if (file.exists && !input.overwrite) {
    throw new Error(`File already exists: ${file.relativePath}`);
  }

  if (file.exists || input.overwrite) {
    await replaceTextFileAtomically(file.targetPath, input.content, file.mode);
  } else {
    await createTextFile(file.targetPath, input.content);
  }

  return {
    path: file.relativePath,
    created: !file.exists,
    bytesWritten: Buffer.byteLength(input.content, 'utf8'),
  };
}
