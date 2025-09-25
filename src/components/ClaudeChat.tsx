'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ThemeToggle from './ThemeToggle';
import ClaudeComposer from './ClaudeComposer';
import Image from 'next/image';
import Skeleton from './Skeleton';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTED_PROMPTS = [
  "What can you do?",
  "What are the prerequisites for CMPSC 465?",
  "When does Panera at the Kern building close?",
  "What writing clubs are there on campus?",
  "What courses do I need a C or better in for a CMPSC degree?",
  "What courses do I take after CMPEN 331?",
  "What days of the week is Choolah closed?",
  "When is Thanksgiving break this semester?",
  "When is finals week?",
  "When do classes begin in spring?"
];

export default function ClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [value, setValue] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentPrompts, setCurrentPrompts] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get 4 random prompts and cycle them
  const getRandomPrompts = () => {
    const shuffled = [...SUGGESTED_PROMPTS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  };

  useEffect(() => {
    const updateTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(currentTheme);
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // Initialize prompts only on page load
  useEffect(() => {
    setCurrentPrompts(getRandomPrompts());
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (scrollRef.current && (shouldAutoScroll || force)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setShowJumpToLatest(false);
    }
  }, [shouldAutoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShouldAutoScroll(isNearBottom);
    setShowJumpToLatest(!isNearBottom && messages.length > 0);
  };

  useEffect(() => {
    if (streaming || messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, streaming, shouldAutoScroll, scrollToBottom]);

  const startNewChat = () => {
    setMessages([]);
    setValue('');
    setCurrentPrompts(getRandomPrompts()); // Refresh prompts on new chat
  };

  const sendPrompt = (prompt: string) => {
    setValue(prompt);
    // Simulate the send action by triggering onSend with the prompt
    setTimeout(() => {
      onSendWithText(prompt);
    }, 100);
  };

  const onSendWithText = async (text: string) => {
    if (!text || streaming) return;
    setValue('');

    const userMsg: Message = { role: 'user', content: text };
    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    // Rest of the send logic...
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
    } catch {
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




  const hasMessages = messages.length > 0;

  return (
    <div className="claude-chat">
      {/* Alpha Testing Banner */}
      <div className="alpha-banner">
        <span className="alpha-tag" title="This is an experimental version. Some features may not work perfectly. Report issues to hi@mlpsu.org">
          Alpha Testing
        </span>
      </div>

      {/* Floating corner controls */}
      <button
        onClick={startNewChat}
        className="corner-btn corner-left"
        aria-label="Start new chat"
        title="New chat"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ThemeToggle className="corner-btn corner-right" />

      {/* Welcome State - Centered Input */}
      {!hasMessages && (
        <div className="welcome-container">
          <div className="welcome-content">
            <div className="welcome-header">
              <div className="buddy-greeting">
                <Image
                  src={`/hand/${theme}.png`}
                  alt="Friendly hand gesture"
                  width={48}
                  height={48}
                  className="hand-icon"
                />
                <h1>Hi, I&apos;m Buddy.</h1>
              </div>
              <p>How can I help you today?</p>
            </div>

            <div className="input-container">
              <ClaudeComposer
                value={value}
                onChange={setValue}
                onSend={onSendWithText}
                placeholder="Ask about courses, majors, policies..."
                disabled={streaming}
                autoFocus
              />
            </div>

            {/* Suggested Prompts */}
            <div className="suggested-prompts">
              {currentPrompts.map((prompt, index) => (
                <button
                  key={`${prompt}-${index}`}
                  className="prompt-button"
                  onClick={() => sendPrompt(prompt)}
                  disabled={streaming}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Conversation State - Messages + Bottom Input */}
      {hasMessages && (
        <div className="conversation-container">
          {/* Messages Area */}
          <div className="messages-area" ref={scrollRef} onScroll={handleScroll}>
            <div className="messages-content">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role} has-toolbar`}>
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
                          <>
                            <div className="typing-indicator">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                            <div style={{ marginTop: 8 }}>
                              <Skeleton lines={3} />
                            </div>
                          </>
                        ) : null
                      )}
                    </div>
                  )}
                  <div className="toolbar">
                    <button
                      className="header-button"
                      onClick={async () => { try { await navigator.clipboard.writeText(message.content); } catch {} }}
                      aria-label="Copy message"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Jump to Latest Button */}
            {showJumpToLatest && (
              <button
                className="jump-to-latest"
                onClick={() => scrollToBottom(true)}
                aria-label="Jump to latest message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M7 13L12 18L17 13M7 6L12 11L17 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Jump to latest
              </button>
            )}
          </div>

          {/* Bottom Input */}
          <div className="bottom-input-container">
            <div className="bottom-input-wrapper">
              <ClaudeComposer
                value={value}
                onChange={setValue}
                onSend={onSendWithText}
                placeholder="Follow up..."
                disabled={streaming}
                variant="bottom"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}