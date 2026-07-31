import type { ToolExecutionContext } from '../../types.js';
import { resolveWorkspaceFile } from '../shared/pathSafety.js';
import { readTextFile } from '../shared/textFile.js';
import type { ReadFileInput } from './input.js';

const MAX_RETURNED_LINES = 1_000;
const MAX_RETURNED_CHARACTERS = 100_000;

export type ReadFileResult = {
  path: string;
  content: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  truncated: boolean;
  nextStartLine: number | null;
};

export async function executeReadFile(
  input: ReadFileInput,
  context: ToolExecutionContext,
): Promise<ReadFileResult> {
  const file = await resolveWorkspaceFile(context.cwd, input.path);
  const contents = await readTextFile(file.targetPath);
  const lines = contents.split('\n');
  const startLine = input.startLine ?? 1;
  const requestedEndLine = input.endLine ?? startLine + MAX_RETURNED_LINES - 1;

  if (requestedEndLine < startLine) {
    throw new Error('"endLine" must be greater than or equal to "startLine".');
  }
  if (startLine > lines.length) {
    throw new Error(`"startLine" ${startLine} exceeds the file's ${lines.length} lines.`);
  }

  const maximumEndLine = Math.min(
    requestedEndLine,
    startLine + MAX_RETURNED_LINES - 1,
    lines.length,
  );
  const selectedLines: string[] = [];
  let selectedCharacters = 0;

  for (let lineNumber = startLine; lineNumber <= maximumEndLine; lineNumber += 1) {
    const line = lines[lineNumber - 1] ?? '';
    const separatorLength = selectedLines.length === 0 ? 0 : 1;
    const nextLength = selectedCharacters + separatorLength + line.length;

    if (nextLength > MAX_RETURNED_CHARACTERS) {
      if (selectedLines.length === 0) {
        throw new Error(
          `Line ${lineNumber} exceeds the ${MAX_RETURNED_CHARACTERS}-character read limit.`,
        );
      }
      break;
    }
    selectedLines.push(line);
    selectedCharacters = nextLength;
  }

  const endLine = startLine + selectedLines.length - 1;
  const truncated = endLine < lines.length;

  return {
    path: file.relativePath,
    content: selectedLines.join('\n'),
    startLine,
    endLine,
    totalLines: lines.length,
    truncated,
    nextStartLine: truncated ? endLine + 1 : null,
  };
}
