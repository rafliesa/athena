import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { AthenaLogo } from '../src/components/AthenaLogo.js';

afterEach(cleanup);

describe('AthenaLogo', () => {
  it('renders the Athena ASCII mark', () => {
    const view = render(<AthenaLogo />);
    const frame = view.lastFrame() ?? '';

    expect(frame).toContain('▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░');
    expect(frame).toContain('▒▒▒░ ▒▒▒░ ▒▒▒░');
    expect(frame).toContain('▒▒▒▒▒▒▒▒▒▒▒▒▒░░');
    expect(frame.split('\n')).toHaveLength(9);
  });
});
