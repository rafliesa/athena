import type { AgentTool } from '../../types.js';
import { executeReadFile } from './execute.js';
import { parseReadFileInput } from './input.js';

export const readFileTool: AgentTool = {
  name: 'read_file',
  title: 'Read file',
  category: 'Filesystem',
  access: 'read-only',
  description:
    'Read a bounded 1-based line range from a UTF-8 text file inside the workspace. Returns at most 1,000 lines or 100,000 characters plus pagination metadata, and rejects binary or oversized files.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Workspace-relative path of the file to read.',
      },
      startLine: {
        type: ['integer', 'null'],
        minimum: 1,
        description: 'First 1-based line to return, or null to start at line 1.',
      },
      endLine: {
        type: ['integer', 'null'],
        minimum: 1,
        description: 'Last 1-based line to return, or null to read up to the per-call line limit.',
      },
    },
    required: ['path', 'startLine', 'endLine'],
    additionalProperties: false,
  },
  async execute(input, context) {
    return executeReadFile(parseReadFileInput(input), context);
  },
};
