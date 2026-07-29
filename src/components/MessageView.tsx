import React, { memo } from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../domain/messages.js';
import { Markdown } from './Markdown.js';
import { Spinner } from './Spinner.js';
import { AthenaLogo } from './AthenaLogo.js';

type MessageViewProps = {
  message: Message;
  thinkingLabel?: string;
};

export const MessageView = memo(function MessageView({ message, thinkingLabel }: MessageViewProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <Box flexShrink={0} marginBottom={1}>
        <Text color="white" backgroundColor="#303030">
          {formatUserMessage(message.text)}
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexShrink={0} marginBottom={1}>
      <Text color="cyan" bold>
        athena
      </Text>
      <Box paddingLeft={1}>
        {thinkingLabel ? (
          <Spinner label={thinkingLabel} />
        ) : message.variant === 'welcome' ? (
          <Box alignItems="center">
            <AthenaLogo />
            <Box flexDirection="column" marginLeft={1}>
              <Markdown>{message.text}</Markdown>
            </Box>
          </Box>
        ) : (
          <Markdown>{message.text}</Markdown>
        )}
      </Box>
    </Box>
  );
});

function formatUserMessage(text: string): string {
  return text
    .split('\n')
    .map((line, index) => ` ${index === 0 ? '›' : ' '} ${line} `)
    .join('\n');
}
