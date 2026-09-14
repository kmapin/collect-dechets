import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ConfirmVariant = 'danger' | 'success' | 'primary' | 'neutral';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Ligne d'info secondaire (encadré), ex. "un autre tarif sera désactivé". */
  detail?: string;
  icon?: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ConfirmRequest extends Required<ConfirmOptions> {
  id: string;
}

const DEFAULT_ICONS: Record<ConfirmVariant, string> = {
  danger: 'delete_forever',
  success: 'check_circle',
  primary: 'help_outline',
  neutral: 'help_outline',
};

/**
 * Popup de confirmation générique et réutilisable (remplace les `confirm()`
 * natifs du navigateur et les dialogues "faits maison" dupliqués par page).
 * Montée une seule fois via <app-confirm-dialog> à la racine (app.component).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private requestSubject = new Subject<ConfirmRequest | null>();
  request$ = this.requestSubject.asObservable();

  private pendingResolve?: (value: boolean) => void;

  confirm(options: ConfirmOptions): Promise<boolean> {
    // Une confirmation déjà ouverte est annulée avant d'en afficher une nouvelle.
    this.pendingResolve?.(false);
    const variant = options.variant ?? 'neutral';

    return new Promise<boolean>((resolve) => {
      this.pendingResolve = resolve;
      this.requestSubject.next({
        id: Math.random().toString(36).slice(2),
        title: options.title,
        message: options.message,
        detail: options.detail ?? '',
        icon: options.icon ?? DEFAULT_ICONS[variant],
        variant,
        confirmLabel: options.confirmLabel ?? 'Confirmer',
        cancelLabel: options.cancelLabel ?? 'Annuler',
      });
    });
  }

  /** Utilisé par ConfirmDialog (le composant hôte) pour clore la boîte active. */
  resolve(result: boolean): void {
    this.pendingResolve?.(result);
    this.pendingResolve = undefined;
    this.requestSubject.next(null);
  }
}
