import { spawn, type ChildProcess } from 'node:child_process';
import type { ToolExecutionContext } from '../../types.js';
import { resolveWorkspaceDirectory } from '../../filesystem/shared/pathSafety.js';
import type { RunCommandInput } from './input.js';

const MAX_OUTPUT_CHARACTERS = 50_000;
const FORCE_KILL_DELAY_MS = 1_000;

export type RunCommandResult = {
  command: string;
  args: string[];
  cwd: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  durationMs: number;
};

export async function executeRunCommand(
  input: RunCommandInput,
  context: ToolExecutionContext,
): Promise<RunCommandResult> {
  const directory = await resolveWorkspaceDirectory(context.cwd, input.cwd);
  const startedAt = Date.now();
  const child = spawn(input.command, input.args, {
    cwd: directory.targetPath,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  return new Promise<RunCommandResult>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let forceKillTimer: NodeJS.Timeout | undefined;

    child.stdout.on('data', (chunk: string) => {
      const captured = captureOutput(stdout, chunk);
      stdout = captured.output;
      stdoutTruncated ||= captured.truncated;
    });
    child.stderr.on('data', (chunk: string) => {
      const captured = captureOutput(stderr, chunk);
      stderr = captured.output;
      stderrTruncated ||= captured.truncated;
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      terminateProcess(child, 'SIGTERM');
      forceKillTimer = setTimeout(() => terminateProcess(child, 'SIGKILL'), FORCE_KILL_DELAY_MS);
    }, input.timeoutMs);

    child.once('error', (error) => {
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      reject(new Error(`Failed to start command "${input.command}": ${error.message}`));
    });

    child.once('close', (exitCode, signal) => {
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolve({
        command: input.command,
        args: input.args,
        cwd: directory.relativePath,
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut,
        stdoutTruncated,
        stderrTruncated,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}

function captureOutput(
  currentOutput: string,
  chunk: string,
): { output: string; truncated: boolean } {
  const remainingCharacters = MAX_OUTPUT_CHARACTERS - currentOutput.length;
  if (remainingCharacters <= 0) return { output: currentOutput, truncated: true };
  if (chunk.length <= remainingCharacters) {
    return { output: currentOutput + chunk, truncated: false };
  }
  return {
    output: currentOutput + chunk.slice(0, remainingCharacters),
    truncated: true,
  };
}

function terminateProcess(
  child: Pick<ChildProcess, 'exitCode' | 'signalCode' | 'pid' | 'kill'>,
  signal: NodeJS.Signals,
): void {
  if (child.exitCode !== null || child.signalCode !== null) return;

  if (process.platform !== 'win32' && child.pid !== undefined) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // The process may have exited between the state check and the signal.
    }
  }
  child.kill(signal);
}
