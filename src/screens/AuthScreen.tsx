import React from 'react';
import { Box, Text } from 'ink';
import { ApiKeyForm } from '../components/ApiKeyForm.js';
import { AuthProviderPicker } from '../components/AuthProviderPicker.js';
import { Spinner } from '../components/Spinner.js';
import { useAuthFlow } from '../hooks/useAuthFlow.js';
import type { AthenaConfig } from '../domain/config.js';

export function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (config: AthenaConfig) => void;
}) {
  const auth = useAuthFlow(onAuthenticated);

  return (
    <Box flexDirection="column" padding={2} width="100%">
      <Text bold color="cyan">
        Athena setup
      </Text>
      <Text dimColor>Connect a provider to start using the agent harness.</Text>

      {auth.step === 'provider' && <AuthProviderPicker selectedIndex={auth.selectedIndex} />}
      {auth.step === 'api-key' && <ApiKeyForm apiKey={auth.apiKey} />}
      {auth.isBusy && <Spinner label={auth.status} />}
      {!auth.isBusy && auth.step === 'codex' && auth.status && <Text>{auth.status}</Text>}
      {auth.error && <Text color="red">Error: {auth.error}</Text>}
    </Box>
  );
}
