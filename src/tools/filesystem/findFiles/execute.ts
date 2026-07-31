import type { ToolExecutionContext } from '../../types.js';
import { resolveWorkspaceDirectory } from '../shared/pathSafety.js';
import { walkWorkspaceFiles } from '../shared/walkWorkspaceFiles.js';
import type { FindFilesInput } from './input.js';

export type FindFilesResult = {
  path: string;
  query: string;
  files: string[];
  truncated: boolean;
};

export async function executeFindFiles(
  input: FindFilesInput,
  context: ToolExecutionContext,
): Promise<FindFilesResult> {
  const directory = await resolveWorkspaceDirectory(context.cwd, input.path);
  const files: string[] = [];
  const query = normalize(input.query, input.caseSensitive);

  const traversal = await walkWorkspaceFiles(directory.workspaceRoot, directory.targetPath, {
    maxDepth: input.maxDepth,
    includeHidden: input.includeHidden,
    visit(entry) {
      if (!normalize(entry.name, input.caseSensitive).includes(query)) return false;
      if (files.length >= input.limit) return true;
      files.push(entry.path);
      return false;
    },
  });

  return {
    path: directory.relativePath,
    query: input.query,
    files,
    truncated: traversal.stopped || traversal.traversalTruncated,
  };
}

function normalize(value: string, caseSensitive: boolean): string {
  return caseSensitive ? value : value.toLowerCase();
}
