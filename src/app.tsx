import React from 'react';
import { Text } from 'ink';
import { Spinner } from './components/Spinner.js';
import { useStoredConfig } from './config/useStoredConfig.js';
import { AuthScreen } from './screens/AuthScreen.js';
import { ChatScreen } from './screens/ChatScreen.js';

export function App() {
  const { state, setConfig } = useStoredConfig();

  if (state.status === 'loading') return <Spinner label="Loading Athena..." />;
  if (state.status === 'error') {
    return <Text color="red">Failed to load Athena config: {state.error.message}</Text>;
  }
  if (state.config === null) return <AuthScreen onAuthenticated={setConfig} />;

  return (
    <ChatScreen config={state.config} onConfigChange={setConfig} onLogout={() => setConfig(null)} />
  );
}
