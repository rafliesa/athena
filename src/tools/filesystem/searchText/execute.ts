import type { ToolExecutionContext } from '../../types.js';
import { resolveWorkspaceDirectory } from '../shared/pathSafety.js';
import { readTextFile, UnsupportedTextFileError } from '../shared/textFile.js';
import { walkWorkspaceFiles } from '../shared/walkWorkspaceFiles.js';
import type { SearchTextInput } from './input.js';

const MAX_PREVIEW_CHARACTERS = 300;

export type TextMatch = {
  path: string;
  line: number;
  column: number;
  text: string;
};

export type SearchTextResult = {
  path: string;
  query: string;
  matches: TextMatch[];
  filesSearched: number;
  filesSkipped: number;
  truncated: boolean;
};

export async function executeSearchText(
  input: SearchTextInput,
  context: ToolExecutionContext,
): Promise<SearchTextResult> {
  const directory = await resolveWorkspaceDirectory(context.cwd, input.path);
  const matches: TextMatch[] = [];
  const query = normalize(input.query, input.caseSensitive);
  let filesSearched = 0;
  let filesSkipped = 0;

  const traversal = await walkWorkspaceFiles(directory.workspaceRoot, directory.targetPath, {
    maxDepth: input.maxDepth,
    includeHidden: input.includeHidden,
    async visit(entry) {
      let contents: string;
      try {
        contents = await readTextFile(entry.absolutePath);
      } catch (error) {
        if (!(error instanceof UnsupportedTextFileError)) throw error;
        filesSkipped += 1;
        return false;
      }
      filesSearched += 1;

      const lines = contents.split('\n');
      for (const [index, line] of lines.entries()) {
        const column = normalize(line, input.caseSensitive).indexOf(query);
        if (column === -1) continue;
        if (matches.length >= input.limit) return true;
        matches.push({
          path: entry.path,
          line: index + 1,
          column: column + 1,
          text: previewLine(line, column),
        });
      }
      return false;
    },
  });

  return {
    path: directory.relativePath,
    query: input.query,
    matches,
    filesSearched,
    filesSkipped,
    truncated: traversal.stopped || traversal.traversalTruncated,
  };
}

function normalize(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLowerCase();
}

function previewLine(line: string, matchIndex: number): string {
  const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;
  if (normalized.length <= MAX_PREVIEW_CHARACTERS) return normalized;

  const start = Math.max(0, matchIndex - 20);
  const prefix = start > 0 ? '…' : '';
  const availableWithoutSuffix = MAX_PREVIEW_CHARACTERS - prefix.length;
  const needsSuffix = normalized.length - start > availableWithoutSuffix;
  const contentLength = availableWithoutSuffix - (needsSuffix ? 1 : 0);
  return `${prefix}${normalized.slice(start, start + contentLength)}${needsSuffix ? '…' : ''}`;
}
