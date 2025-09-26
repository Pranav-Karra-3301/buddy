'use client';

import { useState } from 'react';
import { Copy, RefreshCw, ThumbsUp, ThumbsDown, Check, User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn, copyToClipboard, formatDate } from '@/lib/utils';
import { Message } from '@/lib/types';

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
  onFeedback?: (type: 'thumbs-up' | 'thumbs-down') => void;
}

export function MessageItem({ message, onRegenerate, onFeedback }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'thumbs-up' | 'thumbs-down' | null>(null);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'thumbs-up' | 'thumbs-down') => {
    setFeedbackGiven(type);
    onFeedback?.(type);
    console.log(`Feedback: ${type} for message ${message.id}`);
  };

  return (
    <div
      className={cn(
        'group relative flex gap-3 px-4 py-6',
        'animate-slide-in',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[var(--accent-foreground)]" />
          </div>
        </div>
      )}

      <div className={cn('flex flex-col gap-1 max-w-[min(600px,80%)]')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            'shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
            isUser
              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] ml-auto'
              : 'bg-[var(--chat-surface)]'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded bg-[var(--muted)] text-[var(--foreground)] text-sm">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="mb-2 p-3 rounded-lg bg-[var(--muted)] overflow-x-auto">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {children}
                  </a>
                ),
              }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-[var(--muted-foreground)]">
            {formatDate(message.createdAt)}
          </span>
        </div>

        {!isUser && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200'
            )}
          >
            <button
              onClick={handleCopy}
              className={cn(
                'p-1.5 rounded-md',
                'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                'hover:bg-[var(--secondary)]',
                'transition-colors duration-160'
              )}
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={onRegenerate}
              className={cn(
                'p-1.5 rounded-md',
                'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
                'hover:bg-[var(--secondary)]',
                'transition-colors duration-160'
              )}
              aria-label="Regenerate response"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleFeedback('thumbs-up')}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-[var(--secondary)]',
                'transition-colors duration-160',
                feedbackGiven === 'thumbs-up'
                  ? 'text-green-600'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
              aria-label="Good response"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleFeedback('thumbs-down')}
              className={cn(
                'p-1.5 rounded-md',
                'hover:bg-[var(--secondary)]',
                'transition-colors duration-160',
                feedbackGiven === 'thumbs-down'
                  ? 'text-red-600'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
              aria-label="Poor response"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--foreground)]" />
          </div>
        </div>
      )}
    </div>
  );
}