import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
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
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptorInterceptor])
    ),
    // `darkModeSelector` vaut "system" par défaut côté PrimeNG (@primeuix/styled) —
    // chaque composant PrimeNG (p-table, p-select, p-dialog...) bascule alors seul
    // sur sa palette sombre dès que l'OS/navigateur du visiteur est en mode sombre
    // (media query prefers-color-scheme), sans aucun rapport avec le reste de l'app
    // (Angular Material est explicitement forcé à `color-scheme: light` dans
    // styles.scss, tout le CSS custom est en dur clair) — d'où des sections
    // PrimeNG isolées en sombre au milieu d'une page claire, jamais un choix
    // voulu. `false` fige tout composant PrimeNG en clair, comme le reste de l'app.
    providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: false } } }),
    MessageService,
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
}).catch(err => console.error(err));
