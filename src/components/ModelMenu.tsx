import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { MODELS, type ModelId } from '../domain/models.js';

type ModelMenuProps = {
  currentModel: ModelId;
  onSelect: (model: ModelId) => void;
  onCancel: () => void;
};

export function ModelMenu({ currentModel, onSelect, onCancel }: ModelMenuProps) {
  const initialIndex = Math.max(
    0,
    MODELS.findIndex((model) => model.id === currentModel),
  );
  const [selected, setSelected] = useState(initialIndex);

  useInput((_, key) => {
    if (key.upArrow) setSelected((selected - 1 + MODELS.length) % MODELS.length);
    if (key.downArrow) setSelected((selected + 1) % MODELS.length);
    if (key.return) {
      const model = MODELS[selected];
      if (model) onSelect(model.id);
    }
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold>Select model</Text>
      {MODELS.map((model, index) => (
        <Text
          key={model.id}
          color={selected === index ? 'cyan' : 'white'}
          bold={selected === index}
        >
          {selected === index ? '› ' : '  '}
          {model.id} <Text dimColor>— {model.description}</Text>
        </Text>
      ))}
      <Text dimColor>↑↓ select · Enter apply · Esc cancel</Text>
    </Box>
  );
}
