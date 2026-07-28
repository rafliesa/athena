import React from 'react';
import { Box, Text } from 'ink';

export function ApiKeyForm({ apiKey }: { apiKey: string }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>OpenAI API key</Text>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} width="100%">
        <Text>{apiKey ? '•'.repeat(Math.min(apiKey.length, 48)) : 'Paste your API key...'}</Text>
      </Box>
      <Text dimColor>Enter validate · Esc back · stored locally with file mode 0600</Text>
    </Box>
  );
}
