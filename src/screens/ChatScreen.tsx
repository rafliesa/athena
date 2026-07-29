import React, { useCallback, useMemo, useState } from 'react';
import { Box, useApp } from 'ink';
import { useConversation } from '../chat/useConversation.js';
import { saveConfig } from '../config/store.js';
import { createCommandExecutor } from '../commands/executeCommand.js';
import { isCommandName } from '../domain/commands.js';
import { DEFAULT_SYSTEM_PROMPT, type AthenaConfig } from '../domain/config.js';
import type { ModelId } from '../domain/models.js';
import { ChatControls } from '../components/ChatControls.js';
import { ConversationView } from '../components/ConversationView.js';
import { Footer } from '../components/Footer.js';
import { Spinner } from '../components/Spinner.js';
import { createProvider as createDefaultProvider } from '../providers/createProvider.js';
import type { Provider } from '../providers/provider.js';
import { usePromptInput } from '../hooks/usePromptInput.js';

type ChatScreenProps = {
  config: AthenaConfig;
  onConfigChange: (config: AthenaConfig) => void;
  onLogout: () => void;
  dependencies?: ChatScreenDependencies;
};

export type ChatScreenDependencies = {
  createProvider: (config: AthenaConfig) => Provider;
  saveConfig: (config: AthenaConfig) => Promise<void>;
};

const DEFAULT_DEPENDENCIES: ChatScreenDependencies = {
  createProvider: createDefaultProvider,
  saveConfig,
};

export function ChatScreen({
  config,
  onConfigChange,
  onLogout,
  dependencies = DEFAULT_DEPENDENCIES,
}: ChatScreenProps) {
  const { exit } = useApp();
  const provider = useMemo(() => dependencies.createProvider(config), [config, dependencies]);
  const { messages, isStreaming, addAssistantMessage, clearMessages, sendMessage } =
    useConversation(provider);
  const [activeMenu, setActiveMenu] = useState<'model' | 'systemPrompt' | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isBusy = isStreaming || isLoggingOut;

  const executeCommand = useMemo(
    () =>
      createCommandExecutor({
        provider: provider.name,
        model: provider.model,
        clearMessages,
        addAssistantMessage,
        openModelMenu: () => setActiveMenu('model'),
        openSystemPromptEditor: () => setActiveMenu('systemPrompt'),
        setLoggingOut: setIsLoggingOut,
        onLogout,
        exit,
      }),
    [addAssistantMessage, clearMessages, exit, onLogout, provider.model, provider.name],
  );

  const handleSubmit = useCallback(
    (value: string) => {
      if (isCommandName(value)) void executeCommand(value);
      else if (value.startsWith('/')) addAssistantMessage(`Unknown command: ${value}`);
      else void sendMessage(value);
    },
    [addAssistantMessage, executeCommand, sendMessage],
  );

  const prompt = usePromptInput({
    active: activeMenu === null && !isBusy,
    onSubmit: handleSubmit,
    onExit: exit,
  });

  const selectModel = useCallback(
    async (model: ModelId) => {
      try {
        const nextConfig: AthenaConfig = { ...config, model };
        await dependencies.saveConfig(nextConfig);
        onConfigChange(nextConfig);
        setActiveMenu(null);
        addAssistantMessage(`Model changed to ${model}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addAssistantMessage(`Failed to change model: ${message}`);
      }
    },
    [addAssistantMessage, config, dependencies, onConfigChange],
  );

  const saveSystemPrompt = useCallback(
    async (systemPrompt: string) => {
      try {
        const nextConfig: AthenaConfig = { ...config, systemPrompt };
        await dependencies.saveConfig(nextConfig);
        onConfigChange(nextConfig);
        setActiveMenu(null);
        addAssistantMessage('System prompt updated.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addAssistantMessage(`Failed to update system prompt: ${message}`);
      }
    },
    [addAssistantMessage, config, dependencies, onConfigChange],
  );

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1} width="100%">
      <ConversationView messages={messages} />
      <ChatControls
        activeMenu={activeMenu}
        prompt={prompt.value}
        systemPrompt={config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT}
        suggestions={prompt.suggestions}
        selectedIndex={prompt.selectedIndex}
        currentModel={config.model}
        onModelSelect={(model) => void selectModel(model)}
        onModelCancel={() => setActiveMenu(null)}
        onSystemPromptSave={(value) => void saveSystemPrompt(value)}
        onSystemPromptCancel={() => setActiveMenu(null)}
      />
      {isBusy && (
        <Spinner label={isLoggingOut ? 'Signing out...' : `Thinking with ${provider.model}...`} />
      )}
      <Footer provider={provider.name} model={provider.model} />
    </Box>
  );
}
