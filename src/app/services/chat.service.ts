import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Conversation, Message, User, TypingIndicator } from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  private selectedConversationSubject = new BehaviorSubject<Conversation | null>(null);
  private messagesSubject = new BehaviorSubject<Message[]>([]);
  private typingIndicatorsSubject = new BehaviorSubject<TypingIndicator[]>([]);

  conversations$ = this.conversationsSubject.asObservable();
  selectedConversation$ = this.selectedConversationSubject.asObservable();
  messages$ = this.messagesSubject.asObservable();
  typingIndicators$ = this.typingIndicatorsSubject.asObservable();

  private currentUser: User = {
    id: 'user-1',
    username: 'John Citizen',
    role: 'citizen',
    avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100',
    status: 'online',
    created_at: new Date(),
    updated_at: new Date()
  };

  private mockUsers: User[] = [
    this.currentUser,
    {
      id: 'user-2',
      username: 'Sarah Agent',
      role: 'agent',
      avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100',
      status: 'online',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'user-3',
      username: 'Mike Admin',
      role: 'admin',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100',
      status: 'offline',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 'user-4',
      username: 'Emma Agent',
      role: 'agent',
      avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
      status: 'online',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const mockConversations: Conversation[] = [
      {
        id: 'conv-1',
        participants: [this.currentUser, this.mockUsers[1]],
        lastMessage: {
          id: 'msg-1',
          conversation_id: 'conv-1',
          sender_id: 'user-2',
          sender: this.mockUsers[1],
          content: 'I will be there in 15 minutes to collect the waste.',
          created_at: new Date(now.getTime() - 5 * 60 * 1000),
          updated_at: new Date(now.getTime() - 5 * 60 * 1000)
        },
        unreadCount: 2,
        created_at: yesterday,
        updated_at: new Date(now.getTime() - 5 * 60 * 1000)
      },
      {
        id: 'conv-2',
        participants: [this.currentUser, this.mockUsers[2]],
        lastMessage: {
          id: 'msg-2',
          conversation_id: 'conv-2',
          sender_id: 'user-1',
          sender: this.currentUser,
          content: 'Thank you for the quick response!',
          created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
        },
        unreadCount: 0,
        created_at: twoDaysAgo,
        updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'conv-3',
        participants: [this.currentUser, this.mockUsers[3]],
        lastMessage: {
          id: 'msg-3',
          conversation_id: 'conv-3',
          sender_id: 'user-4',
          sender: this.mockUsers[3],
          content: 'We have scheduled your pickup for tomorrow morning.',
          created_at: yesterday,
          updated_at: yesterday
        },
        unreadCount: 0,
        created_at: twoDaysAgo,
        updated_at: yesterday
      }
    ];

    this.conversationsSubject.next(mockConversations);
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversationSubject.next(conversation);
    this.loadMessagesForConversation(conversation.id);

    const updatedConversations = this.conversationsSubject.value.map(conv =>
      conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
    );
    this.conversationsSubject.next(updatedConversations);
  }

  private loadMessagesForConversation(conversationId: string): void {
    const now = new Date();
    const mockMessages: { [key: string]: Message[] } = {
      'conv-1': [
        {
          id: 'msg-1-1',
          conversation_id: 'conv-1',
          sender_id: 'user-1',
          sender: this.currentUser,
          content: 'Hello, I need to report a waste collection issue at my address.',
          created_at: new Date(now.getTime() - 30 * 60 * 1000),
          updated_at: new Date(now.getTime() - 30 * 60 * 1000)
        },
        {
          id: 'msg-1-2',
          conversation_id: 'conv-1',
          sender_id: 'user-2',
          sender: this.mockUsers[1],
          content: 'Hello! I\'ll be happy to help. Can you provide more details about the issue?',
          created_at: new Date(now.getTime() - 28 * 60 * 1000),
          updated_at: new Date(now.getTime() - 28 * 60 * 1000)
        },
        {
          id: 'msg-1-3',
          conversation_id: 'conv-1',
          sender_id: 'user-1',
          sender: this.currentUser,
          content: 'The bins were not collected this morning, and there is overflow.',
          created_at: new Date(now.getTime() - 25 * 60 * 1000),
          updated_at: new Date(now.getTime() - 25 * 60 * 1000)
        },
        {
          id: 'msg-1-4',
          conversation_id: 'conv-1',
          sender_id: 'user-1',
          sender: this.currentUser,
          content: 'Here is a photo of the situation.',
          attachment_url: 'https://images.pexels.com/photos/3181031/pexels-photo-3181031.jpeg?auto=compress&cs=tinysrgb&w=400',
          attachment_type: 'photo',
          created_at: new Date(now.getTime() - 24 * 60 * 1000),
          updated_at: new Date(now.getTime() - 24 * 60 * 1000)
        },
        {
          id: 'msg-1-5',
          conversation_id: 'conv-1',
          sender_id: 'user-2',
          sender: this.mockUsers[1],
          content: 'Thank you for the photo. I can see the issue. Let me schedule an immediate pickup for you.',
          created_at: new Date(now.getTime() - 20 * 60 * 1000),
          updated_at: new Date(now.getTime() - 20 * 60 * 1000)
        },
        {
          id: 'msg-1-6',
          conversation_id: 'conv-1',
          sender_id: 'user-2',
          sender: this.mockUsers[1],
          content: 'I will be there in 15 minutes to collect the waste.',
          created_at: new Date(now.getTime() - 5 * 60 * 1000),
          updated_at: new Date(now.getTime() - 5 * 60 * 1000)
        }
      ],
      'conv-2': [
        {
          id: 'msg-2-1',
          conversation_id: 'conv-2',
          sender_id: 'user-2',
          sender: this.mockUsers[2],
          content: 'Hello, we noticed your recent report. Is everything resolved?',
          created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          updated_at: new Date(now.getTime() - 3 * 60 * 60 * 1000)
        },
        {
          id: 'msg-2-2',
          conversation_id: 'conv-2',
          sender_id: 'user-1',
          sender: this.currentUser,
          content: 'Yes, the collection agent came by and resolved everything. Thank you for the quick response!',
          created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
        }
      ],
      'conv-3': [
        {
          id: 'msg-3-1',
          conversation_id: 'conv-3',
          sender_id: 'user-1',
          sender: this.currentUser,
          content: 'I would like to schedule a bulk waste pickup for next week.',
          created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000),
          updated_at: new Date(now.getTime() - 25 * 60 * 60 * 1000)
        },
        {
          id: 'msg-3-2',
          conversation_id: 'conv-3',
          sender_id: 'user-4',
          sender: this.mockUsers[3],
          content: 'Of course! What type of bulk items do you need collected?',
          created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          updated_at: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-3-3',
          conversation_id: 'conv-3',
          sender_id: 'user-1',
          sender: this.currentUser,
          content: 'Old furniture and some electronics.',
          created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          updated_at: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-3-4',
          conversation_id: 'conv-3',
          sender_id: 'user-4',
          sender: this.mockUsers[3],
          content: 'We have scheduled your pickup for tomorrow morning.',
          created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          updated_at: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      ]
    };

    const messages = mockMessages[conversationId] || [];
    this.messagesSubject.next(messages);
  }

  sendMessage(content: string, attachmentUrl?: string, attachmentType?: 'photo' | 'location'): void {
    const selectedConv = this.selectedConversationSubject.value;
    if (!selectedConv) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: selectedConv.id,
      sender_id: this.currentUser.id,
      sender: this.currentUser,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      created_at: new Date(),
      updated_at: new Date()
    };

    const currentMessages = this.messagesSubject.value;
    this.messagesSubject.next([...currentMessages, newMessage]);

    const updatedConversations = this.conversationsSubject.value.map(conv =>
      conv.id === selectedConv.id
        ? { ...conv, lastMessage: newMessage, updated_at: new Date() }
        : conv
    );
    this.conversationsSubject.next(updatedConversations);
  }

  searchConversations(query: string): void {
    if (!query.trim()) {
      this.initializeMockData();
      return;
    }

    const filtered = this.conversationsSubject.value.filter(conv => {
      const otherParticipant = conv.participants.find(p => p.id !== this.currentUser.id);
      return otherParticipant?.username.toLowerCase().includes(query.toLowerCase());
    });

    this.conversationsSubject.next(filtered);
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  simulateTyping(conversationId: string, userId: string): void {
    setTimeout(() => {
      const user = this.mockUsers.find(u => u.id === userId);
      if (user) {
        this.typingIndicatorsSubject.next([{
          conversation_id: conversationId,
          user_id: userId,
          username: user.username,
          is_typing: true
        }]);

        setTimeout(() => {
          this.typingIndicatorsSubject.next([]);
        }, 3000);
      }
    }, 1000);
  }
}
