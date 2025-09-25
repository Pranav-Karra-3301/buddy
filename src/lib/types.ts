export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  feedback?: 'up' | 'down';
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

