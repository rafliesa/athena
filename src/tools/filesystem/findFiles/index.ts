import type { AgentTool } from '../../types.js';
import { executeFindFiles } from './execute.js';
import { parseFindFilesInput } from './input.js';

export const findFilesTool: AgentTool = {
  name: 'find_files',
  title: 'Find files',
  category: 'Filesystem',
  access: 'read-only',
  description:
    'Find files by a literal substring in their file name. Searches recursively inside a workspace directory, returns deterministic paths, skips generated directories, and never follows symbolic links.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Workspace-relative directory to search, for example "." or "src".',
      },
      query: {
        type: 'string',
        maxLength: 256,
        description: 'Non-empty literal substring to match against each file name.',
      },
      caseSensitive: {
        type: 'boolean',
        description: 'Whether letter casing must match exactly.',
      },
      maxDepth: {
        type: 'integer',
        minimum: 1,
        maximum: 8,
        description: 'Maximum recursive depth. Use 1 for immediate files only.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 500,
        description: 'Maximum number of matching file paths to return.',
      },
      includeHidden: {
        type: 'boolean',
        description:
          'Whether to include dot-prefixed files and directories. Generated directories remain excluded.',
      },
    },
    required: ['path', 'query', 'caseSensitive', 'maxDepth', 'limit', 'includeHidden'],
    additionalProperties: false,
  },
  async execute(input, context) {
    return executeFindFiles(parseFindFilesInput(input), context);
  },
};
