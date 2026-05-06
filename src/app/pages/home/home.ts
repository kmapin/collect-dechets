import { Component, OnInit } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService } from '../../services/agency.service';
import { Agency } from '../../models/agency.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import * as L from 'leaflet';
import { NotificationService } from '../../services/notification.service';
import { Arrondissement, Quartier, Sector } from '../../models/countries-org.model';
import { CountriesOrgMockService } from '../../services/countries-org-mock.service';


@Component({
  selector: 'app-home',
  imports: [RouterModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home  implements OnInit {
  searchQuery = '';
  searchResults: Agency[] = [];
  isSearching = false;
  filteredAgencies: Agency[] = [];
  filteredAgenciesOnMap : Agency[] = [];
  randomStarsList: number[] = [];
  sortBy = 'name';
  maxPrice: string = '';
  suggestions: any[] = [];
   private searchSubject = new Subject<string>();
   map: any;
  

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
  selectedCity: string = '';
  // userPosition: { lat: number, lng: number } | null = null;
  userPosition: any = null;
  routeLayer: any = null;
  loading = true;
  mapLoading = true;


  constructor(
    private agencyService: AgencyService,
    private notificationsService: NotificationService,
    private router: Router,
    private countriesOrgMockService: CountriesOrgMockService
    
  ) {}

  ngOnInit(): void {
    this.loadFeaturedAgenciesFromApi();
    this.applyFilters();
    this.searchSubject.pipe(
          debounceTime(300),
          distinctUntilChanged() 
        ).subscribe((query) => {
          this.fetchSuggestions(query);
        })

        // this.initMap();
        this.useGeolocations();
        console.log('selected city ==>', this.selectedCity);

        
  }

  ngAfterViewInit(): void {
    // this.initMap();
    // this.useGeolocations();

  }

  assignAgenciesCoordinatesAndDisplayOnMap(): void {
    // Exemple de coordonnées dans Ouagadougou (latitude ~12.35 à 12.40, longitude ~-1.55 à -1.48)
    this.filteredAgenciesOnMap.forEach((agency, i) => {
      // Génère des coordonnées aléatoires dans la zone de Ouagadougou
      const lat = 12.35 + Math.random() * 0.05; // 12.35 à 12.40
      const lng = -1.55 + Math.random() * 0.07; // -1.55 à -1.48
      const popupContent = `
        <b>${agency.name}</b><br>
        ${agency.address.city || ''}<br>
        <button class="itineraire-btn" data-lat="${lat}" data-lng="${lng}" data-agency="${agency.name}"><i class="material-icons">directions</i>Itinéraire</button>
      `;
      // agency.coordinates = { lat, lng };
      // Ajoute un marker sur la carte
      if (this.map) {
        const marker = L.marker([lat, lng]).addTo(this.map);
        // Ajoute un bouton avec un id unique basé sur l'index ou l'id de l'agence
        const popupContent = `
          <b>${agency.name}</b><br>
          ${agency.address.city || ''}<br>
          <button class="popup-btn itineraire-btn" data-lat="${lat}" data-lng="${lng}" data-agency="${agency.name}">
            <i class="material-icons">directions</i>Itinéraire
          </button>
          <button class="popup-btn start-btn" data-lat="${lat}" data-lng="${lng}" data-agency="${agency.name}">
            <i class="material-icons">play_arrow</i>Démarrer
          </button>
        `;
        marker.bindPopup(popupContent);
        // Ajoute un listener pour le bouton après l'ouverture du popup
        marker.on('popupopen', (event: any) => {
          setTimeout(() => {
            const itinBtn = document.querySelector('.itineraire-btn') as HTMLButtonElement;
            if (itinBtn) {
              itinBtn.onclick = () => this.showItineraryToAgency(lat, lng, agency.name);
            }
            const startBtn = document.querySelector('.start-btn') as HTMLButtonElement;
            if (startBtn) {
              startBtn.onclick = () => this.startLiveNavigation(lat, lng, agency.name);
            }
          }, 1000);
        });
      }
    });
  }

  startNavigation(destLat: number, destLng: number, name: string) {
    // Exemple : ouvre Google Maps dans un nouvel onglet
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`, '_blank');
  }

watchId: number | null = null;
userLiveMarker: any = null;
liveRouteLayer: any = null;

startLiveNavigation(destLat: number, destLng: number, name: string) {
  // Arrête le suivi précédent si besoin
  if (this.watchId) {
    navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }
  // Supprime l'ancien marker et la route
  if (this.userPosition) {
    this.map.removeLayer(this.userPosition);
    this.userPosition = null;
  }
  if (this.liveRouteLayer) {
    this.map.removeLayer(this.liveRouteLayer);
    this.liveRouteLayer = null;
  }

  // Icône rouge pour la position utilisateur
  const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Suivi en temps réel
  this.watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      // Met à jour le marker utilisateur
      if (this.userPosition) {
        this.userPosition.setLatLng([latitude, longitude]);
      } else {
        this.userPosition = L.marker([latitude, longitude], { icon: redIcon }).addTo(this.map)
          .bindPopup('Votre position actuelle').openPopup();
      }
      // Recalcule l'itinéraire
      const url = `https://router.project-osrm.org/route/v1/driving/${longitude},${latitude};${destLng},${destLat}?overview=full&geometries=geojson`;
      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.routes && data.routes.length) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
          // Supprime l'ancien tracé
          if (this.liveRouteLayer) {
            this.map.removeLayer(this.liveRouteLayer);
          }
          this.liveRouteLayer = L.polyline(coords, { color: 'orange', weight: 6, dashArray: '10,10' }).addTo(this.map);
          this.map.fitBounds(this.liveRouteLayer.getBounds());
        }
      } catch (err) {
        // Optionnel : afficher une notification d'erreur
      }
    },
    (error) => {
      this.notificationsService.showError('Erreur', 'Impossible de suivre votre position');
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}


  async showItineraryToAgency(destLat: number, destLng: number, agencyName: string) {
    if (!this.userPosition) {
      this.notificationsService.showError('Erreur', 'Votre position n\'est pas disponible');
      return;
    }
    
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    // Supprime l'ancien marker et la route
    if (this.userPosition) {
      this.map.removeLayer(this.userPosition);
      this.userPosition = null;
    }
    if (this.liveRouteLayer) {
      this.map.removeLayer(this.liveRouteLayer);
      this.liveRouteLayer = null;
    }

    
    // Appel à l'API OSRM pour le routage
    const url = `https://router.project-osrm.org/route/v1/driving/${this.userPosition.lng},${this.userPosition.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        this.routeLayer = L.polyline(coords, { color: 'blue', weight: 5 }).addTo(this.map);
        this.map.fitBounds(this.routeLayer.getBounds());
        this.notificationsService.showSuccess('Itinéraire', `Itinéraire vers ${agencyName} affiché sur la carte.`);
      } else {
        this.notificationsService.showError('Erreur', 'Aucun itinéraire trouvé');
      }
    } catch (err) {
      this.notificationsService.showError('Erreur', 'Impossible de calculer l\'itinéraire');
    }
  }

  initMap(): void {
    this.map = L.map('map').setView([12.3714, -1.5197], 12); // Ouagadougou par défaut
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      // attribution: '© OpenStreetMap contributors'
      attribution: '© Zéro Déchet + ;)'
    }).addTo(this.map);

    // Ajoute un bouton ou une logique pour géolocaliser
    this.map.locate({ setView: true, maxZoom: 32 });
    this.map.on('locationfound', (e: any) => {
      const { lat, lng } = e.latlng;
      this.userPosition = { lat, lng };
      const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      L.marker([lat, lng], { icon: redIcon }).addTo(this.map)
        .bindPopup('Vous êtes ici').openPopup();
      this.reverseGeocode(lat, lng);
    });
    this.map.on('locationerror', () => {
      // alert('Impossible d\'obtenir votre position');
      this.notificationsService.showError('Erreur', 'Impossible d\'obtenir votre position');

    });
    this.assignAgenciesCoordinatesAndDisplayOnMap();
  }

  async reverseGeocode(lat: number, lng: number): Promise<void> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      const city = data.address.city || data.address.town || data.address.village || '';
      const sector = data.address.suburb || data.address.quarter || '';
      const neighborhood = data.address.neighbourhood || '';
      // this.searchQuery = city;
      // this.selectedCity = city;
      this.applyFilters();
      // alert(`Vous êtes à ${city}, secteur ${sector}, quartier ${neighborhood}`); 
      // this.notificationsService.showSuccess('Localisation réussie', `Vous êtes à ${city}, secteur ${sector}, quartier ${neighborhood}`);
    } catch (err) {
      console.error('Erreur géocodage:', err);
      // alert('Impossible de récupérer les informations de localisation');
      // this.notificationsService.showError('Erreur', 'Impossible de récupérer les informations de localisation');
    }
  }

  private fetchSuggestions(query: string): void {
    if (query.length > 2) {
      this.agencyService.getSuggestions(query).subscribe({
        next: (response) => {
          console.log('Suggestions reçues :', response);
          this.suggestions = response || [];
        },
        error: (err) => {
          console.error('Erreur lors de la récupération des suggestions :', err);
        }
      });
    } else {
      this.suggestions = [];
    }
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
    // agencyName: apiAgency.agencyName || '',
    name: apiAgency.name || '',
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
    this.applyFilters();
  }

  

  onSearch(): void {
    this.applyFilters();
  }

applyFilters(): void {
 
  const payload: any = {
    term: this.searchQuery || '',
    city: this.selectedCity,
    arrondissement: this.selectedArrondissement,
    sector: this.selectedSector,
    neighborhood: this.selectedNeighborhood,
    rating: this.minRating ? parseFloat(this.minRating) : null,
    status: 'active',
    getAll: true
    // maxPrice: this.maxPrice ? parseFloat(this.maxPrice) : null
  };
  this.agencyService.searchAgencie(payload).subscribe({
    next: (response: any) => {
        console.log("responses filtrées :", response);
        this.filteredAgenciesOnMap = (response.data || []).map((a: any) => this.mapApiAgency(a));
        
        this.filteredAgencies =this.agencyService.getRandomAgencies((response.data || []).map((a: any) => this.mapApiAgency(a)));
        console.log("Agences filtrées :", this.filteredAgencies);
        this.loading = false;
        this.mapLoading = false;

      // if(response.data.length < 5){

      //   this.filteredAgencies = (response.data || []).map((a: any) => this.mapApiAgency(a));
      // } else {

      //   this.filteredAgencies = (response.data || []).slice(0, 4).map((a: any) => this.mapApiAgency(a));
      // }
      this.generateRandomStarsList();
      this.sortAgencies();
    },
    error: (err) => {
      console.error('Erreur lors de la recherche des agences :', err);
      this.filteredAgencies = [];
      this.loading = false;
    }
  });
}

generateRandomStarsList(): void {
    this.randomStarsList = Array.from({ length: this.filteredAgencies.length }, () =>
      Math.floor(Math.random() * 5) + 1
    );
  }

  sortAgencies(): void {
    this.filteredAgencies.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'price':
          return this.getMinPrice(a) - this.getMinPrice(b);
        case 'clients':
          return b.totalClients - a.totalClients;
        default:
          return 0;
      }
    });
  }

  getMinPrice(agency: Agency): number {
      return Math.min(...agency.services.map(service => service.price));
  }

  // ...existing properties...
  selectedSearchOption: 'geolocation' | 'zone' | 'advanced' | null = null;

  // Utility to mark an option active
  selectOption(option: 'geolocation' | 'zone' | 'advanced') {
    this.selectedSearchOption = option;
  }

  useGeolocations(): void {
    this.selectOption('geolocation');
    this.showMap = false;
    this.showAdvancedSear = false;
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Appel à l'API de géocodage inversé
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          console.log('Données de géocodage:', data);
          if (!data.address) {
            // alert('Impossible de récupérer les informations de localisation');
            this.notificationsService.showError('Erreur', 'Impossible de récupérer les informations de localisation');
            return;
          }
          // Extraction des infos
          const city = data.address.city || data.address.town || data.address.village || '';
          const sector = data.address.suburb || data.address.quarter || '';
          const neighborhood = data.address.neighbourhood || '';
          // this.searchQuery = city;
          this.selectedCity = city;
          console.log('selected city geolocated ==>', this.selectedCity);
          if(this.selectedCity){
            this.onCityChange(this.selectedCity);
          }

          // Utilisation des infos (ex : pré-remplir les filtres)
          // this.searchQuery = city;
          // Tu peux aussi filtrer directement
          this.applyFilters();
          // alert(`Vous êtes à ${city}, secteur ${sector}, quartier ${neighborhood}`);
          // this.notificationsService.showSuccess('Localisation réussie', `Vous êtes à ${city}, secteur ${sector}, quartier ${neighborhood}`);
        } catch (err) {
          console.error('Erreur géocodage:', err);
          // alert('Impossible de récupérer les informations de localisation');
        this.notificationsService.showError('Erreur', 'Impossible de récupérer les informations de localisation');

        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        // alert('Impossible d\'obtenir votre position');
        this.notificationsService.showError('Erreur', 'La géolocalisation n\'est pas supportée par votre navigateur');

      }
    );
  } else {
    // alert('La géolocalisation n\'est pas supportée par votre navigateur');
    this.notificationsService.showError('Erreur', 'Impossible d\'obtenir votre position');
  }
}
  showMap:boolean = false;
  showZoneSelector(): void {
    this.selectOption('zone');
    console.log('Show zone selector');
    this.showMap = true;
    this.showAdvancedSear = false;
    setTimeout(()=>{
      this.initMap();
    }, 500);
    // this.initMap();
  }

  showAdvancedSear:boolean = false;

  showAdvancedSearch(): void {
    this.selectOption('advanced');
    console.log('Show advanced search');
    this.showAdvancedSear = true;
    this.showMap = false;

  }

  getStars(rating: number): number[] {
    if (!rating || rating < 0) return [];
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

agencies: Agency[] = [];
  selectedService = '';
  minRating = '';
  viewMode: 'grid' | 'list' | 'map' = 'grid';
  cities: string[] = ['Ouagadougou', 'Bobo-Dioulasso'];

  arrondissementss: Arrondissement[] = [];
  secteurss: Sector[] = [];
  quartierss: Quartier[] = [];
  
  // selectedCity: string = '';
  selectedArrondissement: string = '';
  selectedSector: string = '';
  selectedNeighborhood: string = '';
  // minRating: string = '';
  
  onCityChange(city: string) {
    console.log('selected city ==>', city);
    const cityObj = this.cities.find(c => c === city);
    // this.arrondissementss = cityObj ? this.countriesOrgMockService.getArrondissementsByCityLabel(cityObj) : [];
    this.selectedArrondissement = '';
    this.secteurss = [];
    this.selectedSector = '';
    this.quartierss = [];
    this.selectedNeighborhood = '';
    this.getCitiesContent(city);
    this.applyFilters();
  }

   getCitiesContent(ville: string){
    this.arrondissementss = this.countriesOrgMockService.getAllArrondissementsByVille(ville);  
    this.secteurss = this.countriesOrgMockService.getAllSectorsByVille(ville);
    this.quartierss = this.countriesOrgMockService.getAllNeighborhoodsByVille(ville);
  }
  
  onArrondissementChange(arrondissement: string) {
    const arrObj = this.arrondissementss.find(a => a.name === arrondissement);
    // this.secteurss = arrObj ? this.countriesOrgMockService.getSectorsByArrondissement(arrObj.id) : [];
    this.selectedSector = '';
    this.quartierss = [];
    this.selectedNeighborhood = '';
    // this.applyFilters();
  }
  
  onSecteurChange(secteur: string) {
    const secteurObj = this.secteurss.find(s => s.name === secteur);
    // this.quartierss = secteurObj ? this.countriesOrgMockService.getNeighborhoodsBySector(secteurObj.id) : [];
    this.selectedNeighborhood = '';
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCity = '';
    this.selectedService = '';
    this.maxPrice = '';
    this.selectedSector = ''
    // this.minRating = '';
    this.applyFilters();
  }
}
