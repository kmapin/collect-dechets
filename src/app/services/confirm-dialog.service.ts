import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ConfirmVariant = 'danger' | 'success' | 'primary' | 'neutral';

export interface ConfirmInputField {
  placeholder?: string;
  initialValue?: string;
  multiline?: boolean;
  /** false par défaut : la confirmation reste possible avec un champ vide. */
  required?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Ligne d'info secondaire (encadré), ex. "un autre tarif sera désactivé". */
  detail?: string;
  icon?: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ajoute un champ de saisie texte à la boîte (remplace un prompt() natif) —
   * voir confirmWithInput(), qui renvoie le texte saisi au lieu d'un booléen. */
  inputField?: ConfirmInputField;
}

export interface ConfirmRequest extends Required<Omit<ConfirmOptions, 'inputField'>> {
  id: string;
  inputField?: ConfirmInputField;
}

const DEFAULT_ICONS: Record<ConfirmVariant, string> = {
  danger: 'delete_forever',
  success: 'check_circle',
  primary: 'help_outline',
  neutral: 'help_outline',
};

/**
 * Popup de confirmation générique et réutilisable (remplace les `confirm()`/
 * `prompt()` natifs du navigateur et les dialogues "faits maison" dupliqués
 * par page). Montée une seule fois via <app-confirm-dialog> à la racine
 * (app.component).
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private requestSubject = new Subject<ConfirmRequest | null>();
  request$ = this.requestSubject.asObservable();

  private pendingResolve?: (value: boolean) => void;
  private pendingInputResolve?: (value: string | null) => void;

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.cancelPending();
    return new Promise<boolean>((resolve) => {
      this.pendingResolve = resolve;
      this.requestSubject.next(this.buildRequest(options));
    });
  }

  /** Variante avec un champ de saisie texte (remplace un `prompt()` natif) :
   * résout avec le texte saisi (chaîne vide si laissé vide et non requis),
   * ou `null` si l'utilisateur annule. */
  confirmWithInput(options: ConfirmOptions & { inputField: ConfirmInputField }): Promise<string | null> {
    this.cancelPending();
    return new Promise<string | null>((resolve) => {
      this.pendingInputResolve = resolve;
      this.requestSubject.next(this.buildRequest(options));
    });
  }

  private buildRequest(options: ConfirmOptions): ConfirmRequest {
    const variant = options.variant ?? 'neutral';
    return {
      id: Math.random().toString(36).slice(2),
      title: options.title,
      message: options.message,
      detail: options.detail ?? '',
      icon: options.icon ?? DEFAULT_ICONS[variant],
      variant,
      confirmLabel: options.confirmLabel ?? 'Confirmer',
      cancelLabel: options.cancelLabel ?? 'Annuler',
      inputField: options.inputField,
    };
  }

  /** Une confirmation déjà ouverte est annulée avant d'en afficher une nouvelle. */
  private cancelPending(): void {
    this.pendingResolve?.(false);
    this.pendingResolve = undefined;
    this.pendingInputResolve?.(null);
    this.pendingInputResolve = undefined;
  }

  /** Utilisé par ConfirmDialog (le composant hôte) pour clore la boîte active. */
  resolve(result: boolean): void {
    this.pendingResolve?.(result);
    this.pendingResolve = undefined;
    this.requestSubject.next(null);
  }

  /** Utilisé par ConfirmDialog pour clore une boîte ouverte via confirmWithInput(). */
  resolveInput(result: string | null): void {
    this.pendingInputResolve?.(result);
    this.pendingInputResolve = undefined;
    this.requestSubject.next(null);
  }
}
