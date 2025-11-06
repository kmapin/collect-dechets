import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AgencyService } from '../../services/agency.service';
import { Agency, Tariff, WasteService } from '../../models/agency.model';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Arrondissement, Quartier, Sector } from '../../models/countries-org.model';
import { CountriesOrgMockService } from '../../services/countries-org-mock.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-agencies',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './agencies.html',
  styleUrl: './agencies.css'
})
export class Agencies  implements OnInit {
  agencies: Agency[] = [];
  filteredAgencies: Agency[] = [];
  searchQuery = '';
  selectedCity = '';
  selectedService = '';
  maxPrice = '';
  minRating = '';
  sortBy = 'name';
  viewMode: 'grid' | 'list' | 'map' = 'grid';
  agencyTariffs: WasteService[] = [];
  cities: string[] = ['Ouagadougou', 'Bobo-Dioulasso'];
  suggestions: any[] = [];
  randomStarsList: number[] = [];

// cities: string[] = [...];
//sectors: string[] = [...]; // à remplir
//neighborhoods: string[] = [...]; // à remplir

// cities: City[] = [];
arrondissementss: Arrondissement[] = [];
secteurss: Sector[] = [];
quartierss: Quartier[] = [];

// selectedCity: string = '';
selectedArrondissement: string = '';
selectedSector: string = '';
selectedNeighborhood: string = '';
selectedRadius: string = '';
selectedActivityZone: string = '';
selectedStatus: string = '';
// minRating: string = '';

onCityChange(city: string) {
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

// selectedCity: string = '';
// selectedSector: string = '';
// selectedNeighborhood: string = '';
// minRating: string = '';
// searchQuery: string = '';
currentUser!: any ;

 private searchSubject = new Subject<string>();
  constructor(
    private agencyService: AgencyService,
        private authService: AuthService,
    
    private router: Router,
    private route: ActivatedRoute,
    private countriesOrgMockService: CountriesOrgMockService
    
  ) { }

  ngOnInit(): void {

    this.getUser();
   
    this.loadAgenciesFromApi();
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged() 
    ).subscribe((query) => {
      this.fetchSuggestions(query);
    })
     const id = this.route.snapshot.paramMap.get('id'); 
    console.log('ID récupéré :', id);

    // this.getCitiesContent(this.selectedCity);

  }

