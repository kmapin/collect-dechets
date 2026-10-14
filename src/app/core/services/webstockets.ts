import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { NotificationItem } from '../../models/notification.model';

export interface SocketMessage {
  _id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read?: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SocketNotification = NotificationItem;

@Injectable({
  providedIn: 'root',
})
export class Webstockets {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);

  // Rooms demandées via joinRoom() — rejouées à chaque événement 'connect'
  // (connexion initiale ET reconnexions après coupure réseau : socket.io
  // attribue un nouveau socket.id à chaque reconnexion, qui ne garde jamais
  // l'appartenance aux rooms d'une connexion précédente). Corrige une course
  // critique : AuthService appelle connect() puis joinRoom(userId) sur la même
  // ligne, alors que connect() est asynchrone — joinRoom() s'exécutait donc
  // toujours avant que le socket soit réellement connecté, échouait
  // silencieusement (this.socket.connected encore false) et n'était jamais
  // retenté, empêchant structurellement toute notification temps réel ciblée
  // sur un utilisateur (room = son propre userId) d'être jamais reçue.
  private roomsToJoin = new Set<string>();

  // Observables pour les messages
  private messageSent$ = new Subject<SocketMessage>();
  private messageRead$ = new Subject<SocketMessage>();
  private messageDeleted$ = new Subject<{ messageId: string }>();
  
  // Observables pour les notifications
  private newNotification$ = new Subject<SocketNotification>();
  private notificationRead$ = new Subject<{ id: string }>();
  private notificationDeleted$ = new Subject<{ id: string }>();
  private allNotificationsRead$ = new Subject<{ modifiedCount: number }>();

  // Catalogue tarifaire public d'une agence (room `agency-catalog:<agencyId>`,
  // rejoignable par tout utilisateur connecté — voir server.js::joinRoom).
  private pricingUpdated$ = new Subject<{ agencyId: string }>();

  constructor() {
    // Initialiser le socket mais ne pas se connecter automatiquement
    this.initializeSocket();
  }

  private _getToken(): string | null {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return null;
      return JSON.parse(raw)?.token ?? null;
    } catch {
      return null;
    }
  }

  private initializeSocket(): void {

    // Extraire l'URL de base sans '/api'
    const socketUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: (cb: (data: { token: string | null }) => void) => cb({ token: this._getToken() }),
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Événements de connexion
    this.socket.on('connect', () => {
      console.log(' WebSocket connecté');
      this.connected$.next(true);
      this.roomsToJoin.forEach((room) => {
        console.log(' Rejoindre la room (post-connect):', room);
        this.socket!.emit('joinRoom', room);
      });
    });

    this.socket.on('disconnect', () => {
      console.log(' WebSocket déconnecté');
      this.connected$.next(false);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Erreur de connexion WebSocket:', error);
      this.connected$.next(false);
    });

    // Événements pour les messages
    this.socket.on('messageSent', (message: SocketMessage) => {
      console.log('Nouveau message reçu:', message);
      this.messageSent$.next(message);
    });

    this.socket.on('messageRead', (message: SocketMessage) => {
      console.log(' Message lu:', message);
      this.messageRead$.next(message);
    });

    this.socket.on('messageDeleted', (data: { messageId: string }) => {
      console.log(' Message supprimé:', data);
      this.messageDeleted$.next(data);
    });

    // Événements pour les notifications
    this.socket.on('newNotification', (notification: SocketNotification) => {
      console.log(' Nouvelle notification:', notification);
      this.newNotification$.next(notification);
    });

    this.socket.on('notificationRead', (data: { id: string }) => {
      console.log(' Notification lue:', data);
      this.notificationRead$.next(data);
    });

    this.socket.on('notificationDeleted', (data: { id: string }) => {
      console.log(' Notification supprimée:', data);
      this.notificationDeleted$.next(data);
    });

    this.socket.on('allNotificationsRead', (data: { modifiedCount: number }) => {
      console.log(' Toutes les notifications marquées comme lues:', data);
      this.allNotificationsRead$.next(data);
    });

    this.socket.on('pricingUpdated', (data: { agencyId: string }) => {
      console.log(' Catalogue tarifaire mis à jour:', data);
      this.pricingUpdated$.next(data);
    });
  }

  connect(): void {
    if (this.socket && !this.socket.connected) {
      console.log('🔌 Connexion au WebSocket...');
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Déconnexion du WebSocket...');
      this.socket.disconnect();
    }
  }

  joinRoom(userId: string): void {
    this.roomsToJoin.add(userId);
    if (this.socket && this.socket.connected) {
      console.log(' Rejoindre la room:', userId);
      this.socket.emit('joinRoom', userId);
    } else {
      // Pas une erreur : rejointe automatiquement dès l'événement 'connect'
      // (voir roomsToJoin ci-dessus) — la connexion est déjà en cours
      // (connect() appelé juste avant par AuthService).
      console.log(' Socket pas encore connecté, room en attente :', userId);
    }
  }

  leaveRoom(userId: string): void {
    this.roomsToJoin.delete(userId);
    if (this.socket && this.socket.connected) {
      console.log(' Quitter la room:', userId);
      this.socket.emit('leaveRoom', userId);
    }
  }

  emitTyping(conversationId: string, userId: string, isTyping: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', { conversationId, userId, isTyping });
    }
  }

  
  onMessageSent(): Observable<SocketMessage> {
    return this.messageSent$.asObservable();
  }

  onMessageRead(): Observable<SocketMessage> {
    return this.messageRead$.asObservable();
  }

  onMessageDeleted(): Observable<{ messageId: string }> {
    return this.messageDeleted$.asObservable();
  }

  
  onNewNotification(): Observable<SocketNotification> {
    return this.newNotification$.asObservable();
  }

  onNotificationRead(): Observable<{ id: string }> {
    return this.notificationRead$.asObservable();
  }

  onNotificationDeleted(): Observable<{ id: string }> {
    return this.notificationDeleted$.asObservable();
  }

  onAllNotificationsRead(): Observable<{ modifiedCount: number }> {
    return this.allNotificationsRead$.asObservable();
  }

  onPricingUpdated(): Observable<{ agencyId: string }> {
    return this.pricingUpdated$.asObservable();
  }

  
  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  getConnectionStatus(): boolean {
    return this.socket?.connected || false;
  }
}
