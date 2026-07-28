import React, { useState } from 'react';
import { Box } from 'ink';
import { Footer } from './components/Footer.js';
import { MessageView } from './components/MessageView.js';
import { Prompt } from './components/Prompt.js';
import { usePrompt } from './hooks/usePrompt.js';
import type { Message } from './types.js';

const INITIAL_MESSAGES: Message[] = [{ role: 'assistant', text: 'Hello, World!' }];

const RESPONSE = '...';

export function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const prompt = usePrompt((value) => {
    setMessages((current) => [
      ...current,
      { role: 'user', text: value },
      { role: 'assistant', text: RESPONSE },
    ]);
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} width="100%">
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((message, index) => (
          <MessageView key={`${message.role}-${index}`} message={message} />
        ))}
      </Box>
      <Prompt value={prompt} />
      <Footer />
    </Box>
  );
}
