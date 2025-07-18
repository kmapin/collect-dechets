import {HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

export const authInterceptorInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>>  => {
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    const parsedUser = JSON.parse(currentUser);
    req = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${parsedUser?.token}`),
    });
  }
  return next(req).pipe(
    
  );
};
