import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface WasteType {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  instructions: string[];
  acceptedItems: string[];
  rejectedItems: string[];
  tips: string[];
  frequency: string;
  binColor: string;
}

@Component({
  selector: 'app-waste-types',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="waste-types-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Types de Déchets</h1>
          <p class="page-subtitle">
            Guide complet pour le tri et la gestion de vos déchets. Apprenez à identifier, 
            trier et présenter correctement chaque type de déchet pour une collecte efficace 
            et respectueuse de l'environnement.
          </p>
        </div>
      </div>

      <div class="container">
        <!-- Navigation par catégories -->
        <div class="categories-nav">
          <button 
            *ngFor="let category of categories" 
            class="category-btn"
            [class.active]="selectedCategory === category.id"
            (click)="selectCategory(category.id)">
            <i class="material-icons">{{ category.icon }}</i>
            <span>{{ category.name }}</span>
          </button>
        </div>

        <!-- Types de déchets -->
        <div class="waste-types-grid">
          <div *ngFor="let wasteType of getFilteredWasteTypes()" class="waste-type-card card">
            <div class="waste-type-header" [style.background-color]="wasteType.color">
              <div class="waste-type-icon">
                <i class="material-icons">{{ wasteType.icon }}</i>
              </div>
              <div class="waste-type-info">
                <h3 class="waste-type-name">{{ wasteType.name }}</h3>
                <p class="waste-type-description">{{ wasteType.description }}</p>
              </div>
              <div class="bin-indicator">
                <div class="bin-icon" [style.background-color]="wasteType.binColor">
                  <i class="material-icons">delete</i>
                </div>
                <span class="bin-label">Bac {{ getBinColorName(wasteType.binColor) }}</span>
              </div>
            </div>

            <div class="waste-type-content">
              <div class="content-section">
                <h4 class="section-title">
                  <i class="material-icons">rule</i>
                  Instructions de tri
                </h4>
                <ul class="instructions-list">
                  <li *ngFor="let instruction of wasteType.instructions">{{ instruction }}</li>
                </ul>
              </div>

              <div class="content-section">
                <h4 class="section-title">
                  <i class="material-icons">check_circle</i>
                  Accepté
                </h4>
                <div class="items-grid accepted">
                  <span *ngFor="let item of wasteType.acceptedItems" class="item-tag accepted">
                    {{ item }}
                  </span>
                </div>
              </div>

              <div class="content-section">
                <h4 class="section-title">
                  <i class="material-icons">cancel</i>
                  Refusé
                </h4>
                <div class="items-grid rejected">
                  <span *ngFor="let item of wasteType.rejectedItems" class="item-tag rejected">
                    {{ item }}
                  </span>
                </div>
              </div>

              <div class="content-section">
                <h4 class="section-title">
                  <i class="material-icons">lightbulb</i>
                  Conseils pratiques
                </h4>
                <ul class="tips-list">
                  <li *ngFor="let tip of wasteType.tips">{{ tip }}</li>
                </ul>
              </div>

              <div class="collection-info">
                <div class="collection-frequency">
                  <i class="material-icons">schedule</i>
                  <span>Collecte {{ wasteType.frequency }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section informations générales -->
        <div class="general-info-section">
          <h2 class="section-title">Informations Générales</h2>
          
          <div class="info-cards-grid">
            <div class="info-card card">
              <div class="info-icon">
                <i class="material-icons">schedule</i>
              </div>
              <h3>Horaires de Sortie</h3>
              <ul>
                <li>Sortir les bacs la veille au soir après 19h</li>
                <li>Ou le matin avant 7h le jour de collecte</li>
                <li>Rentrer les bacs dans les 24h après collecte</li>
                <li>Respecter les jours fériés (pas de collecte)</li>
              </ul>
            </div>

            <div class="info-card card">
              <div class="info-icon">
                <i class="material-icons">place</i>
              </div>
              <h3>Emplacement des Bacs</h3>
              <ul>
                <li>Placer devant votre domicile, côté rue</li>
                <li>Laisser 50cm entre chaque bac</li>
                <li>Éviter les obstacles (voitures, poteaux)</li>
                <li>Couvercle bien fermé et orienté vers la rue</li>
              </ul>
            </div>

            <div class="info-card card">
              <div class="info-icon">
                <i class="material-icons">cleaning_services</i>
              </div>
              <h3>Entretien des Bacs</h3>
              <ul>
                <li>Nettoyer régulièrement avec de l'eau</li>
                <li>Utiliser du vinaigre blanc pour désinfecter</li>
                <li>Éviter les produits chimiques agressifs</li>
                <li>Signaler tout dommage à votre agence</li>
              </ul>
            </div>

            <div class="info-card card">
              <div class="info-icon">
                <i class="material-icons">report_problem</i>
              </div>
              <h3>Que Faire en Cas de Problème</h3>
              <ul>
                <li>Collecte manquée : signaler dans les 48h</li>
                <li>Bac endommagé : demander un remplacement</li>
                <li>Refus de collecte : vérifier le tri</li>
                <li>Contacter votre agence pour toute question</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Section réglementation -->
        <div class="regulations-section">
          <h2 class="section-title">Réglementation et Sanctions</h2>
          
          <div class="regulations-content card">
            <div class="regulation-item">
              <div class="regulation-icon warning">
                <i class="material-icons">warning</i>
              </div>
              <div class="regulation-content">
                <h4>Tri Incorrect</h4>
                <p>Le non-respect des consignes de tri peut entraîner le refus de collecte. 
                   Les bacs mal triés seront étiquetés et laissés sur place.</p>
              </div>
            </div>

            <div class="regulation-item">
              <div class="regulation-icon error">
                <i class="material-icons">gavel</i>
              </div>
              <div class="regulation-content">
                <h4>Sanctions Municipales</h4>
                <p>Les infractions répétées peuvent faire l'objet d'amendes de 35€ à 150€ 
                   selon la gravité (dépôt sauvage, non-respect des horaires, etc.).</p>
              </div>
            </div>

            <div class="regulation-item">
              <div class="regulation-icon success">
                <i class="material-icons">eco</i>
              </div>
              <div class="regulation-content">
                <h4>Bonne Pratique Récompensée</h4>
                <p>Les foyers exemplaires dans le tri peuvent bénéficier de réductions 
                   sur leur facture de collecte et d'avantages auprès de leur agence.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .waste-types-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .categories-nav {
      display: flex;
      gap: 12px;
      margin-bottom: 32px;
      padding: 0 8px;
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .category-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--white);
      border: 2px solid var(--medium-gray);
      border-radius: 25px;
      color: var(--text-primary);
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
      font-weight: 500;
    }

    .category-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .category-btn.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--white);
    }

    .waste-types-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }

    .waste-type-card {
      padding: 0;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .waste-type-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-strong);
    }

    .waste-type-header {
      padding: 20px;
      color: var(--white);
      display: flex;
      align-items: center;
      gap: 16px;
      position: relative;
    }

    .waste-type-icon {
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .waste-type-info {
      flex: 1;
    }

    .waste-type-name {
      font-size: 1.4rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .waste-type-description {
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .bin-indicator {
      text-align: center;
    }

    .bin-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 4px;
      color: var(--white);
    }

    .bin-label {
      font-size: 0.8rem;
      opacity: 0.9;
    }

    .waste-type-content {
      padding: 24px;
    }

    .content-section {
      margin-bottom: 24px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .section-title i {
      font-size: 20px;
    }

    .instructions-list,
    .tips-list {
      list-style: none;
      padding: 0;
    }

    .instructions-list li,
    .tips-list li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .instructions-list li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: var(--primary-color);
      font-weight: bold;
    }

    .tips-list li::before {
      content: '💡';
      position: absolute;
      left: 0;
    }

    .items-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .item-tag {
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .item-tag.accepted {
      background: #e8f5e8;
      color: var(--success-color);
      border: 1px solid #c8e6c9;
    }

    .item-tag.rejected {
      background: #ffebee;
      color: var(--error-color);
      border: 1px solid #ffcdd2;
    }

    .collection-info {
      background: var(--light-gray);
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }

    .collection-frequency {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      font-weight: 500;
    }

    .general-info-section,
    .regulations-section {
      margin-top: 48px;
    }

    .general-info-section .section-title,
    .regulations-section .section-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 24px;
      color: var(--text-primary);
      text-align: center;
    }

    .info-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .info-card {
      padding: 24px;
      text-align: center;
    }

    .info-icon {
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

    .info-card h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .info-card ul {
      list-style: none;
      padding: 0;
      text-align: left;
    }

    .info-card li {
      padding: 6px 0;
      color: var(--text-secondary);
      position: relative;
      padding-left: 20px;
    }

    .info-card li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--primary-color);
      font-weight: bold;
    }

    .regulations-content {
      padding: 32px;
    }

    .regulation-item {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--medium-gray);
    }

    .regulation-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .regulation-icon {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      font-size: 24px;
      flex-shrink: 0;
    }

    .regulation-icon.warning {
      background: var(--warning-color);
      color: var(--text-primary);
    }

    .regulation-icon.error {
      background: var(--error-color);
    }

    .regulation-icon.success {
      background: var(--success-color);
    }

    .regulation-content h4 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .regulation-content p {
      color: var(--text-secondary);
      line-height: 1.6;
    }

    @media (max-width: 768px) {
      .waste-types-grid {
        grid-template-columns: 1fr;
      }

      .info-cards-grid {
        grid-template-columns: 1fr;
      }

      .waste-type-header {
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }

      .regulation-item {
        flex-direction: column;
        text-align: center;
      }

      .categories-nav {
        justify-content: center;
        flex-wrap: wrap;
      }
    }
  `]
})
export class WasteTypesComponent implements OnInit {
  selectedCategory = 'all';

  categories = [
    { id: 'all', name: 'Tous', icon: 'category' },
    { id: 'household', name: 'Ménagers', icon: 'home' },
    { id: 'recyclable', name: 'Recyclables', icon: 'recycling' },
    { id: 'organic', name: 'Organiques', icon: 'eco' },
    { id: 'hazardous', name: 'Dangereux', icon: 'warning' }
  ];

  wasteTypes: WasteType[] = [
    {
      id: '1',
      name: 'Déchets Ménagers',
      description: 'Déchets non recyclables du quotidien',
      icon: 'delete',
      color: '#4caf50',
      binColor: '#4caf50',
      frequency: 'hebdomadaire',
      instructions: [
        'Placer dans le bac vert avec couvercle bien fermé',
        'Sortir la veille au soir ou le matin avant 7h',
        'Utiliser des sacs plastiques fermés',
        'Ne pas dépasser le niveau du bac'
      ],
      acceptedItems: [
        'Épluchures de légumes', 'Restes alimentaires', 'Papiers souillés',
        'Mouchoirs usagés', 'Litière de chat', 'Couches', 'Emballages non recyclables'
      ],
      rejectedItems: [
        'Verre', 'Métaux', 'Plastiques recyclables', 'Papiers propres',
        'Déchets dangereux', 'Électronique', 'Piles'
      ],
      tips: [
        'Composter les déchets organiques si possible',
        'Réduire les emballages à la source',
        'Nettoyer le bac régulièrement',
        'Éviter les liquides dans le bac'
      ]
    },
    {
      id: '2',
      name: 'Recyclables',
      description: 'Plastiques, papiers, cartons et métaux',
      icon: 'recycling',
      color: '#2196f3',
      binColor: '#ffeb3b',
      frequency: 'bi-hebdomadaire',
      instructions: [
        'Placer dans le bac jaune',
        'Rincer les contenants avant tri',
        'Ne pas imbriquer les emballages',
        'Retirer les bouchons et couvercles'
      ],
      acceptedItems: [
        'Bouteilles plastiques', 'Flacons de shampoing', 'Boîtes de conserve',
        'Canettes', 'Journaux', 'Magazines', 'Cartons', 'Briques alimentaires'
      ],
      rejectedItems: [
        'Plastiques noirs', 'Papiers gras', 'Verre', 'Polystyrène',
        'Films plastiques', 'Papiers peints', 'Cartons souillés'
      ],
      tips: [
        'Vider complètement les contenants',
        'Plier les cartons pour gagner de la place',
        'Séparer les différents matériaux',
        'Consulter les symboles de recyclage'
      ]
    },
    {
      id: '3',
      name: 'Verre',
      description: 'Bouteilles, pots et bocaux en verre',
      icon: 'wine_bar',
      color: '#4caf50',
      binColor: '#4caf50',
      frequency: 'mensuelle',
      instructions: [
        'Déposer dans les conteneurs verts',
        'Retirer bouchons et couvercles',
        'Vider complètement les contenants',
        'Ne pas casser le verre'
      ],
      acceptedItems: [
        'Bouteilles de vin', 'Bouteilles de bière', 'Pots de confiture',
        'Bocaux de conserve', 'Flacons de parfum', 'Bouteilles d\'huile'
      ],
      rejectedItems: [
        'Miroirs', 'Vitres', 'Ampoules', 'Vaisselle en verre',
        'Verre à boire', 'Pyrex', 'Cristal'
      ],
      tips: [
        'Trier par couleur si demandé',
        'Attention aux éclats de verre',
        'Utiliser les points de collecte dédiés',
        'Le verre se recycle à l\'infini'
      ]
    },
    {
      id: '4',
      name: 'Déchets Organiques',
      description: 'Déchets de cuisine et de jardin compostables',
      icon: 'eco',
      color: '#8bc34a',
      binColor: '#8bc34a',
      frequency: 'bi-hebdomadaire',
      instructions: [
        'Utiliser le bac marron avec sacs compostables',
        'Éviter les liquides et graisses',
        'Mélanger déchets verts et bruns',
        'Aérer régulièrement le compost'
      ],
      acceptedItems: [
        'Épluchures de fruits', 'Marc de café', 'Coquilles d\'œufs',
        'Feuilles mortes', 'Tontes de gazon', 'Branches fines', 'Fleurs fanées'
      ],
      rejectedItems: [
        'Viande et poisson', 'Produits laitiers', 'Huiles de cuisson',
        'Excréments d\'animaux', 'Plantes malades', 'Mauvaises herbes montées en graines'
      ],
      tips: [
        'Alterner matières sèches et humides',
        'Broyer les déchets volumineux',
        'Maintenir une bonne humidité',
        'Retourner le compost régulièrement'
      ]
    },
    {
      id: '5',
      name: 'Déchets Dangereux',
      description: 'Produits chimiques et toxiques',
      icon: 'dangerous',
      color: '#f44336',
      binColor: '#f44336',
      frequency: 'sur rendez-vous',
      instructions: [
        'Apporter en déchetterie ou points de collecte',
        'Conserver dans emballage d\'origine',
        'Ne jamais mélanger les produits',
        'Porter des équipements de protection'
      ],
      acceptedItems: [
        'Peintures', 'Solvants', 'Pesticides', 'Batteries de voiture',
        'Huiles de vidange', 'Produits de nettoyage', 'Médicaments périmés'
      ],
      rejectedItems: [
        'Déchets radioactifs', 'Explosifs', 'Amiante',
        'Déchets hospitaliers infectieux'
      ],
      tips: [
        'Ne jamais jeter dans les égouts',
        'Utiliser les collectes spécialisées',
        'Privilégier les produits écologiques',
        'Respecter les doses d\'utilisation'
      ]
    },
    {
      id: '6',
      name: 'Électronique',
      description: 'Appareils électriques et électroniques',
      icon: 'devices',
      color: '#9c27b0',
      binColor: '#9c27b0',
      frequency: 'sur demande',
      instructions: [
        'Déposer en magasin ou déchetterie',
        'Effacer les données personnelles',
        'Retirer les piles et batteries',
        'Conserver les accessoires ensemble'
      ],
      acceptedItems: [
        'Smartphones', 'Ordinateurs', 'Télévisions', 'Électroménager',
        'Câbles électriques', 'Chargeurs', 'Consoles de jeux'
      ],
      rejectedItems: [
        'Appareils contenant de l\'amiante',
        'Équipements médicaux implantables'
      ],
      tips: [
        'Privilégier la réparation',
        'Donner si l\'appareil fonctionne',
        'Utiliser les reprises en magasin',
        'Séparer les différents matériaux'
      ]
    }
  ];

  ngOnInit(): void {}

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  getFilteredWasteTypes(): WasteType[] {
    if (this.selectedCategory === 'all') {
      return this.wasteTypes;
    }

    const categoryMap: { [key: string]: string[] } = {
      'household': ['1'],
      'recyclable': ['2', '3'],
      'organic': ['4'],
      'hazardous': ['5', '6']
    };

    const categoryIds = categoryMap[this.selectedCategory] || [];
    return this.wasteTypes.filter(type => categoryIds.includes(type.id));
  }

  getBinColorName(color: string): string {
    const colorMap: { [key: string]: string } = {
      '#4caf50': 'vert',
      '#ffeb3b': 'jaune',
      '#2196f3': 'bleu',
      '#8bc34a': 'marron',
      '#f44336': 'rouge',
      '#9c27b0': 'violet'
    };
    return colorMap[color] || 'standard';
  }
}