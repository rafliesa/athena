import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { MessageView } from '../src/components/MessageView.js';

afterEach(cleanup);

describe('MessageView', () => {
  it('renders Athena output without a bordered bubble', () => {
    const view = render(<MessageView message={{ id: 1, role: 'assistant', text: '**Ready.**' }} />);
    const frame = view.lastFrame() ?? '';

    expect(frame).toContain('athena');
    expect(frame).toContain('Ready.');
    expect(frame).not.toMatch(/[╭╮╰╯│]/);
  });

  it('renders user input as a highlighted prompt without a label or border', () => {
    const view = render(
      <MessageView message={{ id: 1, role: 'user', text: 'Build this\ncarefully' }} />,
    );
    const frame = view.lastFrame() ?? '';

    expect(frame).toContain('› Build this');
    expect(frame).toContain('carefully');
    expect(frame).not.toContain('you');
    expect(frame).not.toMatch(/[╭╮╰╯│]/);
  });
});
