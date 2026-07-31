import { describe, expect, it, vi } from 'vitest';
import { createCommandExecutor } from '../src/commands/executeCommand.js';

function createContext() {
  return {
    provider: 'api' as const,
    model: 'gpt-5.6-luna',
    permissions: {
      canEditFiles: true,
      canRunCommands: true,
    },
    clearMessages: vi.fn(),
    addAssistantMessage: vi.fn<(message: string) => void>(),
    openModelMenu: vi.fn(),
    openSystemPromptEditor: vi.fn(),
    openPermissionMenu: vi.fn(),
    setLoggingOut: vi.fn(),
    onLogout: vi.fn(),
    exit: vi.fn(),
  };
}

function createDependencies() {
  return {
    deleteConfig: vi.fn(async () => undefined),
  };
}

describe('command executor', () => {
  it('routes commands to independent handlers', async () => {
    const context = createContext();
    const execute = createCommandExecutor(context);

    await execute('/clear');
    await execute('/model');
    await execute('/systemprompt');
    await execute('/permissions');
    await execute('/tools');
    await execute('/status');
    await execute('/help');
    await execute('/exit');

    expect(context.clearMessages).toHaveBeenCalledOnce();
    expect(context.openModelMenu).toHaveBeenCalledOnce();
    expect(context.openSystemPromptEditor).toHaveBeenCalledOnce();
    expect(context.openPermissionMenu).toHaveBeenCalledOnce();
    expect(context.addAssistantMessage).toHaveBeenCalledTimes(3);
    expect(context.addAssistantMessage).toHaveBeenCalledWith(
      expect.stringContaining('scan_directory — Scan directory'),
    );
    expect(context.addAssistantMessage).toHaveBeenCalledWith(
      expect.stringContaining('edit_file — Edit file'),
    );
    expect(context.addAssistantMessage).toHaveBeenCalledWith(
      expect.stringContaining('run_command — Run command'),
    );
    expect(context.exit).toHaveBeenCalledOnce();
  });

  it('only lists tools allowed by the current permissions', async () => {
    const context = {
      ...createContext(),
      permissions: {
        canEditFiles: false,
        canRunCommands: false,
      },
    };

    await createCommandExecutor(context)('/tools');

    expect(context.addAssistantMessage).toHaveBeenCalledWith(
      expect.stringContaining('read_file — Read file'),
    );
    const help = context.addAssistantMessage.mock.calls[0]?.[0] ?? '';
    expect(help).not.toContain('write_file');
    expect(help).not.toContain('edit_file');
    expect(help).not.toContain('run_command');
  });

  it('deletes API configuration and completes logout', async () => {
    const context = createContext();
    const dependencies = createDependencies();

    await createCommandExecutor(context, dependencies)('/logout');

    expect(dependencies.deleteConfig).toHaveBeenCalledOnce();
    expect(context.onLogout).toHaveBeenCalledOnce();
    expect(context.setLoggingOut.mock.calls).toEqual([[true], [false]]);
  });

  it('deletes only Athena configuration when the provider is Codex', async () => {
    const context = { ...createContext(), provider: 'codex' as const };
    const dependencies = createDependencies();

    await createCommandExecutor(context, dependencies)('/logout');

    expect(dependencies.deleteConfig).toHaveBeenCalledOnce();
    expect(context.onLogout).toHaveBeenCalledOnce();
  });

  it('reports logout failures and always clears the loading state', async () => {
    const context = createContext();
    const dependencies = createDependencies();
    dependencies.deleteConfig.mockRejectedValueOnce(new Error('disk unavailable'));

    await createCommandExecutor(context, dependencies)('/logout');

    expect(context.onLogout).not.toHaveBeenCalled();
    expect(context.addAssistantMessage).toHaveBeenCalledWith('Logout failed: disk unavailable');
    expect(context.setLoggingOut.mock.calls).toEqual([[true], [false]]);
  });
});
