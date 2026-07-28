import { useState } from 'react';
import { useInput } from 'ink';
import { isCodexAuthenticated, loginToCodex } from '../auth/codex.js';
import { validateApiKey } from '../auth/openai.js';
import { saveConfig } from '../config/store.js';
import { createApiConfig, createCodexConfig, type AthenaConfig } from '../domain/config.js';

export type AuthStep = 'provider' | 'api-key' | 'codex';
export const AUTH_OPTIONS = [
  { name: 'API key', description: 'Use an OpenAI Platform API key' },
  { name: 'Codex login', description: 'Use your existing ChatGPT/Codex account' },
] as const;

export type AuthFlowDependencies = {
  isCodexAuthenticated: () => Promise<boolean>;
  loginToCodex: (onOutput: (output: string) => void) => Promise<void>;
  validateApiKey: (apiKey: string) => Promise<void>;
  saveConfig: (config: AthenaConfig) => Promise<void>;
};

const DEFAULT_DEPENDENCIES: AuthFlowDependencies = {
  isCodexAuthenticated,
  loginToCodex,
  validateApiKey,
  saveConfig,
};

export function useAuthFlow(
  onAuthenticated: (config: AthenaConfig) => void,
  dependencies: AuthFlowDependencies = DEFAULT_DEPENDENCIES,
) {
  const [step, setStep] = useState<AuthStep>('provider');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function finish(config: AthenaConfig) {
    await dependencies.saveConfig(config);
    onAuthenticated(config);
  }

  async function authenticateApiKey() {
    const normalizedApiKey = apiKey.trim();
    setIsBusy(true);
    setError('');
    setStatus('Validating API key...');
    try {
      await dependencies.validateApiKey(normalizedApiKey);
      await finish(createApiConfig(normalizedApiKey));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsBusy(false);
    }
  }

  async function authenticateCodex() {
    setStep('codex');
    setIsBusy(true);
    setError('');
    setStatus('Checking Codex authentication...');
    try {
      if (!(await dependencies.isCodexAuthenticated())) {
        setStatus('Complete the Codex device login...');
        await dependencies.loginToCodex(setStatus);
      }
      await finish(createCodexConfig());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsBusy(false);
    }
  }

  useInput(
    (input, key) => {
      if (step === 'provider') {
        if (key.upArrow || key.downArrow) {
          const direction = key.upArrow ? -1 : 1;
          setSelectedIndex(
            (current) => (current + direction + AUTH_OPTIONS.length) % AUTH_OPTIONS.length,
          );
        } else if (key.return && selectedIndex === 0) {
          setStep('api-key');
          setError('');
          setStatus('');
        } else if (key.return) {
          void authenticateCodex();
        }
        return;
      }

      if (step === 'codex') {
        if (key.escape) {
          setStep('provider');
          setError('');
          setStatus('');
        } else if (key.return) {
          void authenticateCodex();
        }
        return;
      }

      if (step !== 'api-key') return;
      if (key.escape) {
        setStep('provider');
        setError('');
        setStatus('');
      } else if (key.return && apiKey.trim()) {
        void authenticateApiKey();
      } else if (key.backspace || key.delete) {
        setApiKey((value) => value.slice(0, -1));
      } else if (!key.ctrl && !key.meta && input) {
        setApiKey((value) => value + input);
      }
    },
    { isActive: !isBusy },
  );

  return { step, selectedIndex, apiKey, status, error, isBusy };
}
