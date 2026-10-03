import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';

export interface UtilisateurAdministration {
  idUtilisateur: string;
  identifiants: string;
  role: string;
  permissions: string[];
}

/**
 * Service plat et directement injecté (pas de couche data-access/contracts/tokens comme
 * financial-dashboard) — un seul consommateur (roles-access/) pour deux endpoints, le
 * pattern plus lourd de finance n'apporte rien ici. Appelle /api/administration/session/*
 * (voir backend routes/administrationUsersRoute.js) — endpoints distincts de
 * /api/finance/session/*, catalogue de permissions indépendant.
 */
@Injectable({ providedIn: 'root' })
export class AdministrationUsersService {
  constructor(private http: HttpClient) {}

  getUtilisateurs(): Observable<UtilisateurAdministration[]> {
    return this.http.get<UtilisateurAdministration[]>(`${environment.apiUrl}/administration/session/utilisateurs`);
  }

  setPermissions(idUtilisateur: string, permissions: string[]): Observable<UtilisateurAdministration> {
    return this.http.patch<UtilisateurAdministration>(
      `${environment.apiUrl}/administration/session/utilisateurs/${idUtilisateur}/permissions`,
      { permissions },
    );
  }
}
