import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Role, Utilisateur } from '../../models';
import { SessionService, SessionUtilisateur } from '../contracts/session.service';
import { mapSessionUtilisateurDto, mapUtilisateurDto } from './mappers/session.mapper';

// Traduction inverse de FINANCIAL_ROLE_TO_FRONTEND (backend, services/financeUsers.js) :
// l'enum frontend Role (PascalCase) doit repartir en snake_case attendu par le backend.
const ROLE_TO_BACKEND: Record<Role, 'comptable' | 'manager_terrain' | 'administrateur'> = {
  [Role.COMPTABLE]: 'comptable',
  [Role.MANAGER_TERRAIN]: 'manager_terrain',
  [Role.ADMINISTRATEUR]: 'administrateur',
};

// Squelette inerte (Prompt 17) — voir client-data.http.service.ts pour la note complète
// sur le branchement DI et INTEGRATION.md pour la liste des endpoints.
//
// switchRole() n'a pas d'équivalent réel : une fois branché sur un vrai backend, le rôle
// vient de l'authentification serveur (JWT/session), pas d'un sélecteur de démo — la
// méthode est conservée pour satisfaire le contrat mais ne fait rien.
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

  switchRole(_role: Role): void {
    // Pas d'équivalent réel — voir note de classe ci-dessus.
  }

  getUtilisateurs(): Observable<Utilisateur[]> {
    // GET /finance/session/utilisateurs (F11 admin)
    return this.http.get<unknown[]>(`${this.base}/utilisateurs`).pipe(map(items => items.map(mapUtilisateurDto)));
  }

  toggleDroitsFinance(idUtilisateur: string): void {
    // PATCH /finance/session/utilisateurs/:idUtilisateur/droits-finance
    this.http.patch(`${this.base}/utilisateurs/${idUtilisateur}/droits-finance`, {}).subscribe();
  }

  setFinancialRole(idUtilisateur: string, role: Role | null): void {
    // PATCH /finance/session/utilisateurs/:idUtilisateur/financial-role { financialRole }
    const financialRole = role ? ROLE_TO_BACKEND[role] : null;
    this.http.patch(`${this.base}/utilisateurs/${idUtilisateur}/financial-role`, { financialRole }).subscribe();
  }
}
