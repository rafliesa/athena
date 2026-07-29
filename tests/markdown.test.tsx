import { cleanup, render } from 'ink-testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { Markdown } from '../src/components/Markdown.js';

afterEach(cleanup);

describe('Markdown', () => {
  it('renders common block and inline Markdown without syntax markers', () => {
    const source = `# Heading

This is **bold**, *italic*, ~~removed~~, and \`code\`.
- first
1. second
> quoted
[OpenAI](https://openai.com)

\`\`\`ts
const answer = 42;
\`\`\``;
    const view = render(<Markdown>{source}</Markdown>);
    const frame = view.lastFrame() ?? '';

    expect(frame).toContain('Heading');
    expect(frame).not.toContain('# Heading');
    expect(frame).toContain('This is bold, italic, removed, and code.');
    expect(frame).toContain('• first');
    expect(frame).toContain('1. second');
    expect(frame).toContain('│ quoted');
    expect(frame).toContain('OpenAI (https://openai.com)');
    expect(frame).toContain('const answer = 42;');
    expect(frame).not.toContain('```');
  });

  it('renders an unfinished code fence while output is still streaming', () => {
    const view = render(<Markdown>{'```sh\nnpm test'}</Markdown>);

    expect(view.lastFrame()).toContain('sh');
    expect(view.lastFrame()).toContain('npm test');
    expect(view.lastFrame()).not.toContain('```');
  });
});
