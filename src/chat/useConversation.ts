import { useCallback, useRef, useState } from 'react';
import { updateMessage, WELCOME_MESSAGE, type Message } from '../domain/messages.js';
import type { Provider } from '../providers/provider.js';

const STREAM_RENDER_INTERVAL_MS = 32;

export function useConversation(provider: Provider) {
  const nextId = useRef(1);
  const streaming = useRef(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'assistant', text: WELCOME_MESSAGE, variant: 'welcome' },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  const addAssistantMessage = useCallback((text: string) => {
    const id = nextId.current++;
    setMessages((messages) => [...messages, { id, role: 'assistant', text }]);
  }, []);

  const clearMessages = useCallback(() => {
    const id = nextId.current++;
    setMessages([{ id, role: 'assistant', text: WELCOME_MESSAGE, variant: 'welcome' }]);
  }, []);

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (streaming.current) return;
      streaming.current = true;
      const userMessage: Message = { id: nextId.current++, role: 'user', text: prompt };
      const responseId = nextId.current++;
      const responseMessage: Message = { id: responseId, role: 'assistant', text: '' };

      setMessages((messages) => [...messages, userMessage, responseMessage]);
      setIsStreaming(true);

      let bufferedText = '';
      let renderTimer: ReturnType<typeof setTimeout> | undefined;
      const flushBufferedText = () => {
        if (!bufferedText) return;
        const text = bufferedText;
        bufferedText = '';
        setMessages((messages) =>
          updateMessage(messages, responseId, (message) => ({
            ...message,
            text: message.text + text,
          })),
        );
      };

      try {
        await provider.stream(prompt, (delta) => {
          bufferedText += delta;
          if (renderTimer) return;
          renderTimer = setTimeout(() => {
            renderTimer = undefined;
            flushBufferedText();
          }, STREAM_RENDER_INTERVAL_MS);
        });
        if (renderTimer) clearTimeout(renderTimer);
        flushBufferedText();
      } catch (error) {
        if (renderTimer) clearTimeout(renderTimer);
        bufferedText = '';
        const message = error instanceof Error ? error.message : String(error);
        setMessages((messages) =>
          updateMessage(messages, responseId, (response) => ({
            ...response,
            text: `Error: ${message}`,
          })),
        );
      } finally {
        streaming.current = false;
        setIsStreaming(false);
      }
    },
    [provider],
  );

  return {
    messages,
    isStreaming,
    addAssistantMessage,
    clearMessages,
    sendMessage,
  };
}
