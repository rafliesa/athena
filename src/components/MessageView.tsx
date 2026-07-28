import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../types.js';

export function MessageView({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={isUser ? 'yellow' : 'cyan'} bold>
        {isUser ? 'you' : 'athena'}
      </Text>
      <Box borderStyle={'round'} borderColor={isUser ? 'yellow' : 'cyan'}>
        <Text>{message.text}</Text>
      </Box>
    </Box>
  );
}
