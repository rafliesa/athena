import React from 'react';
import { Box } from 'ink';
import type { Message } from '../domain/messages.js';
import { MessageView } from './MessageView.js';

type ConversationViewProps = {
  messages: Message[];
  thinkingLabel?: string;
};

export function ConversationView({ messages, thinkingLabel }: ConversationViewProps) {
  const lastMessage = messages.at(-1);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {messages.map((message) => (
        <MessageView
          key={message.id}
          message={message}
          thinkingLabel={
            thinkingLabel && message.id === lastMessage?.id && message.text.length === 0
              ? thinkingLabel
              : undefined
          }
        />
      ))}
    </Box>
  );
}
