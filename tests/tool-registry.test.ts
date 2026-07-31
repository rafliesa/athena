import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '../src/tools/ToolRegistry.js';
import { createPermissionedToolRegistry, toolRegistry } from '../src/tools/registry.js';
import type { AgentTool } from '../src/tools/types.js';

const schema = {
  type: 'object',
  properties: { value: { type: 'string' } },
};

function makeTool(overrides: Partial<AgentTool> = {}): AgentTool {
  return {
    name: 'echo',
    title: 'Echo',
    description: 'Returns its input.',
    category: 'Test',
    access: 'read-only',
    inputSchema: schema,
    execute: async (input) => input,
    ...overrides,
  };
}

describe('ToolRegistry', () => {
  it('composes every enabled coding tool in a stable order', () => {
    expect(toolRegistry.list().map((tool) => [tool.name, tool.access])).toEqual([
      ['scan_directory', 'read-only'],
      ['find_files', 'read-only'],
      ['search_text', 'read-only'],
      ['read_file', 'read-only'],
      ['write_file', 'workspace-write'],
      ['edit_file', 'workspace-write'],
      ['run_command', 'process-execution'],
    ]);
    for (const tool of toolRegistry.list()) {
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        additionalProperties: false,
      });
    }
  });

  it('lists tools in registration order', () => {
    const echo = makeTool();
    const second = makeTool({ name: 'second' });

    expect(new ToolRegistry([echo, second]).list()).toEqual([echo, second]);
  });

  it('filters mutating tools according to agent permissions', async () => {
    const readOnly = createPermissionedToolRegistry({
      canEditFiles: false,
      canRunCommands: false,
    });
    expect(readOnly.list().map((tool) => tool.name)).toEqual([
      'scan_directory',
      'find_files',
      'search_text',
      'read_file',
    ]);
    await expect(readOnly.execute('run_command', {}, { cwd: '/workspace' })).resolves.toEqual({
      success: false,
      output: JSON.stringify({ ok: false, error: 'Unknown tool: run_command' }),
    });

    const terminalOnly = createPermissionedToolRegistry({
      canEditFiles: false,
      canRunCommands: true,
    });
    expect(terminalOnly.list().map((tool) => tool.name)).toContain('run_command');
    expect(terminalOnly.list().map((tool) => tool.name)).not.toContain('write_file');
  });

  it('serializes successful execution and reports unknown tools', async () => {
    const registry = new ToolRegistry([makeTool()]);

    await expect(
      registry.execute('echo', { value: 'hello' }, { cwd: '/workspace' }),
    ).resolves.toEqual({
      success: true,
      output: JSON.stringify({ ok: true, result: { value: 'hello' } }),
    });
    await expect(registry.execute('missing', {}, { cwd: '/workspace' })).resolves.toEqual({
      success: false,
      output: JSON.stringify({ ok: false, error: 'Unknown tool: missing' }),
    });
  });

  it('rejects duplicate names at registration time', () => {
    expect(() => new ToolRegistry([makeTool(), makeTool()])).toThrow('Duplicate tool name: echo');
  });

  it('turns thrown Error and non-Error values into failed results', async () => {
    const registry = new ToolRegistry([
      makeTool({ name: 'error', execute: async () => Promise.reject(new Error('broken')) }),
      makeTool({
        name: 'string-error',
        execute: async () => {
          const reason: unknown = 'unavailable';
          throw reason;
        },
      }),
    ]);

    await expect(registry.execute('error', {}, { cwd: '/workspace' })).resolves.toEqual({
      success: false,
      output: JSON.stringify({ ok: false, error: 'broken' }),
    });
    await expect(registry.execute('string-error', {}, { cwd: '/workspace' })).resolves.toEqual({
      success: false,
      output: JSON.stringify({ ok: false, error: 'unavailable' }),
    });
  });
});
