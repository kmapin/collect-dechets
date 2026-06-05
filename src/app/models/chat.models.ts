export type UserRole = 'citizen' | 'agent' | 'admin';
export type UserStatus = 'online' | 'offline';
export type AttachmentType = 'photo' | 'location';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  avatar_url?: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: User;
  content: string;
  attachment_url?: string;
  attachment_type?: AttachmentType;
  read?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  username: string;
  is_typing: boolean;
}
