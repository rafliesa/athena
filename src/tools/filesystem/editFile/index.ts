import type { AgentTool } from '../../types.js';
import { executeEditFile } from './execute.js';
import { parseEditFileInput } from './input.js';

export const editFileTool: AgentTool = {
  name: 'edit_file',
  title: 'Edit file',
  category: 'Filesystem',
  access: 'workspace-write',
  description:
    'Replace exact text in a UTF-8 workspace file. The edit is atomic and only proceeds when the number of literal matches equals expectedOccurrences, preventing stale or ambiguous edits.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Workspace-relative path of the file to edit.',
      },
      oldText: {
        type: 'string',
        description: 'Non-empty exact text to replace, including enough context to be unambiguous.',
      },
      newText: {
        type: 'string',
        description: 'Replacement text. Use an empty string to delete the matched text.',
      },
      expectedOccurrences: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
        description:
          'Exact number of matches required before changing the file. Usually use 1 for a targeted edit.',
      },
    },
    required: ['path', 'oldText', 'newText', 'expectedOccurrences'],
    additionalProperties: false,
  },
  async execute(input, context) {
    return executeEditFile(parseEditFileInput(input), context);
  },
};
