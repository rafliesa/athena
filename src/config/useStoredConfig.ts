import { useEffect, useState } from 'react';
import type { AthenaConfig } from '../domain/config.js';
import { loadConfig } from './store.js';

type ConfigState =
  | { status: 'loading' }
  | { status: 'ready'; config: AthenaConfig | null }
  | { status: 'error'; error: Error };

export type ConfigLoader = () => Promise<AthenaConfig | null>;

export function useStoredConfig(configLoader: ConfigLoader = loadConfig) {
  const [state, setState] = useState<ConfigState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    void configLoader().then(
      (config) => {
        if (active) setState({ status: 'ready', config });
      },
      (error: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      },
    );

    return () => {
      active = false;
    };
  }, [configLoader]);

  function setConfig(config: AthenaConfig | null) {
    setState({ status: 'ready', config });
  }

  return { state, setConfig };
}
