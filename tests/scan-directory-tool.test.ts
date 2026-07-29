import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanDirectoryTool } from '../src/tools/filesystem/scanDirectory/index.js';

const temporaryDirectories: string[] = [];

async function createWorkspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'athena-scan-directory-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function scan(workspace: string, input: unknown) {
  return scanDirectoryTool.execute(input, { cwd: workspace });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('scanDirectoryTool', () => {
  it('recurses to the requested depth, matches queries case-insensitively, and sorts entries', async () => {
    const workspace = await createWorkspace();
    await mkdir(join(workspace, 'bravo'));
    await mkdir(join(workspace, 'bravo', 'nested'));
    await writeFile(join(workspace, 'alpha.txt'), 'alpha');
    await writeFile(join(workspace, 'bravo', 'Needle.md'), 'needle');
    await writeFile(join(workspace, 'bravo', 'nested', 'needle-too-deep.md'), 'deep');
    await writeFile(join(workspace, 'zulu.txt'), 'zulu');

    await expect(
      scan(workspace, { path: '.', query: 'NEEDLE', maxDepth: 2, limit: 10, includeHidden: false }),
    ).resolves.toEqual({
      path: '.',
      query: 'NEEDLE',
      entries: [{ path: 'bravo/Needle.md', type: 'file' }],
      truncated: false,
    });
    await expect(
      scan(workspace, { path: '.', query: null, maxDepth: 1, limit: 10, includeHidden: false }),
    ).resolves.toMatchObject({
      entries: [
        { path: 'alpha.txt', type: 'file' },
        { path: 'bravo', type: 'directory' },
        { path: 'zulu.txt', type: 'file' },
      ],
      truncated: false,
    });
  });

  it('excludes hidden and generated directories while honoring includeHidden', async () => {
    const workspace = await createWorkspace();
    await Promise.all([
      mkdir(join(workspace, '.git')),
      mkdir(join(workspace, '.hidden')),
      mkdir(join(workspace, 'coverage')),
      mkdir(join(workspace, 'dist')),
      mkdir(join(workspace, 'node_modules')),
      writeFile(join(workspace, 'visible.txt'), 'visible'),
    ]);

    const hiddenExcluded = await scan(workspace, {
      path: '.',
      query: null,
      maxDepth: 2,
      limit: 20,
      includeHidden: false,
    });
    expect(hiddenExcluded).toMatchObject({ entries: [{ path: 'visible.txt', type: 'file' }] });

    const hiddenIncluded = await scan(workspace, {
      path: '.',
      query: null,
      maxDepth: 2,
      limit: 20,
      includeHidden: true,
    });
    expect(hiddenIncluded).toMatchObject({
      entries: [
        { path: '.hidden', type: 'directory' },
        { path: 'visible.txt', type: 'file' },
      ],
    });
  });

  it('stops at the limit and reports truncation', async () => {
    const workspace = await createWorkspace();
    await Promise.all(
      ['a.txt', 'b.txt', 'c.txt'].map((name) => writeFile(join(workspace, name), name)),
    );

    await expect(
      scan(workspace, { path: '.', query: null, maxDepth: 1, limit: 2, includeHidden: false }),
    ).resolves.toMatchObject({
      entries: [
        { path: 'a.txt', type: 'file' },
        { path: 'b.txt', type: 'file' },
      ],
      truncated: true,
    });
  });

  it('lists symbolic links without following them and rejects paths outside the workspace', async () => {
    const workspace = await createWorkspace();
    const outside = await createWorkspace();
    await writeFile(join(outside, 'outside-secret.txt'), 'secret');
    await symlink(outside, join(workspace, 'outside-link'), 'dir');

    await expect(
      scan(workspace, { path: '.', query: null, maxDepth: 3, limit: 10, includeHidden: false }),
    ).resolves.toMatchObject({ entries: [{ path: 'outside-link', type: 'symlink' }] });
    await expect(
      scan(workspace, { path: '.', query: 'secret', maxDepth: 3, limit: 10, includeHidden: false }),
    ).resolves.toMatchObject({ entries: [] });
    await expect(
      scan(workspace, { path: '../', query: null, maxDepth: 1, limit: 10, includeHidden: false }),
    ).rejects.toThrow('Directory path must stay inside the current workspace.');
    await expect(
      scan(workspace, {
        path: 'outside-link',
        query: null,
        maxDepth: 1,
        limit: 10,
        includeHidden: false,
      }),
    ).rejects.toThrow('Directory path must stay inside the current workspace.');
  });

  it('validates every required input field before scanning', async () => {
    const workspace = await createWorkspace();
    const valid = { path: '.', query: null, maxDepth: 1, limit: 1, includeHidden: false };

    await expect(scan(workspace, null)).rejects.toThrow('Tool input must be an object.');
    await expect(scan(workspace, { ...valid, path: '  ' })).rejects.toThrow(
      '"path" must be a non-empty string.',
    );
    await expect(scan(workspace, { ...valid, query: 3 })).rejects.toThrow(
      '"query" must be a string or null.',
    );
    await expect(scan(workspace, { ...valid, maxDepth: 0 })).rejects.toThrow(
      '"maxDepth" must be an integer from 1 to 8.',
    );
    await expect(scan(workspace, { ...valid, limit: 1.5 })).rejects.toThrow(
      '"limit" must be an integer from 1 to 500.',
    );
    await expect(scan(workspace, { ...valid, includeHidden: 'no' })).rejects.toThrow(
      '"includeHidden" must be a boolean.',
    );
    await expect(scan(workspace, { ...valid, unexpected: true })).rejects.toThrow(
      'Unknown input property: "unexpected".',
    );
  });
});
