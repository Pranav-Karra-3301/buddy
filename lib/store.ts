import { Thread, Message } from './types';

const STORAGE_KEY = 'ltc:threads:v1';

export function getThreads(): Thread[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const threads = JSON.parse(stored) as Thread[];
    return threads.map((thread) => ({
      ...thread,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
      messages: thread.messages.map((msg) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
      })),
    }));
  } catch (error) {
    console.error('Error loading threads:', error);
    return [];
  }
}

export function saveThreads(threads: Thread[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
  } catch (error) {
    console.error('Error saving threads:', error);
  }
}

export function createThread(firstMessage?: Message): Thread {
  const now = new Date();
  const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const thread: Thread = {
    id: threadId,
    title: firstMessage
      ? firstMessage.content.substring(0, 40) + (firstMessage.content.length > 40 ? '...' : '')
      : 'New Thread',
    messages: firstMessage ? [firstMessage] : [],
    createdAt: now,
    updatedAt: now,
  };

  const threads = getThreads();
  threads.unshift(thread);
  saveThreads(threads);

  return thread;
}

export function addMessageToThread(threadId: string, message: Message): void {
  const threads = getThreads();
  const threadIndex = threads.findIndex(t => t.id === threadId);

  if (threadIndex === -1) {
    console.error('Thread not found:', threadId);
    return;
  }

  threads[threadIndex].messages.push(message);
  threads[threadIndex].updatedAt = new Date();

  if (threads[threadIndex].messages.length === 1 && message.role === 'user') {
    threads[threadIndex].title = message.content.substring(0, 40) +
      (message.content.length > 40 ? '...' : '');
  }

  saveThreads(threads);
}

export function updateThreadMessages(threadId: string, messages: Message[]): void {
  const threads = getThreads();
  const threadIndex = threads.findIndex(t => t.id === threadId);

  if (threadIndex === -1) {
    console.error('Thread not found:', threadId);
    return;
  }

  threads[threadIndex].messages = messages;
  threads[threadIndex].updatedAt = new Date();

  saveThreads(threads);
}

export function deleteThread(threadId: string): void {
  const threads = getThreads();
  const filteredThreads = threads.filter(t => t.id !== threadId);
  saveThreads(filteredThreads);
}

export function clearAllThreads(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}