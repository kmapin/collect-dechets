import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
// eslint-disable-next-line @typescript-eslint/no-deprecated
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptorInterceptor } from './app/auth-interceptor-interceptor';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';

registerLocaleData(localeFr);
registerLocaleData(localeFr, 'fr-FR');

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),   // requis par PrimeNG (p-dialog, p-toast, etc.)
    provideZoneChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptorInterceptor])
    ),
    providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: false } } }),
    MessageService,
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
}).catch(err => console.error(err));
