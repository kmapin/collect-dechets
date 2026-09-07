import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { UserRole } from "../../models/user.model";
import { dashboardRouteForRole, PLANNING_DETAIL_ROLES } from "../../shared/notification-route.util";
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

  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth) return true;
      if (authService.hasMinimumRole(UserRole.CLIENT)) {
        return true;
      }
      console.warn("Accès refusé: Authentification requise");
      router.navigate(["/login"]);
      return false;
    }),
  );
};

/**
 * Guard pour les managers (MANAGER minimum)
 */
export const managerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth) return true;
      if (authService.hasMinimumRole(UserRole.MANAGER)) {
        return true;
      }

      console.warn("Accès refusé: Rôle MANAGER requis");
      router.navigate(["/login"]);
      return false;
    }),
  );
};

/**
 * Guard pour les administrateurs (ADMIN requis)
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth) return true;
      if (authService.hasRole(UserRole.SUPER_ADMIN)) {
        return true;
      }

      console.warn("Accès refusé: Rôle ADMIN requis");
      router.navigate(["/login"]);
      return false;
    }),
  );
};

export const municipalityGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth) return true;
      if (authService.hasMinimumRole(UserRole.MUNICIPALITY)) {
        return true;
      }

      console.warn("Accès refusé: Rôle USER requis");
      router.navigate(["/login"]);
      return false;
    }),
  );
};

/**
 * Guard inverse d'authGuard : un utilisateur déjà connecté ne doit plus pouvoir
 * revenir sur une page publique d'authentification (login) — que ce soit via une
 * URL tapée directement ou via le bouton "précédent" du navigateur, qui redéclenche
 * bien la résolution des guards Angular Router (popstate est intercepté comme
 * n'importe quelle navigation). Redirige vers le dashboard de son rôle, jamais vers
 * la page de connexion.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (!isAuth) return true;

      const role = authService.getCurrentUser()?.role;
      let dashboardRoute = '/';
      switch (role) {
        case UserRole.CLIENT: dashboardRoute = '/dashboard/client'; break;
        case UserRole.MANAGER: dashboardRoute = '/dashboard/agency'; break;
        case UserRole.COLLECTOR: dashboardRoute = '/dashboard/collector'; break;
        case UserRole.MUNICIPALITY: dashboardRoute = '/dashboard/municipality'; break;
        case UserRole.SUPER_ADMIN: dashboardRoute = '/dashboard/admin'; break;
      }

      router.navigate([dashboardRoute], { replaceUrl: true });
      return false;
    }),
  );
};

export const adminOrManagerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuthenticated$.pipe(
    map((isAuth) => {
      if (isAuth) return true;

      if (authService.hasMinimumRole(UserRole.MANAGER)) {
        return true;
      }

      if (authService.hasRole(UserRole.SUPER_ADMIN)) {
        return true;
      }

      console.warn("Accès refusé: Rôle ADMIN ou MANAGER requis");
      router.navigate(["/login"]);
      return false;
    }),
  );
};

/**
 * Guard pour /planning/detail/:id — réservé au personnel qui opère réellement le
 * planning (manager/collecteur) : cette page expose des actions de gestion
 * (démarrer/annuler/réaffecter) et la position exacte de chaque client. super_admin,
 * municipality et client n'y ont pas accès — ils obtiennent un résumé en lecture
 * seule (drawer) au clic sur une notification ou un lien "Lié à une collecte" à la
 * place — voir notification-route.util.ts::PLANNING_DETAIL_ROLES, UNIQUE source de
 * vérité pour cette liste de rôles (réutilisée ici, jamais redéfinie), et
 * planning-summary-drawer.ts.
 *
 * Contrairement aux guards ci-dessus, le rôle est vérifié explicitement — un
 * utilisateur authentifié mais du mauvais rôle est redirigé vers SON tableau de
 * bord (jamais laissé passer, jamais renvoyé au login puisqu'il est bien connecté).
 */
export const agencyStaffOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getCurrentUser();

  if (!user) {
    router.navigate(["/login"]);
    return false;
  }
  if (user.role && PLANNING_DETAIL_ROLES.has(user.role)) {
    return true;
  }

  console.warn("Accès refusé: page réservée au personnel de l'agence (manager/collecteur)");
  router.navigate([dashboardRouteForRole(user.role)]);
  return false;
};
