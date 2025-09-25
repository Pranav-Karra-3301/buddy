'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function SimpleChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hi, I'm Buddy." },
  ]);
  const [value, setValue] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(scrollToBottom, [messages, streaming]);

  const addFiles = (list: FileList | File[]) => {
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
  };

  const onPickFiles = () => fileInputRef.current?.click();

  const onSend = async () => {
    const text = value.trim();
    if (!text || streaming) return;
    setValue('');

    const userMsg: Msg = { role: 'user', content: text };
    const assistantMsg: Msg = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      // If attachments exist, upload to vector store first and wait for indexing.
      if (files.length > 0) {
        const fd = new FormData();
        for (const f of files) fd.append('files', f, f.name);
        await fetch('/api/upload', { method: 'POST', body: fd });
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!res.body) throw new Error('No body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

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
              buffer += evt.delta;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (!last || last.role !== 'assistant') return prev;
                copy[copy.length - 1] = { ...last, content: buffer };
                return copy;
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
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = {
            ...last,
            content: 'Sorry—something went wrong generating a reply.',
          };
        }
      return copy;
      });
    } finally {
      setStreaming(false);
      scrollToBottom();
      setFiles([]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ padding: '48px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{"Hi, I'm Buddy."}</h1>
        <p className="opacity-80" style={{ marginBottom: 24 }}>How can I help you today?</p>

        <div
          className="card"
          style={{ padding: 0 }}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
              addFiles(e.dataTransfer.files);
            }
          }}
        >
          <div
            ref={boxRef}
            className="scroll-area"
            style={{ maxHeight: '55vh', overflowY: 'auto', padding: 16 }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                {m.role === 'user' ? (
                  <div
                    className="bubble"
                    style={{
                      background: '#F0EEE6',
                      color: '#111',
                      marginLeft: 'auto',
                      maxWidth: '88%',
                      borderRadius: 14,
                      padding: '12px 14px',
                      width: 'fit-content',
                    }}
                  >
                    {m.content}
                  </div>
                ) : (
                  <div style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                )}
              </div>
            ))}
            {streaming && (
              <div style={{ textAlign: 'left', opacity: 0.8 }}>…</div>
            )}
          </div>
          <div className="border-t" style={{ padding: 12, borderTop: '1px solid var(--shade)' }}>
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
              <button className="btn" onClick={onPickFiles} aria-label="Add files">+</button>
              <textarea
                className="input flex-1"
                rows={1}
                placeholder="Ask about courses, majors, policies…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                style={{ resize: 'none' }}
              />
              <button className="btn" onClick={onSend} disabled={streaming || !value.trim()}>
                Send
              </button>
            </div>
            {files.length > 0 && (
              <div className="text-xs opacity-80" style={{ textAlign: 'left', marginTop: 6 }}>
                {files.length} file{files.length === 1 ? '' : 's'} attached
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
