import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isCodexAuthenticated, loginToCodex, logoutFromCodex } from '../src/auth/codex.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

class FakeChildProcess extends EventEmitter {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
}

const spawnMock = vi.mocked(spawn);

beforeEach(() => {
  spawnMock.mockReset();
});

describe('Codex authentication', () => {
  it('detects an authenticated Codex session', async () => {
    const child = new FakeChildProcess();
    spawnMock.mockReturnValue(child as never);

    const authenticated = isCodexAuthenticated();
    child.emit('close', 0);

    await expect(authenticated).resolves.toBe(true);
    expect(spawnMock).toHaveBeenCalledWith('codex', ['login', 'status'], {
      stdio: 'ignore',
    });
  });

  it('treats non-zero status and spawn errors as unauthenticated', async () => {
    const failedChild = new FakeChildProcess();
    spawnMock.mockReturnValueOnce(failedChild as never);
    const failedStatus = isCodexAuthenticated();
    failedChild.emit('close', 1);

    await expect(failedStatus).resolves.toBe(false);

    const missingChild = new FakeChildProcess();
    spawnMock.mockReturnValueOnce(missingChild as never);
    const missingBinary = isCodexAuthenticated();
    missingChild.emit('error', new Error('codex not found'));

    await expect(missingBinary).resolves.toBe(false);
  });

  it('starts device authentication and forwards trimmed stdout and stderr', async () => {
    const child = new FakeChildProcess();
    spawnMock.mockReturnValue(child as never);
    const onOutput = vi.fn();

    const login = loginToCodex(onOutput);
    child.stdout.write('Open this URL\n');
    child.stderr.write('Waiting for confirmation\n');
    child.emit('close', 0);

    await expect(login).resolves.toBeUndefined();
    expect(spawnMock).toHaveBeenCalledWith('codex', ['login', '--device-auth'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(onOutput.mock.calls).toEqual([['Open this URL'], ['Waiting for confirmation']]);
  });

  it('runs logout and reports a non-zero exit code', async () => {
    const child = new FakeChildProcess();
    spawnMock.mockReturnValue(child as never);

    const logout = logoutFromCodex();
    child.emit('close', 7);

    await expect(logout).rejects.toThrow('codex logout exited with code 7.');
  });
});
