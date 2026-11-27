import { stamp } from './../../../../../node_modules/@types/leaflet/index.d';
import { Component, OnInit } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { UserRole, RegisterUserData, RegisterResponse } from '../../../models/user.model';
import { Agency } from '../../../models/agency.model';
import { Admin } from '../../../services/admin';
import { AgencyService } from '../../../services/agency.service';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { Arrondissement, City, Country, Quartier, Sector } from '../../../models/countries-org.model';
import { PhoneInputDirective } from '../../../shared/phone-input.directive';
import { TerritorySelectComponent, toTerritoryOptions, toTerritoryOptionsById } from '../../../shared/territory-select/territory-select';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-register',
  imports: [RouterModule, FormsModule, PhoneInputDirective, TerritorySelectComponent],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register implements OnInit {

  userData = {
    _id: '',
    role: UserRole.CLIENT as UserRole | null,
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    isOwnerAgency: false,
    status: '',
    address: {
      arrondissement: '',
      sector: '',
      street: '',
      doorNumber: '',
      doorColor: '',
      neighborhood: '',
      city: '',
      postalCode: '',
      latitude: '',
      longitude: ''
    },
    agencyName: '',
    slogan: '',
    agencyDescription: '',
    termsAccepted: false,
    acceptTerms: false,
    receiveOffers: false,
    commune: {
      name: '',
      region: '',
      province: ''
    },
    agency: {
      name: '',
      agencyDescription: '',
      zoneActivite: [],
      client: '',
      collector: '',
      slogan: '',
      gestionnaires: [],
      owner: '',
      documents: [],
      status: 'active',
      location: {
        type: 'Point',
        coordinates: [0, 0]
      },
      commune: {
        name: '',
        region: '',
        province: ''
      }
    }
  };



  readonly toTerritoryOptions = toTerritoryOptions;
  readonly toTerritoryOptionsById = toTerritoryOptionsById;

  arrondissementss: Arrondissement[] = [];
  cities: City[] = [];
  countries: Country[] = [];
  selectedCountryId = '';
  secteurss: Sector[] = [];
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];
  quartierss: Quartier[] = [];
  agencyId: string = '';
  showPassword = false;
  isLoading = false;
  isLoadingCities = false;
  isLoadingArrondissements = false;
  isLoadingSecteurs = false;
  isLoadingQuartiers = false;
  territoryError = '';
  private territoryRequestId = 0;
  currentStep = 1;
  readonly steps = [
    { number: 1, title: 'Type de compte' },
    { number: 2, title: 'Informations personnelles' },
    { number: 3, title: 'Adresse de localisation' },
    { number: 4, title: 'Sécurité et conditions' },
  ];
  stepError = '';
  stepFieldErrors: Record<string, string> = {};

  // Error handling properties
  validationErrors: { [key: string]: string[] } = {};
  generalError: string = '';

  roleMunicipality: string = '';
  agency: any;
  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
    private adminService: Admin,
    private activatedRoute: ActivatedRoute,
    private agencyService: AgencyService,
    private territoryService: TerritoryHttpService
  ) { }

  ngOnInit(): void {
    this.formCountriesDataInit();
    this.agencyId = this.activatedRoute.snapshot.params['id'];
    if (this.agencyId) {
      this.loadAgencyFromApi(this.agencyId);
    }
    // this.roleMunicipality = this.adminService.getData()?.userRole || '';
    this.roleMunicipality = localStorage.getItem('userRole') || '';
    if (this.roleMunicipality === 'municipality') this.userData.role = UserRole.MUNICIPALITY;
  }

  get citiesForSelectedCountry(): City[] {
    return this.cities.filter((city) => String(city.countryId) === String(this.selectedCountryId));
  }

  get progressPercent(): number {
    return (this.currentStep / this.steps.length) * 100;
  }

  get currentStepTitle(): string {
    return this.steps[this.currentStep - 1]?.title ?? this.steps[0].title;
  }

  get isEditingAccount(): boolean {
    return Boolean(this.agencyId);
  }

  get isMunicipalityRegistration(): boolean {
    return this.userData.role === UserRole.MUNICIPALITY;
  }

  onCountryChange(countryId: string | number | null): void {
    this.selectedCountryId = countryId === null ? '' : String(countryId);

    this.territoryRequestId++;

    this.userData.address.city = '';
    this.userData.address.arrondissement = '';
    this.userData.address.sector = '';
    this.userData.address.neighborhood = '';

    this.clearStepFieldError('country');
    this.clearStepFieldError('city');

    this.chargerTerritoireVille('', false);
  }

  nextStep(form: NgForm): void {
    if (this.currentStep >= this.steps.length || this.isLoading) return;
    this.markCurrentStepTouched(form);
    this.stepFieldErrors = {};
    this.stepError = '';

    if (!this.validateCurrentStep(form)) return;
    this.currentStep += 1;
  }

  previousStep(): void {
    if (this.currentStep <= 1 || this.isLoading) return;
    this.currentStep -= 1;
    this.stepFieldErrors = {};
    this.stepError = '';
  }

  submitCurrentStep(form: NgForm): void {
    if (this.currentStep < this.steps.length) {
      this.nextStep(form);
      return;
    }

    if (this.isLoading) return;
    this.markCurrentStepTouched(form);
    this.stepFieldErrors = {};
    this.stepError = '';
    if (!this.validateCurrentStep(form)) return;
    this.onRegister();
  }

  private markCurrentStepTouched(form: NgForm): void {
    Object.values(form.controls).forEach((control) => control.markAsTouched());
  }

  private validateCurrentStep(form: NgForm): boolean {
    let valid = form.valid === true;

    if (this.currentStep === 1) {
      if (!this.userData.role) {
        this.stepFieldErrors['role'] = 'Veuillez choisir un type de compte.';
        valid = false;
      }
    } else if (this.currentStep === 2) {
      if (!this.userData.firstName.trim()) {
        this.stepFieldErrors['firstName'] = 'Le prénom est requis.';
        valid = false;
      }
      if (!this.userData.lastName.trim()) {
        this.stepFieldErrors['lastName'] = 'Le nom est requis.';
        valid = false;
      }
      if (!this.userData.phone.trim()) {
        this.stepFieldErrors['phone'] = 'Le numéro de téléphone est requis.';
        valid = false;
      }
      if (this.userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.userData.email)) {
        this.stepFieldErrors['email'] = 'Veuillez saisir une adresse email valide.';
        valid = false;
      }
      if (this.userData.role === UserRole.MANAGER) {
        if (!this.userData.agencyName.trim()) {
          this.stepFieldErrors['agencyName'] = 'Le nom de l’agence est requis.';
          valid = false;
        }
        if (!this.userData.agencyDescription.trim()) {
          this.stepFieldErrors['agencyDescription'] = 'La description de l’agence est requise.';
          valid = false;
        }
        if (!this.userData.slogan.trim()) {
          this.stepFieldErrors['slogan'] = 'Le slogan de l’agence est requis.';
          valid = false;
        }
      }
    } else if (this.currentStep === 3) {
      if (!this.countries.some((country) => country.id === this.selectedCountryId)) {
        this.stepFieldErrors['country'] = 'Veuillez sélectionner un pays.';
        valid = false;
      }
      const city = this.citiesForSelectedCountry.find((item) => item.name === this.userData.address.city);
      if (!city) {
        this.stepFieldErrors['city'] = 'Veuillez sélectionner une ville disponible dans ce pays.';
        valid = false;
      }
      if (this.territoryError) {
        this.stepFieldErrors['city'] = this.territoryError;
        valid = false;
      }
      if (this.isLoadingArrondissements || this.isLoadingSecteurs || this.isLoadingQuartiers) {
        this.stepFieldErrors['city'] = 'Veuillez attendre le chargement du découpage territorial.';
        valid = false;
      }
      if (this.arrondissementss.length && !this.arrondissementss.some((item) => item.name === this.userData.address.arrondissement)) {
        this.stepFieldErrors['arrondissement'] = 'Veuillez sélectionner un arrondissement.';
        valid = false;
      }
      if (this.secteurss.length && !this.secteurss.some((item) => item.name === this.userData.address.sector)) {
        this.stepFieldErrors['sector'] = 'Veuillez sélectionner un secteur.';
        valid = false;
      }
      if (this.quartierss.length && !this.quartierss.some((item) => item.name === this.userData.address.neighborhood)) {
        this.stepFieldErrors['neighborhood'] = 'Veuillez sélectionner un quartier.';
        valid = false;
      }
    } else if (this.currentStep === 4 && !this.agencyId) {
      if (this.userData.password.length < 8) {
        this.stepFieldErrors['password'] = 'Le mot de passe doit contenir au moins 8 caractères.';
        valid = false;
      }
      if (!this.userData.confirmPassword || this.userData.password !== this.userData.confirmPassword) {
        this.stepFieldErrors['confirmPassword'] = 'Les mots de passe ne correspondent pas.';
        valid = false;
      }
      if (!this.userData.acceptTerms) {
        this.stepFieldErrors['acceptTerms'] = 'Vous devez accepter les conditions d’utilisation.';
        valid = false;
      }
    }

    if (!valid) this.stepError = 'Vérifiez les champs signalés avant de continuer.';
    return valid;
  }

  clearStepFieldError(field: string): void {
    delete this.stepFieldErrors[field];
    this.stepError = '';
  }
  clearError(): void {
    this.generalError = '';
  }
  formCountriesDataInit() {
    this.getAllCountries();
  }
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  getPasswordStrength(): string {
    const password = this.userData.password;
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    const texts = {
      weak: 'Faible',
      medium: 'Moyen',
      strong: 'Fort'
    };
    return texts[strength as keyof typeof texts] || '';
  }
  loadAgencyFromApi(id: string | null): void {
    this.agencyService.getAgencyByIdFromApi(id).subscribe((response: any) => {
      if (response.success && response.data) {
        this.agency = this.mapApiAgency(response.data);
        this.userData._id = this.agency._id;
        this.userData.role = this.agency.role;
        this.userData.firstName = this.agency.firstName;
        this.userData.lastName = this.agency.lastName;
        this.userData.email = this.agency.email;
        this.userData.phone = this.agency.phone;
        this.userData.acceptTerms = this.agency.termsAccepted; // renommé
        this.userData.acceptTerms = this.agency.termsAccepted; // renommé
        this.userData.receiveOffers = this.agency.receiveOffers;
        this.userData.address.arrondissement = this.agency.address.arrondissement;
        this.userData.address.sector = this.agency.address.sector;
        this.userData.address.street = this.agency.address.street;
        this.userData.address.doorNumber = this.agency.address.doorNumber;
        this.userData.address.doorColor = this.agency.address.doorColor;
        this.userData.address.neighborhood = this.agency.address.neighborhood;
        this.userData.address.city = this.agency.address.city;
        this.userData.address.postalCode = this.agency.address.postalCode;
        if (this.cities.length && this.userData.address.city) {
          this.selectedCountryId = this.cities.find((city) => city.name === this.userData.address.city)?.country?.id ?? '';
          this.chargerTerritoireVille(this.userData.address.city, true);
        }

        this.userData.agencyName = this.agency.agencyName;
        this.userData.agencyDescription = this.agency.agencyDescription


      } else {
        // Fallback vers les données mockées si l'API échoue
        this.agencyService.getAgencyById(id).subscribe(agency => {
          this.agency = agency || null;
        });
      }
    });
  }
  private mapApiAgency(apiAgency: any): Agency {
    return {
      _id: apiAgency._id || '',
      userId: apiAgency.userId || '',
      role: apiAgency.role || UserRole.MANAGER,
      firstName: apiAgency.firstName || '',
      lastName: apiAgency.lastName || '',
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
  formatPhone(phone: any): string {
    if (!phone) return '';

    const phoneStr = String(phone).trim();

    return phoneStr
      .replace(/\s+/g, '')
      .replace(/^\+?(226|225)?/, '');
  }
  onRegister(): void {
    if (this.isLoading || this.currentStep !== this.steps.length) return;

    // Clear previous errors
    this.validationErrors = {};
    this.generalError = '';

    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    if (this.userData.role === UserRole.CLIENT) {
      // Prepare data in the new format
      const registrationData: RegisterUserData = {
        firstName: this.userData.firstName,
        lastName: this.userData.lastName,
        email: this.userData.email,
        phone: this.formatPhone(this.userData.phone),
        password: this.userData.password,
        role: this.userData.role,
        acceptTerms: this.userData.acceptTerms,
        receiveOffers: this.userData.receiveOffers,
        address: {
          street: this.userData.address.street,
          arrondissement: this.userData.address.arrondissement,
          sector: this.userData.address.sector,
          doorNumber: this.userData.address.doorNumber,
          doorColor: this.userData.address.doorColor,
          neighborhood: this.userData.address.neighborhood,
          city: this.userData.address.city,
          postalCode: this.userData.address.postalCode,
          ...this.getQuartierCoordinates(),
        },
        ...(this.agencyId && { agencyId: this.agencyId })
      };

      this.authService.register(registrationData).subscribe({
        next: (response: RegisterResponse) => {
          this.isLoading = false;

          if (response.success) {
            this.notificationService.showSuccess(
              'Inscription réussie',
              response.message || 'Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.'
            );
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.handleRegistrationError(response.error, response.message);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.handleRegistrationError(error, 'Erreur lors de la communication avec le serveur');
        }
      });
      return;
    }

    // Handle AGENCY role using the unified register method
    if (this.userData.role === UserRole.MANAGER) {
      // Prepare agency registration data
      const registrationData: RegisterUserData = {
        firstName: this.userData.firstName,
        lastName: this.userData.lastName,
        email: this.userData.email,
        phone: this.userData.phone,
        agencyDescription: this.userData.agencyDescription,
        password: this.userData.password,
        role: this.userData.role,
        acceptTerms: this.userData.acceptTerms,
        receiveOffers: this.userData.receiveOffers,
        isOwnerAgency: this.userData.isOwnerAgency,
        address: {
          street: this.userData.address.street,
          arrondissement: this.userData.address.arrondissement,
          sector: this.userData.address.sector,
          doorNumber: this.userData.address.doorNumber || 'N/A', // N/A for agencies
          doorColor: this.userData.address.doorColor || 'N/A', // N/A for agencies
          neighborhood: this.userData.address.neighborhood,
          city: this.userData.address.city,
          postalCode: this.userData.address.postalCode,
          ...this.getQuartierCoordinates(),
        },
        // Agency-specific data - ensure they are always included for agency role

        agency: {
          name: this.userData.agencyName,
          agencyDescription: this.userData.agencyDescription,
          zoneActivite: [],
          client: '',
          collector: '',
          slogan: this.userData.slogan,
          gestionnaires: [],
          owner: '',
          documents: [],
          status: 'inactive',
          ...this.getQuartierCoordinates(),
        }
      };

      this.authService.register(registrationData).subscribe({
        next: (response) => {
          this.isLoading = false;
          // Use the unified RegisterResponse structure
          const isSuccess = response.success;

          if (isSuccess) {
            this.notificationService.showSuccess('Inscription agence réussie',
              'Votre agence a été créée avec succès ! Veuillez patienter pendant que l’administrateur active votre compte avant de pouvoir vous connecter.');
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.handleRegistrationError(response.message || response.error);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.handleRegistrationError(error.error || error.message || error);
        }
      });
      return;
    } else if (this.userData.role === UserRole.MUNICIPALITY) {
      const body: RegisterUserData = {
        firstName: this.userData.firstName,
        lastName: this.userData.lastName,
        email: this.userData.email,
        phone: this.userData.phone,
        password: this.userData.password,
        role: this.userData.role,
        acceptTerms: this.userData.acceptTerms,
        receiveOffers: this.userData.receiveOffers,
        address: {
          street: this.userData.address.street,
          arrondissement: this.userData.address.arrondissement,
          sector: this.userData.address.sector,
          doorNumber: this.userData.address.doorNumber,
          doorColor: this.userData.address.doorColor,
          neighborhood: this.userData.address.neighborhood,
          city: this.userData.address.city,
          postalCode: this.userData.address.postalCode,
          ...this.getQuartierCoordinates(),
        },
        ...(this.agencyId && { agencyId: this.agencyId })
      };

      this.authService.register(body).subscribe({
        next: (response) => {
          localStorage.removeItem('userRole');
          this.isLoading = false;
          this.adminService.cleanData();
          const res: any = response;
          const isSuccess =
            response.success ||
            res.status === 'success' ||
            (typeof response.message === 'string' && (
              response.message.toLowerCase().includes('succès') ||
              response.message.toLowerCase().includes('réussi')
            ))

          if (isSuccess) {
            this.notificationService.showSuccess('Inscription mairie réussie',
              'Votre agence a été créée avec succès ! Vous pouvez maintenant vous connecter.');
            setTimeout(() => {
              this.router.navigate(['/dashboard/admin']);
            }, 2000);
          } else {
            const rawMessage = response?.message || response?.error || '';

            const message = typeof rawMessage === 'string'
              ? rawMessage
              : Object.values(rawMessage).flat().join(', '); // convertir objet en string

            const errorMsg = this.getFriendlyMessage(message, false);
            this.notificationService.showError('Erreur lors de l\'inscription mairie', errorMsg);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.adminService.cleanData();
          const errorMsg = this.getFriendlyMessage((error?.error?.message || error?.error?.message || error?.error || ''), false);
          // const errorMsg = this.getFriendlyMessage((error?.error?.error || error?.error?.message || error?.message || ''), false);
          this.notificationService.showError('Erreur lors de l\'inscription mairie', errorMsg);
        }
      });
      return;
    }
  }

  onArrondissementChange(value: string | number | null) {
    const arrondissement = value === null ? '' : String(value);
    this.userData.address.arrondissement = arrondissement;
    this.clearStepFieldError('arrondissement');
    this.clearError();
    const requestId = ++this.territoryRequestId;
    this.secteurss = [];
    this.quartierss = [];
    this.quartiers = [];
    this.isLoadingSecteurs = false;
    this.isLoadingQuartiers = false;
    this.territoryError = '';
    this.userData.address.sector = '';
    this.userData.address.neighborhood = '';
    if (!arrondissement) return;

    const arrondissementObj = this.arrondissementss.find(a => a.name === arrondissement);
    if (!arrondissementObj?.id) return;
    this.chargerSecteursArrondissement(arrondissementObj, requestId);
  }

  private chargerSecteursArrondissement(
    arrondissement: Arrondissement,
    requestId: number,
    secteurEnregistre = '',
    quartierEnregistre = '',
  ): void {
    this.isLoadingSecteurs = true;
    this.territoryService.getSectorsByArrondissement(arrondissement.id).subscribe({
      next: (sectors) => {
        if (requestId !== this.territoryRequestId || this.userData.address.arrondissement !== arrondissement.name) return;
        this.secteurss = sectors.filter(
          (sector) => this.idArrondissementSecteur(sector) === arrondissement.id,
        );
        this.isLoadingSecteurs = false;
        const secteur = this.secteurss.find((item) => item.name === secteurEnregistre);
        if (secteur) {
          this.userData.address.sector = secteur.name;
          this.chargerQuartiersSecteur(secteur, requestId, quartierEnregistre);
          return;
        }
        this.userData.address.sector = '';
        this.userData.address.neighborhood = '';
        if (!this.secteurss.length) {
          this.chargerQuartiersDirectsArrondissement(arrondissement.id, requestId, quartierEnregistre);
        }
      },
      error: () => {
        if (requestId !== this.territoryRequestId) return;
        this.secteurss = [];
        this.quartierss = [];
        this.isLoadingSecteurs = false;
        this.userData.address.sector = '';
        this.userData.address.neighborhood = '';
        this.territoryError = 'Impossible de charger les secteurs de cette ville.';
      },
    });
  }

  onSecteurChange(value: string | number | null) {
    const secteur = value === null ? '' : String(value);
    this.userData.address.sector = secteur;
    this.clearStepFieldError('sector');
    this.clearError();
    const requestId = ++this.territoryRequestId;
    this.quartierss = [];
    this.quartiers = [];
    this.isLoadingQuartiers = false;
    this.territoryError = '';
    this.userData.address.neighborhood = '';
    if (!secteur) return;

    const secteurObj = this.secteurss.find(s => s.name === secteur);
    if (!secteurObj?.id) return;
    this.chargerQuartiersSecteur(secteurObj, requestId);
  }

  private chargerQuartiersSecteur(secteur: Sector, requestId: number, quartierEnregistre = ''): void {
    this.isLoadingQuartiers = true;
    this.territoryService.getNeighborhoodsBySector(secteur.id).subscribe({
      next: (quartiers) => {
        if (requestId !== this.territoryRequestId || this.userData.address.sector !== secteur.name) return;
        this.quartierss = quartiers.filter(
          (quartier) => (quartier.sectorId || quartier.sector?.id) === secteur.id,
        );
        this.isLoadingQuartiers = false;
        this.restaurerQuartier(quartierEnregistre);
      },
      error: () => {
        if (requestId !== this.territoryRequestId) return;
        this.quartierss = [];
        this.isLoadingQuartiers = false;
        this.userData.address.neighborhood = '';
        this.territoryError = 'Impossible de charger les quartiers de ce secteur.';
      },
    });
  }

  private restaurerQuartier(nom: string): void {
    this.userData.address.neighborhood = this.quartierss.some((quartier) => quartier.name === nom) ? nom : '';
  }

  private getQuartierCoordinates(): { latitude?: number; longitude?: number } {
    const quartier = this.quartierss.find(q => q.name === this.userData.address.neighborhood);
    return {
      latitude: quartier?.latitude ?? undefined,
      longitude: quartier?.longitude ?? undefined,
    };
  }

  onCityChange(value: string | number | null): void {
    const city = value === null ? '' : String(value);
    this.userData.address.city = city;
    const cityObj = this.cities.find(
      (item) =>
        item.name === city &&
        item.countryId === this.selectedCountryId
    );
    if (cityObj?.countryId) {
      this.selectedCountryId = String(cityObj.countryId);
    }
    this.clearError();
    this.clearStepFieldError('city');
    this.chargerTerritoireVille(city, false);
  }

  private chargerTerritoireVille(city: string, conserverSelection: boolean): void {
    const requestId = ++this.territoryRequestId;
    const arrondissementEnregistre = conserverSelection ? this.userData.address.arrondissement : '';
    const secteurEnregistre = conserverSelection ? this.userData.address.sector : '';
    const quartierEnregistre = conserverSelection ? this.userData.address.neighborhood : '';
    this.arrondissementss = [];
    this.secteurss = [];
    this.quartierss = [];
    this.secteurs = [];
    this.quartiers = [];
    this.territoryError = '';
    this.userData.address.arrondissement = conserverSelection ? arrondissementEnregistre : '';
    this.userData.address.sector = conserverSelection ? secteurEnregistre : '';
    this.userData.address.neighborhood = conserverSelection ? quartierEnregistre : '';
    this.isLoadingArrondissements = false;
    this.isLoadingSecteurs = false;
    this.isLoadingQuartiers = false;
    if (!city) return;

    const cityObj = this.cities.find(c => c.name === city && c.countryId === this.selectedCountryId);
    if (!cityObj?.id) {
      this.userData.address.arrondissement = '';
      this.userData.address.sector = '';
      this.userData.address.neighborhood = '';
      if (city) this.territoryError = 'Cette ville n’est pas disponible dans le découpage territorial.';
      return;
    }
    this.isLoadingArrondissements = true;
    this.territoryService.getArrondissementsByCity(cityObj.id).subscribe({
      next: (arrondissements) => {
        if (requestId !== this.territoryRequestId || this.userData.address.city !== city) return;
        this.arrondissementss = arrondissements.filter(
          (item) => (item.cityId || item.city?.id) === cityObj.id,
        );
        this.quartiers = [];
        this.quartierss = [];
        this.isLoadingArrondissements = false;

        if (this.arrondissementss.length) {
          const arrondissement = this.arrondissementss.find((item) => item.name === arrondissementEnregistre);
          if (arrondissement) {
            this.userData.address.arrondissement = arrondissement.name;
            this.chargerSecteursArrondissement(arrondissement, requestId, secteurEnregistre, quartierEnregistre);
          } else {
            this.userData.address.arrondissement = '';
            this.userData.address.sector = '';
            this.userData.address.neighborhood = '';
          }
          return;
        }

        this.userData.address.arrondissement = '';
        this.chargerSecteursVille(cityObj.id, requestId, secteurEnregistre, quartierEnregistre);
      },
      error: () => {
        if (requestId !== this.territoryRequestId) return;
        this.arrondissementss = [];
        this.secteurss = [];
        this.quartierss = [];
        this.isLoadingArrondissements = false;
        this.userData.address.arrondissement = '';
        this.userData.address.sector = '';
        this.userData.address.neighborhood = '';
        this.territoryError = 'Impossible de charger le découpage territorial de cette ville.';
      },
    });
  }

  private chargerSecteursVille(
    cityId: string,
    requestId: number,
    secteurEnregistre = '',
    quartierEnregistre = '',
  ): void {
    this.isLoadingSecteurs = true;
    this.territoryService.getAllSectors().subscribe({
      next: (sectors) => {
        if (requestId !== this.territoryRequestId || this.userData.address.arrondissement) return;
        this.secteurss = sectors.filter((sector) =>
          !this.idArrondissementSecteur(sector) && this.idVilleSecteur(sector) === cityId,
        );
        this.isLoadingSecteurs = false;
        const secteur = this.secteurss.find((item) => item.name === secteurEnregistre);
        if (secteur) {
          this.userData.address.sector = secteur.name;
          this.chargerQuartiersSecteur(secteur, requestId, quartierEnregistre);
          return;
        }
        this.userData.address.sector = '';
        if (this.secteurss.length) {
          this.userData.address.neighborhood = '';
          this.quartierss = [];
        } else {
          this.chargerQuartiersDirectsVille(cityId, requestId, quartierEnregistre);
        }
      },
      error: () => {
        if (requestId !== this.territoryRequestId) return;
        this.secteurss = [];
        this.isLoadingSecteurs = false;
        this.userData.address.sector = '';
        this.userData.address.neighborhood = '';
        this.territoryError = 'Impossible de charger les secteurs de cette ville.';
        this.quartierss = [];
      },
    });
  }

  private idArrondissementSecteur(sector: Sector): string {
    return sector.arrondissementId || sector.arrondissement?.id || '';
  }

  private idVilleSecteur(sector: Sector): string {
    return sector.cityId || sector.arrondissement?.cityId || sector.arrondissement?.city?.id || '';
  }

  private chargerQuartiersDirectsVille(cityId: string, requestId: number, quartierEnregistre = ''): void {
    this.isLoadingQuartiers = true;
    this.territoryService.getAllNeighborhoods().subscribe({
      next: (neighborhoods) => {
        const cityName = this.cities.find((item) => item.id === cityId)?.name;
        if (requestId !== this.territoryRequestId || this.userData.address.city !== cityName) return;
        this.quartierss = neighborhoods.filter(
          (quartier) => !quartier.sectorId && !quartier.arrondissementId && quartier.cityId === cityId,
        );
        this.isLoadingQuartiers = false;
        this.restaurerQuartier(quartierEnregistre);
      },
      error: () => {
        if (requestId !== this.territoryRequestId) return;
        this.quartierss = [];
        this.isLoadingQuartiers = false;
        this.territoryError = 'Impossible de charger les quartiers de cette ville.';
      },
    });
  }

  private chargerQuartiersDirectsArrondissement(
    arrondissementId: string,
    requestId: number,
    quartierEnregistre = '',
  ): void {
    this.isLoadingQuartiers = true;
    this.territoryService.getAllNeighborhoods().subscribe({
      next: (neighborhoods) => {
        const arrondissementName = this.arrondissementss.find((item) => item.id === arrondissementId)?.name;
        if (requestId !== this.territoryRequestId || this.userData.address.arrondissement !== arrondissementName) return;
        this.quartierss = neighborhoods.filter(
          (quartier) => !quartier.sectorId && quartier.arrondissementId === arrondissementId,
        );
        this.isLoadingQuartiers = false;
        this.restaurerQuartier(quartierEnregistre);
      },
      error: () => {
        if (requestId !== this.territoryRequestId) return;
        this.quartierss = [];
        this.isLoadingQuartiers = false;
        this.territoryError = 'Impossible de charger les quartiers de cet arrondissement.';
      },
    });
  }
  private validateForm(): boolean {
    // Vérifier que le rôle est bien sélectionné
    if (!this.userData.role) {
      this.notificationService.showError('Erreur', 'Veuillez sélectionner un rôle');
      return false;
    }

    // Champs communs obligatoires
    if (!this.userData.firstName || !this.userData.lastName || !this.userData.phone) {
      this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return false;
    }

    if (!this.userData.address.city) {
      this.notificationService.showError('Erreur', 'Veuillez sélectionner une ville.');
      return false;
    }

    if (!this.cities.some((city) => city.name === this.userData.address.city)) {
      this.notificationService.showError('Erreur', 'La ville sélectionnée n’est plus disponible.');
      return false;
    }

    if (this.territoryError) {
      this.notificationService.showError('Erreur', 'Impossible de vérifier le découpage territorial. Veuillez réessayer.');
      return false;
    }

    if (this.isLoadingArrondissements || this.isLoadingSecteurs || this.isLoadingQuartiers) {
      this.notificationService.showError('Erreur', 'Veuillez attendre le chargement du découpage territorial.');
      return false;
    }

    if (this.arrondissementss.length && !this.userData.address.arrondissement) {
      this.notificationService.showError('Erreur', 'Veuillez sélectionner un arrondissement.');
      return false;
    }

    if (this.secteurss.length && !this.userData.address.sector) {
      this.notificationService.showError('Erreur', 'Veuillez sélectionner un secteur.');
      return false;
    }

    if (this.quartierss.length && !this.userData.address.neighborhood) {
      this.notificationService.showError('Erreur', 'Veuillez sélectionner un quartier.');
      return false;
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (this.userData.email && !emailRegex.test(this.userData.email)) {
      this.notificationService.showError('Erreur', 'Veuillez saisir une adresse email valide');
      return false;
    }

    if (!this.agencyId) {
      if (this.userData.password !== this.userData.confirmPassword) {
        this.notificationService.showError('Erreur', 'Les mots de passe ne correspondent pas');
        return false;
      }

      if (this.userData.password.length < 8) {
        this.notificationService.showError('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
        return false;
      }

      if (!this.userData.acceptTerms) {
        this.notificationService.showError('Erreur', 'Vous devez accepter les conditions d\'utilisation');
        return false;
      }
    }

    // Validation spécifique pour les agences
    if (this.userData.role === UserRole.MANAGER) {
      if (!this.userData.agencyName || this.userData.agencyName.trim() === '') {
        this.handleRegistrationError('Le nom de l\'agence est requis');
        return false;
      }
      if (!this.userData.agencyDescription || this.userData.agencyDescription.trim() === '') {
        this.handleRegistrationError('La description de l\'agence est requise');
        return false;
      }
    }



    // Validation spécifique selon le rôle
    if (this.userData.role === UserRole.CLIENT) {

      const address = this.userData.address;
    } else if (this.userData.role === UserRole.MANAGER) {
      // Validation agence
      if (!this.userData.agencyName) {
        this.handleRegistrationError('Le nom de l\'agence est requis');
        return false;
      }
    } else if (this.userData.role === UserRole.MUNICIPALITY) {
    } else {
      // Cas improbable, mais au cas où

      this.handleRegistrationError('Rôle utilisateur invalide');
      return false;
    }

    // Si tout est ok
    return true;
  }

  private getFriendlyMessage(raw: string, isSuccess: boolean = false): string {
    if (!raw) {
      return isSuccess
        ? "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter."
        : "Une erreur est survenue. Veuillez réessayer.";
    }
    const map: { [key: string]: string } = {
      "Email already exists": "Cette adresse email est déjà utilisée.",
      "Invalid email or password": "Email ou mot de passe invalide.",
      "User created successfully": "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
      "Missing required fields": "Veuillez remplir tous les champs obligatoires.",
      "Password too short": "Le mot de passe est trop court.",
      "Invalid phone number": "Le numéro de téléphone est invalide.",
      // Ajoute d'autres correspondances ici si besoin
    };
    if (map[raw]) return map[raw];
    for (const key in map) {
      if (raw.toLowerCase().includes(key.toLowerCase())) return map[key];
    }
    return isSuccess
      ? "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter."
      : raw;
  }

  private redirectToDashboard(role: string): void {
    const dashboardRoutes = {
      client: '/dashboard/client',
      agency: '/dashboard/agency',
      collector: '/dashboard/collector',
      municipality: '/dashboard/municipality'
    };

    const route = dashboardRoutes[role as keyof typeof dashboardRoutes] || '/';
    this.router.navigate([route]);
  }

  private handleRegistrationError(error: string | { [key: string]: string[] } | undefined, fallbackMessage?: string): void {
    this.validationErrors = {};
    this.generalError = '';

    if (typeof error === 'object' && error !== null) {
      // Handle field-specific validation errors
      this.validationErrors = error;
      this.notificationService.showError(
        'Erreurs de validation',
        'Veuillez corriger les erreurs dans le formulaire'
      );
    } else if (typeof error === 'string' && error.trim()) {
      // Handle general error message
      this.generalError = error;
      this.notificationService.showError('Erreur lors de l\'inscription', error);
    } else {
      // Handle fallback error
      const message = fallbackMessage || 'Une erreur inconnue s\'est produite';
      this.generalError = message;
      this.notificationService.showError('Erreur lors de l\'inscription', message);
    }
  }

  getFieldError(fieldName: string): string {
    const errors = this.validationErrors[fieldName];
    return errors && errors.length > 0 ? errors[0] : '';
  }

  hasFieldError(fieldName: string): boolean {
    return this.validationErrors[fieldName] && this.validationErrors[fieldName].length > 0;
  }

  getAllCountries(): void {
    this.isLoadingCities = true;
    this.territoryError = '';

    forkJoin({
      countries: this.territoryService.getCountries(),
      cities: this.territoryService.getAllCities()
    }).subscribe({
      next: ({ countries, cities }) => {
        this.cities = cities;
        this.countries = countries;

        console.log('cities ===>', this.cities);
        console.log('countries ===>', this.countries);

        this.isLoadingCities = false;

        if (this.userData.address.city) {
          const city = this.cities.find(
            (item) => item.name === this.userData.address.city
          );

          this.selectedCountryId = city?.countryId ?? '';

          this.chargerTerritoireVille(
            this.userData.address.city,
            true
          );
        }
      },
      error: () => {
        this.cities = [];
        this.countries = [];
        this.selectedCountryId = '';
        this.isLoadingCities = false;
        this.territoryError =
          'Impossible de charger la liste des pays et des villes.';
      },
    });
  }

  // getAllCountries() {
  //   this.isLoadingCities = true;
  //   this.territoryService.getAllCities().subscribe({
  //     next: (cities) => {
  //       this.cities = cities;
  //       console.log("cities===>", this.cities);
  //       const countriesById = new Map<string, Country>();
  //       cities.forEach((city) => {
  //         if (city.country?.id || city.countryId) countriesById.set(city.country.id, city.country);
  //       });
  //       this.countries = [...countriesById.values()];
  //       this.isLoadingCities = false;
  //       if (this.userData.address.city) {
  //         const city = this.cities.find((item) => item.name === this.userData.address.city);
  //         this.selectedCountryId = city?.country?.id ?? '';
  //         this.chargerTerritoireVille(this.userData.address.city, true);
  //       }
  //     },
  //     error: () => {
  //       this.cities = [];
  //       this.countries = [];
  //       this.selectedCountryId = '';
  //       this.isLoadingCities = false;
  //       this.territoryError = 'Impossible de charger la liste des villes.';
  //     },
  //   });
  // }
}