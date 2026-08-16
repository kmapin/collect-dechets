import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MessagesService } from './messages.service';
import { ClientService } from './client.service';
import { Webstockets } from '../core/services/webstockets';
import { Message } from '../models/message.model';

/**
 * Forme réelle du document `Message` (Mongoose, backend) émise par l'événement
 * socket `messageSent` — DIFFÉRENTE de l'interface `SocketMessage` déclarée dans
 * webstockets.ts (sender_id/receiver_id/conversation_id), qui ne correspond
 * qu'au prototype mocké de pages/chat (jamais branché en production). Ne pas
 * réutiliser `SocketMessage` ici : ses noms de champs ne correspondent pas au
 * vrai schéma `Message` (sender/receiver/content/read/createdAt).
 */
export interface RealtimeMessage {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  read?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Logique de messagerie partagée entre client-dashboard et agency-dashboard —
 * remplace les deux copies quasi identiques de userMessages()/submitMessage()/
 * userAndAgencyConversation() qui existaient dans chaque composant. Chaque
 * dashboard reste responsable de son propre état d'affichage (receivedMessages,
 * connectedUserMessages...) ; ce service ne fait que centraliser les appels
 * HTTP et le canal temps réel.
 */
@Injectable({ providedIn: 'root' })
export class ConversationService {
  constructor(
    private messagesService: MessagesService,
    private clientService: ClientService,
    private websocketService: Webstockets,
  ) {}

  /** Liste des interlocuteurs (agences pour un client, clients pour une agence) avec compteur de non-lus. */
  getConversationsList$(selfId: string): Observable<any[]> {
    return this.messagesService.getMessagesForUser(selfId);
  }

  getUnreadCount$(selfId: string): Observable<number> {
    return this.messagesService.getUserUnreadMessagesCount(selfId).pipe(
      map((response: any) => response?.unreadCount || 0),
    );
  }

  /** Ouvre une conversation avec un interlocuteur, triée chronologiquement. */
  openConversation$(selfId: string, partnerId: string): Observable<any[]> {
    return this.clientService.userAndAgencyConversation(selfId, partnerId).pipe(
      map((messages: any) =>
        (messages || []).sort(
          (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
      ),
    );
  }

  markAsRead$(messageId: string): Observable<void> {
    return this.messagesService.markMessagesAsRead(messageId);
  }

  sendMessage$(payload: Message): Observable<Message> {
    return this.messagesService.sendMessage(payload);
  }

  /**
   * Canal temps réel : le backend émet `messageSent` à la fois vers
   * l'expéditeur et le destinataire (controllers/message.controller.js), donc
   * un même message transite ici pour les deux parties d'une conversation.
   */
  onIncomingMessage$(): Observable<RealtimeMessage> {
    return this.websocketService.onMessageSent() as unknown as Observable<RealtimeMessage>;
  }
}
