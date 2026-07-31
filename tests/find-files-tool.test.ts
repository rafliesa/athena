import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findFilesTool } from '../src/tools/filesystem/findFiles/index.js';
import {
  createTemporaryWorkspace,
  removeTemporaryWorkspaces,
} from './helpers/temporary-workspace.js';

async function findFiles(workspace: string, input: unknown) {
  return findFilesTool.execute(input, { cwd: workspace });
}

afterEach(removeTemporaryWorkspaces);

describe('findFilesTool', () => {
  it('finds sorted file names with configurable casing and depth', async () => {
    const workspace = await createTemporaryWorkspace();
    await mkdir(join(workspace, 'src', 'nested'), { recursive: true });
    await writeFile(join(workspace, 'src', 'Needle.ts'), '');
    await writeFile(join(workspace, 'src', 'another-needle.ts'), '');
    await writeFile(join(workspace, 'src', 'nested', 'needle.ts'), '');

    await expect(
      findFiles(workspace, {
        path: 'src',
        query: 'NEEDLE',
        caseSensitive: false,
        maxDepth: 1,
        limit: 10,
        includeHidden: false,
      }),
    ).resolves.toEqual({
      path: 'src',
      query: 'NEEDLE',
      files: ['src/another-needle.ts', 'src/Needle.ts'],
      truncated: false,
    });

    await expect(
      findFiles(workspace, {
        path: '.',
        query: 'Needle',
        caseSensitive: true,
        maxDepth: 3,
        limit: 10,
        includeHidden: false,
      }),
    ).resolves.toMatchObject({ files: ['src/Needle.ts'] });
  });

  it('skips hidden, generated, and symlinked directories and reports result truncation', async () => {
    const workspace = await createTemporaryWorkspace();
    const outside = await createTemporaryWorkspace();
    await Promise.all([
      mkdir(join(workspace, '.hidden')),
      mkdir(join(workspace, 'node_modules')),
      mkdir(join(workspace, 'visible')),
      writeFile(join(outside, 'needle-outside.ts'), ''),
    ]);
    await symlink(outside, join(workspace, 'linked-outside'), 'dir');
    await writeFile(join(workspace, '.hidden', 'needle-hidden.ts'), '');
    await writeFile(join(workspace, 'node_modules', 'needle-generated.ts'), '');
    await writeFile(join(workspace, 'visible', 'needle-a.ts'), '');
    await writeFile(join(workspace, 'visible', 'needle-b.ts'), '');

    await expect(
      findFiles(workspace, {
        path: '.',
        query: 'needle',
        caseSensitive: false,
        maxDepth: 3,
        limit: 1,
        includeHidden: false,
      }),
    ).resolves.toMatchObject({
      files: ['visible/needle-a.ts'],
      truncated: true,
    });

    await expect(
      findFiles(workspace, {
        path: '.',
        query: 'hidden',
        caseSensitive: false,
        maxDepth: 3,
        limit: 10,
        includeHidden: true,
      }),
    ).resolves.toMatchObject({ files: ['.hidden/needle-hidden.ts'], truncated: false });
  });

  it('strictly validates its arguments', async () => {
    const workspace = await createTemporaryWorkspace();
    const valid = {
      path: '.',
      query: 'file',
      caseSensitive: false,
      maxDepth: 1,
      limit: 10,
      includeHidden: false,
    };

    await expect(findFiles(workspace, null)).rejects.toThrow('Tool input must be an object.');
    await expect(findFiles(workspace, { ...valid, query: '' })).rejects.toThrow(
      '"query" must be a non-empty string.',
    );
    await expect(findFiles(workspace, { ...valid, caseSensitive: 'no' })).rejects.toThrow(
      '"caseSensitive" must be a boolean.',
    );
    await expect(findFiles(workspace, { ...valid, maxDepth: 9 })).rejects.toThrow(
      '"maxDepth" must be an integer from 1 to 8.',
    );
    await expect(findFiles(workspace, { ...valid, extra: true })).rejects.toThrow(
      'Unknown input property: "extra".',
    );
  });
});
