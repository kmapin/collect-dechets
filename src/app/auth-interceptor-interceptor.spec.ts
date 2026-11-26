import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { authInterceptorInterceptor } from './auth-interceptor-interceptor';
import { TERRITORIAL_IMPORT_RETURN_URL_KEY } from './core/territorial-import-return';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';

describe('authInterceptorInterceptor', () => {
  let router: { url: string; navigateByUrl: jasmine.Spy };

  beforeEach(() => {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem(TERRITORIAL_IMPORT_RETURN_URL_KEY);
    router = { url: '/territorial/import/draft-123/preview', navigateByUrl: jasmine.createSpy() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    });
    spyOn(console, 'error');
  });

  afterEach(() => {
    sessionStorage.removeItem(TERRITORIAL_IMPORT_RETURN_URL_KEY);
  });

  it('conserve l’aperçu territorial et propage l’erreur réseau', () => {
    const request = new HttpRequest('GET', '/api/territory/units');
    const error = new HttpErrorResponse({ status: 0, url: request.url });
    let receivedError: unknown;

    TestBed.runInInjectionContext(() =>
      authInterceptorInterceptor(request, () => throwError(() => error)).subscribe({
        error: (caught) => { receivedError = caught; },
      }),
    );

    expect(sessionStorage.getItem(TERRITORIAL_IMPORT_RETURN_URL_KEY))
      .toBe('/territorial/import/draft-123/preview');
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/indisponible');
    expect(receivedError).toBe(error);
  });

  it('ne conserve pas une route sans rapport avec l’aperçu territorial', () => {
    router.url = '/territorial/units';
    const request = new HttpRequest('GET', '/api/territory/units');
    const error = new HttpErrorResponse({ status: 503, url: request.url });

    TestBed.runInInjectionContext(() =>
      authInterceptorInterceptor(request, () => throwError(() => error)).subscribe({ error: () => undefined }),
    );

    expect(sessionStorage.getItem(TERRITORIAL_IMPORT_RETURN_URL_KEY)).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/indisponible');
  });
});
