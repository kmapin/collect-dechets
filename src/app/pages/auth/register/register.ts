import { stamp } from './../../../../../node_modules/@types/leaflet/index.d';
import { Component, OnInit } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { UserRole, RegisterUserData, RegisterResponse } from '../../../models/user.model';
import { Agency } from '../../../models/agency.model';
import { OUAGA_DATA, QuartierData } from '../../../data/mock-data';
import { Admin } from '../../../services/admin';
import { AgencyService } from '../../../services/agency.service';
import { CountriesOrgMockService } from '../../../services/countries-org-mock.service';
import { Arrondissement, City, Quartier, Sector } from '../../../models/countries-org.model';

@Component({
  selector: 'app-register',
  imports: [RouterModule, FormsModule],
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
    status:'',
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
    acceptTerms: true,
    receiveOffers: false,
    commune: {
      name: '',
      region: '',
      province: ''
    },
    agency : {
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



  arrondissements: QuartierData[] = OUAGA_DATA;
  arrondissementss: Arrondissement[] = [];
  cities: City[] = [];
  secteurss: Sector[] = [];
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];
  quartierss: Quartier[] = [];
  agencyId: string = '';
  showPassword = false;
  isLoading = false;

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
    private countriesOrgMockService: CountriesOrgMockService
  ) { }

  ngOnInit(): void {
    this.formCountriesDataInit();
    this.agencyId = this.activatedRoute.snapshot.params['id'];
    if (this.agencyId) {
      this.loadAgencyFromApi(this.agencyId);
    }
    console.log("L'id de l'agence est ", this.agencyId);
    // this.roleMunicipality = this.adminService.getData()?.userRole || '';
    this.roleMunicipality = localStorage.getItem('userRole') || '';
    if (this.roleMunicipality === 'municipality') this.userData.role = UserRole.MUNICIPALITY
    console.log(this.roleMunicipality);

  }

  formCountriesDataInit() {
    this.getAllCountries();
    this.test();
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
        console.log('[DEBUG] Agency data:', response);
        this.agency = this.mapApiAgency(response.data);
        console.log('[DEBUG] Agency details:', this.agency);
        this.userData._id = this.agency._id;
        this.userData.role = this.agency.role;
        this.userData.firstName = this.agency.firstName;
        this.userData.lastName = this.agency.lastName;
        this.userData.email = this.agency.email;
        this.userData.phone = this.agency.phone;
        // this.userData.password;
        // this.userData.confirmPassword;
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
        // latitude: this.userData.address.latitude;
        // longitude: this.userData.address.postalCode

        this.userData.agencyName = this.agency.agencyName;
        this.userData.agencyDescription = this.agency.agencyDescription


      } else {
        console.error('Erreur lors du chargement de l\'agence');
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
  testButton(): void {
    console.log('[DEBUG] Test button clicked!');
    console.log('[DEBUG] isLoading:', this.isLoading);
    console.log('[DEBUG] acceptTerms:', this.userData.acceptTerms);
    console.log('[DEBUG] password match:', this.userData.password === this.userData.confirmPassword);
    console.log('[DEBUG] userData:', this.userData);
  }

  isButtonDisabled(): boolean {
    const disabled = this.isLoading || !this.userData.acceptTerms || this.userData.password !== this.userData.confirmPassword;
    console.log('[DEBUG] Button disabled:', disabled);
    console.log('[DEBUG] - isLoading:', this.isLoading);
    console.log('[DEBUG] - acceptTerms:', this.userData.acceptTerms);
    console.log('[DEBUG] - password match:', this.userData.password === this.userData.confirmPassword);
    return disabled;
  }
  formatPhone(phone: any): string {
    if (!phone) return '';

    const phoneStr = String(phone).trim();

    return phoneStr
      .replace(/\s+/g, '')
      .replace(/^\+?(226|225)?/, '');
  }
  onRegister(): void {
    console.log('[DEBUG] onRegister() appelée');
    console.log('[DEBUG] Données utilisateur:', this.userData);
    console.log('[DEBUG] isLoading:', this.isLoading);
    console.log('[DEBUG] acceptTerms:', this.userData.acceptTerms);
    
    // Clear previous errors
    this.validationErrors = {};
    this.generalError = '';

    if (!this.validateForm()) {
      console.log('[DEBUG] Validation échouée');
      return;
    }

    console.log('[DEBUG] Validation réussie, démarrage inscription...');

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
          longitude: -17.444,
          latitude: 14.692
          
        },
        ...(this.agencyId && { agencyId: this.agencyId })
      };

      console.log('[DEBUG] Données d\'inscription préparées:', registrationData);

      this.authService.register(registrationData).subscribe({
        next: (response: RegisterResponse) => {
          this.isLoading = false;
          console.log('[DEBUG] Réponse inscription:', response);

          if (response.success) {
            this.notificationService.showSuccess(
              'Inscription réussie',
              response.message || 'Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.'
            );
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            console.log(" Error response", response)
            this.handleRegistrationError(response.error, response.message);
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('[DEBUG] Erreur inscription:', error);
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
          longitude: -17.444,
          latitude: 14.692
        },
        // Agency-specific data - ensure they are always included for agency role
   
        agency: {
          name: this.userData.agencyName,
          agencyDescription: this.userData.agencyDescription,
          zoneActivite: [],
          client: '' ,
          collector: '',
          slogan: this.userData.slogan,
          gestionnaires: [],
          owner: '',
          documents: [],
          status: 'inactive',
          longitude: -17.444,
          latitude: 14.692 
        }
      };

      console.log('[DEBUG] Données d\'inscription agence préparées:', registrationData);
      console.log('[DEBUG] agencyName value:', this.userData.agencyName);
      console.log('[DEBUG] agencyDescription value:', this.userData.agencyDescription);

      this.authService.register(registrationData).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('[DEBUG] Réponse inscription agence:', response);
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
          console.error('[DEBUG] Erreur inscription agence2:', error);
          this.handleRegistrationError(error.error || error.message || error);
        }
      });
      return;
    } else if (this.userData.role === UserRole.MUNICIPALITY) {
      const body : RegisterUserData = {
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
          longitude: -17.444,
          latitude: 14.692
        },
        ...(this.agencyId && { agencyId: this.agencyId })
      };

      console.log('[DEBUG] Body envoyé à registerMunicipality:', body);
      this.authService.register(body).subscribe({
        next: (response) => {
          localStorage.removeItem('userRole');
          this.isLoading = false;
          this.adminService.cleanData();
          console.log('[DEBUG] Réponse inscription municipal:', response);
          const res: any = response;
          const isSuccess =
            response.success ||
            res.status === 'success' ||
            (typeof response.message === 'string' && (
              response.message.toLowerCase().includes('succès') ||
              response.message.toLowerCase().includes('réussi')
            )) 
            // ||
            // !!response.municipality;

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

  onArrondissementChange(arrondissement?: string) {
    if (arrondissement) {
      const sectorObj = this.arrondissementss.find(a => a.name === arrondissement);
      const sectors = this.countriesOrgMockService.getSectorsByArrondissement(sectorObj?.id || '');
      this.secteurss = sectors ? sectors : [];
      console.log("Secteurs  ==> ", this.secteurss);
      this.quartiers = [];
      this.userData.address.sector = '';
      this.userData.address.neighborhood = '';
    }
  }

  onSecteurChange(secteur: string) {
    if (secteur) {
      const secteurObj = this.secteurss.find(s => s.name === secteur);
      const quartiers = this.countriesOrgMockService.getNeighborhoodsBySector(secteurObj?.id || '');
      console.log("Quartiers  ==> ", quartiers);
      this.quartierss = quartiers;
      this.userData.address.neighborhood = this.userData.address.neighborhood || '';
    }
    const secteurObj = this.secteurs.find(s => s.secteur === secteur);
    this.quartiers = secteurObj ? secteurObj.quartiers : [];
    this.userData.address.neighborhood = this.userData.address.neighborhood || '';
  }

  onCityChange(city: string) {
    if (city) {
      const cityObj = this.cities.find(c => c.name === city);
      console.log("City Object ==> ", cityObj);
      const arr = this.countriesOrgMockService.getArrondissementsByCity(cityObj?.id || '');
      this.arrondissementss = arr ? arr : [];
      console.log("Arrondissements  ==> ", this.arrondissementss);
      this.secteurs = [];
      this.quartiers = [];
      this.userData.address.arrondissement = '';
      this.userData.address.sector = '';
      this.userData.address.neighborhood = '';
    };

  }
  private validateForm(): boolean {
    // Vérifier que le rôle est bien sélectionné
    if (!this.userData.role) {
      this.notificationService.showError('Erreur', 'Veuillez sélectionner un rôle');
      return false;
    }

    // Champs communs obligatoires
    if (!this.userData.firstName || !this.userData.lastName || !this.userData.email || !this.userData.phone) {
      this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return false;
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.userData.email)) {
      this.notificationService.showError('Erreur', 'Veuillez saisir une adresse email valide');
      return false;
    }

    // Validation mot de passe
    if (this.userData.password !== this.userData.confirmPassword) {
      this.notificationService.showError('Erreur', 'Les mots de passe ne correspondent pas');
      return false;
    }

    if (this.userData.password.length < 8) {
      this.notificationService.showError('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    // Validation acceptation des conditions
    if (!this.userData.acceptTerms) {
      this.notificationService.showError('Erreur', 'Vous devez accepter les conditions d\'utilisation');
      return false;
    }

    // Validation spécifique pour les agences
    if (this.userData.role === UserRole.MANAGER) {
      if (!this.userData.agencyName || this.userData.agencyName.trim() === '') {
        this.notificationService.showError('Erreur', 'Le nom de l\'agence est requis');
        return false;
      }
      if (!this.userData.agencyDescription || this.userData.agencyDescription.trim() === '') {
        this.notificationService.showError('Erreur', 'La description de l\'agence est requise');
        return false;
      }
    }

    // Validation spécifique pour les municipalités  
    if (this.userData.role === UserRole.MUNICIPALITY) {
      if (!this.userData.commune || !this.userData.commune.name || this.userData.commune.name.trim() === '') {
        this.notificationService.showError('Erreur', 'Le nom de la commune est requis');
        return false;
      }
    }

    // Validation arrondissement obligatoire
    // if (!this.userData.arrondissement) {
    //   this.notificationService.showError('Erreur', 'L\'arrondissement est requis');
    //   return false;
    // }

    // Validation spécifique selon le rôle
    if (this.userData.role === UserRole.CLIENT) {

      const address = this.userData.address;
      // if (!address.street || !address.doorNumber || !address.neighborhood || !address.city || !address.postalCode) {
      //   this.notificationService.showError('Erreur', 'Veuillez remplir tous les champs d\'adresse');
      //   return false;
      // }
      if (!address.doorColor) {
        this.notificationService.showError('Erreur', 'Veuillez indiquer la couleur de la porte');
        return false;
      }
    } else if (this.userData.role === UserRole.MANAGER) {
      // Validation agence
      if (!this.userData.agencyName) {
        this.notificationService.showError('Erreur', 'Le nom de l\'agence est requis');
        return false;
      }
    } else if (this.userData.role === UserRole.MUNICIPALITY) {
      // Validation agence
      // if (!this.userData.agencyName) {
      //   this.notificationService.showError('Erreur', 'Le nom de l\'agence est requis');
      //   return false;
      // }
    } else {
      // Cas improbable, mais au cas où
      this.notificationService.showError('Erreur', 'Rôle utilisateur invalide');
      return false;
    }

    // Si tout est ok
    return true;
  }

  /**
   * Convertit les messages techniques du backend en messages conviviaux pour l'utilisateur
   */
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

  /**
   * Handles registration errors and displays appropriate messages
   */
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

  /**
   * Gets validation error for a specific field
   */
  getFieldError(fieldName: string): string {
    const errors = this.validationErrors[fieldName];
    return errors && errors.length > 0 ? errors[0] : '';
  }

  /**
   * Checks if a field has validation errors
   */
  hasFieldError(fieldName: string): boolean {
    return this.validationErrors[fieldName] && this.validationErrors[fieldName].length > 0;
  }

  test() {
    console.log("All sectors ==> ", this.countriesOrgMockService.getSectorsByArrondissement("1"));
  }

  getAllCountries() {
    console.log("All cities ==> ", this.countriesOrgMockService.getCitiesByCountry("1"));
    this.cities = this.countriesOrgMockService.getCitiesByCountry("1");
  }
}