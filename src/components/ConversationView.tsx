import React from 'react';
import { Box } from 'ink';
import type { Message } from '../domain/messages.js';
import { MessageView } from './MessageView.js';

export function ConversationView({ messages }: { messages: Message[] }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {messages.map((message) => (
        <MessageView key={message.id} message={message} />
      ))}
    </Box>
  );
}
