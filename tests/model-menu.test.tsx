import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ModelMenu } from '../src/components/ModelMenu.js';

async function sendInput(view: ReturnType<typeof render>, input: string): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  view.stdin.write(input);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

afterEach(cleanup);

describe('ModelMenu', () => {
  it('starts at the active model and selects with arrow keys', async () => {
    const onSelect = vi.fn();
    const view = render(
      <ModelMenu currentModel="gpt-5.6-terra" onSelect={onSelect} onCancel={vi.fn()} />,
    );

    expect(view.lastFrame()).toContain('› gpt-5.6-terra');
    await sendInput(view, '\u001B[B');
    await sendInput(view, '\r');

    expect(onSelect).toHaveBeenCalledWith('gpt-5.6-sol');
  });

  it('wraps upward from the first model to the last', async () => {
    const onSelect = vi.fn();
    const view = render(
      <ModelMenu currentModel="gpt-5.6-luna" onSelect={onSelect} onCancel={vi.fn()} />,
    );

    await sendInput(view, '\u001B[A');
    await sendInput(view, '\r');

    expect(onSelect).toHaveBeenCalledWith('gpt-5.6-sol');
  });

  it('cancels on Escape without selecting a model', async () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    const view = render(
      <ModelMenu currentModel="gpt-5.6-luna" onSelect={onSelect} onCancel={onCancel} />,
    );

    await sendInput(view, '\u001B');

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
