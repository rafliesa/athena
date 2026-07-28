import React from 'react';
import { Box, Text } from 'ink';
import type { ProviderName } from '../domain/config.js';
import type { ModelId } from '../domain/models.js';

type FooterProps = {
  provider: ProviderName;
  model: ModelId;
};

export function Footer({ provider, model }: FooterProps) {
  return (
    <Box justifyContent="space-between" marginTop={1}>
      <Text dimColor>↑↓ select · Tab complete · Enter send · Ctrl+C exit</Text>
      <Text dimColor>
        ⌁ {provider} · {model}
      </Text>
    </Box>
  );
}
