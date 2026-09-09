import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { MessagesService } from './messages.service';
import { ClientService } from './client.service';
import { Webstockets } from '../core/services/webstockets';
import { Message } from '../models/message.model';

export interface RealtimeMessage {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  read?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

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

  onIncomingMessage$(): Observable<RealtimeMessage> {
    return this.websocketService.onMessageSent() as unknown as Observable<RealtimeMessage>;
  }
}
