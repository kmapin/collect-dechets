import { Component, OnInit } from '@angular/core';

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
  imports: [RouterModule],
  templateUrl: './waste-types.html',
  styleUrl: './waste-types.css'
})
export class WasteTypes  implements OnInit {
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