'use client';

import { Message } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MessageItem({
  message,
  onRegenerate,
  onFeedback,
}: {
  message: Message;
  onRegenerate: (messageId: string) => void;
  onFeedback: (messageId: string, kind: 'up' | 'down') => void;
}) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content); } catch {}
  };

  return (
    <div className={`has-toolbar ${isUser ? 'text-right' : 'text-left'}`}>
      <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
        {isAssistant && message.content ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Style headers
              h1: ({children}) => <h1 style={{fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>{children}</h1>,
              h2: ({children}) => <h2 style={{fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>{children}</h2>,
              h3: ({children}) => <h3 style={{fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem'}}>{children}</h3>,

              // Style lists
              ul: ({children}) => <ul style={{marginLeft: '1rem', marginBottom: '0.5rem'}}>{children}</ul>,
              ol: ({children}) => <ol style={{marginLeft: '1rem', marginBottom: '0.5rem'}}>{children}</ol>,
              li: ({children}) => <li style={{marginBottom: '0.25rem'}}>{children}</li>,

              // Style paragraphs; detect simple "Sources:" label and render a section title
              p: ({children}) => {
                const text = String(children);
                if (text.trim().toLowerCase() === 'sources:' || text.trim().toLowerCase() === 'sources') {
                  return <h4 style={{fontWeight: 'bold', marginTop: '0.75rem', marginBottom: '0.25rem'}}>Sources</h4>;
                }
                return <p style={{marginBottom: '0.5rem'}}>{children}</p>;
              },

              // Style code
              code: ({children, className}) => {
                const isBlock = className?.includes('language-');
                return isBlock ? (
                  <pre style={{
                    background: 'rgba(0,0,0,0.1)',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    overflow: 'auto'
                  }}>
                    <code>{children}</code>
                  </pre>
                ) : (
                  <code style={{
                    background: 'rgba(0,0,0,0.1)',
                    padding: '0.125rem 0.25rem',
                    borderRadius: '3px',
                    fontSize: '0.9em'
                  }}>{children}</code>
                );
              },

              // Style blockquotes
              blockquote: ({children}) => (
                <blockquote style={{
                  borderLeft: '3px solid var(--accent)',
                  paddingLeft: '1rem',
                  marginBottom: '0.5rem',
                  fontStyle: 'italic'
                }}>{children}</blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {message.content || (isAssistant ? ' ' : '')}
          </div>
        )}
      </div>
      <div className="toolbar text-xs opacity-80">
        <button className="icon-btn" onClick={copy} aria-label="Copy message" title="Copy">📋</button>
        {isAssistant && (
          <>
            <button className="icon-btn" onClick={() => onRegenerate(message.id)} aria-label="Regenerate" title="Regenerate">⟳</button>
            <button
              className="icon-btn"
              aria-pressed={message.feedback === 'up'}
              onClick={() => onFeedback(message.id, 'up')}
              aria-label="Thumbs up"
              title="Thumbs up"
            >👍</button>
            <button
              className="icon-btn"
              aria-pressed={message.feedback === 'down'}
              onClick={() => onFeedback(message.id, 'down')}
              aria-label="Thumbs down"
              title="Thumbs down"
            >👎</button>
          </>
        )}
      </div>
    </div>
  );
}

