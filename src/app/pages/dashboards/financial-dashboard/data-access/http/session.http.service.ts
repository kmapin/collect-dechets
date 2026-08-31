import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { FinancePermission, Role, Utilisateur } from '../../models';
import { SessionService, SessionUtilisateur } from '../contracts/session.service';
import { mapSessionUtilisateurDto, mapUtilisateurDto } from './mappers/session.mapper';

// Traduction inverse de FINANCIAL_ROLE_TO_FRONTEND (backend, services/financeUsers.js) :
// l'enum frontend Role (PascalCase) doit repartir en snake_case attendu par le backend.
const ROLE_TO_BACKEND: Record<Role, 'comptable' | 'manager_terrain' | 'administrateur'> = {
  [Role.COMPTABLE]: 'comptable',
  [Role.MANAGER_TERRAIN]: 'manager_terrain',
  [Role.ADMINISTRATEUR]: 'administrateur',
};

// Voir client-data.http.service.ts pour la note complète sur le branchement DI et
// INTEGRATION.md pour la liste des endpoints.
@Injectable()
export class SessionHttpService implements SessionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/finance/session`;

  private readonly _currentUser$ = new BehaviorSubject<SessionUtilisateur | null>(null);
  readonly currentUser$: Observable<SessionUtilisateur> = this._currentUser$.pipe(
    filter((u): u is SessionUtilisateur => u !== null),
  );

  constructor() {
    // GET /finance/session/moi — session réelle chargée une fois au démarrage du module.
    this.http
      .get<unknown>(`${this.base}/moi`)
      .pipe(map(mapSessionUtilisateurDto))
      .subscribe(utilisateur => this._currentUser$.next(utilisateur));
  }

  getCurrentUser(): SessionUtilisateur {
    const utilisateur = this._currentUser$.value;
    if (!utilisateur) throw new Error('Session non encore chargée (GET /finance/session/moi).');
    return utilisateur;
  }

  getUtilisateurs(): Observable<Utilisateur[]> {
    // GET /finance/session/utilisateurs (F11 admin)
    return this.http.get<unknown[]>(`${this.base}/utilisateurs`).pipe(map(items => items.map(mapUtilisateurDto)));
  }

  toggleDroitsFinance(idUtilisateur: string): Observable<Utilisateur> {
    // PATCH /finance/session/utilisateurs/:idUtilisateur/droits-finance
    return this.http.patch<unknown>(`${this.base}/utilisateurs/${idUtilisateur}/droits-finance`, {}).pipe(
      map(mapUtilisateurDto),
      tap(() => this._rafraichirSiSessionCourante(idUtilisateur)),
    );
  }

  setFinancialRole(idUtilisateur: string, role: Role | null): Observable<Utilisateur> {
    // PATCH /finance/session/utilisateurs/:idUtilisateur/financial-role { financialRole }
    const financialRole = role ? ROLE_TO_BACKEND[role] : null;
    return this.http.patch<unknown>(`${this.base}/utilisateurs/${idUtilisateur}/financial-role`, { financialRole }).pipe(
      map(mapUtilisateurDto),
      tap(() => this._rafraichirSiSessionCourante(idUtilisateur)),
    );
  }

  setPermissions(idUtilisateur: string, permissions: FinancePermission[]): Observable<Utilisateur> {
    // PATCH /finance/session/utilisateurs/:idUtilisateur/permissions { permissions }
    return this.http.patch<unknown>(`${this.base}/utilisateurs/${idUtilisateur}/permissions`, { permissions }).pipe(
      map(mapUtilisateurDto),
      tap(() => this._rafraichirSiSessionCourante(idUtilisateur)),
    );
  }

  // RG8 : si l'utilisateur modifié est celui de la session active, ses onglets/gardes
  // doivent refléter le changement immédiatement, sans rechargement de page — re-fetch de
  // /moi plutôt qu'une reconstruction locale du DTO (source de vérité unique, évite un
  // écart si le backend applique une règle non répliquée côté client, ex. préréglage de rôle).
  private _rafraichirSiSessionCourante(idUtilisateur: string): void {
    if (this._currentUser$.value?.idUtilisateur !== idUtilisateur) return;
    this.http
      .get<unknown>(`${this.base}/moi`)
      .pipe(map(mapSessionUtilisateurDto))
      .subscribe(utilisateur => this._currentUser$.next(utilisateur));
  }
}
