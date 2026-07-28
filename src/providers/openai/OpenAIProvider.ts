import type { ModelId } from '../../domain/models.js';
import type { Provider, TextDeltaHandler } from '../provider.js';
import { SseDecoder } from './sse.js';

type ResponsesStreamEvent = {
  type?: string;
  delta?: string;
  error?: { message?: string };
};

const EMPTY_RESPONSE = 'OpenAI returned an empty response.';
const DEFAULT_TIMEOUT_MS = 120_000;

export class OpenAIProvider implements Provider {
  readonly name = 'api';

  constructor(
    private readonly apiKey: string,
    readonly model: ModelId,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async stream(prompt: string, onDelta: TextDeltaHandler): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: prompt,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error (${response.status}): ${await response.text()}`);
      }
      if (!response.body) {
        throw new Error('OpenAI API returned no response stream.');
      }

      const decoder = new TextDecoder();
      const sse = new SseDecoder();
      const reader = response.body.getReader();
      let receivedText = false;

      while (true) {
        const { value, done } = await reader.read();
        const payloads = sse.push(decoder.decode(value, { stream: !done }));
        if (done) payloads.push(...sse.finish());

        for (const payload of payloads) {
          if (payload === '[DONE]') continue;
          const event = JSON.parse(payload) as ResponsesStreamEvent;

          if (event.type === 'response.output_text.delta' && event.delta) {
            receivedText = true;
            onDelta(event.delta);
          }
          if (event.type === 'error') {
            throw new Error(event.error?.message ?? 'OpenAI stream failed.');
          }
        }

        if (done) break;
      }

      if (!receivedText) onDelta(EMPTY_RESPONSE);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`OpenAI request timed out after ${this.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
