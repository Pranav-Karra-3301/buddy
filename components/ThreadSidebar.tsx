'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Thread } from '@/lib/types';
import { SidebarSkeleton } from './Skeleton';

interface ThreadSidebarProps {
  threads: Thread[];
  currentThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread: (threadId: string) => void;
  isLoading?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadSidebar({
  threads,
  currentThreadId,
  onThreadSelect,
  onNewThread,
  onDeleteThread,
  isLoading = false,
  isOpen,
  onClose
}: ThreadSidebarProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (deleteConfirm === threadId) {
      onDeleteThread(threadId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(threadId);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (isLoading) {
    return <SidebarSkeleton />;
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden',
          'transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed left-0 top-0 h-full z-50',
          'w-80 bg-[var(--background)] border-r border-[var(--border)]',
          'flex flex-col',
          'transition-transform duration-200',
          'lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Threads
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--secondary)] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onNewThread}
          className={cn(
            'flex items-center gap-2 m-4 p-3 rounded-lg',
            'bg-[var(--primary)] text-[var(--primary-foreground)]',
            'hover:opacity-90 transition-opacity',
            'focus:outline-none focus:ring-2 focus:ring-[var(--ring)]'
          )}
        >
          <Plus className="w-5 h-5" />
          <span>New Thread</span>
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
          {threads.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              No threads yet. Start a new conversation!
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => onThreadSelect(thread.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg',
                    'transition-all duration-200',
                    'hover:bg-[var(--secondary)]',
                    'group relative',
                    currentThreadId === thread.id
                      ? 'bg-[var(--secondary)] ring-1 ring-[var(--accent)]'
                      : 'bg-[var(--background)]'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--muted-foreground)]" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--foreground)] truncate">
                        {thread.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {thread.messages.length} messages · {formatDate(thread.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, thread.id)}
                      className={cn(
                        'p-1 rounded',
                        'opacity-0 group-hover:opacity-100',
                        'hover:bg-[var(--muted)]',
                        'transition-all duration-200',
                        deleteConfirm === thread.id
                          ? 'opacity-100 bg-red-500 text-white'
                          : 'text-[var(--muted-foreground)]'
                      )}
                      aria-label={deleteConfirm === thread.id ? 'Confirm delete' : 'Delete thread'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}