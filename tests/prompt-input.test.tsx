import { Text } from 'ink';
import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePromptInput } from '../src/hooks/usePromptInput.js';

async function sendInput(view: ReturnType<typeof render>, input: string): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  view.stdin.write(input);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

function PromptHarness({
  active = true,
  onSubmit = () => undefined,
  onExit = () => undefined,
}: {
  active?: boolean;
  onSubmit?: (value: string) => void;
  onExit?: () => void;
}) {
  const prompt = usePromptInput({ active, onSubmit, onExit });

  return (
    <Text>
      {prompt.value}|{prompt.selectedIndex}|
      {prompt.suggestions.map((suggestion) => suggestion.name).join(',')}
    </Text>
  );
}

afterEach(cleanup);

describe('usePromptInput', () => {
  it('edits, trims, submits, and clears a regular prompt', async () => {
    const onSubmit = vi.fn();
    const view = render(<PromptHarness onSubmit={onSubmit} />);

    await sendInput(view, ' hello!');
    await sendInput(view, '\u007F');
    await sendInput(view, ' ');
    await sendInput(view, '\r');

    expect(onSubmit).toHaveBeenCalledWith('hello');
    expect(view.lastFrame()).toBe('|0|');
  });

  it('navigates suggestions with wrapping and completes the selected command', async () => {
    const onSubmit = vi.fn();
    const view = render(<PromptHarness onSubmit={onSubmit} />);

    await sendInput(view, '/');
    await sendInput(view, '\u001B[A');
    expect(view.lastFrame()).toContain('/|6|');

    await sendInput(view, '\t');
    expect(view.lastFrame()).toBe('/exit|0|/exit');

    await sendInput(view, '\r');
    expect(onSubmit).toHaveBeenCalledWith('/exit');
    expect(view.lastFrame()).toBe('|0|');
  });

  it('ignores editing while inactive but still handles Ctrl+C', async () => {
    const onSubmit = vi.fn();
    const onExit = vi.fn();
    const view = render(<PromptHarness active={false} onSubmit={onSubmit} onExit={onExit} />);

    await sendInput(view, 'ignored');
    await sendInput(view, '\r');
    await sendInput(view, '\u0003');

    expect(view.lastFrame()).toBe('|0|');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledOnce();
  });
});
