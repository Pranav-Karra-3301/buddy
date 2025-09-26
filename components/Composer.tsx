'use client';

import { useEffect, useRef, useState, KeyboardEvent, FormEvent } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComposerProps {
  onSubmit: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSubmit, isDisabled = false, placeholder }: ComposerProps) {
  const [input, setInput] = useState('');
  const [currentPlaceholder, setCurrentPlaceholder] = useState('Ask anything...');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const placeholders = [
    'Ask anything...',
    'Follow up...',
    'What would you like to know?',
    'Type your message...'
  ];

  useEffect(() => {
    if (placeholder) {
      setCurrentPlaceholder(placeholder);
      return;
    }

    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => {
        const currentIndex = placeholders.indexOf(prev);
        return placeholders[(currentIndex + 1) % placeholders.length];
      });
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = window.innerHeight * 0.4;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isDisabled) {
      onSubmit(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div
        className={cn(
          'relative flex items-end',
          'bg-[var(--input)] rounded-lg',
          'border border-[var(--border)]',
          'shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
          'transition-all duration-200',
          'focus-within:ring-2 focus-within:ring-[var(--ring)]',
          'focus-within:border-[var(--accent)]'
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentPlaceholder}
          disabled={isDisabled}
          className={cn(
            'flex-1 px-4 py-3',
            'bg-transparent resize-none',
            'text-[var(--foreground)] placeholder-[var(--muted-foreground)]',
            'focus:outline-none',
            'min-h-[52px] max-h-[40vh]',
            'scrollbar-thin'
          )}
          rows={1}
        />

        <div className="flex items-center gap-2 p-2">
          <button
            type="button"
            disabled={isDisabled}
            className={cn(
              'p-2 rounded-md',
              'text-[var(--muted-foreground)]',
              'hover:bg-[var(--secondary)] hover:text-[var(--foreground)]',
              'transition-colors duration-200',
              'opacity-50 cursor-not-allowed'
            )}
            aria-label="Attach file (coming soon)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            type="button"
            disabled={isDisabled}
            className={cn(
              'p-2 rounded-md',
              'text-[var(--muted-foreground)]',
              'hover:bg-[var(--secondary)] hover:text-[var(--foreground)]',
              'transition-colors duration-200',
              'opacity-50 cursor-not-allowed'
            )}
            aria-label="Voice input (coming soon)"
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            type="submit"
            disabled={isDisabled || !input.trim()}
            className={cn(
              'p-2 rounded-md',
              'transition-all duration-200',
              input.trim() && !isDisabled
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </form>
  );
}