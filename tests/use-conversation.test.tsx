import { Text } from 'ink';
import { cleanup, render } from 'ink-testing-library';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useConversation } from '../src/chat/useConversation.js';
import type { Provider } from '../src/providers/provider.js';

type HarnessProps = {
  provider: Provider;
};

function ConversationHarness({ provider }: HarnessProps) {
  const { messages, isStreaming, sendMessage } = useConversation(provider);
  const latestMessage = messages.at(-1);

  useEffect(() => {
    void sendMessage('hello');
  }, [sendMessage]);

  return (
    <Text>
      {isStreaming ? 'streaming' : 'idle'}|{latestMessage?.role}|{latestMessage?.text}
    </Text>
  );
}

function ConcurrentConversationHarness({ provider }: HarnessProps) {
  const { messages, isStreaming, sendMessage } = useConversation(provider);

  useEffect(() => {
    void sendMessage('first');
    void sendMessage('second');
  }, [sendMessage]);

  return (
    <Text>
      {isStreaming ? 'streaming' : 'idle'}|
      {messages.map((message) => `${message.role}:${message.text}`).join('|')}
    </Text>
  );
}

function ClearingConversationHarness({ provider }: HarnessProps) {
  const { messages, sendMessage, clearMessages, addAssistantMessage } = useConversation(provider);

  useEffect(() => {
    let active = true;
    void sendMessage('discard me').then(() => {
      if (!active) return;
      clearMessages();
      addAssistantMessage('after clear');
    });
    return () => {
      active = false;
    };
  }, [addAssistantMessage, clearMessages, sendMessage]);

  return <Text>{messages.map((message) => `${message.role}:${message.text}`).join('|')}</Text>;
}

afterEach(cleanup);

describe('useConversation', () => {
  it('accumulates streamed deltas into one assistant message', async () => {
    const provider: Provider = {
      name: 'api',
      model: 'gpt-5.6-luna',
      stream: vi.fn<Provider['stream']>(async (_prompt, onDelta) => {
        onDelta('Hello');
        onDelta(' world');
      }),
    };
    const view = render(<ConversationHarness provider={provider} />);

    await vi.waitFor(() => {
      expect(view.lastFrame()).toBe('idle|assistant|Hello world');
    });
    expect(provider.stream).toHaveBeenCalledWith('hello', expect.any(Function));
  });

  it('renders provider failures in the pending assistant message', async () => {
    const provider: Provider = {
      name: 'api',
      model: 'gpt-5.6-luna',
      stream: vi.fn<Provider['stream']>(async () => {
        throw new Error('network unavailable');
      }),
    };
    const view = render(<ConversationHarness provider={provider} />);

    await vi.waitFor(() => {
      expect(view.lastFrame()).toBe('idle|assistant|Error: network unavailable');
    });
  });

  it('ignores a second submission while a response is still streaming', async () => {
    let resolveStream: () => void = () => {};
    const pendingStream = new Promise<void>((resolve) => {
      resolveStream = resolve;
    });
    const provider: Provider = {
      name: 'api',
      model: 'gpt-5.6-luna',
      stream: vi.fn<Provider['stream']>(() => pendingStream),
    };
    const view = render(<ConcurrentConversationHarness provider={provider} />);

    await vi.waitFor(() => {
      expect(provider.stream).toHaveBeenCalledOnce();
      expect(view.lastFrame()).toContain('streaming|');
    });
    expect(provider.stream).toHaveBeenCalledWith('first', expect.any(Function));

    resolveStream();

    await vi.waitFor(() => expect(view.lastFrame()).toContain('idle|'));
    expect(view.lastFrame()).not.toContain('user:second');
  });

  it('clears prior messages and preserves a fresh welcome message', async () => {
    const provider: Provider = {
      name: 'api',
      model: 'gpt-5.6-luna',
      stream: vi.fn<Provider['stream']>(async (_prompt, onDelta) => {
        onDelta('discarded response');
      }),
    };
    const view = render(<ClearingConversationHarness provider={provider} />);

    await vi.waitFor(() => {
      expect(view.lastFrame()).toContain('assistant:after clear');
    });
    expect(view.lastFrame()).toContain('assistant:Hello! I am Athena.');
    expect(view.lastFrame()).not.toContain('discard me');
    expect(view.lastFrame()).not.toContain('discarded response');
  });
});
