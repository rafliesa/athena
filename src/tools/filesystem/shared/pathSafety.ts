import { lstat, mkdir, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

export type WorkspacePath = {
  workspaceRoot: string;
  targetPath: string;
  relativePath: string;
};

export type WritableWorkspaceFile = WorkspacePath & {
  exists: boolean;
  mode?: number;
};

export async function resolveWorkspaceDirectory(
  cwd: string,
  requestedPath: string,
): Promise<WorkspacePath> {
  const workspaceRoot = await realpath(cwd);
  const unresolvedTarget = resolve(workspaceRoot, requestedPath);
  assertInsideWorkspace(workspaceRoot, unresolvedTarget, 'Directory path');

  const targetPath = await realpath(unresolvedTarget);
  assertInsideWorkspace(workspaceRoot, targetPath, 'Directory path');

  const targetStats = await lstat(targetPath);
  if (!targetStats.isDirectory()) {
    throw new Error(`Not a directory: ${requestedPath}`);
  }

  return {
    workspaceRoot,
    targetPath,
    relativePath: toWorkspaceRelativePath(workspaceRoot, targetPath),
  };
}

export async function resolveWorkspaceFile(
  cwd: string,
  requestedPath: string,
  options: { allowSymlink?: boolean } = {},
): Promise<WorkspacePath> {
  const workspaceRoot = await realpath(cwd);
  const unresolvedTarget = resolve(workspaceRoot, requestedPath);
  assertInsideWorkspace(workspaceRoot, unresolvedTarget, 'File path');

  const unresolvedStats = await lstat(unresolvedTarget);
  if (options.allowSymlink === false && unresolvedStats.isSymbolicLink()) {
    throw new Error(`Symbolic links cannot be modified: ${requestedPath}`);
  }

  const targetPath = await realpath(unresolvedTarget);
  assertInsideWorkspace(workspaceRoot, targetPath, 'File path');

  const targetStats = await lstat(targetPath);
  if (!targetStats.isFile()) {
    throw new Error(`Not a file: ${requestedPath}`);
  }

  return {
    workspaceRoot,
    targetPath,
    relativePath: toWorkspaceRelativePath(workspaceRoot, unresolvedTarget),
  };
}

export async function resolveWritableWorkspaceFile(
  cwd: string,
  requestedPath: string,
  createParentDirectories: boolean,
): Promise<WritableWorkspaceFile> {
  const workspaceRoot = await realpath(cwd);
  const unresolvedTarget = resolve(workspaceRoot, requestedPath);
  assertInsideWorkspace(workspaceRoot, unresolvedTarget, 'File path');

  const parentPath = dirname(unresolvedTarget);
  await assertExistingAncestorInsideWorkspace(workspaceRoot, parentPath);

  if (createParentDirectories) {
    await mkdir(parentPath, { recursive: true });
  }

  let parentRealPath: string;
  try {
    parentRealPath = await realpath(parentPath);
  } catch (error) {
    if (isMissingPathError(error)) {
      throw new Error(
        `Parent directory does not exist: ${toPortablePath(relative(workspaceRoot, parentPath))}`,
        { cause: error },
      );
    }
    throw error;
  }
  assertInsideWorkspace(workspaceRoot, parentRealPath, 'File path');

  const parentStats = await lstat(parentRealPath);
  if (!parentStats.isDirectory()) {
    throw new Error(`Not a directory: ${toPortablePath(relative(workspaceRoot, parentPath))}`);
  }

  let exists = false;
  let mode: number | undefined;
  try {
    const targetStats = await lstat(unresolvedTarget);
    if (targetStats.isSymbolicLink()) {
      throw new Error(`Symbolic links cannot be modified: ${requestedPath}`);
    }
    if (!targetStats.isFile()) {
      throw new Error(`Not a file: ${requestedPath}`);
    }
    exists = true;
    mode = targetStats.mode;
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
  }

  const targetPath = resolve(parentRealPath, basename(unresolvedTarget));
  assertInsideWorkspace(workspaceRoot, targetPath, 'File path');

  return {
    workspaceRoot,
    targetPath,
    relativePath: toWorkspaceRelativePath(workspaceRoot, unresolvedTarget),
    exists,
    ...(mode === undefined ? {} : { mode }),
  };
}

export function assertInsideWorkspace(
  workspaceRoot: string,
  targetPath: string,
  label = 'Path',
): void {
  const relativePath = relative(workspaceRoot, targetPath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`${label} must stay inside the current workspace.`);
  }
}

export function toPortablePath(path: string): string {
  return path.split(sep).join('/');
}

function toWorkspaceRelativePath(workspaceRoot: string, targetPath: string): string {
  return toPortablePath(relative(workspaceRoot, targetPath)) || '.';
}

async function assertExistingAncestorInsideWorkspace(
  workspaceRoot: string,
  requestedPath: string,
): Promise<void> {
  try {
    const candidateRealPath = await realpath(requestedPath);
    assertInsideWorkspace(workspaceRoot, candidateRealPath, 'File path');
    const stats = await lstat(candidateRealPath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${toPortablePath(relative(workspaceRoot, requestedPath))}`);
    }
  } catch (error) {
    if (!isMissingPathError(error)) throw error;

    const parent = dirname(requestedPath);
    if (parent === requestedPath) {
      throw new Error('Could not resolve a parent directory inside the current workspace.', {
        cause: error,
      });
    }
    await assertExistingAncestorInsideWorkspace(workspaceRoot, parent);
  }
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}
