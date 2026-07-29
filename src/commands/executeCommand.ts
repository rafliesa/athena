import { logoutFromCodex } from '../auth/codex.js';
import { deleteConfig } from '../config/store.js';
import { formatCommandHelp, type CommandName } from '../domain/commands.js';
import type { ProviderName } from '../domain/config.js';
import { formatToolHelp } from '../tools/formatToolHelp.js';
import { toolRegistry } from '../tools/registry.js';

export type CommandContext = {
  provider: ProviderName;
  model: string;
  clearMessages: () => void;
  addAssistantMessage: (message: string) => void;
  openModelMenu: () => void;
  openSystemPromptEditor: () => void;
  setLoggingOut: (value: boolean) => void;
  onLogout: () => void;
  exit: () => void;
};

export type CommandDependencies = {
  logoutFromCodex: () => Promise<void>;
  deleteConfig: () => Promise<void>;
};

type CommandHandler = (
  context: CommandContext,
  dependencies: CommandDependencies,
) => void | Promise<void>;

const DEFAULT_DEPENDENCIES: CommandDependencies = {
  logoutFromCodex,
  deleteConfig,
};

const HANDLERS: Record<CommandName, CommandHandler> = {
  '/clear': ({ clearMessages }) => clearMessages(),
  '/model': ({ openModelMenu }) => openModelMenu(),
  '/systemprompt': ({ openSystemPromptEditor }) => openSystemPromptEditor(),
  '/tools': ({ addAssistantMessage }) => addAssistantMessage(formatToolHelp(toolRegistry)),
  '/status': ({ addAssistantMessage, provider, model }) =>
    addAssistantMessage(`Provider: ${provider}\nModel: ${model}\nStatus: ready`),
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
    if (context.provider === 'codex') await dependencies.logoutFromCodex();
    await dependencies.deleteConfig();
    context.onLogout();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.addAssistantMessage(`Logout failed: ${message}`);
  } finally {
    context.setLoggingOut(false);
  }
}
