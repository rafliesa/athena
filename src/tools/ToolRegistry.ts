import type { AgentTool, ToolExecutionContext, ToolExecutionResult, ToolRuntime } from './types.js';

export class ToolRegistry implements ToolRuntime {
  private readonly toolsByName: Map<string, AgentTool>;

  constructor(tools: readonly AgentTool[]) {
    this.toolsByName = new Map();
    for (const tool of tools) {
      if (this.toolsByName.has(tool.name)) {
        throw new Error(`Duplicate tool name: ${tool.name}`);
      }
      this.toolsByName.set(tool.name, tool);
    }
  }

  list(): readonly AgentTool[] {
    return [...this.toolsByName.values()];
  }

  async execute(
    name: string,
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.toolsByName.get(name);
    if (!tool) {
      return failure(`Unknown tool: ${name}`);
    }

    try {
      const result = await tool.execute(input, context);
      return {
        success: true,
        output: JSON.stringify({ ok: true, result }),
      };
    } catch (error) {
      return failure(error instanceof Error ? error.message : String(error));
    }
  }
}

function failure(error: string): ToolExecutionResult {
  return {
    success: false,
    output: JSON.stringify({ ok: false, error }),
  };
}
