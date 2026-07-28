import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppServerClient } from '../src/providers/codex/AppServerClient.js';

class FakeAppServerProcess extends EventEmitter {
  readonly stdin = new PassThrough();
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  readonly kill = vi.fn(() => true);
  private input = '';

  constructor() {
    super();
    this.stdin.on('data', (chunk: Buffer) => {
      this.input += chunk.toString();
    });
  }

  messages(): Record<string, unknown>[] {
    return this.input
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  send(message: Record<string, unknown> | string): void {
    const line = typeof message === 'string' ? message : JSON.stringify(message);
    this.stdout.write(`${line}\n`);
  }

  asChildProcess(): ChildProcessWithoutNullStreams {
    return this as unknown as ChildProcessWithoutNullStreams;
  }
}

const clients: AppServerClient[] = [];

function createClient() {
  const process = new FakeAppServerProcess();
  const processFactory = vi.fn(() => process.asChildProcess());
  const client = new AppServerClient('/workspace', processFactory);
  clients.push(client);
  return { client, process, processFactory };
}

afterEach(() => {
  for (const client of clients.splice(0)) client.dispose();
});

describe('AppServerClient', () => {
  it('initializes the protocol and sends the initialized notification', async () => {
    const { client, process, processFactory } = createClient();

    const initialization = client.initialize();
    expect(process.messages()).toEqual([
      {
        id: 1,
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'athena',
            title: 'Athena',
            version: '1.0.0',
          },
        },
      },
    ]);

    process.send({ id: 1, result: { userAgent: 'codex-test' } });
    await initialization;

    expect(processFactory).toHaveBeenCalledWith('/workspace');
    expect(process.messages()[1]).toEqual({ method: 'initialized' });
  });

  it('matches out-of-order responses to their request IDs', async () => {
    const { client, process } = createClient();

    const first = client.request<string>('first', { value: 1 });
    const second = client.request<string>('second', { value: 2 });
    process.send({ id: 2, result: 'second-result' });
    process.send({ id: 1, result: 'first-result' });

    await expect(first).resolves.toBe('first-result');
    await expect(second).resolves.toBe('second-result');
  });

  it('rejects JSON-RPC errors and ignores malformed or unknown responses', async () => {
    const { client, process } = createClient();

    const request = client.request('thread/start', {});
    process.send('not-json');
    process.send({ id: 999, result: 'ignored' });
    process.send({ id: 1, error: { message: 'permission denied' } });

    await expect(request).rejects.toThrow('permission denied');
  });

  it('dispatches notifications until their handler is removed', () => {
    const { client, process } = createClient();
    const handler = vi.fn();
    const remove = client.on('turn/completed', handler);

    process.send({ method: 'turn/completed', params: { status: 'ok' } });
    remove();
    process.send({ method: 'turn/completed', params: { status: 'ignored' } });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('rejects all pending requests and reports an unexpected close once', async () => {
    const { client, process } = createClient();
    const first = client.request('first', {});
    const second = client.request('second', {});
    const onClose = vi.fn();
    client.onClose(onClose);
    process.stderr.write('fatal app-server error\n');

    process.emit('error', new Error('spawn failed'));
    process.emit('close', 1);

    await expect(first).rejects.toThrow('spawn failed');
    await expect(second).rejects.toThrow('spawn failed');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('disposes idempotently, kills the child, and rejects pending work', async () => {
    const { client, process } = createClient();
    const pending = client.request('turn/start', {});

    client.dispose();
    client.dispose();

    await expect(pending).rejects.toThrow('Codex app server was closed.');
    expect(process.kill).toHaveBeenCalledOnce();
    await expect(client.request('after/dispose', {})).rejects.toThrow(
      'Codex app server is not running.',
    );
  });
});
