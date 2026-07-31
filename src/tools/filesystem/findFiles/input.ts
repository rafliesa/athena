import { parseToolInput, readBoolean, readInteger, readString } from '../../shared/input.js';

export type FindFilesInput = {
  path: string;
  query: string;
  caseSensitive: boolean;
  maxDepth: number;
  limit: number;
  includeHidden: boolean;
};

const INPUT_PROPERTIES = [
  'path',
  'query',
  'caseSensitive',
  'maxDepth',
  'limit',
  'includeHidden',
] as const;

export function parseFindFilesInput(input: unknown): FindFilesInput {
  const record = parseToolInput(input, INPUT_PROPERTIES);
  return {
    path: readString(record, 'path'),
    query: readString(record, 'query', { maximumLength: 256 }),
    caseSensitive: readBoolean(record, 'caseSensitive'),
    maxDepth: readInteger(record, 'maxDepth', 1, 8),
    limit: readInteger(record, 'limit', 1, 500),
    includeHidden: readBoolean(record, 'includeHidden'),
  };
}
