export type Command = {
  name: string;
  description: string;
};

export const COMMANDS: Command[] = [
  { name: '/help', description: 'Show available commands' },
  { name: '/clear', description: 'Clear the conversation' },
  { name: '/status', description: 'Show harness status' },
  { name: '/exit', description: 'Exit Athena' },
];
