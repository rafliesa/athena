import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from '../src/providers/openai/OpenAIProvider.js';

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

    await new OpenAIProvider('secret-key', 'gpt-5.6-luna').stream('Hi', onDelta);

    expect(onDelta.mock.calls).toEqual([['Hello'], [' world']]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(API_URL);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer secret-key');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'gpt-5.6-luna',
      input: 'Hi',
      stream: true,
    });
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
