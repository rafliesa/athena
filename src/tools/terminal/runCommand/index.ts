import type { AgentTool } from '../../types.js';
import { executeRunCommand } from './execute.js';
import { parseRunCommandInput } from './input.js';

export const runCommandTool: AgentTool = {
  name: 'run_command',
  title: 'Run command',
  category: 'Terminal',
  access: 'process-execution',
  description:
    'Run one executable with explicit arguments and no interactive stdin, from a workspace directory. Captures bounded stdout/stderr and enforces a timeout. This is trusted local execution, not an OS sandbox: the process inherits Athena permissions and may access paths or network resources outside the workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        maxLength: 512,
        description:
          'Executable name or path, for example "npm", "git", "rg", or "node". Shell syntax is not interpreted.',
      },
      args: {
        type: 'array',
        maxItems: 100,
        items: { type: 'string', maxLength: 10000 },
        description: 'Ordered command arguments, for example ["run", "test"].',
      },
      cwd: {
        type: 'string',
        description: 'Workspace-relative directory in which to start the command.',
      },
      timeoutMs: {
        type: 'integer',
        minimum: 100,
        maximum: 120000,
        description: 'Time limit in milliseconds before the process group is terminated.',
      },
    },
    required: ['command', 'args', 'cwd', 'timeoutMs'],
    additionalProperties: false,
  },
  async execute(input, context) {
    return executeRunCommand(parseRunCommandInput(input), context);
  },
};
