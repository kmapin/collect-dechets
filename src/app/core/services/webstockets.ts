import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

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

export interface SocketNotification {
  _id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: Date;
}

@Injectable({
  providedIn: 'root',
})
export class Webstockets {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);
  
  // Observables pour les messages
  private messageSent$ = new Subject<SocketMessage>();
  private messageRead$ = new Subject<SocketMessage>();
  private messageDeleted$ = new Subject<{ messageId: string }>();
  
  // Observables pour les notifications
  private newNotification$ = new Subject<SocketNotification>();
  private notificationRead$ = new Subject<{ id: string }>();
  private notificationDeleted$ = new Subject<{ id: string }>();

  constructor() {
    // Initialiser le socket mais ne pas se connecter automatiquement
    this.initializeSocket();
  }

  /**
   * Récupère le JWT courant — même source que `auth-interceptor-interceptor.ts`
   * (`JSON.parse(localStorage.getItem('currentUser')).token`), PAS la clé
   * séparée `authWasteToken` (posée par `auth.service.ts` mais jamais relue
   * nulle part ailleurs dans l'app — un artefact mort).
   *
   * Corrigé (usage réel) : jusqu'ici AUCUN token n'était jamais envoyé au
   * handshake du socket — le serveur (`server.js::io.use`) exige
   * `socket.handshake.auth.token` et rejette sinon avec "Token manquant".
   * Chaque tentative de connexion WebSocket échouait donc silencieusement,
   * pour tout le monde, depuis toujours : `newNotification` (et donc tout le
   * travail de rafraîchissement temps réel construit dans cette conversation)
   * n'a jamais pu réellement transiter par socket en usage réel.
   */
  private _getToken(): string | null {
    try {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return null;
      return JSON.parse(raw)?.token ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Initialise la connexion socket sans se connecter
   */
  private initializeSocket(): void {

    // Extraire l'URL de base sans '/api'
    const socketUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(socketUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      // Fonction (pas une valeur figée) : réévaluée à CHAQUE tentative de
      // connexion/reconnexion, pour toujours envoyer le token le plus récent
      // (ex. après un login qui arrive après la création de ce service).
      auth: (cb: (data: { token: string | null }) => void) => cb({ token: this._getToken() }),
    });

    this.setupSocketListeners();
  }

  /**
   * Configure tous les listeners d'événements socket
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Événements de connexion
    this.socket.on('connect', () => {
      console.log(' WebSocket connecté');
      this.connected$.next(true);
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
  }

  /**
   * Connecte le socket au serveur
   */
  connect(): void {
    if (this.socket && !this.socket.connected) {
      console.log('🔌 Connexion au WebSocket...');
      this.socket.connect();
    }
  }

  /**
   * Déconnecte le socket du serveur
   */
  disconnect(): void {
    if (this.socket && this.socket.connected) {
      console.log('🔌 Déconnexion du WebSocket...');
      this.socket.disconnect();
    }
  }

  /**
   * Rejoint une room utilisateur (appelé après login)
   */
  joinRoom(userId: string): void {
    if (this.socket && this.socket.connected) {
      console.log(' Rejoindre la room:', userId);
      this.socket.emit('joinRoom', userId);
    } else {
      console.warn(' Socket non connecté. Impossible de rejoindre la room.');
    }
  }

  /**
   * Quitte une room utilisateur
   */
  leaveRoom(userId: string): void {
    if (this.socket && this.socket.connected) {
      console.log(' Quitter la room:', userId);
      this.socket.emit('leaveRoom', userId);
    }
  }

  /**
   * Émet un événement de typing indicator
   */
  emitTyping(conversationId: string, userId: string, isTyping: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', { conversationId, userId, isTyping });
    }
  }

  // ============================================================
  // Observables publics pour les messages
  // ============================================================
  
  onMessageSent(): Observable<SocketMessage> {
    return this.messageSent$.asObservable();
  }

  onMessageRead(): Observable<SocketMessage> {
    return this.messageRead$.asObservable();
  }

  onMessageDeleted(): Observable<{ messageId: string }> {
    return this.messageDeleted$.asObservable();
  }

  // ============================================================
  // Observables publics pour les notifications
  // ============================================================
  
  onNewNotification(): Observable<SocketNotification> {
    return this.newNotification$.asObservable();
  }

  onNotificationRead(): Observable<{ id: string }> {
    return this.notificationRead$.asObservable();
  }

  onNotificationDeleted(): Observable<{ id: string }> {
    return this.notificationDeleted$.asObservable();
  }

  // ============================================================
  // État de connexion
  // ============================================================
  
  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  getConnectionStatus(): boolean {
    return this.socket?.connected || false;
  }
}
