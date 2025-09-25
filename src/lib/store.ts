import { Message, Thread } from './types';

const KEY = 'ltc:threads:v1';

export function loadThreads(): Thread[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(threads)); } catch {}
}

export function createThread(): Thread {
  return {
    id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
    title: 'New Thread',
    createdAt: Date.now(),
    messages: [],
  };
}

export function addMessageToThread(thread: Thread, msg: Message): Thread {
  return { ...thread, messages: [...thread.messages, msg] };
}

