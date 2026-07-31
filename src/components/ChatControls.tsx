import React from 'react';
import { CommandMenu } from './CommandMenu.js';
import { ModelMenu } from './ModelMenu.js';
import { PermissionMenu } from './PermissionMenu.js';
import { Prompt } from './Prompt.js';
import { SystemPromptEditor } from './SystemPromptEditor.js';
import type { Command } from '../domain/commands.js';
import type { ModelId } from '../domain/models.js';
import type { AgentPermissions } from '../domain/permissions.js';

type ChatControlsProps = {
  activeMenu: 'model' | 'systemPrompt' | 'permissions' | null;
  prompt: string;
  systemPrompt: string;
  permissions: AgentPermissions;
  suggestions: Command[];
  selectedIndex: number;
  currentModel: ModelId;
  onModelSelect: (model: ModelId) => void;
  onModelCancel: () => void;
  onSystemPromptSave: (value: string) => void;
  onSystemPromptCancel: () => void;
  onPermissionsSave: (permissions: AgentPermissions) => void;
  onPermissionsCancel: () => void;
};

export function ChatControls({
  activeMenu,
  prompt,
  systemPrompt,
  permissions,
  suggestions,
  selectedIndex,
  currentModel,
  onModelSelect,
  onModelCancel,
  onSystemPromptSave,
  onSystemPromptCancel,
  onPermissionsSave,
  onPermissionsCancel,
}: ChatControlsProps) {
  if (activeMenu === 'model') {
    return (
      <ModelMenu currentModel={currentModel} onSelect={onModelSelect} onCancel={onModelCancel} />
    );
  }

  if (activeMenu === 'systemPrompt') {
    return (
      <SystemPromptEditor
        initialValue={systemPrompt}
        onSave={onSystemPromptSave}
        onCancel={onSystemPromptCancel}
      />
    );
  }

  if (activeMenu === 'permissions') {
    return (
      <PermissionMenu
        currentPermissions={permissions}
        onSave={onPermissionsSave}
        onCancel={onPermissionsCancel}
      />
    );
  }

  return (
    <>
      <Prompt value={prompt} />
      <CommandMenu commands={suggestions} selectedIndex={selectedIndex} />
    </>
  );
}
