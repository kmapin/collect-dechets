import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="terms-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Conditions d'Utilisation</h1>
          <p class="page-subtitle">
            Dernière mise à jour : {{ lastUpdated | date:'dd/MM/yyyy' }}
          </p>
        </div>
      </div>

      <div class="container">
        <div class="terms-content card">
          <section>
            <h2>1. Acceptation des conditions</h2>
            <p>
              En utilisant WasteManager, vous acceptez d'être lié par ces conditions d'utilisation.
            </p>
          </section>

          <section>
            <h2>2. Services fournis</h2>
            <p>
              WasteManager est une plateforme de gestion de collecte de déchets qui connecte 
              les clients aux agences de collecte.
            </p>
          </section>

          <section>
            <h2>3. Responsabilités de l'utilisateur</h2>
            <p>
              Vous vous engagez à fournir des informations exactes et à respecter 
              les consignes de tri et de présentation des déchets.
            </p>
          </section>

          <section>
            <h2>4. Limitation de responsabilité</h2>
            <p>
              WasteManager ne peut être tenu responsable des retards ou problèmes 
              de collecte dus à des circonstances indépendantes de notre volonté.
            </p>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .terms-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .terms-content {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }

    .terms-content section {
      margin-bottom: 32px;
    }

    .terms-content h2 {
      color: var(--primary-color);
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .terms-content p {
      color: var(--text-secondary);
      line-height: 1.6;
    }
  `]
})
export class TermsComponent {
  lastUpdated = new Date();
}