import { describe, expect, it } from 'vitest';
import { updateMessage, type Message } from '../src/domain/messages.js';

describe('messages', () => {
  it('updates a message by stable ID', () => {
    const messages: Message[] = [
      { id: 1, role: 'user', text: 'hello' },
      { id: 2, role: 'assistant', text: 'stream' },
    ];

    expect(
      updateMessage(messages, 2, (message) => ({ ...message, text: `${message.text}ing` })),
    ).toEqual([
      { id: 1, role: 'user', text: 'hello' },
      { id: 2, role: 'assistant', text: 'streaming' },
    ]);
  });
});
