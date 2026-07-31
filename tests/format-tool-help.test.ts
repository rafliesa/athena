import { describe, expect, it } from 'vitest';
import { formatToolHelp } from '../src/tools/formatToolHelp.js';
import type { ToolRuntime } from '../src/tools/types.js';

describe('formatToolHelp', () => {
  it('reports when the runtime has no tools', () => {
    const runtime: ToolRuntime = {
      list: () => [],
      execute: async () => ({ success: true, output: '' }),
    };

    expect(formatToolHelp(runtime)).toBe('No tools are available.');
  });

  it('formats tool metadata and parameter details', () => {
    const runtime: ToolRuntime = {
      list: () => [
        {
          name: 'find_files',
          title: 'Find files',
          category: 'Filesystem',
          access: 'read-only',
          description: 'Find matching paths.',
          inputSchema: {
            properties: {
              query: { type: ['string', 'null'], description: 'Text to match.' },
              limit: {
                type: 'integer',
                minimum: 1,
                maximum: 10,
                maxLength: 20,
                maxItems: 5,
                default: 5,
              },
              unusual: { description: 42 },
            },
            required: ['query'],
          },
          execute: async () => undefined,
        },
        {
          name: 'status',
          title: 'Status',
          category: 'System',
          access: 'read-only',
          description: 'Show status.',
          inputSchema: {},
          execute: async () => undefined,
        },
      ],
      execute: async () => ({ success: true, output: '' }),
    };

    expect(formatToolHelp(runtime)).toBe(`## Available tools (2)

### find_files — Find files

- **Category:** Filesystem
- **Access:** read-only

Find matching paths.

**Parameters**

- \`query\` (string | null, required) — Text to match.
- \`limit\` (integer, optional, min 1, max 10, max length 20, max items 5, default 5)
- \`unusual\` (unknown, optional)

### status — Status

- **Category:** System
- **Access:** read-only

Show status.

**Parameters**

- None`);
  });
});
