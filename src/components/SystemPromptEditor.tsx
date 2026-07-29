import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

type SystemPromptEditorProps = {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
};

export function SystemPromptEditor({ initialValue, onSave, onCancel }: SystemPromptEditorProps) {
  const [value, setValue] = useState(initialValue);

  useInput((input, key) => {
    if (key.ctrl && input === 'a') {
      setValue('');
      return;
    }
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      if (key.shift) {
        setValue((current) => `${current}\n`);
      } else if (value.trim()) {
        onSave(value);
      }
      return;
    }
    if (key.backspace || key.delete) {
      setValue((current) => current.slice(0, -1));
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      setValue((current) => current + input);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text color="cyan" bold>
        Edit system prompt
      </Text>
      <Text>
        {value}
        <Text color="cyan">▌</Text>
      </Text>
      <Text dimColor>Ctrl+A replace · Enter save · Shift+Enter new line · Esc cancel</Text>
    </Box>
  );
}
