import React from 'react';
import { CommandMenu } from './CommandMenu.js';
import { ModelMenu } from './ModelMenu.js';
import { Prompt } from './Prompt.js';
import type { Command } from '../domain/commands.js';
import type { ModelId } from '../domain/models.js';

type ChatControlsProps = {
  activeMenu: 'model' | null;
  prompt: string;
  suggestions: Command[];
  selectedIndex: number;
  currentModel: ModelId;
  onModelSelect: (model: ModelId) => void;
  onModelCancel: () => void;
};

export function ChatControls({
  activeMenu,
  prompt,
  suggestions,
  selectedIndex,
  currentModel,
  onModelSelect,
  onModelCancel,
}: ChatControlsProps) {
  if (activeMenu === 'model') {
    return (
      <ModelMenu currentModel={currentModel} onSelect={onModelSelect} onCancel={onModelCancel} />
    );
  }

  return (
    <>
      <Prompt value={prompt} />
      <CommandMenu commands={suggestions} selectedIndex={selectedIndex} />
    </>
  );
}
