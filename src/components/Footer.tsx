import React from 'react';
import { Box, Text } from 'ink';

export function Footer() {
  return (
    <Box justifyContent="space-between" marginTop={1}>
      <Text dimColor>↑↓ pilih · Tab lengkapi · Enter kirim · Ctrl+C keluar</Text>
      <Text dimColor>⌁ ready</Text>
    </Box>
  );
}
