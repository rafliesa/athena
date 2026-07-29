import { DEFAULT_SYSTEM_PROMPT } from '../../domain/config.js';
import type { ModelId } from '../../domain/models.js';
import { toOpenAIFunctionTools } from '../../tools/adapters/openai.js';
import { toolRegistry } from '../../tools/registry.js';
import type { ToolExecutionResult, ToolRuntime } from '../../tools/types.js';
import type { Provider, TextDeltaHandler } from '../provider.js';
import { SseDecoder } from './sse.js';

type ResponsesStreamEvent = {
  type?: string;
  delta?: string;
  item?: ResponsesOutputItem;
  response?: { output?: ResponsesOutputItem[] };
  error?: { message?: string };
};

type ResponsesOutputItem = Record<string, unknown> & {
  type?: string;
};

type FunctionCallItem = ResponsesOutputItem & {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
};

const EMPTY_RESPONSE = 'OpenAI returned an empty response.';
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TOOL_ROUNDS = 8;

export class OpenAIProvider implements Provider {
  readonly name = 'api';

  constructor(
    private readonly apiKey: string,
    readonly model: ModelId,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
    private readonly systemPrompt = DEFAULT_SYSTEM_PROMPT,
    private readonly tools: ToolRuntime = toolRegistry,
  ) {}

  async stream(prompt: string, onDelta: TextDeltaHandler): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const input: Record<string, unknown>[] = [{ role: 'user', content: prompt }];
    const streamState = { receivedText: false };

    try {
      for (let round = 0; ; round++) {
        const output = await this.requestResponse(input, controller.signal, (delta) => {
          streamState.receivedText = true;
          onDelta(delta);
        });
        input.push(...output);

        const toolCalls = output.filter(isFunctionCallItem);
        if (toolCalls.length === 0) break;
        if (round >= MAX_TOOL_ROUNDS) {
          throw new Error(`OpenAI exceeded the ${MAX_TOOL_ROUNDS}-round tool-call limit.`);
        }

        for (const call of toolCalls) {
          const result = await this.executeToolCall(call);
          input.push({
            type: 'function_call_output',
            call_id: call.call_id,
            output: result.output,
          });
        }
      }
      if (!streamState.receivedText) onDelta(EMPTY_RESPONSE);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`OpenAI request timed out after ${this.timeoutMs}ms.`, {
          cause: error,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestResponse(
    input: Record<string, unknown>[],
    signal: AbortSignal,
    onDelta: TextDeltaHandler,
  ): Promise<ResponsesOutputItem[]> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        instructions: this.systemPrompt,
        input,
        tools: toOpenAIFunctionTools(this.tools.list()),
        parallel_tool_calls: false,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error (${response.status}): ${await response.text()}`);
    }
    if (!response.body) {
      throw new Error('OpenAI API returned no response stream.');
    }

    const decoder = new TextDecoder();
    const sse = new SseDecoder();
    const output: ResponsesOutputItem[] = [];
    const processPayloads = (payloads: readonly string[]) => {
      for (const payload of payloads) {
        if (payload === '[DONE]') continue;
        const event = JSON.parse(payload) as ResponsesStreamEvent;

        if (event.type === 'response.output_text.delta' && event.delta) onDelta(event.delta);
        if (event.type === 'response.output_item.done' && event.item) output.push(event.item);
        if (event.type === 'response.completed' && output.length === 0 && event.response?.output) {
          output.push(...event.response.output);
        }
        if (event.type === 'error') {
          throw new Error(event.error?.message ?? 'OpenAI stream failed.');
        }
      }
    };

    for await (const chunk of response.body) {
      processPayloads(sse.push(decoder.decode(chunk, { stream: true })));
    }

    const finalPayloads = sse.push(decoder.decode());
    finalPayloads.push(...sse.finish());
    processPayloads(finalPayloads);

    return output;
  }

  private async executeToolCall(call: FunctionCallItem): Promise<ToolExecutionResult> {
    let input: unknown;
    try {
      input = JSON.parse(call.arguments) as unknown;
    } catch {
      return {
        success: false,
        output: JSON.stringify({ ok: false, error: `Invalid JSON arguments for ${call.name}.` }),
      };
    }
    return this.tools.execute(call.name, input, { cwd: process.cwd() });
  }
}

function isFunctionCallItem(item: ResponsesOutputItem): item is FunctionCallItem {
  return (
    item.type === 'function_call' &&
    typeof item.call_id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.arguments === 'string'
  );
}
