export const COMMANDS = [
  { name: '/help', description: 'Show available commands' },
  { name: '/clear', description: 'Clear the conversation' },
  { name: '/model', description: 'Select the active model' },
  { name: '/systemprompt', description: 'Edit the system prompt' },
  { name: '/permissions', description: 'Configure agent permissions' },
  { name: '/tools', description: 'Show available agent tools' },
  { name: '/status', description: 'Show harness status' },
  { name: '/logout', description: 'Forget Athena config and return to setup' },
  { name: '/exit', description: 'Exit Athena' },
] as const;

export type Command = (typeof COMMANDS)[number];
export type CommandName = Command['name'];

export function getCommandSuggestions(input: string): Command[] {
  if (!input.startsWith('/')) return [];
  const query = input.toLowerCase();
  return COMMANDS.filter((command) => command.name.startsWith(query));
}

export function isCommandName(input: string): input is CommandName {
  return COMMANDS.some((command) => command.name === input);
}

export function formatCommandHelp(): string {
  return COMMANDS.map((command) => `${command.name} — ${command.description}`).join('\n');
}
