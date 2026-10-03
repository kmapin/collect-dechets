import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../../../../services/auth.service';
import { aLaPermissionAdministration } from '../models/administration-permission';
import { aLaPermissionDepuisUser } from '../../../../financial-dashboard/models';

/**
 * Garde dédiée à la sous-page roles-access, qui gère DEUX domaines de permissions
 * indépendants dans le même écran (droits financiers déplacés depuis
 * financial-dashboard/features/roles-admin/, et permissions Administration — clés
 * employees.view, employees.create, employees.update, employees.delete, roles.view,
 * roles.manage) — contrairement à administrationPermissionGuard (générique, utilisé
 * pour employees/), celle-ci laisse entrer quiconque a 'roles.view' dans L'UN OU
 * L'AUTRE système, jamais les deux exigés à la fois. L'écran lui-même masque ensuite la
 * section à laquelle l'utilisateur n'a pas droit (voir roles-access.ts, sections
 * accesFinanceDisponible / accesAdministrationDisponible) — le filtrage fin reste donc
 * réel, cette garde ne fait que décider de l'accès à la page.
 */
export const rolesAccessGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();

  if (aLaPermissionAdministration(user as any, 'roles.view') || aLaPermissionDepuisUser(user as any, 'roles.view')) {
    return true;
  }

  console.warn('Accès refusé: aucune permission roles.view (administration ou finance)');
  router.navigate(['/dashboard/agency']);
  return false;
};
