'use client';

import { useState, useEffect } from 'react';
import { Menu, Settings } from 'lucide-react';
import { cn, generateId } from '@/lib/utils';
import { Thread, Message as LocalMessage } from '@/lib/types';
import {
  getThreads,
  createThread,
  addMessageToThread,
  deleteThread
} from '@/lib/store';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { ThreadSidebar } from './ThreadSidebar';
import { ThemeToggle } from './ThemeToggle';

export default function Chat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [useRag, setUseRag] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentThread = threads.find(t => t.id === currentThreadId);

  useEffect(() => {
    loadThreads();
    const hasVectorStore = !!process.env.NEXT_PUBLIC_VECTOR_STORE_ENABLED;
    setUseRag(hasVectorStore);
  }, []);

  const loadThreads = () => {
    const loadedThreads = getThreads();
    setThreads(loadedThreads);
  };

  const handleNewThread = () => {
    setCurrentThreadId(null);
    setSidebarOpen(false);
  };

  const handleThreadSelect = (threadId: string) => {
    setCurrentThreadId(threadId);
    setSidebarOpen(false);
  };

  const handleDeleteThread = (threadId: string) => {
    deleteThread(threadId);
    if (currentThreadId === threadId) {
      setCurrentThreadId(null);
    }
    loadThreads();
  };

  const handleSendMessage = async (content: string) => {
    setIsProcessing(true);
    let threadId = currentThreadId;

    if (!threadId) {
      const firstMessage: LocalMessage = {
        id: generateId(),
        role: 'user',
        content,
        createdAt: new Date()
      };
      const newThread = createThread(firstMessage);
      threadId = newThread.id;
      setCurrentThreadId(threadId);
      loadThreads();
    } else {
      const userMessage: LocalMessage = {
        id: generateId(),
        role: 'user',
        content,
        createdAt: new Date()
      };
      addMessageToThread(threadId, userMessage);
      loadThreads();
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentThread ? currentThread.messages : [{ role: 'user', content }],
          useRag,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          assistantMessage += text;
        }
      }

      if (threadId && assistantMessage) {
        const aiMessage: LocalMessage = {
          id: generateId(),
          role: 'assistant',
          content: assistantMessage,
          createdAt: new Date()
        };
        addMessageToThread(threadId, aiMessage);
        loadThreads();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerate = async () => {
    if (currentThread && currentThread.messages.length > 0) {
      const lastUserMessage = currentThread.messages
        .filter(m => m.role === 'user')
        .pop();

      if (lastUserMessage) {
        await handleSendMessage(lastUserMessage.content);
      }
    }
  };

  const handleFeedback = (messageId: string, type: 'thumbs-up' | 'thumbs-down') => {
    console.log(`Feedback: ${type} for message ${messageId}`);
  };

  const displayMessages = currentThread ? currentThread.messages : [];

  return (
    <div className="flex h-screen bg-[var(--background)]">
      <ThreadSidebar
        threads={threads}
        currentThreadId={currentThreadId}
        onThreadSelect={handleThreadSelect}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col">
        <header className="border-b border-[var(--border)] px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-[var(--secondary)] lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-[var(--foreground)]">
                {currentThread?.title || 'New Chat'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {process.env.NEXT_PUBLIC_VECTOR_STORE_ENABLED && (
                <button
                  onClick={() => setUseRag(!useRag)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm',
                    'transition-all duration-200',
                    useRag
                      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
                      : 'bg-[var(--secondary)] text-[var(--foreground)]'
                  )}
                  aria-label="Toggle knowledge base"
                >
                  {useRag ? 'Knowledge On' : 'Knowledge Off'}
                </button>
              )}
              <ThemeToggle />
              <button
                className="p-2 rounded-lg hover:bg-[var(--secondary)]"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <MessageList
          messages={displayMessages}
          isStreaming={isProcessing}
          onRegenerate={handleRegenerate}
          onFeedback={handleFeedback}
        />

        <div className="border-t border-[var(--border)] p-4">
          <div className="max-w-3xl mx-auto">
            <Composer
              onSubmit={handleSendMessage}
              isDisabled={isProcessing}
              placeholder={currentThread ? 'Follow up...' : 'Ask anything...'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}