import { describe, expect, it } from 'vitest';
import { SseDecoder } from '../src/providers/openai/sse.js';

describe('SseDecoder', () => {
  it('decodes events split across network chunks', () => {
    const decoder = new SseDecoder();

    expect(decoder.push('data: {"type":"response.output_')).toEqual([]);
    expect(decoder.push('text.delta","delta":"hi"}\n\n')).toEqual([
      '{"type":"response.output_text.delta","delta":"hi"}',
    ]);
  });

  it('supports CRLF and multiline data fields', () => {
    const decoder = new SseDecoder();

    expect(decoder.push('data: first\r\ndata: second\r\n\r\n')).toEqual(['first\nsecond']);
  });

  it('decodes multiple events in one chunk', () => {
    const decoder = new SseDecoder();

    expect(decoder.push('data: one\n\ndata: two\n\n')).toEqual(['one', 'two']);
  });

  it('flushes the final event when the stream ends without a blank line', () => {
    const decoder = new SseDecoder();

    expect(decoder.push('data: final')).toEqual([]);
    expect(decoder.finish()).toEqual(['final']);
    expect(decoder.finish()).toEqual([]);
  });

  it('flushes and clears a final event ending in a single newline', () => {
    const decoder = new SseDecoder();

    expect(decoder.push('data: final\n')).toEqual([]);
    expect(decoder.finish()).toEqual(['final']);
    expect(decoder.finish()).toEqual([]);
  });
});
