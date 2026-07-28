import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createConfigStore } from '../src/config/store.js';

const temporaryDirectories: string[] = [];

async function createTemporaryStore() {
  const root = await mkdtemp(join(tmpdir(), 'athena-config-test-'));
  temporaryDirectories.push(root);
  const configPath = join(root, '.config', 'athena', 'config.json');
  return {
    root,
    configPath,
    configDirectory: join(root, '.config', 'athena'),
    store: createConfigStore(configPath),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('config store', () => {
  it('returns null when the config file does not exist', async () => {
    const { store } = await createTemporaryStore();

    await expect(store.load()).resolves.toBeNull();
  });

  it('returns null for malformed JSON or an invalid config shape', async () => {
    const { configDirectory, configPath, store } = await createTemporaryStore();
    await mkdir(configDirectory, { recursive: true });

    await writeFile(configPath, '{broken');
    await expect(store.load()).resolves.toBeNull();

    await writeFile(configPath, JSON.stringify({ provider: 'api' }));
    await expect(store.load()).resolves.toBeNull();
  });

  it('persists and reloads config with private filesystem permissions', async () => {
    const { configDirectory, configPath, store } = await createTemporaryStore();
    const config = {
      provider: 'api' as const,
      model: 'gpt-5.6-luna' as const,
      apiKey: 'sk-secret',
    };

    await store.save(config);

    expect(await readFile(configPath, 'utf8')).toBe(`${JSON.stringify(config, null, 2)}\n`);
    expect((await stat(configPath)).mode & 0o777).toBe(0o600);
    expect((await stat(configDirectory)).mode & 0o777).toBe(0o700);
    await expect(store.load()).resolves.toEqual(config);
  });

  it('repairs overly broad permissions on an existing directory and file', async () => {
    const { configDirectory, configPath, store } = await createTemporaryStore();
    await mkdir(configDirectory, { recursive: true, mode: 0o777 });
    await writeFile(configPath, '{}', { mode: 0o666 });

    await store.save({ provider: 'codex', model: 'gpt-5.6-terra' });

    expect((await stat(configDirectory)).mode & 0o777).toBe(0o700);
    expect((await stat(configPath)).mode & 0o777).toBe(0o600);
  });

  it('deletes config idempotently', async () => {
    const { configPath, store } = await createTemporaryStore();
    await store.save({ provider: 'codex', model: 'gpt-5.6-luna' });

    await store.delete();
    await expect(readFile(configPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(store.delete()).resolves.toBeUndefined();
  });

  it('propagates filesystem errors other than a missing file', async () => {
    const { configPath, store } = await createTemporaryStore();
    await mkdir(configPath, { recursive: true });

    await expect(store.load()).rejects.toBeInstanceOf(Error);
    await expect(store.delete()).rejects.toBeInstanceOf(Error);
  });
});
