import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { UserRole } from "../../models/user.model";
import { map } from "rxjs";

/**
 * Réserve l'écran de configuration des frais plateforme au Super Admin (Prompt
 * F2/F8 : "configuration par admin seul", plateforme-wide, jamais une agence).
 *
 * Écrit à la main plutôt que de réutiliser `adminGuard` (core/guards/auth.guard.ts) :
 * ce dernier a un bug de court-circuit — `if (isAuth) return true;` avant même de
 * vérifier le rôle — qui laisse passer N'IMPORTE QUEL utilisateur authentifié,
 * pas seulement super_admin (constaté en lisant son code, pas corrigé ici : ce
 * bug affecte aussi adminOrManagerGuard/managerGuard/municipalityGuard sur des
 * routes déjà en prod, hors du périmètre de ce chantier Frais — signalé au
 * rapport plutôt que corrigé silencieusement).
 */
export const feeConfigAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth && authService.hasRole(UserRole.SUPER_ADMIN)) {
        return true;
      }

      console.warn("Accès refusé: configuration des frais plateforme réservée au Super Admin");
      router.navigate(["/login"]);
      return false;
    }),
  );
};
