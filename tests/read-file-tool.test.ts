import { symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readFileTool } from '../src/tools/filesystem/readFile/index.js';
import { MAX_TEXT_FILE_BYTES } from '../src/tools/filesystem/shared/textFile.js';
import {
  createTemporaryWorkspace,
  removeTemporaryWorkspaces,
} from './helpers/temporary-workspace.js';

async function readFileWithTool(workspace: string, input: unknown) {
  return readFileTool.execute(input, { cwd: workspace });
}

afterEach(removeTemporaryWorkspaces);

describe('readFileTool', () => {
  it('reads an explicit 1-based line range and preserves its text', async () => {
    const workspace = await createTemporaryWorkspace();
    await writeFile(join(workspace, 'hello.txt'), 'alpha\nβeta\ngamma\n');

    await expect(
      readFileWithTool(workspace, { path: 'hello.txt', startLine: 2, endLine: 3 }),
    ).resolves.toEqual({
      path: 'hello.txt',
      content: 'βeta\ngamma',
      startLine: 2,
      endLine: 3,
      totalLines: 4,
      truncated: true,
      nextStartLine: 4,
    });
  });

  it('defaults nullable ranges and caps each response at 1,000 lines', async () => {
    const workspace = await createTemporaryWorkspace();
    const lines = Array.from({ length: 1_005 }, (_, index) => `line ${index + 1}`);
    await writeFile(join(workspace, 'long.txt'), lines.join('\n'));

    const firstPage = (await readFileWithTool(workspace, {
      path: 'long.txt',
      startLine: null,
      endLine: null,
    })) as {
      content: string;
      endLine: number;
      truncated: boolean;
      nextStartLine: number | null;
    };

    expect(firstPage.content).toContain('line 1');
    expect(firstPage.content).toContain('line 1000');
    expect(firstPage.endLine).toBe(1_000);
    expect(firstPage.truncated).toBe(true);
    expect(firstPage.nextStartLine).toBe(1_001);

    await expect(
      readFileWithTool(workspace, { path: 'long.txt', startLine: 1_001, endLine: 9_999 }),
    ).resolves.toMatchObject({
      content: lines.slice(1_000).join('\n'),
      endLine: 1_005,
      truncated: false,
      nextStartLine: null,
    });
  });

  it('rejects invalid ranges, binary content, oversized files, and workspace escapes', async () => {
    const workspace = await createTemporaryWorkspace();
    const outside = await createTemporaryWorkspace();
    await writeFile(join(workspace, 'short.txt'), 'one\ntwo');
    await writeFile(join(workspace, 'binary.bin'), Buffer.from([0x61, 0x00]));
    await writeFile(join(workspace, 'large.txt'), Buffer.alloc(MAX_TEXT_FILE_BYTES + 1, 0x61));
    await writeFile(join(outside, 'secret.txt'), 'secret');
    await symlink(join(outside, 'secret.txt'), join(workspace, 'secret-link.txt'), 'file');

    await expect(
      readFileWithTool(workspace, { path: 'short.txt', startLine: 2, endLine: 1 }),
    ).rejects.toThrow('"endLine" must be greater than or equal to "startLine".');
    await expect(
      readFileWithTool(workspace, { path: 'short.txt', startLine: 3, endLine: null }),
    ).rejects.toThrow(`"startLine" 3 exceeds the file's 2 lines.`);
    await expect(
      readFileWithTool(workspace, { path: 'binary.bin', startLine: null, endLine: null }),
    ).rejects.toThrow('Binary files are not supported.');
    await expect(
      readFileWithTool(workspace, { path: 'large.txt', startLine: null, endLine: null }),
    ).rejects.toThrow(`File exceeds the ${MAX_TEXT_FILE_BYTES}-byte text limit.`);
    await expect(
      readFileWithTool(workspace, {
        path: 'secret-link.txt',
        startLine: null,
        endLine: null,
      }),
    ).rejects.toThrow('File path must stay inside the current workspace.');
    await expect(
      readFileWithTool(workspace, { path: '../secret.txt', startLine: null, endLine: null }),
    ).rejects.toThrow('File path must stay inside the current workspace.');
  });

  it('keeps individual responses within the character limit', async () => {
    const workspace = await createTemporaryWorkspace();
    await writeFile(join(workspace, 'wide.txt'), `${'a'.repeat(60_000)}\n${'b'.repeat(60_000)}`);
    await writeFile(join(workspace, 'one-line.txt'), 'x'.repeat(100_001));

    await expect(
      readFileWithTool(workspace, { path: 'wide.txt', startLine: null, endLine: null }),
    ).resolves.toMatchObject({
      content: 'a'.repeat(60_000),
      startLine: 1,
      endLine: 1,
      truncated: true,
      nextStartLine: 2,
    });
    await expect(
      readFileWithTool(workspace, { path: 'one-line.txt', startLine: null, endLine: null }),
    ).rejects.toThrow('Line 1 exceeds the 100000-character read limit.');
  });

  it('validates nullable line arguments and unknown properties', async () => {
    const workspace = await createTemporaryWorkspace();
    const valid = { path: 'file.txt', startLine: null, endLine: null };

    await expect(readFileWithTool(workspace, { ...valid, startLine: 0 })).rejects.toThrow(
      '"startLine" must be an integer from 1 to 10000000.',
    );
    await expect(readFileWithTool(workspace, { ...valid, endLine: '2' })).rejects.toThrow(
      '"endLine" must be an integer from 1 to 10000000.',
    );
    await expect(readFileWithTool(workspace, { ...valid, other: true })).rejects.toThrow(
      'Unknown input property: "other".',
    );
  });
});
