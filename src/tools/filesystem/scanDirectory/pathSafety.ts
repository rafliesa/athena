import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

export type WorkspaceDirectory = {
  workspaceRoot: string;
  targetPath: string;
};

export async function resolveWorkspaceDirectory(
  cwd: string,
  requestedPath: string,
): Promise<WorkspaceDirectory> {
  const workspaceRoot = await realpath(cwd);
  const unresolvedTarget = resolve(workspaceRoot, requestedPath);
  assertInsideWorkspace(workspaceRoot, unresolvedTarget);

  const targetPath = await realpath(unresolvedTarget);
  assertInsideWorkspace(workspaceRoot, targetPath);

  const targetStats = await lstat(targetPath);
  if (!targetStats.isDirectory()) {
    throw new Error(`Not a directory: ${requestedPath}`);
  }

  return { workspaceRoot, targetPath };
}

export function assertInsideWorkspace(workspaceRoot: string, targetPath: string): void {
  const relativePath = relative(workspaceRoot, targetPath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error('Directory path must stay inside the current workspace.');
  }
}

export function toPortablePath(path: string): string {
  return path.split(sep).join('/');
}
