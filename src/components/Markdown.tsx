import React, { Fragment, type ReactNode } from 'react';
import { Box, Text } from 'ink';

type MarkdownProps = {
  children: string;
};

export function Markdown({ children }: MarkdownProps) {
  const lines = children.split('\n');
  const blocks: ReactNode[] = [];
  let codeFence: { language: string; lines: string[] } | null = null;

  for (const [index, line] of lines.entries()) {
    const fence = /^```([\w+-]*)\s*$/.exec(line);
    if (fence) {
      if (codeFence) {
        blocks.push(renderCodeBlock(codeFence, index));
        codeFence = null;
      } else {
        codeFence = { language: fence[1] ?? '', lines: [] };
      }
      continue;
    }

    if (codeFence) {
      codeFence.lines.push(line);
      continue;
    }

    blocks.push(renderLine(line, index));
  }

  if (codeFence) blocks.push(renderCodeBlock(codeFence, lines.length));

  return <Box flexDirection="column">{blocks}</Box>;
}

function renderLine(line: string, key: number): ReactNode {
  if (!line) return <Text key={key}> </Text>;

  const heading = /^(#{1,6})\s+(.+)$/.exec(line);
  if (heading) {
    return (
      <Text key={key} bold color="cyan">
        {renderInline(heading[2] ?? '')}
      </Text>
    );
  }

  if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
    return (
      <Text key={key} dimColor>
        {'─'.repeat(24)}
      </Text>
    );
  }

  const unorderedItem = /^(\s*)[-*+]\s+(.+)$/.exec(line);
  if (unorderedItem) {
    return (
      <Text key={key}>
        {unorderedItem[1]}• {renderInline(unorderedItem[2] ?? '')}
      </Text>
    );
  }

  const orderedItem = /^(\s*)(\d+)\.\s+(.+)$/.exec(line);
  if (orderedItem) {
    return (
      <Text key={key}>
        {orderedItem[1]}
        {orderedItem[2]}. {renderInline(orderedItem[3] ?? '')}
      </Text>
    );
  }

  const quote = /^>\s?(.*)$/.exec(line);
  if (quote) {
    return (
      <Text key={key} italic dimColor>
        │ {renderInline(quote[1] ?? '')}
      </Text>
    );
  }

  return <Text key={key}>{renderInline(line)}</Text>;
}

function renderCodeBlock(codeFence: { language: string; lines: string[] }, key: number): ReactNode {
  return (
    <Box key={`code-${key}`} flexDirection="column" borderStyle="single" borderColor="gray">
      {codeFence.language && (
        <Text color="gray" dimColor>
          {codeFence.language}
        </Text>
      )}
      <Text color="green">{codeFence.lines.join('\n')}</Text>
    </Box>
  );
}

function renderInline(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^) \n]+\))/g;
  let offset = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index;
    if (index > offset) nodes.push(value.slice(offset, index));

    const token = match[0];
    const key = `${index}-${token}`;
    if (token.startsWith('`')) {
      nodes.push(
        <Text key={key} color="green" inverse>
          {token.slice(1, -1)}
        </Text>,
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <Text key={key} bold>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith('~~')) {
      nodes.push(
        <Text key={key} strikethrough>
          {token.slice(2, -2)}
        </Text>,
      );
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      nodes.push(
        <Fragment key={key}>
          <Text color="cyan" underline>
            {link?.[1]}
          </Text>
          <Text dimColor> ({link?.[2]})</Text>
        </Fragment>,
      );
    } else {
      nodes.push(
        <Text key={key} italic>
          {token.slice(1, -1)}
        </Text>,
      );
    }

    offset = index + token.length;
  }

  if (offset < value.length) nodes.push(value.slice(offset));
  return nodes;
}
