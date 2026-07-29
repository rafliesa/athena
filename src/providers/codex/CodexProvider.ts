import { DEFAULT_SYSTEM_PROMPT } from '../../domain/config.js';
import type { ModelId } from '../../domain/models.js';
import { toCodexDynamicTools } from '../../tools/adapters/codex.js';
import { toolRegistry } from '../../tools/registry.js';
import type { ToolRuntime } from '../../tools/types.js';
import type { Provider, TextDeltaHandler } from '../provider.js';
import { AppServerClient, type CodexClientFactory } from './AppServerClient.js';

type ThreadStartResult = {
  thread?: { id?: string };
};

type TurnCompletedParams = {
  turn?: {
    status?: string;
    error?: { message?: string };
  };
};

const EMPTY_RESPONSE = 'Codex returned an empty response.';
const DEFAULT_TIMEOUT_MS = 120_000;

export class CodexProvider implements Provider {
  readonly name = 'codex';

  constructor(
    readonly model: ModelId,
    private readonly createClient: CodexClientFactory = (cwd) => new AppServerClient(cwd),
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
    private readonly systemPrompt = DEFAULT_SYSTEM_PROMPT,
    private readonly tools: ToolRuntime = toolRegistry,
  ) {}

  async stream(prompt: string, onDelta: TextDeltaHandler): Promise<void> {
    const client = this.createClient(process.cwd());
    const streamState = { receivedText: false };
    let cleanupCompletion: () => void = () => undefined;
    let cancelTimeout: () => void = () => undefined;
    let removeToolHandler: () => void = () => undefined;

    try {
      const operation = (async () => {
        removeToolHandler = client.onRequest('item/tool/call', async (params) => {
          const tool = typeof params.tool === 'string' ? params.tool : '';
          const result = await this.tools.execute(tool, params.arguments, {
            cwd: process.cwd(),
          });
          return {
            contentItems: [{ type: 'inputText', text: result.output }],
            success: result.success,
          };
        });
        await client.initialize();
        const { thread } = await client.request<ThreadStartResult>('thread/start', {
          model: this.model,
          developerInstructions: this.systemPrompt,
          cwd: process.cwd(),
          sandbox: 'read-only',
          approvalPolicy: 'never',
          ephemeral: true,
          dynamicTools: toCodexDynamicTools(this.tools.list()),
        });
        if (!thread?.id) {
          throw new Error('Codex did not return a thread ID.');
        }

        let removeDeltaHandler: () => void = () => undefined;
        let removeCompletedHandler: () => void = () => undefined;
        let removeCloseHandler: () => void = () => undefined;
        cleanupCompletion = () => {
          removeDeltaHandler();
          removeCompletedHandler();
          removeCloseHandler();
        };

        const completed = new Promise<void>((resolve, reject) => {
          let settled = false;
          const settle = (error?: Error) => {
            if (settled) return;
            settled = true;
            cleanupCompletion();
            if (error) reject(error);
            else resolve();
          };
          removeDeltaHandler = client.on('item/agentMessage/delta', (params) => {
            const delta = params.delta;
            if (typeof delta !== 'string') return;
            streamState.receivedText = true;
            onDelta(delta);
          });
          removeCompletedHandler = client.on('turn/completed', (params) => {
            const { turn } = params as TurnCompletedParams;
            if (turn?.status === 'failed') {
              settle(new Error(turn.error?.message ?? 'Codex turn failed.'));
            } else if (turn?.status === 'completed') {
              settle();
            } else {
              settle(new Error(`Codex turn ended with status ${turn?.status ?? 'unknown'}.`));
            }
          });
          removeCloseHandler = client.onClose(settle);
        });

        await client.request('turn/start', {
          threadId: thread.id,
          model: this.model,
          input: [{ type: 'text', text: prompt }],
        });
        await completed;

        if (!streamState.receivedText) onDelta(EMPTY_RESPONSE);
      })();

      const timedOut = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Codex request timed out after ${this.timeoutMs}ms.`));
        }, this.timeoutMs);
        cancelTimeout = () => clearTimeout(timeout);
      });

      await Promise.race([operation, timedOut]);
    } finally {
      cancelTimeout();
      cleanupCompletion();
      removeToolHandler();
      client.dispose();
    }
  }
}
