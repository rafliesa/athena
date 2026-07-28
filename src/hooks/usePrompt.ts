import { useState } from 'react';
import { useApp, useInput } from 'ink';

export function usePrompt(onSubmit: (value: string) => void) {
  const { exit } = useApp();
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || input === 'q') {
      exit();
    } else if (key.return) {
      const trimmed = value.trim();
      if (trimmed) onSubmit(trimmed);
      setValue('');
    } else if (key.backspace || key.delete) {
      setValue((current) => current.slice(0, -1));
    } else if (!key.ctrl && !key.meta && input) {
      setValue((current) => current + input);
    }
  });

  return value;
}
