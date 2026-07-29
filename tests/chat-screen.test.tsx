import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatScreen, type ChatScreenDependencies } from '../src/screens/ChatScreen.js';
import type { AthenaConfig } from '../src/domain/config.js';
import type { Provider } from '../src/providers/provider.js';

const CONFIG: AthenaConfig = {
  provider: 'api',
  model: 'gpt-5.6-luna',
  apiKey: 'sk-test',
};

async function sendInput(view: ReturnType<typeof render>, input: string): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  view.stdin.write(input);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function createHarness(overrides?: {
  provider?: Provider;
  saveConfig?: ChatScreenDependencies['saveConfig'];
}) {
  const provider: Provider = overrides?.provider ?? {
    name: 'api',
    model: 'gpt-5.6-luna',
    stream: vi.fn<Provider['stream']>(async (_prompt, onDelta) => {
      onDelta('provider answer');
    }),
  };
  const dependencies: ChatScreenDependencies = {
    createProvider: vi.fn(() => provider),
    saveConfig: overrides?.saveConfig ?? vi.fn(async () => undefined),
  };
  const onConfigChange = vi.fn();
  const onLogout = vi.fn();
  const view = render(
    <ChatScreen
      config={CONFIG}
      onConfigChange={onConfigChange}
      onLogout={onLogout}
      dependencies={dependencies}
    />,
  );

  return { view, provider, dependencies, onConfigChange, onLogout };
}

afterEach(cleanup);

describe('ChatScreen', () => {
  it('renders the thinking indicator under the borderless Athena label', async () => {
    let finishStreaming: (() => void) | undefined;
    const provider: Provider = {
      name: 'api',
      model: 'gpt-5.6-luna',
      stream: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishStreaming = resolve;
          }),
      ),
    };
    const { view } = createHarness({ provider });

    await sendInput(view, 'hello');
    await sendInput(view, '\r');

    await vi.waitFor(() => {
      const frame = view.lastFrame() ?? '';
      const thinkingIndex = frame.indexOf('Thinking with gpt-5.6-luna...');
      expect(thinkingIndex).toBeGreaterThan(-1);
      const athenaIndex = frame.lastIndexOf('athena', thinkingIndex);
      expect(athenaIndex).toBeGreaterThan(-1);
      expect(frame.slice(athenaIndex, thinkingIndex)).not.toMatch(/[╭╮╰╯│]/);
    });

    finishStreaming?.();
  });

  it('routes a regular prompt to the provider and renders streamed output', async () => {
    const { view, provider } = createHarness();

    await sendInput(view, 'hello');
    await sendInput(view, '\r');

    await vi.waitFor(() => {
      expect(provider.stream).toHaveBeenCalledWith('hello', expect.any(Function));
      expect(view.lastFrame()).toContain('provider answer');
    });
  });

  it('keeps the latest agent output and controls visible when the conversation exceeds the viewport', async () => {
    const provider: Provider = {
      name: 'api',
      model: 'gpt-5.6-luna',
      stream: vi.fn<Provider['stream']>(async (_prompt, onDelta) => {
        onDelta(Array.from({ length: 40 }, (_, index) => `line ${index}`).join('\n'));
      }),
    };
    const { view } = createHarness({ provider });

    await sendInput(view, 'long response');
    await sendInput(view, '\r');

    await vi.waitFor(() => expect(view.lastFrame()).toContain('line 39'));
    expect(view.lastFrame()).not.toContain('line 0');
    expect(view.lastFrame()).toContain('Tell me to do something...');
    expect(view.lastFrame()).toContain('api · gpt-5.6-luna');
  });

  it('scrolls through conversation history and can return to the latest output', async () => {
    const provider: Provider = {
      name: 'api',
      model: 'gpt-5.6-luna',
      stream: vi.fn<Provider['stream']>(async (_prompt, onDelta) => {
        onDelta(Array.from({ length: 40 }, (_, index) => `line ${index}`).join('\n'));
      }),
    };
    const { view } = createHarness({ provider });

    await sendInput(view, 'long response');
    await sendInput(view, '\r');
    await vi.waitFor(() => expect(view.lastFrame()).toContain('line 39'));

    await sendInput(view, '\u001B[5~');
    await vi.waitFor(() => expect(view.lastFrame()).not.toContain('line 39'));
    expect(view.lastFrame()).toContain('line 20');

    await sendInput(view, '\u0005');
    await vi.waitFor(() => expect(view.lastFrame()).toContain('line 39'));
  });

  it('renders unknown slash commands without calling the provider', async () => {
    const { view, provider } = createHarness();

    await sendInput(view, '/unknown');
    await sendInput(view, '\r');

    await vi.waitFor(() => expect(view.lastFrame()).toContain('Unknown command: /unknown'));
    expect(provider.stream).not.toHaveBeenCalled();
  });

  it('persists a model selection before publishing the new config', async () => {
    const { view, dependencies, onConfigChange } = createHarness();

    await sendInput(view, '/model');
    await sendInput(view, '\r');
    await vi.waitFor(() => expect(view.lastFrame()).toContain('Select model'));
    await sendInput(view, '\u001B[B');
    await sendInput(view, '\r');

    const expectedConfig: AthenaConfig = {
      ...CONFIG,
      model: 'gpt-5.6-terra',
    };
    await vi.waitFor(() => expect(onConfigChange).toHaveBeenCalledWith(expectedConfig));
    expect(dependencies.saveConfig).toHaveBeenCalledWith(expectedConfig);
    expect(vi.mocked(dependencies.saveConfig).mock.invocationCallOrder[0]).toBeLessThan(
      onConfigChange.mock.invocationCallOrder[0]!,
    );
    expect(view.lastFrame()).toContain('Model changed to gpt-5.6-terra.');
  });

  it('opens the system prompt editor and persists a replacement', async () => {
    const { view, dependencies, onConfigChange } = createHarness();

    await sendInput(view, '/systemprompt');
    await sendInput(view, '\r');
    await vi.waitFor(() => expect(view.lastFrame()).toContain('Edit system prompt'));
    await sendInput(view, '\u0001');
    await sendInput(view, 'Be concise.');
    await sendInput(view, '\r');

    const expectedConfig: AthenaConfig = {
      ...CONFIG,
      systemPrompt: 'Be concise.',
    };
    await vi.waitFor(() => expect(onConfigChange).toHaveBeenCalledWith(expectedConfig));
    expect(dependencies.saveConfig).toHaveBeenCalledWith(expectedConfig);
    expect(view.lastFrame()).toContain('System prompt updated.');
  });

  it('keeps the model menu open and reports persistence failures', async () => {
    const saveConfig = vi.fn(async () => {
      throw new Error('config is read-only');
    });
    const { view, onConfigChange } = createHarness({ saveConfig });

    await sendInput(view, '/model');
    await sendInput(view, '\r');
    await sendInput(view, '\u001B[B');
    await sendInput(view, '\r');

    await vi.waitFor(() =>
      expect(view.lastFrame()).toContain('Failed to change model: config is read-only'),
    );
    expect(view.lastFrame()).toContain('Select model');
    expect(onConfigChange).not.toHaveBeenCalled();
  });
});
