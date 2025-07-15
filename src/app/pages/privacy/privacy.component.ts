import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="privacy-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Politique de Confidentialité</h1>
          <p class="page-subtitle">
            Dernière mise à jour : {{ lastUpdated | date:'dd/MM/yyyy' }}
          </p>
        </div>
      </div>

      <div class="container">
        <div class="privacy-content card">
          <section>
            <h2>1. Collecte des données</h2>
            <p>
              Nous collectons les informations que vous nous fournissez directement, 
              telles que vos informations de contact et d'adresse pour la collecte des déchets.
            </p>
          </section>

          <section>
            <h2>2. Utilisation des données</h2>
            <p>
              Vos données sont utilisées pour fournir nos services de gestion de collecte, 
              traiter vos paiements et améliorer notre plateforme.
            </p>
          </section>

          <section>
            <h2>3. Protection des données</h2>
            <p>
              Nous mettons en place des mesures de sécurité appropriées pour protéger 
              vos informations personnelles contre tout accès non autorisé.
            </p>
          </section>

          <section>
            <h2>4. Vos droits</h2>
            <p>
              Vous avez le droit d'accéder, de modifier ou de supprimer vos données personnelles. 
              Contactez-nous pour exercer ces droits.
            </p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .privacy-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .privacy-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }

    .privacy-content section {
      margin-bottom: 32px;
    }

    .privacy-content h2 {
      color: var(--primary-color);
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .privacy-content p {
      color: var(--text-secondary);
      line-height: 1.6;
    }
  `]
})
export class PrivacyComponent {
  lastUpdated = new Date();
}