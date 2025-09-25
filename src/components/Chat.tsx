'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ThreadSidebar from './ThreadSidebar';
import MessageList from './MessageList';
import Composer from './Composer';
import ThemeToggle from './ThemeToggle';
import TypingDots from './TypingDots';
import { addMessageToThread, createThread, loadThreads, saveThreads } from '@/lib/store';
import { Message, Thread } from '@/lib/types';

const STORAGE_KEY = 'ltc:threads:v1';
const DEFAULT_PLACEHOLDERS = ['Ask anything…', 'Follow up…'];

export default function Chat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [useRag, setUseRag] = useState<boolean>(
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_VECTOR_STORE_ENABLED === 'true'
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  // Load threads from localStorage on mount
  useEffect(() => {
    const data = loadThreads();
    if (data.length === 0) {
      const t = createThread();
      setThreads([t]);
      setActiveId(t.id);
      saveThreads([t]);
    } else {
      setThreads(data);
      setActiveId(data[0]?.id || null);
    }
  }, []);

  // Persist on changes
  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  const onNewThread = () => {
    const t = createThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
  };

  const onSend = async (text: string) => {
    if (!activeThread) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    const withUser = addMessageToThread(activeThread, userMsg);
    // Autotitle if empty
    if (!withUser.title || withUser.title === 'New Thread') {
      withUser.title = text.slice(0, 40);
    }

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    const updated = addMessageToThread(withUser, assistantMsg);
    setThreads((prev) => [updated, ...prev.filter((t) => t.id !== updated.id)]);
    setStreaming(true);

    try {
      const payload = {
        messages: updated.messages.map((m) => ({ role: m.role, content: m.content })),
        useRag,
      };
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantBuffer = '';

      // SSE parsing: lines starting with `data: ` contain JSON events
      const processChunk = (text: string) => {
        const lines = text.split(/\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
              assistantBuffer += evt.delta;
              setThreads((prev) => {
                const cur = prev.find((t) => t.id === updated.id);
                if (!cur) return prev;
                const lastIdx = cur.messages.length - 1;
                const last = cur.messages[lastIdx];
                if (!last || last.role !== 'assistant') return prev;
                const newThread: Thread = {
                  ...cur,
                  messages: [
                    ...cur.messages.slice(0, lastIdx),
                    { ...last, content: assistantBuffer },
                  ],
                };
                return [newThread, ...prev.filter((t) => t.id !== newThread.id)];
              });
            }
          } catch {
            // ignore malformed events
          }
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        processChunk(chunk);
      }
    } catch (e) {
      // On error, write a fallback message
      setThreads((prev) => {
        const cur = prev.find((t) => t.id === activeThread.id);
        if (!cur) return prev;
        const lastIdx = cur.messages.length - 1;
        const last = cur.messages[lastIdx];
        if (!last || last.role !== 'assistant') return prev;
        const newThread: Thread = {
          ...cur,
          messages: [
            ...cur.messages.slice(0, lastIdx),
            { ...last, content: 'Sorry, there was an issue generating a reply.' },
          ],
        };
        return [newThread, ...prev.filter((t) => t.id !== newThread.id)];
      });
    } finally {
      setStreaming(false);
    }
  };

  const onRegenerate = async (messageId: string) => {
    if (!activeThread) return;
    // Regenerate from the beginning up to this message
    const idx = activeThread.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    const context = activeThread.messages.slice(0, idx + 1);

    const regenThread: Thread = {
      ...activeThread,
      messages: [...context, { id: crypto.randomUUID(), role: 'assistant', content: '', createdAt: Date.now() }],
    };
    setThreads((prev) => [regenThread, ...prev.filter((t) => t.id !== regenThread.id)]);

    try {
      setStreaming(true);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: regenThread.messages.map((m) => ({ role: m.role, content: m.content })),
          useRag,
        }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantBuffer = '';
      const processChunk = (text: string) => {
        const lines = text.split(/\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
              assistantBuffer += evt.delta;
              setThreads((prev) => {
                const cur = prev.find((t) => t.id === regenThread.id);
                if (!cur) return prev;
                const lastIdx = cur.messages.length - 1;
                const last = cur.messages[lastIdx];
                if (!last || last.role !== 'assistant') return prev;
                const newThread: Thread = {
                  ...cur,
                  messages: [
                    ...cur.messages.slice(0, lastIdx),
                    { ...last, content: assistantBuffer },
                  ],
                };
                return [newThread, ...prev.filter((t) => t.id !== newThread.id)];
              });
            }
          } catch {}
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        processChunk(chunk);
      }
    } finally {
      setStreaming(false);
    }
  };

  const setFeedback = (messageId: string, kind: 'up' | 'down') => {
    if (!activeThread) return;
    setThreads((prev) => {
      const cur = prev.find((t) => t.id === activeThread.id);
      if (!cur) return prev;
      const idx = cur.messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return prev;
      const m = cur.messages[idx];
      const updated: Thread = {
        ...cur,
        messages: [
          ...cur.messages.slice(0, idx),
          { ...m, feedback: m.feedback === kind ? undefined : kind },
          ...cur.messages.slice(idx + 1),
        ],
      };
      console.log('feedback', { messageId, feedback: updated.messages[idx].feedback });
      return [updated, ...prev.filter((t) => t.id !== updated.id)];
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="container" style={{ padding: '20px 16px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <strong>local-threads-chatbot</strong>
            {typeof process !== 'undefined' && process.env.NEXT_PUBLIC_VECTOR_STORE_ENABLED === 'true' && (
              <label className="flex items-center gap-2 text-sm" title="Use knowledge base">
                <input
                  type="checkbox"
                  checked={useRag}
                  onChange={(e) => setUseRag(e.target.checked)}
                />
                Use knowledge base
              </label>
            )}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container" style={{ padding: '0 16px 20px' }}>
        <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: 16 }}>
          <aside className="card" style={{ padding: 12 }}>
            <ThreadSidebar
              threads={threads}
              activeId={activeId}
              onSelect={(id) => setActiveId(id)}
              onNewThread={onNewThread}
            />
          </aside>
          <section className="card" style={{ padding: 0, display: 'flex', minHeight: '70vh' }}>
            <div className="flex flex-col w-full">
              <div className="flex-1">
                {activeThread ? (
                  <MessageList
                    thread={activeThread}
                    streaming={streaming}
                    typingNode={streaming ? <TypingDots /> : null}
                    onRegenerate={onRegenerate}
                    onFeedback={setFeedback}
                  />
                ) : (
                  <div className="p-6 text-sm opacity-70">No thread selected.</div>
                )}
              </div>
              <div className="p-3 border-t border-[color:var(--shade)]" style={{ background: 'var(--bg)' }}>
                <Composer placeholders={DEFAULT_PLACEHOLDERS} onSend={onSend} disabled={streaming} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

