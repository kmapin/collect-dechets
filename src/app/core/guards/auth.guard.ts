import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { UserRole } from "../../models/user.model";
import { dashboardRouteForRole, PLANNING_DETAIL_ROLES } from "../../shared/notification-route.util";
import { map } from "rxjs";


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
