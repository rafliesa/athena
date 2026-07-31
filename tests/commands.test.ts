import { describe, expect, it } from 'vitest';
import { formatCommandHelp, getCommandSuggestions, isCommandName } from '../src/domain/commands.js';

describe('commands', () => {
  it('suggests slash commands by prefix', () => {
    expect(getCommandSuggestions('/mo').map((command) => command.name)).toEqual(['/model']);
  });

  it('does not suggest commands for regular prompts', () => {
    expect(getCommandSuggestions('model')).toEqual([]);
  });

  it('recognizes only complete command names', () => {
    expect(isCommandName('/logout')).toBe(true);
    expect(isCommandName('/log')).toBe(false);
  });

  it('formats help from the command registry', () => {
    expect(formatCommandHelp()).toContain('/model — Select the active model');
    expect(formatCommandHelp()).toContain('/systemprompt — Edit the system prompt');
    expect(formatCommandHelp()).toContain('/permissions — Configure agent permissions');
    expect(formatCommandHelp()).toContain('/tools — Show available agent tools');
    expect(formatCommandHelp()).toContain('/logout — Forget Athena config and return to setup');
  });
});
