import type { AgentTool } from '../types.js';

export type CodexDynamicTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export function toCodexDynamicTools(tools: readonly AgentTool[]): CodexDynamicTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}
