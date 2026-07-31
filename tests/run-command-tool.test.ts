import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCommandTool } from '../src/tools/terminal/runCommand/index.js';
import {
  createTemporaryWorkspace,
  removeTemporaryWorkspaces,
} from './helpers/temporary-workspace.js';

async function runCommand(workspace: string, input: unknown) {
  return runCommandTool.execute(input, { cwd: workspace });
}

afterEach(removeTemporaryWorkspaces);

describe('runCommandTool', () => {
  it('runs an executable in a workspace directory and captures nonzero results', async () => {
    const workspace = await createTemporaryWorkspace();
    await mkdir(join(workspace, 'nested'));

    const result = (await runCommand(workspace, {
      command: 'sh',
      args: ['-c', 'printf "%s" "$PWD"; printf "warning" >&2; exit 3'],
      cwd: 'nested',
      timeoutMs: 5_000,
    })) as {
      cwd: string;
      exitCode: number | null;
      signal: string | null;
      stdout: string;
      stderr: string;
      timedOut: boolean;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
      durationMs: number;
    };

    expect(result).toMatchObject({
      cwd: 'nested',
      exitCode: 3,
      signal: null,
      stdout: join(workspace, 'nested'),
      stderr: 'warning',
      timedOut: false,
      stdoutTruncated: false,
      stderrTruncated: false,
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('terminates commands at the timeout', async () => {
    const workspace = await createTemporaryWorkspace();

    const result = (await runCommand(workspace, {
      command: 'sh',
      args: ['-c', 'sleep 10'],
      cwd: '.',
      timeoutMs: 100,
    })) as {
      exitCode: number | null;
      signal: string | null;
      timedOut: boolean;
    };

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
    expect(result.signal).toBe('SIGTERM');
  });

  it('caps stdout and stderr while allowing the command to complete', async () => {
    const workspace = await createTemporaryWorkspace();

    const result = (await runCommand(workspace, {
      command: 'sh',
      args: ['-c', 'printf "%060000d" 0; printf "%060000d" 0 >&2'],
      cwd: '.',
      timeoutMs: 5_000,
    })) as {
      stdout: string;
      stderr: string;
      stdoutTruncated: boolean;
      stderrTruncated: boolean;
      exitCode: number | null;
    };

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toHaveLength(50_000);
    expect(result.stderr).toHaveLength(50_000);
    expect(result.stdoutTruncated).toBe(true);
    expect(result.stderrTruncated).toBe(true);
  });

  it('reports spawn failures and rejects cwd escapes', async () => {
    const workspace = await createTemporaryWorkspace();

    await expect(
      runCommand(workspace, {
        command: 'athena-command-that-does-not-exist',
        args: [],
        cwd: '.',
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow('Failed to start command "athena-command-that-does-not-exist"');
    await expect(
      runCommand(workspace, {
        command: 'sh',
        args: [],
        cwd: '..',
        timeoutMs: 1_000,
      }),
    ).rejects.toThrow('Directory path must stay inside the current workspace.');
  });

  it('strictly validates commands, argument arrays, and timeout bounds', async () => {
    const workspace = await createTemporaryWorkspace();
    const valid = {
      command: 'sh',
      args: [],
      cwd: '.',
      timeoutMs: 1_000,
    };

    await expect(runCommand(workspace, { ...valid, command: '' })).rejects.toThrow(
      '"command" must be a non-empty string.',
    );
    await expect(runCommand(workspace, { ...valid, args: 'test' })).rejects.toThrow(
      '"args" must be an array containing at most 100 strings.',
    );
    await expect(runCommand(workspace, { ...valid, args: [42] })).rejects.toThrow(
      'Every "args" item must be a string containing at most 10000 characters.',
    );
    await expect(runCommand(workspace, { ...valid, timeoutMs: 99 })).rejects.toThrow(
      '"timeoutMs" must be an integer from 100 to 120000.',
    );
  });
});
