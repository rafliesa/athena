import { useState } from 'react';
import { useInput } from 'ink';
import { getCommandSuggestions } from '../domain/commands.js';

type PromptInputOptions = {
  active: boolean;
  onSubmit: (value: string) => void;
  onExit: () => void;
};

export function usePromptInput({ active, onSubmit, onExit }: PromptInputOptions) {
  const [value, setValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const suggestions = getCommandSuggestions(value);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onExit();
      return;
    }
    if (!active) return;
    if (key.upArrow || key.downArrow) {
      if (suggestions.length === 0) return;
      const direction = key.upArrow ? -1 : 1;
      setSelectedIndex(
        (current) => (current + direction + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (key.tab) {
      const selected = suggestions[selectedIndex % suggestions.length];
      if (selected) {
        setValue(selected.name);
        setSelectedIndex(0);
      }
      return;
    }
    if (key.return) {
      const selected = suggestions[selectedIndex % suggestions.length];
      const submission = selected?.name ?? value.trim();
      if (submission) onSubmit(submission);
      setValue('');
      setSelectedIndex(0);
      return;
    }
    if (key.backspace || key.delete) {
      setValue((current) => current.slice(0, -1));
      setSelectedIndex(0);
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      setValue((current) => current + input);
      setSelectedIndex(0);
    }
  });

  return { value, suggestions, selectedIndex };
}
