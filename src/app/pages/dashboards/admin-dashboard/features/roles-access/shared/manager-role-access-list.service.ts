import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Admin } from '../../../../../../services/admin';
import { FinancePermission } from '../../../../financial-dashboard/models';
import { AdministrationPermission } from '../../../../agency-dashboard/features/administration/models/administration-permission';
import { FINANCIAL_ROLE_BACKEND_VERS_FRONTEND, ManagerRoleAccess } from './manager-role-access.model';

/**
 * Source de liste partagée par AdminFinanceAccess et AdminAdministrationPermissions (les
 * deux onglets Droits financiers / Permissions Administration du dashboard super_admin) —
 * un seul appel GET /api/users?role=manager suffit aux deux domaines (le document renvoie
 * déjà financialRole/droitsFinance/financePermissions/administrationPermissions), extrait
 * ici pour ne pas dupliquer le chargement+mapping+tri dans chaque composant.
 */
@Injectable({ providedIn: 'root' })
export class ManagerRoleAccessListService {
  private readonly adminService = inject(Admin);

  charger(): Observable<ManagerRoleAccess[]> {
    return this.adminService.getAllUsers({ role: 'manager', page: 1, limit: 1000 }).pipe(
      map((reponse: any) => {
        const bruts: any[] = reponse?.data ?? [];
        return bruts
          .map((u) => ({
            idUtilisateur: u._id,
            identifiants: `${u.firstName} ${u.lastName}`,
            agencyId: u.agencyId || '',
            agenceNom: u.agency?.name || '—',
            financialRole: u.financialRole ? FINANCIAL_ROLE_BACKEND_VERS_FRONTEND[u.financialRole] ?? null : null,
            droitsFinance: !!u.droitsFinance,
            financePermissions: (u.financePermissions || []) as FinancePermission[],
            administrationPermissions: (u.administrationPermissions || []) as AdministrationPermission[],
          }))
          .sort((a: ManagerRoleAccess, b: ManagerRoleAccess) => a.identifiants.localeCompare(b.identifiants));
      }),
    );
  }
}
