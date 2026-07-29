import type { AgentTool } from '../types.js';

export type OpenAIFunctionTool = {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  strict: true;
};

export function toOpenAIFunctionTools(tools: readonly AgentTool[]): OpenAIFunctionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    strict: true,
  }));
}
