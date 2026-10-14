import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Conversation, Message, User, UserRole, TypingIndicator } from '../models/chat.models';
import { Webstockets } from '../core/services/webstockets';
import { ConversationService, RealtimeMessage } from './conversation.service';
import { AuthService } from './auth.service';

function mapRole(role?: string): UserRole {
  if (role === 'super_admin') return 'admin';
  if (role === 'manager' || role === 'collector' || role === 'municipality') return 'agent';
  return 'citizen';
}

/**
 * TEMPS-REEL-WEBSOCKET.md §3 (Fondation) — remplace le mock (conversations/
 * messages codés en dur, `sendMessage()` purement local) par les vraies
 * routes `/api/messages/*` (via ConversationService, déjà utilisé par
 * client-dashboard.ts/agency-dashboard.ts pour leur mini-widget) et le vrai
 * canal socket. Il n'existe pas d'entité "Conversation" côté backend — une
 * conversation EST la paire (utilisateur courant, interlocuteur), donc
 * `Conversation.id` est toujours l'id de l'interlocuteur, jamais un id dédié.
 *
 * Contrat public (Observables + méthodes) inchangé pour ne pas toucher aux
 * composants `pages/chat/*` (purement présentationnels, pilotés par ce
 * service) — seule l'implémentation interne passe du mock au réel.
 */
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

  private readonly authService = inject(AuthService);
  private readonly conversationService = inject(ConversationService);
  private readonly websocketService = inject(Webstockets);

  private readonly currentUser: User = this.buildCurrentUser();

  // Source de vérité complète (non filtrée) — `conversationsSubject` peut
  // refléter un filtre de recherche actif, voir searchConversations().
  private allConversations: Conversation[] = [];

  constructor() {
    this.loadConversations();
    this.setupWebSocketListeners();
  }

  private buildCurrentUser(): User {
    const user = this.authService.getCurrentUser();
    const id = String((user as any)?._id ?? (user as any)?.id ?? '');
    const username = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.email || 'Moi';
    return {
      id,
      username,
      role: mapRole(user?.role),
      avatar_url: (user as any)?.avatar ?? undefined,
      status: 'online',
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  private setupWebSocketListeners(): void {
    // `Webstockets.onMessageSent()` déclare un type `SocketMessage` qui ne
    // correspond PAS au payload réel émis par le backend (voir
    // conversation.service.ts::onIncomingMessage$, qui fait le même cast) —
    // le backend émet le document Message brut : sender/receiver/content/
    // read/createdAt/updatedAt, jamais conversation_id/sender_id/created_at.
    this.websocketService.onMessageSent().subscribe((raw) => {
      const payload = raw as unknown as RealtimeMessage;
      const senderId = this.extractId(payload.sender);
      const receiverId = this.extractId(payload.receiver);
      if (senderId !== this.currentUser.id && receiverId !== this.currentUser.id) return;
      const partnerId = senderId === this.currentUser.id ? receiverId : senderId;
      const message = this.mapRealtimeMessage(payload, partnerId);

      const currentConv = this.selectedConversationSubject.value;
      const isOpen = currentConv?.id === partnerId;
      if (isOpen) {
        this.messagesSubject.next([...this.messagesSubject.value, message]);
        if (senderId !== this.currentUser.id) {
          this.conversationService.markAsRead$(message.id).subscribe();
        }
      }
      this.updateConversationWithNewMessage(message, partnerId, isOpen);
    });

    this.websocketService.onMessageRead().subscribe((raw) => {
      const id = (raw as any)?._id ?? (raw as any)?.id;
      if (!id) return;
      this.messagesSubject.next(this.messagesSubject.value.map(m => m.id === id ? { ...m, read: true } : m));
    });

    this.websocketService.onMessageDeleted().subscribe(({ messageId }) => {
      this.messagesSubject.next(this.messagesSubject.value.filter(m => m.id !== messageId));
    });
  }

  private extractId(value: any): string {
    return String((value && typeof value === 'object') ? value._id : value);
  }

  private loadConversations(): void {
    if (!this.currentUser.id) return;
    this.conversationService.getConversationsList$(this.currentUser.id).subscribe({
      next: (partners) => {
        this.allConversations = (partners || []).map((p: any) => this.mapPartnerToConversation(p));
        this.conversationsSubject.next(this.allConversations);
      },
      error: () => {
        this.allConversations = [];
        this.conversationsSubject.next([]);
      },
    });
  }

  private mapPartnerToUser(partner: any): User {
    const isAgency = !partner.firstName && !!partner.name;
    return {
      id: String(partner._id),
      username: isAgency
        ? partner.name
        : [partner.firstName, partner.lastName].filter(Boolean).join(' ').trim() || partner.email || 'Utilisateur',
      role: isAgency ? 'agent' : mapRole(partner.role),
      avatar_url: partner.avatar ?? undefined,
      status: 'offline',
      created_at: partner.createdAt ? new Date(partner.createdAt) : new Date(),
      updated_at: partner.updatedAt ? new Date(partner.updatedAt) : new Date(),
    };
  }

  private mapPartnerToConversation(partner: any): Conversation {
    const partnerUser = this.mapPartnerToUser(partner);
    return {
      id: partnerUser.id,
      participants: [this.currentUser, partnerUser],
      lastMessage: partner.lastMessage ? this.mapRealtimeMessage(partner.lastMessage, partnerUser.id) : undefined,
      unreadCount: partner.unreadCount ?? 0,
      created_at: partner.lastMessageDate ? new Date(partner.lastMessageDate) : new Date(),
      updated_at: partner.lastMessageDate ? new Date(partner.lastMessageDate) : new Date(),
    };
  }

  private mapRealtimeMessage(raw: RealtimeMessage | any, conversationId: string): Message {
    return {
      id: String(raw._id),
      conversation_id: conversationId,
      sender_id: this.extractId(raw.sender),
      content: raw.content,
      read: raw.read,
      created_at: new Date(raw.createdAt ?? Date.now()),
      updated_at: new Date(raw.updatedAt ?? raw.createdAt ?? Date.now()),
    };
  }

  private updateConversationWithNewMessage(message: Message, partnerId: string, isOpen: boolean): void {
    const idx = this.allConversations.findIndex(c => c.id === partnerId);
    if (idx === -1) {
      // Nouvel interlocuteur jamais vu dans cette session (premier message
      // d'une conversation inédite) : on ne connaît ni son nom ni son rôle
      // ici, il faut les récupérer via l'API plutôt que fabriquer un objet
      // partiel.
      this.loadConversations();
      return;
    }
    this.allConversations = this.allConversations.map(c => c.id === partnerId
      ? {
          ...c,
          lastMessage: message,
          updated_at: new Date(),
          unreadCount: isOpen ? 0 : (c.unreadCount || 0) + (message.sender_id !== this.currentUser.id ? 1 : 0),
        }
      : c);
    this.conversationsSubject.next(this.allConversations);
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversationSubject.next(conversation);
    this.loadMessagesForConversation(conversation);

    this.allConversations = this.allConversations.map(c => c.id === conversation.id ? { ...c, unreadCount: 0 } : c);
    this.conversationsSubject.next(this.allConversations);
  }

  private loadMessagesForConversation(conversation: Conversation): void {
    this.conversationService.openConversation$(this.currentUser.id, conversation.id).subscribe({
      next: (raw) => {
        const messages = (raw || []).map((m: any) => this.mapRealtimeMessage(m, conversation.id));
        this.messagesSubject.next(messages);
        messages
          .filter(m => m.sender_id !== this.currentUser.id && !m.read)
          .forEach(m => this.conversationService.markAsRead$(m.id).subscribe());
      },
      error: () => this.messagesSubject.next([]),
    });
  }

  sendMessage(content: string, attachmentUrl?: string, attachmentType?: 'photo' | 'location'): void {
    const selectedConv = this.selectedConversationSubject.value;
    if (!selectedConv || !content.trim()) return;

    // Le modèle Message backend (models/Message.js) ne porte pas de champ
    // pièce jointe — attachmentUrl/attachmentType (hérités du mock) ne sont
    // donc pas persistés, comportement inchangé pour les appelants actuels
    // (pages/chat n'envoie jamais d'attachment aujourd'hui).
    this.conversationService.sendMessage$({
      sender: this.currentUser.id,
      receiver: selectedConv.id,
      content: content.trim(),
    }).subscribe({
      next: (saved) => {
        const message = this.mapRealtimeMessage(saved as unknown as RealtimeMessage, selectedConv.id);
        this.messagesSubject.next([...this.messagesSubject.value, message]);
        this.updateConversationWithNewMessage(message, selectedConv.id, true);
      },
    });
  }

  searchConversations(query: string): void {
    if (!query.trim()) {
      this.conversationsSubject.next(this.allConversations);
      return;
    }
    const q = query.toLowerCase();
    const filtered = this.allConversations.filter(conv => {
      const other = conv.participants.find(p => p.id !== this.currentUser.id);
      return other?.username.toLowerCase().includes(q);
    });
    this.conversationsSubject.next(filtered);
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  // Pas de diffusion d'un signal "l'autre partie est en train d'écrire" côté
  // backend/socket aujourd'hui (seul `Webstockets.emitTyping()` existe, en
  // émission uniquement, rien ne l'écoute) — no-op plutôt que de fabriquer un
  // faux indicateur comme le faisait le mock.
  simulateTyping(_conversationId: string, _userId: string): void {}
}
