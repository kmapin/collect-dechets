import {HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { NotificationService } from './services/notification.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authInterceptorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>>  => {
  const notificationService = inject(NotificationService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const currentUser = localStorage.getItem('currentUser');
  const NOTIFICATION_DURATION = 5 * 1000;
  if (currentUser) {
    const parsedUser = JSON.parse(currentUser);
    req = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${parsedUser?.token}`),
    });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error("[JWTI-ERROR] ", error)

      // if (error.status === 408 || error.status === 401 || error.status === 403) {
      if (error.status === 401 || error.status === 403) {
        notificationService.showSuccess("Deconnexion","Votre session a expiré, Vous allez être déconnecté dans quelques instants");
        setTimeout(() => {
          localStorage.removeItem('currentUser');
          authService.logout();
          window.location.reload();
          router.navigate(['/login']);
        }, NOTIFICATION_DURATION);
      }

      return throwError(() => error);
    })
  );
};
