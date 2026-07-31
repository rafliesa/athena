import { spawn } from 'node:child_process';

type OutputHandler = (output: string) => void;

export async function isCodexAuthenticated(): Promise<boolean> {
  try {
    await runCodex(['login', 'status']);
    return true;
  } catch {
    return false;
  }
}

export async function loginToCodex(onOutput: OutputHandler): Promise<void> {
  await runCodex(['login', '--device-auth'], onOutput);
}

function runCodex(args: string[], onOutput?: OutputHandler): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('codex', args, {
      stdio: onOutput ? ['ignore', 'pipe', 'pipe'] : 'ignore',
    });

    if (onOutput) {
      const forward = (chunk: Buffer) => {
        const output = chunk.toString().trim();
        if (output) onOutput(output);
      };
      child.stdout?.on('data', forward);
      child.stderr?.on('data', forward);
    }

    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`codex ${args.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
  });
}
