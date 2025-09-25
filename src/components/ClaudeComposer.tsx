'use client';

import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  variant?: 'default' | 'bottom';
  onPlusClick?: () => void;
};

export default function ClaudeComposer({
  value,
  onChange,
  onSend,
  placeholder = 'Ask anything…',
  disabled,
  autoFocus,
  variant = 'default',
  onPlusClick,
}: Props) {
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to 40% viewport height
  const autoGrow = () => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxPx = Math.max(window.innerHeight * 0.4, 120);
    el.style.height = Math.min(el.scrollHeight, maxPx) + 'px';
  };

  useEffect(() => { autoGrow(); }, [value]);
  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      // Reset height right after send for a responsive feel
      requestAnimationFrame(() => {
        const el = textRef.current;
        if (el) el.style.height = 'auto';
      });
    }
  };

  const isBottom = variant === 'bottom';

  return (
    <div className="composer" aria-label="Message composer">
      <button
        type="button"
        className="icon-btn"
        aria-label="Add"
        title="Add"
        onClick={onPlusClick}
        disabled={disabled}
      >
        +
      </button>

      <textarea
        ref={textRef}
        className={`composer-textarea${isBottom ? ' bottom' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        style={{ resize: 'none' }}
        disabled={disabled}
      />

      <button
        type="button"
        className="icon-btn icon-btn--send"
        onClick={handleSend}
        aria-label="Send"
        title="Send"
        disabled={disabled || !value.trim()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}


