import { parseToolInput, readNullableInteger, readString } from '../../shared/input.js';

export type ReadFileInput = {
  path: string;
  startLine: number | null;
  endLine: number | null;
};

const INPUT_PROPERTIES = ['path', 'startLine', 'endLine'] as const;
const MAX_LINE_NUMBER = 10_000_000;

export function parseReadFileInput(input: unknown): ReadFileInput {
  const record = parseToolInput(input, INPUT_PROPERTIES);
  return {
    path: readString(record, 'path'),
    startLine: readNullableInteger(record, 'startLine', 1, MAX_LINE_NUMBER),
    endLine: readNullableInteger(record, 'endLine', 1, MAX_LINE_NUMBER),
  };
}
