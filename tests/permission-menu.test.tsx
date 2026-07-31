import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissionMenu } from '../src/components/PermissionMenu.js';

async function sendInput(view: ReturnType<typeof render>, input: string): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  view.stdin.write(input);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

afterEach(cleanup);

describe('PermissionMenu', () => {
  it('toggles permissions independently and saves the draft', async () => {
    const onSave = vi.fn();
    const view = render(
      <PermissionMenu
        currentPermissions={{ canEditFiles: true, canRunCommands: false }}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    expect(view.lastFrame()).toContain('› [x] Edit files');
    expect(view.lastFrame()).toContain('[ ] Run terminal');

    await sendInput(view, '\u001B[B');
    await sendInput(view, ' ');
    await sendInput(view, '\r');

    expect(onSave).toHaveBeenCalledWith({
      canEditFiles: true,
      canRunCommands: true,
    });
  });

  it('wraps selection and cancels without saving', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const view = render(
      <PermissionMenu
        currentPermissions={{ canEditFiles: true, canRunCommands: false }}
        onSave={onSave}
        onCancel={onCancel}
      />,
    );

    await sendInput(view, '\u001B[A');
    expect(view.lastFrame()).toContain('› [ ] Run terminal');
    await sendInput(view, '\u001B');

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
