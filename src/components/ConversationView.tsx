import React, { useLayoutEffect, useRef, useState } from 'react';
import { Box, measureElement, useInput, type DOMElement } from 'ink';
import type { Message } from '../domain/messages.js';
import { MessageView } from './MessageView.js';

type ConversationViewProps = {
  messages: Message[];
  thinkingLabel?: string;
  viewportRows: number;
};

export function ConversationView({ messages, thinkingLabel, viewportRows }: ConversationViewProps) {
  const lastMessage = messages.at(-1);
  const viewportRef = useRef<DOMElement>(null);
  const contentRef = useRef<DOMElement>(null);
  const previousContentHeight = useRef(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [scrollMetrics, setScrollMetrics] = useState({ maximum: 0, pageSize: 1 });

  useLayoutEffect(() => {
    if (!viewportRef.current || !contentRef.current) return;
    const viewportHeight = measureElement(viewportRef.current).height;
    const contentHeight = measureElement(contentRef.current).height;
    const maximum = Math.max(0, contentHeight - viewportHeight);
    const pageSize = Math.max(1, viewportHeight - 2);
    const addedRows = Math.max(0, contentHeight - previousContentHeight.current);
    previousContentHeight.current = contentHeight;

    setScrollMetrics((current) =>
      current.maximum === maximum && current.pageSize === pageSize
        ? current
        : { maximum, pageSize },
    );
    setScrollOffset((current) => {
      if (current === 0) return current;
      return Math.min(current + addedRows, maximum);
    });
  }, [messages, thinkingLabel, viewportRows]);

  useInput((input, key) => {
    if (key.pageUp) {
      setScrollOffset((current) =>
        Math.min(current + scrollMetrics.pageSize, scrollMetrics.maximum),
      );
    } else if (key.pageDown) {
      setScrollOffset((current) => Math.max(0, current - scrollMetrics.pageSize));
    } else if (key.ctrl && input === 'e') {
      setScrollOffset(0);
    }
  });

  return (
    <Box
      ref={viewportRef}
      flexDirection="column"
      flexGrow={1}
      flexBasis={0}
      justifyContent="flex-end"
      overflowY="hidden"
      marginBottom={1}
    >
      <Box
        ref={contentRef}
        flexDirection="column"
        flexShrink={0}
        justifyContent="flex-end"
        marginBottom={-scrollOffset}
      >
        {messages.map((message) => (
          <MessageView
            key={message.id}
            message={message}
            thinkingLabel={
              thinkingLabel && message.id === lastMessage?.id && message.text.length === 0
                ? thinkingLabel
                : undefined
            }
          />
        ))}
      </Box>
    </Box>
  );
}
