import { chmod, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { parseConfig, type AthenaConfig } from '../domain/config.js';

const CONFIG_DIRECTORY = join(homedir(), '.config', 'athena');
const CONFIG_PATH = join(CONFIG_DIRECTORY, 'config.json');

export type ConfigStore = {
  load: () => Promise<AthenaConfig | null>;
  save: (config: AthenaConfig) => Promise<void>;
  delete: () => Promise<void>;
};

export function createConfigStore(configPath: string): ConfigStore {
  const configDirectory = dirname(configPath);

  return {
    async load() {
      try {
        const rawConfig: unknown = JSON.parse(await readFile(configPath, 'utf8'));
        return parseConfig(rawConfig);
      } catch (error) {
        if (isMissingFile(error) || error instanceof SyntaxError) return null;
        throw error;
      }
    },

    async save(config) {
      await mkdir(configDirectory, { recursive: true, mode: 0o700 });
      await chmod(configDirectory, 0o700);
      await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
        mode: 0o600,
      });
      await chmod(configPath, 0o600);
    },

    async delete() {
      try {
        await unlink(configPath);
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
    },
  };
}

const defaultStore = createConfigStore(CONFIG_PATH);

export function loadConfig(): Promise<AthenaConfig | null> {
  return defaultStore.load();
}

export function saveConfig(config: AthenaConfig): Promise<void> {
  return defaultStore.save(config);
}

export function deleteConfig(): Promise<void> {
  return defaultStore.delete();
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
