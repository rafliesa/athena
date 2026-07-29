import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from '../src/providers/openai/OpenAIProvider.js';
import { toOpenAIFunctionTools } from '../src/tools/adapters/openai.js';
import { toolRegistry } from '../src/tools/registry.js';
import type { AgentTool, ToolRuntime } from '../src/tools/types.js';

const API_URL = 'https://api.openai.com/v1/responses';

function streamingResponse(...chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });

  return new Response(body, { status: 200 });
}

function createToolRuntime(
  execute: ToolRuntime['execute'] = vi.fn(async () => ({
    success: true,
    output: '{"ok":true}',
  })),
): ToolRuntime {
  const definition: AgentTool = {
    name: 'scan_directory',
    title: 'Scan directory',
    category: 'Filesystem',
    access: 'read-only',
    description: 'Scan files',
    inputSchema: { type: 'object' },
    execute: async () => undefined,
  };
  return {
    list: () => [definition],
    execute,
  };
}

function requestJson(fetchCall: Parameters<typeof fetch>): Record<string, unknown> {
  const body = fetchCall[1]?.body;
  if (typeof body !== 'string') {
    throw new TypeError('Expected the OpenAI request body to be JSON.');
  }
  return JSON.parse(body) as Record<string, unknown>;
}

describe('OpenAIProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends an authenticated streaming request and forwards every text delta', async () => {
    fetchMock.mockResolvedValue(
      streamingResponse(
        'data: {"type":"response.output_text.delta","delta":"Hel',
        'lo"}\n\ndata: {"type":"response.output_text.delta","delta":" world"}\n\n',
        'data: [DONE]\n\n',
      ),
    );
    const onDelta = vi.fn();

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna', undefined, 'Be concise.').stream(
      'Hi',
      onDelta,
    );

    expect(onDelta.mock.calls).toEqual([['Hello'], [' world']]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(API_URL);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret-key');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(requestJson(fetchMock.mock.calls[0]!)).toEqual({
      model: 'gpt-5.6-luna',
      instructions: 'Be concise.',
      input: [{ role: 'user', content: 'Hi' }],
      tools: toOpenAIFunctionTools(toolRegistry.list()),
      parallel_tool_calls: false,
      stream: true,
    });
  });

  it('executes a function call and continues with its output and response items', async () => {
    const execute = vi.fn<ToolRuntime['execute']>(async () => ({
      success: true,
      output: '{"ok":true,"result":{"entries":["src/config.ts"]}}',
    }));
    const tools = createToolRuntime(execute);
    const reasoning = { type: 'reasoning', id: 'reasoning-1', summary: [] };
    const functionCall = {
      type: 'function_call',
      id: 'call-item-1',
      call_id: 'call-1',
      name: 'scan_directory',
      arguments: '{"path":"src","query":"config"}',
    };
    fetchMock
      .mockResolvedValueOnce(
        streamingResponse(
          `data: ${JSON.stringify({ type: 'response.output_item.done', item: reasoning })}\n\n`,
          `data: ${JSON.stringify({ type: 'response.output_item.done', item: functionCall })}\n\n`,
          'data: {"type":"response.completed"}\n\n',
        ),
      )
      .mockResolvedValueOnce(
        streamingResponse(
          'data: {"type":"response.output_text.delta","delta":"Found config."}\n\n',
          'data: {"type":"response.completed"}\n\n',
        ),
      );
    const onDelta = vi.fn();

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna', undefined, 'Be concise.', tools).stream(
      'Find config',
      onDelta,
    );

    expect(execute).toHaveBeenCalledWith(
      'scan_directory',
      { path: 'src', query: 'config' },
      { cwd: process.cwd() },
    );
    expect(onDelta).toHaveBeenCalledOnce();
    expect(onDelta).toHaveBeenCalledWith('Found config.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestJson(fetchMock.mock.calls[1]!)).toMatchObject({
      input: [
        { role: 'user', content: 'Find config' },
        reasoning,
        functionCall,
        {
          type: 'function_call_output',
          call_id: 'call-1',
          output: '{"ok":true,"result":{"entries":["src/config.ts"]}}',
        },
      ],
      tools: toOpenAIFunctionTools(tools.list()),
      parallel_tool_calls: false,
    });
  });

  it('uses completed response output when item-done events are unavailable', async () => {
    const execute = vi.fn<ToolRuntime['execute']>(async () => ({
      success: false,
      output: '{"ok":false,"error":"not found"}',
    }));
    const tools = createToolRuntime(execute);
    const functionCall = {
      type: 'function_call',
      call_id: 'call-from-completed',
      name: 'scan_directory',
      arguments: '{}',
    };
    fetchMock
      .mockResolvedValueOnce(
        streamingResponse(
          `data: ${JSON.stringify({
            type: 'response.completed',
            response: { output: [functionCall] },
          })}\n\n`,
        ),
      )
      .mockResolvedValueOnce(
        streamingResponse('data: {"type":"response.output_text.delta","delta":"Unable."}\n\n'),
      );

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna', undefined, 'Be concise.', tools).stream(
      'Scan',
      vi.fn(),
    );

    expect(execute).toHaveBeenCalledOnce();
    expect(requestJson(fetchMock.mock.calls[1]!)).toMatchObject({
      input: [
        { role: 'user', content: 'Scan' },
        functionCall,
        {
          type: 'function_call_output',
          call_id: 'call-from-completed',
          output: '{"ok":false,"error":"not found"}',
        },
      ],
    });
  });

  it('returns malformed tool arguments to the model instead of invoking the tool', async () => {
    const execute = vi.fn<ToolRuntime['execute']>();
    const tools = createToolRuntime(execute);
    const functionCall = {
      type: 'function_call',
      call_id: 'bad-call',
      name: 'scan_directory',
      arguments: '{not-json',
    };
    fetchMock
      .mockResolvedValueOnce(
        streamingResponse(
          `data: ${JSON.stringify({ type: 'response.output_item.done', item: functionCall })}\n\n`,
        ),
      )
      .mockResolvedValueOnce(
        streamingResponse('data: {"type":"response.output_text.delta","delta":"Try again."}\n\n'),
      );

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna', undefined, 'Be concise.', tools).stream(
      'Scan',
      vi.fn(),
    );

    expect(execute).not.toHaveBeenCalled();
    expect(requestJson(fetchMock.mock.calls[1]!)).toMatchObject({
      input: [
        { role: 'user', content: 'Scan' },
        functionCall,
        {
          type: 'function_call_output',
          call_id: 'bad-call',
          output: '{"ok":false,"error":"Invalid JSON arguments for scan_directory."}',
        },
      ],
    });
  });

  it('stops repeated function calls at the tool-round limit', async () => {
    const execute = vi.fn<ToolRuntime['execute']>(async () => ({
      success: true,
      output: '{"ok":true}',
    }));
    const tools = createToolRuntime(execute);
    fetchMock.mockImplementation(async () =>
      streamingResponse(
        `data: ${JSON.stringify({
          type: 'response.output_item.done',
          item: {
            type: 'function_call',
            call_id: `call-${fetchMock.mock.calls.length}`,
            name: 'scan_directory',
            arguments: '{}',
          },
        })}\n\n`,
      ),
    );

    await expect(
      new OpenAIProvider('secret-key', 'gpt-5.6-luna', undefined, 'Be concise.', tools).stream(
        'Loop',
        vi.fn(),
      ),
    ).rejects.toThrow('OpenAI exceeded the 8-round tool-call limit.');
    expect(fetchMock).toHaveBeenCalledTimes(9);
    expect(execute).toHaveBeenCalledTimes(8);
  });

  it('includes the HTTP status and response body in API errors', async () => {
    fetchMock.mockResolvedValue(new Response('invalid key', { status: 401 }));

    await expect(
      new OpenAIProvider('bad-key', 'gpt-5.6-luna').stream('Hi', vi.fn()),
    ).rejects.toThrow('OpenAI API error (401): invalid key');
  });

  it('propagates errors sent inside the stream', async () => {
    fetchMock.mockResolvedValue(
      streamingResponse('data: {"type":"error","error":{"message":"rate limited"}}\n\n'),
    );

    await expect(
      new OpenAIProvider('secret-key', 'gpt-5.6-luna').stream('Hi', vi.fn()),
    ).rejects.toThrow('rate limited');
  });

  it('shows a fallback when the stream completes without text', async () => {
    fetchMock.mockResolvedValue(streamingResponse('data: {"type":"response.completed"}\n\n'));
    const onDelta = vi.fn();

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna').stream('Hi', onDelta);

    expect(onDelta).toHaveBeenCalledOnce();
    expect(onDelta).toHaveBeenCalledWith('OpenAI returned an empty response.');
  });

  it('rejects a successful response without a stream body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(
      new OpenAIProvider('secret-key', 'gpt-5.6-luna').stream('Hi', vi.fn()),
    ).rejects.toThrow('OpenAI API returned no response stream.');
  });

  it('preserves multibyte text split across byte chunks', async () => {
    const encoder = new TextEncoder();
    const event = encoder.encode('data: {"type":"response.output_text.delta","delta":"Hi 🌍"}\n\n');
    const emojiStart = event.indexOf(0xf0);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(event.slice(0, emojiStart + 2));
        controller.enqueue(event.slice(emojiStart + 2));
        controller.close();
      },
    });
    fetchMock.mockResolvedValue(new Response(body));
    const onDelta = vi.fn();

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna').stream('Hi', onDelta);

    expect(onDelta).toHaveBeenCalledWith('Hi 🌍');
  });

  it('rejects malformed JSON events', async () => {
    fetchMock.mockResolvedValue(streamingResponse('data: not-json\n\n'));

    await expect(
      new OpenAIProvider('secret-key', 'gpt-5.6-luna').stream('Hi', vi.fn()),
    ).rejects.toBeInstanceOf(SyntaxError);
  });

  it('handles a final event without a trailing SSE separator', async () => {
    fetchMock.mockResolvedValue(
      streamingResponse('data: {"type":"response.output_text.delta","delta":"final"}'),
    );
    const onDelta = vi.fn();

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna').stream('Hi', onDelta);

    expect(onDelta).toHaveBeenCalledWith('final');
  });

  it('aborts a stalled request after the configured timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );
    const stream = new OpenAIProvider('secret-key', 'gpt-5.6-luna', 1_000).stream('Hi', vi.fn());
    const rejection = expect(stream).rejects.toThrow('OpenAI request timed out after 1000ms.');

    await vi.advanceTimersByTimeAsync(1_000);

    await rejection;
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toHaveProperty('aborted', true);
  });
});
