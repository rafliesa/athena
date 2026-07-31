import type { AgentTool } from '../../types.js';
import { executeSearchText } from './execute.js';
import { parseSearchTextInput } from './input.js';

export const searchTextTool: AgentTool = {
  name: 'search_text',
  title: 'Search text',
  category: 'Filesystem',
  access: 'read-only',
  description:
    'Search UTF-8 text files for a literal content substring and return matching lines with 1-based line and column positions. Binary and oversized files are skipped; generated directories and symbolic links are not traversed.',
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
        description: 'Non-empty literal text to find in file contents.',
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
        description: 'Maximum number of matching lines to return.',
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
    return executeSearchText(parseSearchTextInput(input), context);
  },
};
