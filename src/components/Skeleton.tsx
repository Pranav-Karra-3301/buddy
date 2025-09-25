'use client';

export default function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="grid" style={{ gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 14, borderRadius: 6 }} />
      ))}
    </div>
  );
}

