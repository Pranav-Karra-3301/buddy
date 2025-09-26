'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageItem } from './MessageItem';
import { TypingDots } from './TypingDots';
import { Message } from '@/lib/types';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onRegenerate?: (messageId: string) => void;
  onFeedback?: (messageId: string, type: 'thumbs-up' | 'thumbs-down') => void;
}

export function MessageList({
  messages,
  isStreaming,
  onRegenerate,
  onFeedback
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      setAutoScroll(isNearBottom);
      setShowScrollButton(!isNearBottom && scrollHeight > clientHeight);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            Welcome to Local Threads Chatbot
          </h2>
          <p className="text-[var(--muted-foreground)]">
            Start a conversation by typing a message below. All your conversations
            are stored locally in your browser.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              'Tell me a joke',
              'What can you help me with?',
              'Explain quantum computing'
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  const input = document.querySelector('textarea');
                  if (input) {
                    (input as HTMLTextAreaElement).value = prompt;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.focus();
                  }
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg',
                  'bg-[var(--secondary)] hover:bg-[var(--muted)]',
                  'text-sm text-[var(--foreground)]',
                  'transition-colors duration-200'
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-thin"
      >
        <div className="max-w-3xl mx-auto py-4">
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              onRegenerate={
                message.role === 'assistant' && index === messages.length - 1
                  ? () => onRegenerate?.(message.id)
                  : undefined
              }
              onFeedback={
                message.role === 'assistant'
                  ? (type) => onFeedback?.(message.id, type)
                  : undefined
              }
            />
          ))}
          {isStreaming && <TypingDots />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className={cn(
            'absolute bottom-4 right-4 p-2 rounded-full',
            'bg-[var(--primary)] text-[var(--primary-foreground)]',
            'shadow-lg hover:shadow-xl',
            'transition-all duration-200',
            'animate-slide-in'
          )}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}