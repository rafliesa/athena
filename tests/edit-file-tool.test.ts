import { readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { editFileTool } from '../src/tools/filesystem/editFile/index.js';
import {
  createTemporaryWorkspace,
  removeTemporaryWorkspaces,
} from './helpers/temporary-workspace.js';

async function editFile(workspace: string, input: unknown) {
  return editFileTool.execute(input, { cwd: workspace });
}

afterEach(removeTemporaryWorkspaces);

describe('editFileTool', () => {
  it('replaces an exact section and supports intentional multiple replacements', async () => {
    const workspace = await createTemporaryWorkspace();
    const path = join(workspace, 'source.ts');
    await writeFile(path, 'const old = 1;\nold + old;\n');

    await expect(
      editFile(workspace, {
        path: 'source.ts',
        oldText: 'const old = 1;',
        newText: 'const old = 2;',
        expectedOccurrences: 1,
      }),
    ).resolves.toMatchObject({ path: 'source.ts', replacements: 1 });

    await expect(
      editFile(workspace, {
        path: 'source.ts',
        oldText: 'old',
        newText: 'value',
        expectedOccurrences: 3,
      }),
    ).resolves.toMatchObject({ path: 'source.ts', replacements: 3 });
    await expect(readFile(path, 'utf8')).resolves.toBe('const value = 2;\nvalue + value;\n');
  });

  it('does not mutate the file when the expected occurrence count is stale', async () => {
    const workspace = await createTemporaryWorkspace();
    const path = join(workspace, 'source.ts');
    const original = 'same\nsame\n';
    await writeFile(path, original);

    await expect(
      editFile(workspace, {
        path: 'source.ts',
        oldText: 'same',
        newText: 'changed',
        expectedOccurrences: 1,
      }),
    ).rejects.toThrow('Expected 1 occurrence(s) of "oldText" but found 2; file was not changed.');
    await expect(readFile(path, 'utf8')).resolves.toBe(original);

    await expect(
      editFile(workspace, {
        path: 'source.ts',
        oldText: 'missing',
        newText: '',
        expectedOccurrences: 1,
      }),
    ).rejects.toThrow('Expected 1 occurrence(s) of "oldText" but found 0; file was not changed.');
  });

  it('rejects symlinks and invalid edit contracts', async () => {
    const workspace = await createTemporaryWorkspace();
    await writeFile(join(workspace, 'target.txt'), 'target');
    await symlink(join(workspace, 'target.txt'), join(workspace, 'link.txt'), 'file');

    await expect(
      editFile(workspace, {
        path: 'link.txt',
        oldText: 'target',
        newText: 'changed',
        expectedOccurrences: 1,
      }),
    ).rejects.toThrow('Symbolic links cannot be modified: link.txt');
    await expect(
      editFile(workspace, {
        path: 'target.txt',
        oldText: '',
        newText: 'changed',
        expectedOccurrences: 1,
      }),
    ).rejects.toThrow('"oldText" must be a non-empty string.');
    await expect(
      editFile(workspace, {
        path: 'target.txt',
        oldText: 'target',
        newText: 'changed',
        expectedOccurrences: 0,
      }),
    ).rejects.toThrow('"expectedOccurrences" must be an integer from 1 to 1000.');
  });
});
