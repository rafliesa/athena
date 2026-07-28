import { Text } from 'ink';
import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthFlow, type AuthFlowDependencies } from '../src/hooks/useAuthFlow.js';
import type { AthenaConfig } from '../src/domain/config.js';

async function sendInput(view: ReturnType<typeof render>, input: string): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  view.stdin.write(input);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function createDependencies(): AuthFlowDependencies {
  return {
    isCodexAuthenticated: vi.fn(async () => true),
    loginToCodex: vi.fn(async () => undefined),
    validateApiKey: vi.fn(async () => undefined),
    saveConfig: vi.fn(async () => undefined),
  };
}

function AuthHarness({
  dependencies,
  onAuthenticated,
}: {
  dependencies: AuthFlowDependencies;
  onAuthenticated: (config: AthenaConfig) => void;
}) {
  const auth = useAuthFlow(onAuthenticated, dependencies);

  return (
    <Text>
      {auth.step}|{auth.selectedIndex}|{auth.apiKey}|{auth.isBusy ? 'busy' : 'idle'}|{auth.status}|
      {auth.error}
    </Text>
  );
}

afterEach(cleanup);

describe('useAuthFlow', () => {
  it('validates, normalizes, persists, and returns an API configuration', async () => {
    const dependencies = createDependencies();
    const onAuthenticated = vi.fn();
    const view = render(
      <AuthHarness dependencies={dependencies} onAuthenticated={onAuthenticated} />,
    );

    await sendInput(view, '\r');
    await sendInput(view, '  sk-secret  ');
    await sendInput(view, '\r');

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(dependencies.validateApiKey).toHaveBeenCalledWith('sk-secret');
    expect(dependencies.saveConfig).toHaveBeenCalledWith({
      provider: 'api',
      model: 'gpt-5.6-luna',
      apiKey: 'sk-secret',
    });
    expect(onAuthenticated).toHaveBeenCalledWith({
      provider: 'api',
      model: 'gpt-5.6-luna',
      apiKey: 'sk-secret',
    });
  });

  it('shows API validation errors without persisting configuration', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.validateApiKey).mockRejectedValueOnce(new Error('invalid API key'));
    const onAuthenticated = vi.fn();
    const view = render(
      <AuthHarness dependencies={dependencies} onAuthenticated={onAuthenticated} />,
    );

    await sendInput(view, '\r');
    await sendInput(view, 'sk-invalid');
    await sendInput(view, '\r');

    await vi.waitFor(() => expect(view.lastFrame()).toContain('invalid API key'));
    expect(dependencies.saveConfig).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(view.lastFrame()).toContain('|idle|');
  });

  it('reuses an authenticated Codex session without starting device login', async () => {
    const dependencies = createDependencies();
    const onAuthenticated = vi.fn();
    const view = render(
      <AuthHarness dependencies={dependencies} onAuthenticated={onAuthenticated} />,
    );

    await sendInput(view, '\u001B[B');
    await sendInput(view, '\r');

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(dependencies.loginToCodex).not.toHaveBeenCalled();
    expect(dependencies.saveConfig).toHaveBeenCalledWith({
      provider: 'codex',
      model: 'gpt-5.6-luna',
    });
  });

  it('runs device login when no Codex session exists', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.isCodexAuthenticated).mockResolvedValueOnce(false);
    vi.mocked(dependencies.loginToCodex).mockImplementationOnce(async (onOutput) => {
      onOutput('Waiting for browser approval');
    });
    const onAuthenticated = vi.fn();
    const view = render(
      <AuthHarness dependencies={dependencies} onAuthenticated={onAuthenticated} />,
    );

    await sendInput(view, '\u001B[B');
    await sendInput(view, '\r');

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(dependencies.loginToCodex).toHaveBeenCalledOnce();
  });

  it('allows returning to provider selection after Codex login fails', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.isCodexAuthenticated).mockResolvedValue(false);
    vi.mocked(dependencies.loginToCodex).mockRejectedValue(new Error('device login expired'));
    const view = render(<AuthHarness dependencies={dependencies} onAuthenticated={vi.fn()} />);

    await sendInput(view, '\u001B[B');
    await sendInput(view, '\r');
    await vi.waitFor(() => expect(view.lastFrame()).toContain('device login expired'));
    expect(view.lastFrame()).toContain('codex|');

    await sendInput(view, '\u001B');

    await vi.waitFor(() => expect(view.lastFrame()).toMatch(/^provider\|1\|/));
  });

  it('allows retrying Codex login after a transient failure', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.isCodexAuthenticated).mockResolvedValue(false);
    vi.mocked(dependencies.loginToCodex)
      .mockRejectedValueOnce(new Error('temporary login failure'))
      .mockResolvedValueOnce(undefined);
    const onAuthenticated = vi.fn();
    const view = render(
      <AuthHarness dependencies={dependencies} onAuthenticated={onAuthenticated} />,
    );

    await sendInput(view, '\u001B[B');
    await sendInput(view, '\r');
    await vi.waitFor(() => expect(view.lastFrame()).toContain('temporary login failure'));

    await sendInput(view, '\r');

    await vi.waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
    expect(dependencies.loginToCodex).toHaveBeenCalledTimes(2);
  });

  it('does not authenticate when saving configuration fails', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.saveConfig).mockRejectedValueOnce(new Error('config is read-only'));
    const onAuthenticated = vi.fn();
    const view = render(
      <AuthHarness dependencies={dependencies} onAuthenticated={onAuthenticated} />,
    );

    await sendInput(view, '\r');
    await sendInput(view, 'sk-valid');
    await sendInput(view, '\r');

    await vi.waitFor(() => expect(view.lastFrame()).toContain('config is read-only'));
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
