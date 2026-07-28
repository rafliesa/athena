import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../commands.js';

export function CommandMenu({
  commands,
  selectedIndex = 0,
}: {
  commands: Command[];
  selectedIndex?: number;
}) {
  if (commands.length === 0) return null;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      {commands.map((command, index) => (
        <Box key={command.name}>
          <Text color={index === selectedIndex ? 'cyan' : 'white'} bold={index === selectedIndex}>
            {index === selectedIndex ? '› ' : '  '}
            {command.name}
          </Text>
          <Text dimColor> {command.description}</Text>
        </Box>
      ))}
    </Box>
  );
}
