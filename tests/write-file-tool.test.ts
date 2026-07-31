import { chmod, mkdir, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeFileTool } from '../src/tools/filesystem/writeFile/index.js';
import {
  createTemporaryWorkspace,
  removeTemporaryWorkspaces,
} from './helpers/temporary-workspace.js';

async function writeFileWithTool(workspace: string, input: unknown) {
  return writeFileTool.execute(input, { cwd: workspace });
}

afterEach(removeTemporaryWorkspaces);

describe('writeFileTool', () => {
  it('creates nested UTF-8 files and reports exact bytes', async () => {
    const workspace = await createTemporaryWorkspace();

    await expect(
      writeFileWithTool(workspace, {
        path: 'src/nested/hello.txt',
        content: 'Hi 🌍',
        overwrite: false,
        createParentDirectories: true,
      }),
    ).resolves.toEqual({
      path: 'src/nested/hello.txt',
      created: true,
      bytesWritten: Buffer.byteLength('Hi 🌍'),
    });
    await expect(readFile(join(workspace, 'src', 'nested', 'hello.txt'), 'utf8')).resolves.toBe(
      'Hi 🌍',
    );
  });

  it('guards overwrites, replaces atomically, and preserves file permissions', async () => {
    const workspace = await createTemporaryWorkspace();
    const path = join(workspace, 'script.sh');
    await writeFile(path, 'old');
    await chmod(path, 0o744);

    await expect(
      writeFileWithTool(workspace, {
        path: 'script.sh',
        content: 'blocked',
        overwrite: false,
        createParentDirectories: false,
      }),
    ).rejects.toThrow('File already exists: script.sh');
    await expect(readFile(path, 'utf8')).resolves.toBe('old');

    await expect(
      writeFileWithTool(workspace, {
        path: 'script.sh',
        content: '',
        overwrite: true,
        createParentDirectories: false,
      }),
    ).resolves.toEqual({ path: 'script.sh', created: false, bytesWritten: 0 });
    await expect(readFile(path, 'utf8')).resolves.toBe('');
    expect((await stat(path)).mode & 0o777).toBe(0o744);
  });

  it('rejects missing parents, directories, traversal, and symbolic links', async () => {
    const workspace = await createTemporaryWorkspace();
    const outside = await createTemporaryWorkspace();
    await mkdir(join(workspace, 'directory'));
    await writeFile(join(outside, 'outside.txt'), 'outside');
    await symlink(join(outside, 'outside.txt'), join(workspace, 'file-link.txt'), 'file');
    await symlink(outside, join(workspace, 'directory-link'), 'dir');

    const base = {
      content: 'new',
      overwrite: true,
      createParentDirectories: false,
    };

    await expect(
      writeFileWithTool(workspace, { ...base, path: 'missing/file.txt' }),
    ).rejects.toThrow('Parent directory does not exist: missing');
    await expect(writeFileWithTool(workspace, { ...base, path: 'directory' })).rejects.toThrow(
      'Not a file: directory',
    );
    await expect(writeFileWithTool(workspace, { ...base, path: '../outside.txt' })).rejects.toThrow(
      'File path must stay inside the current workspace.',
    );
    await expect(writeFileWithTool(workspace, { ...base, path: 'file-link.txt' })).rejects.toThrow(
      'Symbolic links cannot be modified: file-link.txt',
    );
    await expect(
      writeFileWithTool(workspace, {
        ...base,
        path: 'directory-link/escaped.txt',
        createParentDirectories: true,
      }),
    ).rejects.toThrow('File path must stay inside the current workspace.');
    await expect(readFile(join(outside, 'outside.txt'), 'utf8')).resolves.toBe('outside');
  });

  it('strictly validates content and flags', async () => {
    const workspace = await createTemporaryWorkspace();
    const valid = {
      path: 'file.txt',
      content: '',
      overwrite: false,
      createParentDirectories: false,
    };

    await expect(writeFileWithTool(workspace, { ...valid, content: null })).rejects.toThrow(
      '"content" must be a string.',
    );
    await expect(writeFileWithTool(workspace, { ...valid, overwrite: 1 })).rejects.toThrow(
      '"overwrite" must be a boolean.',
    );
    await expect(
      writeFileWithTool(workspace, { ...valid, createParentDirectories: 'yes' }),
    ).rejects.toThrow('"createParentDirectories" must be a boolean.');
  });
});
