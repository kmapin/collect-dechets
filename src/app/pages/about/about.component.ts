import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="about-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">À propos de WasteManager</h1>
          <p class="page-subtitle">
            Découvrez notre mission, nos valeurs et notre engagement pour un environnement plus propre
          </p>
        </div>
      </div>

      <div class="container">
        <div class="about-content">
          <section class="mission-section card">
            <h2>Notre Mission</h2>
            <p>
              WasteManager révolutionne la gestion des déchets en connectant clients, agences de collecte 
              et autorités municipales sur une plateforme unique et intuitive. Notre objectif est de 
              simplifier les processus, optimiser les collectes et contribuer à un environnement plus propre.
            </p>
          </section>

          <section class="values-section card">
            <h2>Nos Valeurs</h2>
            <div class="values-grid">
              <div class="value-item">
                <i class="material-icons">eco</i>
                <h3>Écologie</h3>
                <p>Promouvoir des pratiques durables et respectueuses de l'environnement</p>
              </div>
              <div class="value-item">
                <i class="material-icons">innovation</i>
                <h3>Innovation</h3>
                <p>Utiliser la technologie pour améliorer la gestion des déchets</p>
              </div>
              <div class="value-item">
                <i class="material-icons">people</i>
                <h3>Communauté</h3>
                <p>Rassembler tous les acteurs pour un objectif commun</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .about-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .about-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .mission-section,
    .values-section {
      margin-bottom: 32px;
      padding: 32px;
    }

    .values-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }

    .value-item {
      text-align: center;
    }

    .value-item i {
      font-size: 48px;
      color: var(--primary-color);
      margin-bottom: 16px;
    }

    .value-item h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .value-item p {
      color: var(--text-secondary);
      line-height: 1.5;
    }
  `]
})
export class AboutComponent {
}