export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatState {
  threads: Thread[];
  currentThreadId: string | null;
  useRag: boolean;
}

export interface MessageAction {
  type: 'copy' | 'regenerate' | 'thumbs-up' | 'thumbs-down';
  messageId: string;
  timestamp: Date;
}