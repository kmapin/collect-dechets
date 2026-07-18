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
}
