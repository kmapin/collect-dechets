import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="help-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Centre d'aide</h1>
          <p class="page-subtitle">
            Trouvez rapidement les réponses à vos questions et apprenez à utiliser WasteManager
          </p>
        </div>
      </div>

      <div class="container">
        <div class="help-content">
          <div class="help-categories">
            <div class="category-card card" *ngFor="let category of helpCategories">
              <div class="category-icon">
                <i class="material-icons">{{ category.icon }}</i>
              </div>
              <h3>{{ category.title }}</h3>
              <p>{{ category.description }}</p>
              <ul>
                <li *ngFor="let item of category.items">{{ item }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .help-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .help-categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .category-card {
      padding: 24px;
      text-align: center;
    }

    .category-icon {
      width: 60px;
      height: 60px;
      background: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: var(--white);
      font-size: 24px;
    }

    .category-card h3 {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .category-card p {
      color: var(--text-secondary);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .category-card ul {
      list-style: none;
      padding: 0;
      text-align: left;
    }

    .category-card li {
      padding: 4px 0;
      color: var(--text-secondary);
      position: relative;
      padding-left: 20px;
    }

    .category-card li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--primary-color);
      font-weight: bold;
    }
  `]
})
export class HelpComponent {
  helpCategories = [
    {
      icon: 'person',
      title: 'Compte utilisateur',
      description: 'Gestion de votre profil et paramètres',
      items: [
        'Créer un compte',
        'Modifier ses informations',
        'Réinitialiser son mot de passe',
        'Gérer ses notifications'
      ]
    },
    {
      icon: 'local_shipping',
      title: 'Collectes',
      description: 'Tout sur les collectes de déchets',
      items: [
        'Programmer une collecte',
        'Suivre ses collectes',
        'Signaler un problème',
        'Comprendre les horaires'
      ]
    },
    {
      icon: 'payment',
      title: 'Facturation',
      description: 'Paiements et abonnements',
      items: [
        'Modes de paiement',
        'Consulter ses factures',
        'Modifier son abonnement',
        'Résoudre un problème de paiement'
      ]
    }
  ];
}