export type MessageRole = 'user' | 'assistant';

export type Message = {
  id: number;
  role: MessageRole;
  text: string;
  variant?: 'welcome';
};

export const WELCOME_MESSAGE = 'Hello! I am Athena.\nWhat would you like to build today?';

export function updateMessage(
  messages: Message[],
  id: number,
  update: (message: Message) => Message,
): Message[] {
  return messages.map((message) => (message.id === id ? update(message) : message));
}
