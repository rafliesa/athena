import { Text } from 'ink';
import { cleanup, render } from 'ink-testing-library';
import { useEffect, useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useStoredConfig, type ConfigLoader } from '../src/config/useStoredConfig.js';
import type { AthenaConfig } from '../src/domain/config.js';

function StoredConfigHarness({
  loader,
  replacement,
}: {
  loader: ConfigLoader;
  replacement?: AthenaConfig | null;
}) {
  const { state, setConfig } = useStoredConfig(loader);
  const replaced = useRef(false);

  useEffect(() => {
    if (state.status === 'ready' && replacement !== undefined && !replaced.current) {
      replaced.current = true;
      setConfig(replacement);
    }
  }, [replacement, setConfig, state.status]);

  if (state.status === 'loading') return <Text>loading</Text>;
  if (state.status === 'error') return <Text>error:{state.error.message}</Text>;
  if (state.config === null) return <Text>ready:none</Text>;
  return (
    <Text>
      ready:{state.config.provider}:{state.config.model}
    </Text>
  );
}

afterEach(cleanup);

describe('useStoredConfig', () => {
  it('moves from loading to a loaded configuration', async () => {
    let resolveLoad: (config: AthenaConfig | null) => void = () => {};
    const loader = vi.fn(
      () =>
        new Promise<AthenaConfig | null>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const view = render(<StoredConfigHarness loader={loader} />);

    expect(view.lastFrame()).toBe('loading');
    await vi.waitFor(() => expect(loader).toHaveBeenCalledOnce());
    resolveLoad({ provider: 'codex', model: 'gpt-5.6-terra' });

    await vi.waitFor(() => expect(view.lastFrame()).toBe('ready:codex:gpt-5.6-terra'));
  });

  it('normalizes non-Error loader failures', async () => {
    const loader = vi.fn(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- verifies normalization of unknown rejections
      throw 'disk unavailable';
    });
    const view = render(<StoredConfigHarness loader={loader} />);

    await vi.waitFor(() => expect(view.lastFrame()).toBe('error:disk unavailable'));
  });

  it('allows the loaded config to be replaced in memory', async () => {
    const loader = vi.fn(async () => null);
    const view = render(
      <StoredConfigHarness
        loader={loader}
        replacement={{ provider: 'codex', model: 'gpt-5.6-sol' }}
      />,
    );

    await vi.waitFor(() => expect(view.lastFrame()).toBe('ready:codex:gpt-5.6-sol'));
  });
});
