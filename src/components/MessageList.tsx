'use client';

import { useEffect, useRef, useState } from 'react';
import { Thread } from '@/lib/types';
import MessageItem from './MessageItem';

export default function MessageList({
  thread,
  streaming,
  typingNode,
  onRegenerate,
  onFeedback,
}: {
  thread: Thread;
  streaming: boolean;
  typingNode: React.ReactNode | null;
  onRegenerate: (messageId: string) => void;
  onFeedback: (messageId: string, kind: 'up' | 'down') => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (!ref.current || !autoScroll) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [thread, streaming, autoScroll]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAtBottom(nearBottom);
    setAutoScroll(nearBottom);
  };

  const jumpToLatest = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setAutoScroll(true);
  };

  return (
    <div className="relative" style={{ height: '100%', background: 'var(--bg)' }}>
      <div ref={ref} className="scroll-area" onScroll={onScroll} style={{ height: '100%', padding: 16 }}>
        {thread.messages.map((m) => (
          <div key={m.id} className="animate-in" style={{ marginBottom: 20 }}>
            <MessageItem message={m} onRegenerate={onRegenerate} onFeedback={onFeedback} />
          </div>
        ))}
        {streaming && (
          <div className="bubble assistant" style={{ marginBottom: 20, width: 'fit-content' }}>
            {typingNode}
          </div>
        )}
      </div>
      {!atBottom && (
        <button className="jump-pill" onClick={jumpToLatest} aria-label="Jump to latest">
          Jump to latest
        </button>
      )}
    </div>
  );
}