  getUser(){
   this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      
    });
    console.log("Current User", this.currentUser); 
  }

  getCitiesContent(ville: string){
    this.arrondissementss = this.countriesOrgMockService.getAllArrondissementsByVille(ville);  
    this.secteurss = this.countriesOrgMockService.getAllSectorsByVille(ville);
    this.quartierss = this.countriesOrgMockService.getAllNeighborhoodsByVille(ville);
  }

  loadAgencies(): void {
    this.agencyService.getAgencies().subscribe(agencies => {
      this.agencies = agencies;
      this.filteredAgencies = agencies;
      console.log("Agences chargées :", agencies);
    });
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
      name: apiAgency.name || '',
      // agencyName: apiAgency.agencyName || '',
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
      randomStars: Math.floor(Math.random() * 5) + 1,
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
   * Charge les agences depuis l'API backend et remplace les données locales
   */
  loadAgenciesFromApi(): void {
    
    this.applyFilters();
  }

  onSearch(): void {
    // this.loadAgenciesFromApi()
    this.applyFilters();
  }

 // ...existing code...

applyFilters(): void {
  const payload: any = {
    name: this.searchQuery || '',
    city: this.selectedCity || '',
    arrondissement: this.selectedArrondissement || '',
    sector: this.selectedSector || '',
    neighborhood: this.selectedNeighborhood || '',
    rating: this.minRating ? this.minRating.toString() : undefined,
    service: this.selectedService || undefined,
    activityZone: this.selectedActivityZone || undefined, 
    radius: this.selectedRadius || undefined,
    status: this.selectedStatus || 'all'
    // maxPrice: this.maxPrice ? parseFloat(this.maxPrice) : null
  };

  // this.agencyService.searchAgencie(payload).subscribe({
  this.agencyService.getAllAgenciesFromApiInAgencies(payload).subscribe({
    next: (response: any) => {
      this.filteredAgencies = (response.data || []).map((a: any) => this.mapApiAgency(a));
      console.log("Agences filtrées :", this.filteredAgencies);
      this.generateRandomStarsList();
      this.sortAgencies();
    },

    error: (err) => {
      console.error('Erreur lors de la recherche des agences :', err);
      this.filteredAgencies = [];
    }
  });
}



// ...existing code...

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

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCity = '';
    this.selectedService = '';
    this.maxPrice = '';
    this.minRating = '';
    this.applyFilters();
  }

  // getStars(rating: number, randomStars?: number): number[] {
  //   console.log("Rating:", rating+1, "Random Stars:", randomStars);
  //   const stars = randomStars !== undefined ? randomStars : Math.floor(rating);
  //   return stars > 0 ? Array(stars).fill(0) : [];
  // }
  generateRandomStarsList(): void {
    this.randomStarsList = Array.from({ length: this.filteredAgencies.length }, () =>
      Math.floor(Math.random() * 5) + 1
    );
  }
  getStars(rating: number, randomStars?: number): number[]
   {
    console.log("Rating:", rating+1, "Random Stars:", randomStars);
    const stars = randomStars !== undefined ? randomStars : Math.floor(rating);
    return stars > 0 ? Array(stars).fill(0) : [];
  }
  getMinPrice(agency: Agency): number {
    return Math.min(...agency.services.map(service => service.price));
  }

  getFrequencyText(agency: Agency): string {
    const frequencies = agency.services.map(s => s.frequency);
    if (frequencies.includes('weekly' as any)) return 'hebdomadaire';
    if (frequencies.includes('biweekly' as any)) return 'bi-hebdomadaire';
    if (frequencies.includes('monthly' as any)) return 'mensuelle';
    return 'régulière';
  }

  subscribeToAgency(agencyId: string): void {
    this.router.navigate(['/agencies', agencyId]);
  }

  // recuperation des tarif a partir du web service
  // loadTariffsForAgency(): void {
  //   const userString = localStorage.getItem('currentUser');
  //   if (userString) {
  //     const currentUser = JSON.parse(userString);


  //     this.agencyService.getAgencyTariffs().subscribe({
  //       next: (tariffs) => {
  //         this.agencyTariffs = tariffs;
  //         console.log('Tarifs récupérés :', tariffs);
  //       },
  //       error: (err) => {
  //         console.error("Erreur lors du chargement des tarifs de l'agence", err);
  //       }
  //     });
  //   } else {
  //     console.error("Aucun utilisateur trouvé dans le stockage local.");
  //   }
  // }
//recuperation des suggestions venqnt de la base de donnese pour l utilisateur connecté
  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery); // Émet la valeur saisie
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

//application des suggestion
applySuggestion(suggestion: any): void {
  this.searchQuery = suggestion.name;
  this.suggestions = [];
  this.applyFilters();
}
// recuperations des tarifs liee a une agences
tariffs: Tariff[] = [];
  isLoading: boolean = false;
 loadTariffs(): void {
  this.isLoading = true;
  const agencyId = this.route.snapshot.paramMap.get('id'); 
  if (!agencyId) {
    console.error('[DEBUG] Aucun agencyId trouvé pour l’utilisateur courant');
    this.isLoading = false;
    return;
  }

  this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
    next: (data: Tariff[]) => {
      this.tariffs = data;
      console.log('Tarifs récupérés :', this.tariffs);
      this.isLoading = false;
    },
    error: (error) => {
      console.error('[DEBUG] Erreur lors du chargement des tarifs :', error);
      this.isLoading = false;
    }
  });
}
 
}