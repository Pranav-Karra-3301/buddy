'use client';

export function TypingDots() {
  return (
    <div className="flex items-center space-x-1 px-4 py-2">
      <span
        className="inline-block w-2 h-2 rounded-full bg-[var(--muted-foreground)]"
        style={{ animation: 'typing-dot 1.4s infinite ease-in-out' }}
      />
      <span
        className="inline-block w-2 h-2 rounded-full bg-[var(--muted-foreground)]"
        style={{ animation: 'typing-dot 1.4s infinite ease-in-out 0.2s' }}
      />
      <span
        className="inline-block w-2 h-2 rounded-full bg-[var(--muted-foreground)]"
        style={{ animation: 'typing-dot 1.4s infinite ease-in-out 0.4s' }}
      />
    </div>
  );
}