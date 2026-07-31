import { readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import type { ToolExecutionContext } from '../../types.js';
import type { ScanDirectoryInput } from './input.js';
import { resolveWorkspaceDirectory, toPortablePath } from '../shared/pathSafety.js';

const GENERATED_DIRECTORIES = new Set(['.git', 'coverage', 'dist', 'node_modules']);

export type ScanEntry = {
  path: string;
  type: 'directory' | 'file' | 'symlink' | 'other';
};

export type ScanDirectoryResult = {
  path: string;
  query: string | null;
  entries: ScanEntry[];
  truncated: boolean;
};

export async function executeScanDirectory(
  input: ScanDirectoryInput,
  context: ToolExecutionContext,
): Promise<ScanDirectoryResult> {
  const { workspaceRoot, targetPath } = await resolveWorkspaceDirectory(context.cwd, input.path);
  const entries: ScanEntry[] = [];
  const normalizedQuery = input.query?.toLowerCase() ?? null;
  let truncated = false;

  async function walk(directory: string, depth: number): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));

    for (const child of children) {
      if (truncated) return;
      if (shouldIgnore(child.name, child.isDirectory(), input.includeHidden)) continue;

      const absolutePath = resolve(directory, child.name);
      const relativePath = toPortablePath(relative(workspaceRoot, absolutePath));
      const matches =
        normalizedQuery === null || relativePath.toLowerCase().includes(normalizedQuery);

      if (matches) {
        if (entries.length >= input.limit) {
          truncated = true;
          break;
        }
        entries.push({ path: relativePath, type: getEntryType(child) });
      }

      // Dirent reports symlinks separately, so symbolic links are listed but never traversed.
      if (child.isDirectory() && depth < input.maxDepth) {
        await walk(absolutePath, depth + 1);
      }
    }
  }

  await walk(targetPath, 1);

  return {
    path: toPortablePath(relative(workspaceRoot, targetPath)) || '.',
    query: input.query,
    entries,
    truncated,
  };
}

function shouldIgnore(name: string, directory: boolean, includeHidden: boolean): boolean {
  if (!includeHidden && name.startsWith('.')) return true;
  return directory && GENERATED_DIRECTORIES.has(name);
}

function getEntryType(entry: {
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}): ScanEntry['type'] {
  if (entry.isDirectory()) return 'directory';
  if (entry.isFile()) return 'file';
  if (entry.isSymbolicLink()) return 'symlink';
  return 'other';
}
