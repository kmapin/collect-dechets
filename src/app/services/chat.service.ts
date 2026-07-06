import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Conversation, Message, User, TypingIndicator } from '../models/chat.models';
import { Webstockets, SocketMessage } from '../core/services/webstockets';
import { MessagesService } from './messages.service';
import { AuthService } from './auth.service';

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

  private currentUserAsChat: User = {
    id: '',
    username: 'Moi',
    role: 'citizen',
    status: 'online',
    created_at: new Date(),
    updated_at: new Date()
  };

  constructor(
    private websocketService: Webstockets,
    private messagesService: MessagesService,
    private authService: AuthService
  ) {
    this.initCurrentUser();
    this.setupWebSocketListeners();
  }

  // ── Initialisation ───────────────────────────────────────────

  private initCurrentUser(): void {
    const rawUser = this.authService.getCurrentUser();
    if (rawUser) {
      this.currentUserAsChat = {
        id: (rawUser as any)._id || (rawUser as any).id || '',
        username: `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim() || 'Moi',
        role: this.mapRole(rawUser.role as string),
        status: 'online',
        created_at: new Date(),
        updated_at: new Date()
      };
      console.log('[CHAT] Utilisateur courant :', this.currentUserAsChat.id, this.currentUserAsChat.username);
      if (this.currentUserAsChat.id) {
        this.loadConversations(this.currentUserAsChat.id);
      }
    } else {
      console.warn('[CHAT] Aucun utilisateur connecté — conversations non chargées');
    }
  }

  private mapRole(role: string): 'citizen' | 'agent' | 'admin' {
    if (role === 'manager' || role === 'collector') return 'agent';
    if (role === 'super_admin' || role === 'municipality') return 'admin';
    return 'citizen';
  }

  // ── Chargement des conversations ─────────────────────────────

  private loadConversations(userId: string): void {
    if (!userId) return;

    console.log('[CHAT] Chargement conversations pour userId :', userId);
    this.messagesService.getMessagesForAgencyOrUser(userId)
      .pipe(catchError((err) => {
        console.error('[CHAT] Erreur chargement conversations :', err);
        return of([]);
      }))
      .subscribe((messages: any[]) => {
        console.log('[CHAT] Messages bruts reçus du backend :', messages?.length ?? 0, 'messages');
        if (!messages?.length) {
          console.warn('[CHAT] Aucun message → aucune conversation affichée');
          return;
        }

        // Regrouper par interlocuteur
        const convMap = new Map<string, any[]>();
        messages.forEach((msg: any) => {
          const otherId = msg.sender === userId ? msg.receiver : msg.sender;
          if (!otherId) return;
          if (!convMap.has(otherId)) convMap.set(otherId, []);
          convMap.get(otherId)!.push(msg);
        });

        const conversations: Conversation[] = Array.from(convMap.entries()).map(([otherId, msgs]) => {
          const sorted = [...msgs].sort((a, b) =>
            new Date(a.createdAt || a.created_at || 0).getTime() -
            new Date(b.createdAt || b.created_at || 0).getTime()
          );
          const lastRaw = sorted[sorted.length - 1];
          const otherUser: User = {
            id: otherId,
            username: lastRaw.senderName && lastRaw.sender !== userId
              ? lastRaw.senderName
              : (lastRaw.receiverName || 'Utilisateur'),
            role: 'citizen',
            status: 'online',
            created_at: new Date(),
            updated_at: new Date()
          };
          const lastMessage = this.rawToMessage(lastRaw, userId, otherId);
          const unread = msgs.filter((m: any) => m.receiver === userId && !m.read).length;

          return {
            id: this.convId(userId, otherId),
            participants: [this.currentUserAsChat, otherUser],
            lastMessage,
            unreadCount: unread,
            created_at: new Date(sorted[0].createdAt || sorted[0].created_at || Date.now()),
            updated_at: new Date(lastRaw.createdAt || lastRaw.created_at || Date.now())
          };
        });

        // Trier par date décroissante
        conversations.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
        console.log('[CHAT]', conversations.length, 'conversation(s) construite(s) :', conversations.map(c => c.participants.find(p => p.id !== userId)?.username));
        this.conversationsSubject.next(conversations);
      });
  }

  // ── Sélection et chargement des messages ─────────────────────

  selectConversation(conversation: Conversation): void {
    this.selectedConversationSubject.next(conversation);
    this.loadMessagesForConversation(conversation);

    // Marquer les non-lus comme lus
    const updatedConversations = this.conversationsSubject.value.map(conv =>
      conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
    );
    this.conversationsSubject.next(updatedConversations);
  }

  private loadMessagesForConversation(conversation: Conversation): void {
    const userId = this.currentUserAsChat.id;
    const other = conversation.participants.find(p => p.id !== userId);
    if (!other) return;

    console.log('[CHAT] Chargement messages pour conversation avec :', other.username, `(${other.id})`);
    this.messagesService.getMessagesForAgencyOrUser(userId)
      .pipe(catchError((err) => {
        console.error('[CHAT] Erreur chargement messages :', err);
        return of([]);
      }))
      .subscribe((messages: any[]) => {
        if (!messages) { this.messagesSubject.next([]); return; }

        const filtered = messages.filter((m: any) =>
          (m.sender === userId && m.receiver === other.id) ||
          (m.receiver === userId && m.sender === other.id)
        );

        console.log('[CHAT]', filtered.length, 'message(s) pour cette conversation');
        const mapped = filtered
          .sort((a, b) =>
            new Date(a.createdAt || a.created_at || 0).getTime() -
            new Date(b.createdAt || b.created_at || 0).getTime()
          )
          .map((m: any) => this.rawToMessage(m, userId, other.id));

        this.messagesSubject.next(mapped);
      });
  }

  // ── Envoi de message ─────────────────────────────────────────

  sendMessage(content: string, attachmentUrl?: string, attachmentType?: 'photo' | 'location'): void {
    const selectedConv = this.selectedConversationSubject.value;
    if (!selectedConv || !content.trim()) return;

    const userId = this.currentUserAsChat.id;
    const other = selectedConv.participants.find(p => p.id !== userId);
    if (!other) return;

    // Ajout optimiste pour une UX réactive
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      conversation_id: selectedConv.id,
      sender_id: userId,
      sender: this.currentUserAsChat,
      content,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      read: false,
      created_at: new Date(),
      updated_at: new Date()
    };
    this.messagesSubject.next([...this.messagesSubject.value, tempMessage]);
    this.updateConversationLastMessage(tempMessage);

    // Envoi HTTP réel
    console.log('[CHAT] Envoi message → receiver :', other.id, '| contenu :', content.substring(0, 50));
    this.messagesService.sendMessage({
      sender: userId,
      receiver: other.id,
      content,
      senderName: this.currentUserAsChat.username
    }).pipe(catchError((err) => {
        console.error('[CHAT] Erreur envoi message :', err);
        return of(null);
      }))
      .subscribe((saved: any) => {
        if (saved) {
          console.log('[CHAT] Message enregistré :', saved._id || saved.id);
          const realMsg = this.rawToMessage(saved, userId, other.id);
          this.messagesSubject.next(
            this.messagesSubject.value.map(m => m.id === tempId ? realMsg : m)
          );
          this.updateConversationLastMessage(realMsg);
        } else {
          console.warn('[CHAT] Message envoyé mais aucune réponse serveur (message temporaire conservé)');
        }
      });
  }

  // ── WebSocket listeners ──────────────────────────────────────

  private setupWebSocketListeners(): void {
    // Après POST /api/messages/send, le serveur émet messageSent
    // vers l'expéditeur ET le destinataire (WEBSOCKET (2).md §3)
    this.websocketService.onMessageSent().subscribe((socketMessage: SocketMessage) => {
      const myUserId = this.currentUserAsChat.id;

      if (!myUserId) {
        console.warn('[CHAT] messageSent ignoré — userId vide');
        return;
      }

      const senderId   = socketMessage.sender;
      const receiverId = socketMessage.receiver;

      if (senderId !== myUserId && receiverId !== myUserId) return;

      // Déduplication : l'expéditeur a déjà son message en optimiste
      const alreadyPresent = this.messagesSubject.value.some(m => m.id === socketMessage._id);
      if (alreadyPresent) {
        console.log('[CHAT] messageSent ignoré — déjà présent :', socketMessage._id);
        return;
      }

      const otherId    = senderId === myUserId ? receiverId : senderId;
      const newMessage = this.rawToMessage(socketMessage as any, myUserId, otherId);
      const currentConv = this.selectedConversationSubject.value;

      // 1. Mettre à jour badge + aperçu dans la liste
      this.upsertConversationWithMessage(newMessage, otherId, socketMessage);

      // 2. Si la conversation est ouverte : recharger depuis l'API
      //    (même stratégie que le re-clic — fiable car HTTP est zone-aware)
      if (currentConv && currentConv.participants.some(p => p.id === otherId)) {
        console.log('[CHAT] Conversation active → rechargement messages API');
        this.loadMessagesForConversation(currentConv);
      }
    });

    this.websocketService.onMessageRead().subscribe((socketMessage: SocketMessage) => {
      this.messagesSubject.next(
        this.messagesSubject.value.map(msg =>
          msg.id === socketMessage._id ? { ...msg, read: true } : msg
        )
      );
    });

    this.websocketService.onMessageDeleted().subscribe(({ messageId }) => {
      this.messagesSubject.next(
        this.messagesSubject.value.filter(msg => msg.id !== messageId)
      );
    });
  }

  // ── Recherche ────────────────────────────────────────────────

  searchConversations(query: string): void {
    if (!query.trim()) {
      this.loadConversations(this.currentUserAsChat.id);
      return;
    }
    const filtered = this.conversationsSubject.value.filter(conv => {
      const other = conv.participants.find(p => p.id !== this.currentUserAsChat.id);
      return other?.username.toLowerCase().includes(query.toLowerCase());
    });
    this.conversationsSubject.next(filtered);
  }

  // ── Getters ──────────────────────────────────────────────────

  getCurrentUser(): User {
    return this.currentUserAsChat;
  }

  /** Compatibilité — l'indicateur de frappe vient maintenant du WebSocket */
  simulateTyping(_conversationId: string, _userId: string): void { /* no-op */ }

  // ── Helpers ──────────────────────────────────────────────────

  private convId(userId: string, otherId: string): string {
    // ID déterministe indépendant de l'ordre
    return [userId, otherId].sort().join('_');
  }

  private rawToMessage(raw: any, currentUserId: string, otherId: string): Message {
    const isOwn = raw.sender === currentUserId;
    const sender: User = isOwn
      ? this.currentUserAsChat
      : {
          id: raw.sender || otherId,
          username: raw.senderName || 'Utilisateur',
          role: 'citizen' as const,
          status: 'online' as const,
          created_at: new Date(),
          updated_at: new Date()
        };
    return {
      id: raw._id || raw.id || `${Date.now()}`,
      conversation_id: this.convId(currentUserId, otherId),
      sender_id: raw.sender || otherId,
      sender,
      content: raw.content || '',
      read: raw.read ?? false,
      created_at: new Date(raw.createdAt || raw.created_at || Date.now()),
      updated_at: new Date(raw.updatedAt || raw.updated_at || Date.now())
    };
  }

  private convertSocketMessage(socketMessage: SocketMessage, myUserId: string): Message {
    const otherId = socketMessage.sender === myUserId ? socketMessage.receiver : socketMessage.sender;
    return this.rawToMessage(socketMessage as any, myUserId, otherId);
  }

  private updateConversationLastMessage(message: Message): void {
    const currentConvId = this.selectedConversationSubject.value?.id;
    const existing = this.conversationsSubject.value;
    const updated = existing.map(conv =>
      conv.id === message.conversation_id
        ? {
            ...conv,
            lastMessage: message,
            updated_at: new Date(),
            unreadCount: conv.id !== currentConvId ? (conv.unreadCount || 0) + 1 : 0
          }
        : conv
    );
    this.conversationsSubject.next(updated);
  }

  private upsertConversationWithMessage(
    message: Message,
    otherId: string,
    raw: SocketMessage
  ): void {
    const myUserId = this.currentUserAsChat.id;
    const currentConvId = this.selectedConversationSubject.value?.id;
    const convId = this.convId(myUserId, otherId);
    const existing = this.conversationsSubject.value;
    const idx = existing.findIndex(c => c.id === convId);

    if (idx >= 0) {
      // Conversation déjà dans la liste — mise à jour
      const updated = existing.map((conv, i) =>
        i === idx
          ? {
              ...conv,
              lastMessage: message,
              updated_at: new Date(),
              unreadCount: conv.id !== currentConvId ? (conv.unreadCount || 0) + 1 : 0
            }
          : conv
      );
      // Remonter en tête de liste (plus récente)
      const moved = [updated[idx], ...updated.filter((_, i) => i !== idx)];
      this.conversationsSubject.next(moved);
      console.log('[CHAT] Conversation mise à jour :', convId);
    } else {
      // Nouvelle conversation — créer une entrée minimale
      const otherUser: User = {
        id: otherId,
        username: raw.senderName || 'Utilisateur',
        role: 'citizen',
        status: 'online',
        created_at: new Date(),
        updated_at: new Date()
      };
      const newConv: Conversation = {
        id: convId,
        participants: [this.currentUserAsChat, otherUser],
        lastMessage: message,
        unreadCount: convId !== currentConvId ? 1 : 0,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.conversationsSubject.next([newConv, ...existing]);
      console.log('[CHAT] Nouvelle conversation créée :', convId);
    }
  }
}
