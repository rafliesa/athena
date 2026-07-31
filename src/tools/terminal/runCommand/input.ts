import { parseToolInput, readInteger, readString, readStringArray } from '../../shared/input.js';

export type RunCommandInput = {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
};

const INPUT_PROPERTIES = ['command', 'args', 'cwd', 'timeoutMs'] as const;

export function parseRunCommandInput(input: unknown): RunCommandInput {
  const record = parseToolInput(input, INPUT_PROPERTIES);
  return {
    command: readString(record, 'command', { maximumLength: 512 }),
    args: readStringArray(record, 'args', 100, 10_000),
    cwd: readString(record, 'cwd'),
    timeoutMs: readInteger(record, 'timeoutMs', 100, 120_000),
  };
}
