import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../domain/messages.js';
import { Spinner } from './Spinner.js';

type MessageViewProps = {
  message: Message;
  thinkingLabel?: string;
};

export function MessageView({ message, thinkingLabel }: MessageViewProps) {
  const isUser = message.role === 'user';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={isUser ? 'yellow' : 'cyan'} bold>
        {isUser ? 'you' : 'athena'}
      </Text>
      <Box borderStyle="round" borderColor={isUser ? 'yellow' : 'cyan'} paddingX={1}>
        {thinkingLabel ? <Spinner label={thinkingLabel} /> : <Text>{message.text}</Text>}
      </Box>
    </Box>
  );
}
