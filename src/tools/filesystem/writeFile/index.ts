import type { AgentTool } from '../../types.js';
import { executeWriteFile } from './execute.js';
import { parseWriteFileInput } from './input.js';

export const writeFileTool: AgentTool = {
  name: 'write_file',
  title: 'Write file',
  category: 'Filesystem',
  access: 'workspace-write',
  description:
    'Create a UTF-8 text file or replace its complete contents inside the workspace. Overwriting must be explicit, parent creation is configurable, symbolic-link targets are rejected, and replacements are atomic.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Workspace-relative path of the file to create or replace.',
      },
      content: {
        type: 'string',
        description: 'Complete UTF-8 content to write. May be empty.',
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether an existing regular file may be replaced.',
      },
      createParentDirectories: {
        type: 'boolean',
        description: 'Whether missing parent directories should be created.',
      },
    },
    required: ['path', 'content', 'overwrite', 'createParentDirectories'],
    additionalProperties: false,
  },
  async execute(input, context) {
    return executeWriteFile(parseWriteFileInput(input), context);
  },
};
