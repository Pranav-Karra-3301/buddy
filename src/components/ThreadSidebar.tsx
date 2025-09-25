'use client';

import { Thread } from '@/lib/types';

export default function ThreadSidebar({
  threads,
  activeId,
  onSelect,
  onNewThread,
}: {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewThread: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <strong>Threads</strong>
        <button className="btn" onClick={onNewThread} aria-label="New Thread">+ New</button>
      </div>
      <div className="grid" style={{ gap: 8 }}>
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="input text-left"
            style={{
              background: t.id === activeId ? 'var(--shade)' : 'var(--surface)',
            }}
            aria-pressed={t.id === activeId}
          >
            <div className="truncate" title={t.title || 'Untitled'}>
              {t.title || 'Untitled'}
            </div>
            <div className="text-xs opacity-70">
              {new Date(t.createdAt).toLocaleString()}
            </div>
          </button>
        ))}
        {threads.length === 0 && (
          <div className="text-sm opacity-70">No threads yet</div>
        )}
      </div>
    </div>
  );
}

