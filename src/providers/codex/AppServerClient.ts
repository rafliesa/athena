import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';

type JsonRpcResponse = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { message?: string };
};

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
};

export type NotificationHandler = (params: Record<string, unknown>) => void;

export interface CodexClient {
  initialize(): Promise<void>;
  request<T>(method: string, params: Record<string, unknown>): Promise<T>;
  on(method: string, handler: NotificationHandler): () => void;
  onClose(handler: (error: Error) => void): () => void;
  dispose(): void;
}

export type CodexClientFactory = (cwd: string) => CodexClient;
export type AppServerProcessFactory = (cwd: string) => ChildProcessWithoutNullStreams;

export class AppServerClient implements CodexClient {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: Interface;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly notificationHandlers = new Map<string, Set<NotificationHandler>>();
  private readonly closeHandlers = new Set<(error: Error) => void>();
  private requestId = 0;
  private stderr = '';
  private disposed = false;
  private terminated = false;

  constructor(cwd: string, createProcess: AppServerProcessFactory = spawnAppServer) {
    this.child = createProcess(cwd);
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', (line) => this.handleLine(line));
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.stderr += chunk.toString();
    });
    this.child.once('error', (error) => this.handleUnexpectedClose(error));
    this.child.once('close', (code) => {
      if (!this.disposed) {
        this.handleUnexpectedClose(
          new Error(
            this.stderr.trim() || `Codex closed unexpectedly with code ${code ?? 'unknown'}.`,
          ),
        );
      }
    });
  }

  async initialize(): Promise<void> {
    await this.request('initialize', {
      clientInfo: { name: 'athena', title: 'Athena', version: '1.0.0' },
    });
    this.notify('initialized');
  }

  request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    if (this.disposed || this.terminated) {
      return Promise.reject(new Error('Codex app server is not running.'));
    }

    const id = ++this.requestId;

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
      });
      try {
        this.write({ id, method, params });
      } catch (error) {
        this.pending.delete(id);
        reject(toError(error));
      }
    });
  }

  notify(method: string, params?: Record<string, unknown>): void {
    this.write(params ? { method, params } : { method });
  }

  on(method: string, handler: NotificationHandler): () => void {
    const handlers = this.notificationHandlers.get(method) ?? new Set();
    handlers.add(handler);
    this.notificationHandlers.set(method, handlers);
    return () => handlers.delete(handler);
  }

  onClose(handler: (error: Error) => void): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.lines.close();
    if (!this.terminated) this.child.kill();
    this.rejectAll(new Error('Codex app server was closed.'));
    this.notificationHandlers.clear();
    this.closeHandlers.clear();
  }

  private write(message: Record<string, unknown>): void {
    if (this.disposed || this.terminated) {
      throw new Error('Codex app server is not running.');
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private handleLine(line: string): void {
    let message: JsonRpcResponse;
    try {
      message = JSON.parse(line) as JsonRpcResponse;
    } catch {
      return;
    }

    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error)
        pending.reject(new Error(message.error.message ?? 'Codex request failed.'));
      else pending.resolve(message.result);
      return;
    }

    if (!message.method) return;
    for (const handler of this.notificationHandlers.get(message.method) ?? []) {
      handler(message.params ?? {});
    }
  }

  private rejectAll(error: Error): void {
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }

  private handleUnexpectedClose(error: Error): void {
    if (this.disposed || this.terminated) return;
    this.terminated = true;
    this.lines.close();
    this.rejectAll(error);
    for (const handler of this.closeHandlers) handler(error);
    this.notificationHandlers.clear();
    this.closeHandlers.clear();
  }
}

function spawnAppServer(cwd: string): ChildProcessWithoutNullStreams {
  return spawn('codex', ['app-server', '--stdio'], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
