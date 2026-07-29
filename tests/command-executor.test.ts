import { describe, expect, it, vi } from 'vitest';
import { createCommandExecutor } from '../src/commands/executeCommand.js';

function createContext() {
  return {
    provider: 'api' as const,
    model: 'gpt-5.6-luna',
    clearMessages: vi.fn(),
    addAssistantMessage: vi.fn(),
    openModelMenu: vi.fn(),
    openSystemPromptEditor: vi.fn(),
    setLoggingOut: vi.fn(),
    onLogout: vi.fn(),
    exit: vi.fn(),
  };
}

function createDependencies() {
  return {
    logoutFromCodex: vi.fn(async () => undefined),
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
    await execute('/tools');
    await execute('/status');
    await execute('/help');
    await execute('/exit');

    expect(context.clearMessages).toHaveBeenCalledOnce();
    expect(context.openModelMenu).toHaveBeenCalledOnce();
    expect(context.openSystemPromptEditor).toHaveBeenCalledOnce();
    expect(context.addAssistantMessage).toHaveBeenCalledTimes(3);
    expect(context.addAssistantMessage).toHaveBeenCalledWith(
      expect.stringContaining('scan_directory — Scan directory'),
    );
    expect(context.exit).toHaveBeenCalledOnce();
  });

  it('deletes API configuration and completes logout', async () => {
    const context = createContext();
    const dependencies = createDependencies();

    await createCommandExecutor(context, dependencies)('/logout');

    expect(dependencies.logoutFromCodex).not.toHaveBeenCalled();
    expect(dependencies.deleteConfig).toHaveBeenCalledOnce();
    expect(context.onLogout).toHaveBeenCalledOnce();
    expect(context.setLoggingOut.mock.calls).toEqual([[true], [false]]);
  });

  it('logs out of Codex before deleting its configuration', async () => {
    const context = { ...createContext(), provider: 'codex' as const };
    const dependencies = createDependencies();

    await createCommandExecutor(context, dependencies)('/logout');

    expect(dependencies.logoutFromCodex).toHaveBeenCalledOnce();
    expect(dependencies.deleteConfig).toHaveBeenCalledOnce();
    expect(dependencies.logoutFromCodex.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.deleteConfig.mock.invocationCallOrder[0]!,
    );
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
