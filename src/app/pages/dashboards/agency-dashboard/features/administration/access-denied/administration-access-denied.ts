import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Pendant de FinanceAccessDenied (financial-dashboard/features/shell/finance-access-denied/)
// — même principe : laisser le manager ENTRER dans le module plutôt que de le rediriger
// silencieusement ailleurs, et lui expliquer pourquoi il ne voit rien ici.
@Component({
  selector: 'app-administration-access-denied',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="adm-access-denied">
      <i class="material-icons" aria-hidden="true">lock</i>
      <h2>Accès restreint</h2>
      <p>Vous n'avez pas les droits nécessaires pour consulter le contenu de cette page.</p>
      <a routerLink="/dashboard/agency">Retour au tableau de bord</a>
    </div>
  `,
  styles: [`
    .adm-access-denied {
      text-align: center;
      padding: 3rem 1.5rem;
      color: #475569;
    }
    .adm-access-denied i {
      font-size: 2.5rem;
      color: #dc2626;
    }
    .adm-access-denied h2 {
      margin: 0.75rem 0 0.25rem;
      color: #1e293b;
    }
    .adm-access-denied a {
      color: #2563eb;
    }
  `],
})
export class AdministrationAccessDenied {}
