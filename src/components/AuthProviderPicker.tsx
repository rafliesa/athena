import React from 'react';
import { Box, Text } from 'ink';
import { AUTH_OPTIONS } from '../hooks/useAuthFlow.js';

export function AuthProviderPicker({ selectedIndex }: { selectedIndex: number }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {AUTH_OPTIONS.map((option, index) => (
        <Text
          key={option.name}
          color={selectedIndex === index ? 'cyan' : 'white'}
          bold={selectedIndex === index}
        >
          {selectedIndex === index ? '› ' : '  '}
          {option.name} <Text dimColor>— {option.description}</Text>
        </Text>
      ))}
      <Text dimColor>↑↓ select · Enter continue</Text>
    </Box>
  );
}
