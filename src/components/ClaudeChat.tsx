'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThemeToggle from './ThemeToggle';

type Message = { role: 'user' | 'assistant'; content: string };

export default function ClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages]);

  const startNewChat = () => {
    setMessages([]);
    setValue('');
  };

  const onSend = async () => {
    const text = value.trim();
    if (!text || streaming) return;
    setValue('');

    const userMsg: Message = { role: 'user', content: text };
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          useRag: true
        }),
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
    } catch (error) {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
          copy[copy.length - 1] = {
            ...last,
            content: 'Sorry, there was an issue generating a reply.',
          };
        }
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="claude-chat">
      {/* Header */}
      <header className="chat-header">
        <div className="header-controls">
          {hasMessages && (
            <button
              onClick={startNewChat}
              className="header-button"
              aria-label="Start new chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              New chat
            </button>
          )}
        </div>
        <div className="header-controls">
          <ThemeToggle />
        </div>
      </header>

      {/* Welcome State - Centered Input */}
      {!hasMessages && (
        <div className="welcome-container">
          <div className="welcome-content">
            <div className="welcome-header">
              <h1>Hi, I'm Buddy. <span className="beta-tag">Still In Development</span></h1>
              <p>How can I help you today?</p>
              <div className="beta-disclaimer">
                <p>Beta preview • Answers may not always be accurate</p>
                <p>Any issues? Email screenshots or responses to <a href="mailto:hi@mlpsu.org">hi@mlpsu.org</a></p>
              </div>
            </div>
            <div className="input-container">
              <textarea
                className="claude-input"
                placeholder="Ask about courses, majors, policies..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={streaming}
                rows={1}
              />
              <button
                className="send-button"
                onClick={onSend}
                disabled={streaming || !value.trim()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation State - Messages + Bottom Input */}
      {hasMessages && (
        <div className="conversation-container">
          {/* Messages Area */}
          <div className="messages-area" ref={scrollRef}>
            <div className="messages-content">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  {message.role === 'user' ? (
                    <div className="user-bubble">
                      {message.content}
                    </div>
                  ) : (
                    <div className="assistant-content">
                      {message.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({children}) => <h1 className="markdown-h1">{children}</h1>,
                            h2: ({children}) => <h2 className="markdown-h2">{children}</h2>,
                            h3: ({children}) => <h3 className="markdown-h3">{children}</h3>,
                            h4: ({children}) => <h4 className="markdown-h4">{children}</h4>,
                            p: ({children}) => <p className="markdown-p">{children}</p>,
                            ul: ({children}) => <ul className="markdown-ul">{children}</ul>,
                            ol: ({children}) => <ol className="markdown-ol">{children}</ol>,
                            li: ({children}) => <li className="markdown-li">{children}</li>,
                            strong: ({children}) => <strong className="markdown-strong">{children}</strong>,
                            code: ({children, className}) => {
                              const isBlock = className?.includes('language-');
                              return isBlock ? (
                                <pre className="markdown-pre">
                                  <code className="markdown-code-block">{children}</code>
                                </pre>
                              ) : (
                                <code className="markdown-code-inline">{children}</code>
                              );
                            },
                            blockquote: ({children}) => (
                              <blockquote className="markdown-blockquote">{children}</blockquote>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      ) : (
                        streaming && index === messages.length - 1 ? (
                          <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Input */}
          <div className="bottom-input-container">
            <div className="bottom-input-wrapper">
              <textarea
                className="claude-input bottom"
                placeholder="Follow up..."
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={streaming}
                rows={1}
              />
              <button
                className="send-button"
                onClick={onSend}
                disabled={streaming || !value.trim()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}