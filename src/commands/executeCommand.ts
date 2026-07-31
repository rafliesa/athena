import { deleteConfig } from '../config/store.js';
import { formatCommandHelp, type CommandName } from '../domain/commands.js';
import type { ProviderName } from '../domain/config.js';
import { formatAgentPermissions, type AgentPermissions } from '../domain/permissions.js';
import { formatToolHelp } from '../tools/formatToolHelp.js';
import { createPermissionedToolRegistry } from '../tools/registry.js';

export type CommandContext = {
  provider: ProviderName;
  model: string;
  permissions: AgentPermissions;
  clearMessages: () => void;
  addAssistantMessage: (message: string) => void;
  openModelMenu: () => void;
  openSystemPromptEditor: () => void;
  openPermissionMenu: () => void;
  setLoggingOut: (value: boolean) => void;
  onLogout: () => void;
  exit: () => void;
};

export type CommandDependencies = {
  deleteConfig: () => Promise<void>;
};

type CommandHandler = (
  context: CommandContext,
  dependencies: CommandDependencies,
) => void | Promise<void>;

const DEFAULT_DEPENDENCIES: CommandDependencies = {
  deleteConfig,
};

const HANDLERS: Record<CommandName, CommandHandler> = {
  '/clear': ({ clearMessages }) => clearMessages(),
  '/model': ({ openModelMenu }) => openModelMenu(),
  '/systemprompt': ({ openSystemPromptEditor }) => openSystemPromptEditor(),
  '/permissions': ({ openPermissionMenu }) => openPermissionMenu(),
  '/tools': ({ addAssistantMessage, permissions }) =>
    addAssistantMessage(formatToolHelp(createPermissionedToolRegistry(permissions))),
  '/status': ({ addAssistantMessage, provider, model, permissions }) =>
    addAssistantMessage(
      `Provider: ${provider}\nModel: ${model}\nStatus: ready\n\nPermissions:\n${formatAgentPermissions(permissions)}`,
    ),
  '/help': ({ addAssistantMessage }) => addAssistantMessage(formatCommandHelp()),
  '/logout': logout,
  '/exit': ({ exit }) => exit(),
};

export function createCommandExecutor(
  context: CommandContext,
  dependencies: CommandDependencies = DEFAULT_DEPENDENCIES,
) {
  return async (command: CommandName): Promise<void> => {
    await HANDLERS[command](context, dependencies);
  };
}

async function logout(context: CommandContext, dependencies: CommandDependencies): Promise<void> {
  context.setLoggingOut(true);
  try {
    await dependencies.deleteConfig();
    context.onLogout();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.addAssistantMessage(`Logout failed: ${message}`);
  } finally {
    context.setLoggingOut(false);
  }
}
