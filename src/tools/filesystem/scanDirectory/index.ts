import type { AgentTool } from '../../types.js';
import { executeScanDirectory } from './execute.js';
import { parseScanDirectoryInput } from './input.js';

export const scanDirectoryTool: AgentTool = {
  name: 'scan_directory',
  title: 'Scan directory',
  category: 'Filesystem',
  access: 'read-only',
  description:
    'Recursively inspect a directory inside the current workspace and optionally find files or directories whose relative path contains a case-insensitive query. Returns paths and entry types without reading file contents. Generated dependency/build directories are skipped.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Workspace-relative directory to scan, for example "." or "src/components".',
      },
      query: {
        type: ['string', 'null'],
        description:
          'Case-insensitive substring to find in relative paths, or null to list every entry.',
      },
      maxDepth: {
        type: 'integer',
        minimum: 1,
        maximum: 8,
        description: 'Maximum recursive depth. Use 1 for immediate children only.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 500,
        description: 'Maximum number of matching entries to return.',
      },
      includeHidden: {
        type: 'boolean',
        description:
          'Whether to include dot-prefixed entries. Generated directories remain excluded.',
      },
    },
    required: ['path', 'query', 'maxDepth', 'limit', 'includeHidden'],
    additionalProperties: false,
  },
  async execute(input, context) {
    return executeScanDirectory(parseScanDirectoryInput(input), context);
  },
};
