import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { UserRole } from "../../models/user.model";
import { map } from "rxjs";

/**
 * Guard pour vérifier que l'utilisateur est authentifié
 */

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth) return true;

      console.warn("Accès refusé: Authentification requise");
      router.navigate(["/login"]);
      return false;
    }),
  );
};

/**
 * Guard pour les utilisateurs (USER minimum)
 */
export const clientGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasMinimumRole(UserRole.CLIENT)) {
    return true;
  }

  console.warn("Accès refusé: Rôle USER requis");
  router.navigate(["/"]);
  return false;
};

/**
 * Guard pour les managers (MANAGER minimum)
 */
export const managerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasMinimumRole(UserRole.MANAGER)) {
    return true;
  }

  console.warn("Accès refusé: Rôle MANAGER requis");
  router.navigate(["/"]);
  return false;
};

/**
 * Guard pour les administrateurs (ADMIN requis)
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole(UserRole.SUPER_ADMIN)) {
    return true;
  }

  console.warn("Accès refusé: Rôle ADMIN requis");
  router.navigate(["/"]);
  return false;
};

export const municipalityGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);


  if (authService.hasMinimumRole(UserRole.MUNICIPALITY)) {
    return true;
  }

  console.warn("Accès refusé: Rôle USER requis");
  router.navigate(["/"]);
  return false;
};

export const adminOrManagerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);


  if (authService.hasMinimumRole(UserRole.MANAGER)) {
    return true;
  }

  if (authService.hasRole(UserRole.SUPER_ADMIN)) {
    return true;
  }

  console.warn("Accès refusé: Rôle ADMIN ou MANAGER requis");
  router.navigate(["/"]);
  return false;
};
