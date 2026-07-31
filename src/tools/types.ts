export type ToolAccess = 'read-only' | 'workspace-write' | 'process-execution';

export type ToolExecutionContext = {
  cwd: string;
};

export type ToolExecutionResult = {
  success: boolean;
  output: string;
};

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  category: string;
  access: ToolAccess;
  inputSchema: Record<string, unknown>;
};

export type AgentTool = ToolDefinition & {
  execute: (input: unknown, context: ToolExecutionContext) => Promise<unknown>;
};

export interface ToolRuntime {
  list(): readonly AgentTool[];
  execute(
    name: string,
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult>;
}
