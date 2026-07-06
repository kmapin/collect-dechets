import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

// Payload réel du backend (POST /api/messages/send → messageSent)
export interface SocketMessage {
  _id: string;
  sender: string;       // _id de l'expéditeur
  receiver: string;     // _id du destinataire
  content: string;
  senderName?: string;
  read?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SocketNotification {
  _id: string;
  user: string;        // _id de l'utilisateur concerné (backend: "user")
  type: string;
  title?: string;      // non fourni par le backend — dériver de type si besoin
  message: string;
  read?: boolean;
  createdAt?: Date;    // backend: "createdAt"
}

export interface SocketReport {
  collecteId: string;
  reportedBy?: string;
  severity?: string;
  comment?: string;
  message?: string;
}

export interface SocketPlanningNotification {
  collectorId: string;
  message: string;
  clients?: any[];
}

@Injectable({
  providedIn: 'root',
})
export class Webstockets {
  private socket: Socket | null = null;
  private connected$ = new BehaviorSubject<boolean>(false);

  // Messages
  private messageSent$ = new Subject<SocketMessage>();
  private messageRead$ = new Subject<SocketMessage>();
  private messageDeleted$ = new Subject<{ messageId: string }>();

  // Notifications
  private newNotification$ = new Subject<SocketNotification>();
  private notificationRead$ = new Subject<{ id: string }>();
  private notificationDeleted$ = new Subject<{ id: string }>();

  // Collectes / Signalements
  private newReport$ = new Subject<SocketReport>();
  private reportAssigned$ = new Subject<SocketReport>();
  private reportResolved$ = new Subject<SocketReport>();

  // Planning
  private planningNotification$ = new Subject<SocketPlanningNotification>();

  constructor(private ngZone: NgZone) {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const socketUrl = environment.apiUrl.replace('/api', '');

    this.socket = io(socketUrl, {
      autoConnect: false,
      // JWT obligatoire — on lit le dernier token disponible
      auth: {
        token: localStorage.getItem('authWasteToken') || ''
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Tous les callbacks socket.io s'exécutent hors zone Angular.
    // ngZone.run() force la détection de changement après chaque événement
    // pour que les composants (ChatWindow, Header, etc.) se mettent à jour.

    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        console.log('[WS] Connecté, id:', this.socket?.id);
        this.connected$.next(true);
      });
    });

    this.socket.on('disconnect', (reason: string) => {
      this.ngZone.run(() => {
        console.log('[WS] Déconnecté :', reason);
        this.connected$.next(false);
      });
    });

    this.socket.on('connect_error', (error: Error) => {
      this.ngZone.run(() => {
        this.connected$.next(false);
        if (error.message === 'Token expiré') {
          console.warn('[WS] Token expiré — appeler updateToken()');
        } else if (error.message === 'Token manquant') {
          console.warn('[WS] Token manquant — se connecter d\'abord');
        } else if (error.message === 'Token invalide') {
          console.error('[WS] Token invalide — rediriger vers login');
        } else {
          console.error('[WS] Erreur connexion :', error.message);
        }
      });
    });

    // ── Messages ────────────────────────────────────────────────
    this.socket.on('messageSent', (msg: SocketMessage) => {
      this.ngZone.run(() => {
        console.log('[WS] messageSent :', msg);
        this.messageSent$.next(msg);
      });
    });

    this.socket.on('messageRead', (msg: SocketMessage) => {
      this.ngZone.run(() => {
        console.log('[WS] messageRead :', msg);
        this.messageRead$.next(msg);
      });
    });

    this.socket.on('messageDeleted', (data: { messageId: string }) => {
      this.ngZone.run(() => {
        console.log('[WS] messageDeleted :', data);
        this.messageDeleted$.next(data);
      });
    });

    // ── Notifications ───────────────────────────────────────────
    this.socket.on('newNotification', (notif: SocketNotification) => {
      this.ngZone.run(() => {
        console.log('[WS] newNotification :', notif);
        this.newNotification$.next(notif);
      });
    });

    this.socket.on('notificationRead', (data: { id: string }) => {
      this.ngZone.run(() => {
        console.log('[WS] notificationRead :', data);
        this.notificationRead$.next(data);
      });
    });

