import { useState } from 'react';
import { useApp, useInput } from 'ink';
import { COMMANDS } from '../commands.js';

export function usePrompt(onSubmit: (value: string) => void) {
  const { exit } = useApp();
  const [value, setValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const matches = COMMANDS.filter((command) => command.name.startsWith(value.toLowerCase()));

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || input === 'q') exit();
    else if (key.upArrow || key.downArrow) {
      if (matches.length > 0) {
        const direction = key.upArrow ? -1 : 1;
        setSelectedIndex((current) => (current + direction + matches.length) % matches.length);
      }
    } else if (key.tab) {
      if (matches.length > 0) setValue(matches[selectedIndex % matches.length].name);
    } else if (key.return) {
      const selected =
        value.startsWith('/') && matches.length > 0
          ? matches[selectedIndex % matches.length].name
          : value.trim();
      if (selected) onSubmit(selected);
      setValue('');
      setSelectedIndex(0);
    } else if (key.backspace || key.delete) {
      setValue((current) => current.slice(0, -1));
      setSelectedIndex(0);
    } else if (!key.ctrl && !key.meta && input) {
      setValue((current) => current + input);
      setSelectedIndex(0);
    }
  });

  return { value, matches, selectedIndex };
}
