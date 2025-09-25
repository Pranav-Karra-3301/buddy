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
  const [showFinding, setShowFinding] = useState(false);

  useEffect(() => {
    if (!ref.current || !autoScroll) return;
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [thread, streaming, autoScroll]);

  useEffect(() => {
    let timer: number | undefined;
    if (streaming) {
      setShowFinding(false);
      timer = window.setTimeout(() => setShowFinding(true), 1200);
    } else {
      setShowFinding(false);
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, [streaming]);

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
            <div style={{ marginBottom: 6 }}><em>Sure — let me check that for you…</em></div>
            {showFinding && (
              <div style={{ marginBottom: 6, opacity: 0.85 }}><em>Finding that information for you…</em></div>
            )}
            {typingNode}
          </div>
        )}
      </div>
      {!atBottom && (
        <button className="jump-to-latest" onClick={jumpToLatest} aria-label="Jump to latest">
          Jump to latest
        </button>
      )}
    </div>
  );
}