    this.socket.on('notificationDeleted', (data: { id: string }) => {
      this.ngZone.run(() => {
        console.log('[WS] notificationDeleted :', data);
        this.notificationDeleted$.next(data);
      });
    });

    // ── Collectes / Signalements ────────────────────────────────
    this.socket.on('newReport', (data: SocketReport) => {
      this.ngZone.run(() => {
        console.log('[WS] newReport :', data);
        this.newReport$.next(data);
      });
    });

    this.socket.on('reportAssigned', (data: SocketReport) => {
      this.ngZone.run(() => {
        console.log('[WS] reportAssigned :', data);
        this.reportAssigned$.next(data);
      });
    });

    this.socket.on('reportResolved', (data: SocketReport) => {
      this.ngZone.run(() => {
        console.log('[WS] reportResolved :', data);
        this.reportResolved$.next(data);
      });
    });

    // ── Planning ────────────────────────────────────────────────
    this.socket.on('planningNotification', (data: SocketPlanningNotification) => {
      this.ngZone.run(() => {
        console.log('[WS] planningNotification :', data);
        this.planningNotification$.next(data);
      });
    });
  }

  // ── Connexion ────────────────────────────────────────────────

  connect(): void {
    if (!this.socket) return;
    // Toujours mettre à jour le token avant de connecter
    const token = localStorage.getItem('authWasteToken') || '';
    (this.socket.auth as any).token = token;

    if (!this.socket.connected) {
      console.log('Connexion WebSocket avec token :', token ? '✓' : '⚠ vide');
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket?.connected) {
      console.log('Déconnexion WebSocket');
      this.socket.disconnect();
    }
  }

  /**
   * Met à jour le JWT et reconnecte. Appeler après refresh du token.
   */
  updateToken(newToken: string): void {
    if (!this.socket) return;
    localStorage.setItem('authWasteToken', newToken);
    (this.socket.auth as any).token = newToken;
    this.socket.disconnect().connect();
  }

  // ── Rooms ────────────────────────────────────────────────────

  /**
   * Rejoindre la room utilisateur.
   * Si la connexion n'est pas encore établie, attend le prochain `connect`.
   */
  joinRoom(userId: string): void {
    if (!this.socket) return;

    if (this.socket.connected) {
      console.log('joinRoom :', userId);
      this.socket.emit('joinRoom', userId);
    } else {
      // Le socket n'est pas encore connecté — queue l'émission
      this.socket.once('connect', () => {
        console.log('joinRoom (différé) :', userId);
        this.socket?.emit('joinRoom', userId);
      });
    }
  }

  leaveRoom(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leaveRoom', userId);
    }
  }

  // ── Typing ──────────────────────────────────────────────────

  emitTyping(conversationId: string, userId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', { conversationId, userId, isTyping });
    }
  }

  // ── Observables — Messages ───────────────────────────────────

  onMessageSent(): Observable<SocketMessage> { return this.messageSent$.asObservable(); }
  onMessageRead(): Observable<SocketMessage> { return this.messageRead$.asObservable(); }
  onMessageDeleted(): Observable<{ messageId: string }> { return this.messageDeleted$.asObservable(); }

  // ── Observables — Notifications ──────────────────────────────

  onNewNotification(): Observable<SocketNotification> { return this.newNotification$.asObservable(); }
  onNotificationRead(): Observable<{ id: string }> { return this.notificationRead$.asObservable(); }
  onNotificationDeleted(): Observable<{ id: string }> { return this.notificationDeleted$.asObservable(); }

  // ── Observables — Collectes / Signalements ───────────────────

  onNewReport(): Observable<SocketReport> { return this.newReport$.asObservable(); }
  onReportAssigned(): Observable<SocketReport> { return this.reportAssigned$.asObservable(); }
  onReportResolved(): Observable<SocketReport> { return this.reportResolved$.asObservable(); }

  // ── Observables — Planning ───────────────────────────────────

  onPlanningNotification(): Observable<SocketPlanningNotification> { return this.planningNotification$.asObservable(); }

  // ── État ─────────────────────────────────────────────────────

  isConnected(): Observable<boolean> { return this.connected$.asObservable(); }
  getConnectionStatus(): boolean { return this.socket?.connected || false; }
}
