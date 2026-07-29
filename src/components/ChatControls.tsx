import React from 'react';
import { CommandMenu } from './CommandMenu.js';
import { ModelMenu } from './ModelMenu.js';
import { Prompt } from './Prompt.js';
import { SystemPromptEditor } from './SystemPromptEditor.js';
import type { Command } from '../domain/commands.js';
import type { ModelId } from '../domain/models.js';

type ChatControlsProps = {
  activeMenu: 'model' | 'systemPrompt' | null;
  prompt: string;
  systemPrompt: string;
  suggestions: Command[];
  selectedIndex: number;
  currentModel: ModelId;
  onModelSelect: (model: ModelId) => void;
  onModelCancel: () => void;
  onSystemPromptSave: (value: string) => void;
  onSystemPromptCancel: () => void;
};

export function ChatControls({
  activeMenu,
  prompt,
  systemPrompt,
  suggestions,
  selectedIndex,
  currentModel,
  onModelSelect,
  onModelCancel,
  onSystemPromptSave,
  onSystemPromptCancel,
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

  return (
    <>
      <Prompt value={prompt} />
      <CommandMenu commands={suggestions} selectedIndex={selectedIndex} />
    </>
  );
}
