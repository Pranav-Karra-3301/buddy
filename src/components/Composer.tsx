'use client';

import { useEffect, useRef, useState } from 'react';

export default function Composer({
  onSend,
  placeholders,
  disabled,
}: {
  onSend: (text: string) => void;
  placeholders: string[];
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(id);
  }, [placeholders.length]);

  const autoGrow = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = Math.max(window.innerHeight * 0.4, 120);
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
  };

  useEffect(() => { autoGrow(); }, [value]);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <button className="icon-btn" title="Attach (coming soon)" aria-label="Attach" disabled>📎</button>
      <button className="icon-btn" title="Voice (coming soon)" aria-label="Voice" disabled>🎤</button>
      <textarea
        ref={ref}
        className="input flex-1"
        placeholder={placeholders[placeholderIdx]}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        style={{ resize: 'none', maxHeight: '40vh', width: '100%' }}
      />
      <button className="icon-btn icon-btn--send" onClick={submit} aria-label="Send" title="Send" disabled={disabled}>➤</button>
    </div>
  );
}

