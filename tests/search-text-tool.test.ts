import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { searchTextTool } from '../src/tools/filesystem/searchText/index.js';
import { MAX_TEXT_FILE_BYTES } from '../src/tools/filesystem/shared/textFile.js';
import {
  createTemporaryWorkspace,
  removeTemporaryWorkspaces,
} from './helpers/temporary-workspace.js';

async function searchText(workspace: string, input: unknown) {
  return searchTextTool.execute(input, { cwd: workspace });
}

afterEach(removeTemporaryWorkspaces);

describe('searchTextTool', () => {
  it('returns deterministic line matches with 1-based positions and casing control', async () => {
    const workspace = await createTemporaryWorkspace();
    await mkdir(join(workspace, 'src'));
    await writeFile(join(workspace, 'src', 'a.ts'), 'first\r\nconst Needle = true;\r\n');
    await writeFile(join(workspace, 'src', 'b.ts'), 'needle lower\n');

    await expect(
      searchText(workspace, {
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
      matches: [
        { path: 'src/a.ts', line: 2, column: 7, text: 'const Needle = true;' },
        { path: 'src/b.ts', line: 1, column: 1, text: 'needle lower' },
      ],
      filesSearched: 2,
      filesSkipped: 0,
      truncated: false,
    });

    await expect(
      searchText(workspace, {
        path: 'src',
        query: 'Needle',
        caseSensitive: true,
        maxDepth: 1,
        limit: 10,
        includeHidden: false,
      }),
    ).resolves.toMatchObject({ matches: [{ path: 'src/a.ts', line: 2, column: 7 }] });
  });

  it('skips unsupported and generated files without following symlinks', async () => {
    const workspace = await createTemporaryWorkspace();
    const outside = await createTemporaryWorkspace();
    await mkdir(join(workspace, 'node_modules'));
    await writeFile(join(workspace, 'binary.bin'), Buffer.from([0x6e, 0x00, 0x65]));
    await writeFile(join(workspace, 'invalid.txt'), Buffer.from([0xc3, 0x28]));
    await writeFile(join(workspace, 'large.txt'), Buffer.alloc(MAX_TEXT_FILE_BYTES + 1, 0x61));
    await writeFile(join(workspace, 'visible.txt'), 'needle');
    await writeFile(join(workspace, 'node_modules', 'generated.txt'), 'needle');
    await writeFile(join(outside, 'outside.txt'), 'needle');
    await symlink(outside, join(workspace, 'outside-link'), 'dir');

    await expect(
      searchText(workspace, {
        path: '.',
        query: 'needle',
        caseSensitive: false,
        maxDepth: 3,
        limit: 10,
        includeHidden: false,
      }),
    ).resolves.toMatchObject({
      matches: [{ path: 'visible.txt', line: 1, column: 1, text: 'needle' }],
      filesSearched: 1,
      filesSkipped: 3,
      truncated: false,
    });
  });

  it('caps long previews and marks omitted matches as truncated', async () => {
    const workspace = await createTemporaryWorkspace();
    await writeFile(
      join(workspace, 'a.txt'),
      `needle ${'x'.repeat(400)}\n${'y'.repeat(350)} far-away-needle`,
    );

    const result = (await searchText(workspace, {
      path: '.',
      query: 'needle',
      caseSensitive: false,
      maxDepth: 1,
      limit: 1,
      includeHidden: false,
    })) as {
      matches: { text: string }[];
      truncated: boolean;
    };

    expect(result.matches[0]?.text).toHaveLength(300);
    expect(result.matches[0]?.text.endsWith('…')).toBe(true);
    expect(result.truncated).toBe(true);

    const farMatch = (await searchText(workspace, {
      path: '.',
      query: 'far-away-needle',
      caseSensitive: true,
      maxDepth: 1,
      limit: 10,
      includeHidden: false,
    })) as { matches: { text: string }[] };
    expect(farMatch.matches[0]?.text).toContain('far-away-needle');
    expect(farMatch.matches[0]?.text.startsWith('…')).toBe(true);
  });

  it('validates query, limits, and booleans', async () => {
    const workspace = await createTemporaryWorkspace();
    const valid = {
      path: '.',
      query: 'needle',
      caseSensitive: false,
      maxDepth: 1,
      limit: 10,
      includeHidden: false,
    };

    await expect(searchText(workspace, { ...valid, query: 'x'.repeat(257) })).rejects.toThrow(
      '"query" must contain at most 256 characters.',
    );
    await expect(searchText(workspace, { ...valid, limit: 0 })).rejects.toThrow(
      '"limit" must be an integer from 1 to 500.',
    );
    await expect(searchText(workspace, { ...valid, includeHidden: null })).rejects.toThrow(
      '"includeHidden" must be a boolean.',
    );
  });
});
