import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Cible de redirection de finance-access.guard.ts — jamais elle-même gardée, pour éviter
// une boucle de redirection.
@Component({
  selector: 'app-finance-access-denied',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="fin-access-denied">
      <i class="material-icons" aria-hidden="true">lock</i>
      <h2>Accès restreint</h2>
      <p>Votre rôle actuel n'a pas accès aux données financières de l'agence (RG8).</p>
      <a routerLink="/">Retour à l'accueil</a>
    </div>
  `,
  styles: [`
    .fin-access-denied {
      text-align: center;
      padding: 3rem 1.5rem;
      color: #475569;
    }
    .fin-access-denied i {
      font-size: 2.5rem;
      color: #dc2626;
    }
    .fin-access-denied h2 {
      margin: 0.75rem 0 0.25rem;
      color: #1e293b;
    }
    .fin-access-denied a {
      color: #2563eb;
    }
  `],
})
export class FinanceAccessDenied {}
