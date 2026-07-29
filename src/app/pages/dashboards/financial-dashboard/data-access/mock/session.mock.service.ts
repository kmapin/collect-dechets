import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Role, Utilisateur } from '../../models';
import { SessionService, SessionUtilisateur } from '../contracts/session.service';
import { UTILISATEURS } from './data/utilisateurs.data';

const NOM_AFFICHE_PAR_ROLE: Record<Role, string> = {
  [Role.COMPTABLE]: 'Comptable (démo)',
  [Role.MANAGER_TERRAIN]: 'Manager terrain (démo)',
  [Role.ADMINISTRATEUR]: 'Administrateur (démo)',
};

function versSessionUtilisateur(utilisateur: Utilisateur): SessionUtilisateur {
  return {
    idUtilisateur: utilisateur.idUtilisateur,
    nomAffiche: NOM_AFFICHE_PAR_ROLE[utilisateur.role],
    role: utilisateur.role,
    droitsFinance: utilisateur.droitsFinance,
  };
}

@Injectable()
export class SessionMockService implements SessionService {
  // Copie mutable en mémoire — le dataset seed (data/utilisateurs.data.ts) reste en
  // lecture seule ; toute bascule de droitsFinance (F11 admin) vit ici, pas dans les data.
  private utilisateurs: Utilisateur[] = UTILISATEURS.map(u => ({ ...u }));

  // Rôle de démarrage de la démo : Comptable (accès complet), pour que le module soit
  // visible par défaut — voir shared/role-switcher pour changer de rôle.
  private readonly _currentUser$ = new BehaviorSubject<SessionUtilisateur>(
    versSessionUtilisateur(this.utilisateurs.find(u => u.role === Role.COMPTABLE) ?? this.utilisateurs[0]),
  );

  readonly currentUser$: Observable<SessionUtilisateur> = this._currentUser$.asObservable();

  getCurrentUser(): SessionUtilisateur {
    return this._currentUser$.value;
  }

  switchRole(role: Role): void {
    const utilisateur = this.utilisateurs.find(u => u.role === role) ?? this.utilisateurs[0];
    this._currentUser$.next(versSessionUtilisateur(utilisateur));
  }

  getUtilisateurs(): Observable<Utilisateur[]> {
    return of([...this.utilisateurs]);
  }

  toggleDroitsFinance(idUtilisateur: string): void {
    this.utilisateurs = this.utilisateurs.map(u =>
      u.idUtilisateur === idUtilisateur ? { ...u, droitsFinance: !u.droitsFinance } : u,
    );

    // Répercuter immédiatement si l'utilisateur actif est celui qu'on vient de modifier —
    // sinon les gardes ne verraient le changement qu'au prochain switchRole().
    const actuel = this.getCurrentUser();
    if (actuel.idUtilisateur === idUtilisateur) {
      const misAJour = this.utilisateurs.find(u => u.idUtilisateur === idUtilisateur);
      if (misAJour) this._currentUser$.next(versSessionUtilisateur(misAJour));
    }
  }

  setFinancialRole(idUtilisateur: string, role: Role | null): void {
    // Le modèle mock n'a pas de rôle opérationnel séparé : Utilisateur.role EST le rôle
    // financier ici (contrairement au backend réel où financialRole est distinct de
    // User.role). Utilisateur.role étant non-nullable dans ce modèle, `role: null` (retrait)
    // n'a pas d'équivalent démo propre — no-op dans ce cas ; le retrait fonctionne bien côté
    // Http réel (voir session.http.service.ts). Implémentation requise pour rester conforme
    // au contrat SessionService (pas encore branchée sur un contrôle UI dans roles-admin —
    // disponible si besoin).
    if (!role) return;

    this.utilisateurs = this.utilisateurs.map(u =>
      u.idUtilisateur === idUtilisateur ? { ...u, role, droitsFinance: true } : u,
    );

    const actuel = this.getCurrentUser();
    if (actuel.idUtilisateur === idUtilisateur) {
      const misAJour = this.utilisateurs.find(u => u.idUtilisateur === idUtilisateur);
      if (misAJour) this._currentUser$.next(versSessionUtilisateur(misAJour));
    }
  }
}
