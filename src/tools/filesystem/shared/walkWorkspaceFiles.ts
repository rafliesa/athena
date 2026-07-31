import { readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { toPortablePath } from './pathSafety.js';

const GENERATED_DIRECTORIES = new Set(['.git', 'coverage', 'dist', 'node_modules']);
const MAX_VISITED_FILES = 10_000;

export type WorkspaceFileEntry = {
  absolutePath: string;
  path: string;
  name: string;
};

export type WalkWorkspaceFilesResult = {
  visitedFiles: number;
  traversalTruncated: boolean;
  stopped: boolean;
};

export async function walkWorkspaceFiles(
  workspaceRoot: string,
  targetPath: string,
  options: {
    maxDepth: number;
    includeHidden: boolean;
    visit: (entry: WorkspaceFileEntry) => boolean | Promise<boolean>;
  },
): Promise<WalkWorkspaceFilesResult> {
  let visitedFiles = 0;
  let traversalTruncated = false;
  let stopped = false;

  async function walk(directory: string, depth: number): Promise<void> {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name));

    for (const child of children) {
      if (stopped || traversalTruncated) return;
      if (shouldIgnore(child.name, child.isDirectory(), options.includeHidden)) continue;

      const absolutePath = resolve(directory, child.name);
      if (child.isFile()) {
        if (visitedFiles >= MAX_VISITED_FILES) {
          traversalTruncated = true;
          return;
        }
        visitedFiles += 1;
        stopped = await options.visit({
          absolutePath,
          path: toPortablePath(relative(workspaceRoot, absolutePath)),
          name: child.name,
        });
      } else if (child.isDirectory() && depth < options.maxDepth) {
        await walk(absolutePath, depth + 1);
      }
    }
  }

  await walk(targetPath, 1);
  return { visitedFiles, traversalTruncated, stopped };
}

function shouldIgnore(name: string, directory: boolean, includeHidden: boolean): boolean {
  if (!includeHidden && name.startsWith('.')) return true;
  return directory && GENERATED_DIRECTORIES.has(name);
}
