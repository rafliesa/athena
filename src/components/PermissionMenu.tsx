import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AgentPermissions } from '../domain/permissions.js';

type PermissionMenuProps = {
  currentPermissions: AgentPermissions;
  onSave: (permissions: AgentPermissions) => void;
  onCancel: () => void;
};

type PermissionOption = {
  key: keyof AgentPermissions;
  label: string;
  description: string;
};

const OPTIONS: readonly PermissionOption[] = [
  {
    key: 'canEditFiles',
    label: 'Edit files',
    description: 'create and modify files inside the workspace',
  },
  {
    key: 'canRunCommands',
    label: 'Run terminal',
    description: 'trusted host process; may modify files or access the network',
  },
];

export function PermissionMenu({ currentPermissions, onSave, onCancel }: PermissionMenuProps) {
  const [selected, setSelected] = useState(0);
  const [permissions, setPermissions] = useState<AgentPermissions>(() => ({
    ...currentPermissions,
  }));

  useInput((input, key) => {
    if (key.upArrow) setSelected((selected - 1 + OPTIONS.length) % OPTIONS.length);
    if (key.downArrow) setSelected((selected + 1) % OPTIONS.length);
    if (input === ' ') {
      const option = OPTIONS[selected];
      if (option) {
        setPermissions((current) => ({
          ...current,
          [option.key]: !current[option.key],
        }));
      }
    }
    if (key.return) onSave(permissions);
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold>Agent permissions</Text>
      {OPTIONS.map((option, index) => (
        <Text
          key={option.key}
          color={selected === index ? 'cyan' : 'white'}
          bold={selected === index}
        >
          {selected === index ? '› ' : '  '}[{permissions[option.key] ? 'x' : ' '}] {option.label}{' '}
          <Text dimColor>— {option.description}</Text>
        </Text>
      ))}
      <Text dimColor>↑↓ select · Space toggle · Enter save · Esc cancel</Text>
    </Box>
  );
}
