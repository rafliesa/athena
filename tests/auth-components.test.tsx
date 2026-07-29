import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiKeyForm } from '../src/components/ApiKeyForm.js';
import { AuthProviderPicker } from '../src/components/AuthProviderPicker.js';

afterEach(cleanup);

describe('authentication components', () => {
  it('shows the API key placeholder and masks entered keys', () => {
    const view = render(<ApiKeyForm apiKey="" />);

    expect(view.lastFrame()).toContain('Paste your API key...');

    view.rerender(<ApiKeyForm apiKey={'s'.repeat(60)} />);

    expect(view.lastFrame()).toContain('•'.repeat(48));
    expect(view.lastFrame()).not.toContain('•'.repeat(49));
  });

  it('marks the selected authentication provider', () => {
    const view = render(<AuthProviderPicker selectedIndex={0} />);

    expect(view.lastFrame()).toContain('› API key');

    view.rerender(<AuthProviderPicker selectedIndex={1} />);

    expect(view.lastFrame()).toContain('› Codex login');
  });
});
