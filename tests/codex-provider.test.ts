import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CodexClient,
  NotificationHandler,
  ServerRequestHandler,
} from '../src/providers/codex/AppServerClient.js';
import { CodexProvider } from '../src/providers/codex/CodexProvider.js';
import { toCodexDynamicTools } from '../src/tools/adapters/codex.js';
import { toolRegistry } from '../src/tools/registry.js';
import type { AgentTool, ToolRuntime } from '../src/tools/types.js';

type Request = {
  method: string;
  params: Record<string, unknown>;
};

class FakeCodexClient implements CodexClient {
  readonly initialize = vi.fn<CodexClient['initialize']>(async () => undefined);
  readonly dispose = vi.fn();
  readonly requests: Request[] = [];
  threadResult: unknown = { thread: { id: 'thread-1' } };
  onTurnStart?: () => void;
  turnStartError?: Error;

  private readonly notificationHandlers = new Map<string, Set<NotificationHandler>>();
  private readonly serverRequestHandlers = new Map<string, ServerRequestHandler>();
  private readonly closeHandlers = new Set<(error: Error) => void>();

  async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    this.requests.push({ method, params });

    if (method === 'thread/start') return this.threadResult as T;
    if (method === 'turn/start') {
      if (this.turnStartError) throw this.turnStartError;
      this.onTurnStart?.();
    }
    return {} as T;
  }

  on(method: string, handler: NotificationHandler): () => void {
    const handlers = this.notificationHandlers.get(method) ?? new Set();
    handlers.add(handler);
    this.notificationHandlers.set(method, handlers);
    return () => handlers.delete(handler);
  }

  onRequest(method: string, handler: ServerRequestHandler): () => void {
    this.serverRequestHandlers.set(method, handler);
    return () => this.serverRequestHandlers.delete(method);
  }

  onClose(handler: (error: Error) => void): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  emit(method: string, params: Record<string, unknown>): void {
    for (const handler of this.notificationHandlers.get(method) ?? []) handler(params);
  }

  closeWith(error: Error): void {
    for (const handler of this.closeHandlers) handler(error);
  }

  async requestFromServer(method: string, params: Record<string, unknown>): Promise<unknown> {
    const handler = this.serverRequestHandlers.get(method);
    if (!handler) throw new Error(`Missing server request handler: ${method}`);
    return handler(params);
  }

  listenerCount(): number {
    let count = this.closeHandlers.size + this.serverRequestHandlers.size;
    for (const handlers of this.notificationHandlers.values()) count += handlers.size;
    return count;
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe('CodexProvider', () => {
  it('starts a restricted ephemeral turn and forwards streamed deltas', async () => {
    const client = new FakeCodexClient();
    client.onTurnStart = () => {
      client.emit('item/agentMessage/delta', { delta: 'Hello' });
      client.emit('item/agentMessage/delta', { delta: ' world' });
      client.emit('turn/completed', { turn: { status: 'completed' } });
    };
    const onDelta = vi.fn();

    await new CodexProvider('gpt-5.6-luna', () => client, undefined, 'Be concise.').stream(
      'Hi',
      onDelta,
    );

    expect(client.initialize).toHaveBeenCalledOnce();
    expect(client.requests).toEqual([
      {
        method: 'thread/start',
        params: {
          model: 'gpt-5.6-luna',
          developerInstructions: 'Be concise.',
          cwd: process.cwd(),
          sandbox: 'read-only',
          approvalPolicy: 'never',
          ephemeral: true,
          dynamicTools: toCodexDynamicTools(toolRegistry.list()),
        },
      },
      {
        method: 'turn/start',
        params: {
          threadId: 'thread-1',
          model: 'gpt-5.6-luna',
          input: [{ type: 'text', text: 'Hi' }],
        },
      },
    ]);
    expect(onDelta.mock.calls).toEqual([['Hello'], [' world']]);
    expect(client.listenerCount()).toBe(0);
    expect(client.dispose).toHaveBeenCalledOnce();
  });

  it('executes dynamic tool requests and returns their content to Codex', async () => {
    const client = new FakeCodexClient();
    const execute = vi.fn<ToolRuntime['execute']>(async () => ({
      success: true,
      output: '{"ok":true}',
    }));
    const tools: ToolRuntime = {
      list: () => [
        {
          name: 'scan_directory',
          title: 'Scan directory',
          category: 'Filesystem',
          access: 'read-only',
          description: 'Scan files',
          inputSchema: { type: 'object' },
          execute: async () => undefined,
        } satisfies AgentTool,
      ],
      execute,
    };
    let toolResponse: unknown;
    client.onTurnStart = () => {
      void client
        .requestFromServer('item/tool/call', {
          tool: 'scan_directory',
          arguments: { path: '.', query: null },
        })
        .then((response) => {
          toolResponse = response;
          client.emit('turn/completed', { turn: { status: 'completed' } });
        });
    };

    await new CodexProvider('gpt-5.6-luna', () => client, undefined, 'Be concise.', tools).stream(
      'Find config files',
      vi.fn(),
    );

    expect(execute).toHaveBeenCalledWith(
      'scan_directory',
      { path: '.', query: null },
      { cwd: process.cwd() },
    );
    expect(toolResponse).toEqual({
      contentItems: [{ type: 'inputText', text: '{"ok":true}' }],
      success: true,
    });
    expect(client.requests[0]?.params).toMatchObject({
      dynamicTools: toCodexDynamicTools(tools.list()),
    });
  });

  it('propagates failed turns and disposes the client', async () => {
    const client = new FakeCodexClient();
    client.onTurnStart = () => {
      client.emit('turn/completed', {
        turn: { status: 'failed', error: { message: 'model unavailable' } },
      });
    };

    await expect(
      new CodexProvider('gpt-5.6-luna', () => client).stream('Hi', vi.fn()),
    ).rejects.toThrow('model unavailable');
    expect(client.dispose).toHaveBeenCalledOnce();
    expect(client.listenerCount()).toBe(0);
  });

  it('propagates an unexpected app-server close', async () => {
    const client = new FakeCodexClient();
    client.onTurnStart = () => client.closeWith(new Error('server crashed'));

    await expect(
      new CodexProvider('gpt-5.6-luna', () => client).stream('Hi', vi.fn()),
    ).rejects.toThrow('server crashed');
    expect(client.dispose).toHaveBeenCalledOnce();
  });

  it('rejects a missing thread ID and still disposes the client', async () => {
    const client = new FakeCodexClient();
    client.threadResult = {};

    await expect(
      new CodexProvider('gpt-5.6-luna', () => client).stream('Hi', vi.fn()),
    ).rejects.toThrow('Codex did not return a thread ID.');
    expect(client.dispose).toHaveBeenCalledOnce();
  });

  it('propagates initialization failures and disposes the client', async () => {
    const client = new FakeCodexClient();
    client.initialize.mockRejectedValueOnce(new Error('initialization rejected'));

    await expect(
      new CodexProvider('gpt-5.6-luna', () => client).stream('Hi', vi.fn()),
    ).rejects.toThrow('initialization rejected');
    expect(client.requests).toEqual([]);
    expect(client.dispose).toHaveBeenCalledOnce();
  });

  it('shows a fallback when a successful turn contains no text', async () => {
    const client = new FakeCodexClient();
    client.onTurnStart = () => {
      client.emit('turn/completed', { turn: { status: 'completed' } });
    };
    const onDelta = vi.fn();

    await new CodexProvider('gpt-5.6-luna', () => client).stream('Hi', onDelta);

    expect(onDelta).toHaveBeenCalledWith('Codex returned an empty response.');
  });

  it('rejects non-success terminal states', async () => {
    const client = new FakeCodexClient();
    client.onTurnStart = () => {
      client.emit('turn/completed', { turn: { status: 'cancelled' } });
    };

    await expect(
      new CodexProvider('gpt-5.6-luna', () => client).stream('Hi', vi.fn()),
    ).rejects.toThrow('Codex turn ended with status cancelled.');
    expect(client.listenerCount()).toBe(0);
  });

  it('cleans up completion listeners when turn/start rejects', async () => {
    const client = new FakeCodexClient();
    client.turnStartError = new Error('turn could not start');

    await expect(
      new CodexProvider('gpt-5.6-luna', () => client).stream('Hi', vi.fn()),
    ).rejects.toThrow('turn could not start');
    expect(client.listenerCount()).toBe(0);
    expect(client.dispose).toHaveBeenCalledOnce();
  });

  it('times out a turn that never completes and cleans up the client', async () => {
    vi.useFakeTimers();
    const client = new FakeCodexClient();
    const stream = new CodexProvider('gpt-5.6-luna', () => client, 1_000).stream('Hi', vi.fn());

    await vi.advanceTimersByTimeAsync(0);
    const rejection = expect(stream).rejects.toThrow('Codex request timed out after 1000ms.');
    await vi.advanceTimersByTimeAsync(1_000);

    await rejection;
    expect(client.listenerCount()).toBe(0);
    expect(client.dispose).toHaveBeenCalledOnce();
  });

  it('also times out while app-server initialization is stalled', async () => {
    vi.useFakeTimers();
    const client = new FakeCodexClient();
    client.initialize.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const stream = new CodexProvider('gpt-5.6-luna', () => client, 1_000).stream('Hi', vi.fn());
    const rejection = expect(stream).rejects.toThrow('Codex request timed out after 1000ms.');

    await vi.advanceTimersByTimeAsync(1_000);

    await rejection;
    expect(client.requests).toEqual([]);
    expect(client.dispose).toHaveBeenCalledOnce();
  });
});
