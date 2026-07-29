import React, { memo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../domain/messages.js';
import { Markdown } from './Markdown.js';
import { Spinner } from './Spinner.js';

type MessageViewProps = {
  message: Message;
  thinkingLabel?: string;
};

export const MessageView = memo(function MessageView({ message, thinkingLabel }: MessageViewProps) {
  const isUser = message.role === 'user';

  return (
    <Box flexDirection="column" flexShrink={0} marginBottom={1}>
      <Text color={isUser ? 'yellow' : 'cyan'} bold>
        {isUser ? 'you' : 'athena'}
      </Text>
      <Box borderStyle="round" borderColor={isUser ? 'yellow' : 'cyan'} paddingX={1}>
        {thinkingLabel ? <Spinner label={thinkingLabel} /> : <Markdown>{message.text}</Markdown>}
      </Box>
    </Box>
  );
});
