import React from 'react';
import { Box, Text } from 'ink';

export function Prompt({ value }: { value: string }) {
  return (
    <Box width="100%" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text color="cyan" bold>
        › <Text color="white">{value || 'Tell me to do something...'}</Text>
        {value ? '▌' : ''}
      </Text>
    </Box>
  );
}
