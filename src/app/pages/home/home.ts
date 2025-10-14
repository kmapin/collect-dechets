import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService } from '../../services/agency.service';
import { Agency } from '../../models/agency.model';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home  implements OnInit {
  searchQuery = '';
  searchResults: Agency[] = [];
  isSearching = false;

  features = [
    {
      icon: 'search',
      title: '1. Rechercher',
      description: 'Trouvez instantanément les agences de collecte qui desservent votre zone géographique avec notre moteur de recherche intelligent.',
      items: [
        'Recherche par adresse précise',
        // 'Géolocalisation automatique',
        'Filtres par type de service',
        'Résultats en temps réel'
      ]
    },
    {
      icon: 'compare_arrows',
      title: '2. Comparer',
      description: 'Analysez et comparez facilement, tarifs et évaluations des différentes agences pour faire le meilleur choix.',
      items: [
        'Comparaison des tarifs',
        // 'Évaluations clients vérifiées',
        // 'Détails des services',
        'Zones de couverture'
      ]
    },
    {
      icon: 'check_circle',
      title: '3. S\'abonner',
      description: 'Souscrivez en quelques clics au service qui vous convient et profitez d\'une collecte régulière et fiable.',
      items: [
        'Abonnement flexible',
        'Paiement sécurisé',
        'Suivi en temps réel',
        'Support client 24/7'
      ]
    }
  ];

  stats = [
    {
      icon: 'business',
      number: '150+',
      label: 'Agences partenaires',
      description: 'Agences certifiées dans toute la région'
    },
    {
      icon: 'people',
      number: '50,000+',
      label: 'Clients satisfaits',
      description: 'Utilisateurs actifs sur la plateforme'
    },
    {
      icon: 'star',
      number: '95%',
      label: 'Taux de satisfaction',
      description: 'Clients recommandent nos services'
    },
    {
      icon: 'local_shipping',
      number: '500+',
      label: 'Collectes par jour',
      description: 'Collectes effectuées quotidiennement'
    }
  ];

 testimonials = [
  {
    text: 'ZéroDéchet+ a complètement transformé notre gestion des déchets. Simple, efficace et écologique !',
    name: 'GANGO Siméon',
    role: 'Particulier, Kossodo',
    rating: 5,
     avatar: '/assets/homeUseCases/symon.png'

  },
  {
    text: 'Une plateforme intuitive qui nous fait gagner un temps précieux. Le service client est exceptionnel.',
    name: 'W.Paulin GUIGMA',
    role: 'Gérant d\'entreprise, Ouagadougou',
    rating: 5,
    avatar: '/assets/homeUseCases/paulBoss.jpg'
  },
  {
    text: 'Grâce à ZéroDéchet+, nous avons amélioré notre tri et réduit nos coûts de 30%. Parfait !',
    name: 'Rimvie OUEDRAOGO',
    role: 'Responsable RSE, Tampouy',
    rating: 5,
    avatar: '/assets/homeUseCases/rimvie.png'

  },
  
];

  carouselImages = [
    // { src: 'https://images.pexels.com/photos/193338/pexels-photo-193338.jpeg?auto=compress&w=400&h=200&fit=crop', alt: 'Collecte de déchets' },
    { src: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', alt: 'Tri sélectif' },
    // { src: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', alt: 'Tri sélectif' },
    { src: 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', alt: 'Recyclage' },
    { src: 'https://images.unsplash.com/photo-1740635313618-35636018c870?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', alt: 'Camion de collecte' },
    { src: 'https://i.pinimg.com/736x/25/85/0b/25850b6dac3595a04de4aa307397d122.jpg', alt: 'Sensibilisation environnement' }
  ];
  carouselDuration = 20;

  constructor(
    private agencyService: AgencyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFeaturedAgenciesFromApi();
  }

  /**
   * Transforme une agence API en objet compatible avec le template
   */
private mapApiAgency(apiAgency: any): Agency {
  return {
    _id: apiAgency._id || '',
    userId: apiAgency.userId || '',
    firstName: apiAgency.firstName || '',
    lastName: apiAgency.lastName || '',
    agencyName: apiAgency.agencyName || '',
    agencyDescription: apiAgency.agencyDescription || '',
    phone: apiAgency.phone || '',
    address: apiAgency.address || { 
      street: '', 
      arrondissement: '', 
      sector: '', 
      neighborhood: '', 
      city: '', 
      postalCode: '' 
    },
    arrondissement: apiAgency.arrondissement || '',
    secteur: apiAgency.secteur || '',
    quartier: apiAgency.quartier || '',
    licenseNumber: apiAgency.licenseNumber || '',
    members: apiAgency.members || [],
    serviceZones: apiAgency.serviceZones || [],
    services: apiAgency.services || [],
    employees: apiAgency.employees || [],
    schedule: apiAgency.schedule || [],
    collectors: apiAgency.collectors || [],
    clients: apiAgency.clients || [],
    collections: apiAgency.collections || [],
    incidents: apiAgency.incidents || [],
    rating: apiAgency.rating || 0,
    totalClients: apiAgency.totalClients || (apiAgency.clients ? apiAgency.clients.length : 0),
    acceptTerms: apiAgency.acceptTerms || false,
    receiveOffers: apiAgency.receiveOffers || false,
    isActive: apiAgency.isActive !== undefined ? apiAgency.isActive : true,
    createdAt: apiAgency.createdAt || '',
    updatedAt: apiAgency.updatedAt || '',
    __v: apiAgency.__v || 0
  };
}


  /**
   * Charge les agences depuis l'API backend et affiche les 4 premières en vedette
   */
  loadFeaturedAgenciesFromApi(): void {
    this.agencyService.getAllAgenciesFromApi().subscribe((response: any) => {
      this.searchResults = (response.data || []).slice(0, 4).map((a: any) => this.mapApiAgency(a));
      console.log('[DEBUG] searchResults:', this.searchResults);
    });
  }

  searchAgencies(): void {
    if (!this.searchQuery.trim()) return;

    this.isSearching = true;
    this.agencyService.searchAgencies(this.searchQuery).subscribe({
      next: (agencies) => {
        this.searchResults = agencies;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.isSearching = false;
      }
    });
  }

  useGeolocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.agencyService.getAgenciesByZone(latitude, longitude).subscribe(agencies => {
            this.searchResults = agencies;
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Impossible d\'obtenir votre position');
        }
      );
    } else {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
    }
  }

  showZoneSelector(): void {
    console.log('Show zone selector');
  }

  showAdvancedSearch(): void {
    console.log('Show advanced search');
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  viewAgencyDetails(agencyId: string): void {
    this.router.navigate(['/agencies', agencyId]);
  }

  subscribeToAgency(agencyId: string): void {
    this.router.navigate(['/agencies', agencyId]);
  }

  playDemo(): void {
    // window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
    window.open('#');
  }
}
