import { parseToolInput, readBoolean, readString } from '../../shared/input.js';

export type WriteFileInput = {
  path: string;
  content: string;
  overwrite: boolean;
  createParentDirectories: boolean;
};

const INPUT_PROPERTIES = ['path', 'content', 'overwrite', 'createParentDirectories'] as const;

export function parseWriteFileInput(input: unknown): WriteFileInput {
  const record = parseToolInput(input, INPUT_PROPERTIES);
  return {
    path: readString(record, 'path'),
    content: readString(record, 'content', { allowEmpty: true }),
    overwrite: readBoolean(record, 'overwrite'),
    createParentDirectories: readBoolean(record, 'createParentDirectories'),
  };
}
