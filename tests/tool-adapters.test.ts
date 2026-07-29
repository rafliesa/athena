import { describe, expect, it } from 'vitest';
import { toCodexDynamicTools } from '../src/tools/adapters/codex.js';
import { toOpenAIFunctionTools } from '../src/tools/adapters/openai.js';
import type { AgentTool } from '../src/tools/types.js';

const tool: AgentTool = {
  name: 'echo',
  title: 'Echo',
  description: 'Returns its input.',
  category: 'Test',
  access: 'read-only',
  inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
  execute: async (input) => input,
};

describe('tool provider adapters', () => {
  it('maps agent tools to OpenAI function tools', () => {
    expect(toOpenAIFunctionTools([tool])).toEqual([
      {
        type: 'function',
        name: 'echo',
        description: 'Returns its input.',
        parameters: tool.inputSchema,
        strict: true,
      },
    ]);
  });

  it('maps agent tools to Codex dynamic tools', () => {
    expect(toCodexDynamicTools([tool])).toEqual([
      { name: 'echo', description: 'Returns its input.', inputSchema: tool.inputSchema },
    ]);
  });
});
