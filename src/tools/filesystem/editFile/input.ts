import { parseToolInput, readInteger, readString } from '../../shared/input.js';

export type EditFileInput = {
  path: string;
  oldText: string;
  newText: string;
  expectedOccurrences: number;
};

const INPUT_PROPERTIES = ['path', 'oldText', 'newText', 'expectedOccurrences'] as const;

export function parseEditFileInput(input: unknown): EditFileInput {
  const record = parseToolInput(input, INPUT_PROPERTIES);
  return {
    path: readString(record, 'path'),
    oldText: readString(record, 'oldText'),
    newText: readString(record, 'newText', { allowEmpty: true }),
    expectedOccurrences: readInteger(record, 'expectedOccurrences', 1, 1_000),
  };
}
