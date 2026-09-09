import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { UserRole } from "../../models/user.model";
import { map } from "rxjs";

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
