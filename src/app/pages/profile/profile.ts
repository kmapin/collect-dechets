import { City } from './../../models/countries-org.model';
import { map } from 'rxjs';
import { Component, OnInit } from "@angular/core";

import { FormsModule } from "@angular/forms";
import { AuthService } from "../../services/auth.service";
import { RegisterUserData, User } from "../../models/user.model";
import { OUAGA_DATA, QuartierData } from "../../data/mock-data";
import { NotificationService } from "../../services/notification.service";
import QRCode from "qrcode";
import jsPDF  from "jspdf";
import {
  Arrondissement,
  Quartier,
  Sector,
} from "../../models/countries-org.model";
import { TerritoryHttpService } from "../../services/territory-http.service";
import { SharedService } from "../../services/shared-service";

@Component({
  selector: "app-profile",
  imports: [FormsModule],
  templateUrl: "./profile.html",
  styleUrl: "./profile.css",
})
export class Profile implements OnInit {
  userData: RegisterUserData = {
    _id: "",
    id: "",
    userId: "",
    subscribedAgencyId: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    address: {
      arrondissement: "",
      sector: "",
      street: "",
      doorNumber: "",
      doorColor: "",
      neighborhood: "",
      city: "",
      postalCode: "",
      latitude: 0,
      longitude: 0,
    },
    acceptTerms: true,
    receiveOffers: false,
    agencyId: "",
    status: "",
    nbGestionnaires: 0,
    isOwnerAgency: false,
    slogan: "",
    longitude: 0,
    latitude: 0,
    agencyName: "",
    agencyDescription: "",
    createdAt: "",
    updatedAt: "",
    isActive: true,
    avatar: "",
    commune: {
      name: "",
      region: "",
      province: "",
    },
    agency: {
      name: "",
      agencyDescription: "",
      zoneActivite: [],
      client: "",
      collector: "",
      slogan: "",
      gestionnaires: [],
      owner: "",
      documents: [],
      status: "active",
      longitude: 0,
      latitude: 0,
    },
  };

  arrondissementss: Arrondissement[] = [];
  cities: City[] = [];
  secteurss: Sector[] = [];
  quartierss: Quartier[] = [];
  validationErrors: { [key: string]: string[] } = {};
  generalError: string = "";
  isLoadingCities = false;
  isLoadingArrondissements = false;
  isLoadingSecteurs = false;
  isLoadingQuartiers = false;

  user: any;
  // Pour le select en cascade
  arrondissements: QuartierData[] = OUAGA_DATA;
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];

  // Pour agency
  allServices: string[] = [
    "Collecte ménagère",
    "Recyclage",
    "Collecte industrielle",
    "Collecte spéciale",
    "Traitement déchets dangereux",
  ];
  allSecteurs: { secteur: string; quartiers: string[] }[] = [];
  isLoading: boolean = false;
  currentUserId: string | null = null;
  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private territoryService: TerritoryHttpService,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?._id!;
    if(this.currentUserId){
      // Chantier "migrer le frontend vers TerritoryHttpService" — `getAllCountries()`
      // était synchrone (CountriesOrgMockService), donc `this.cities` était déjà rempli
      // avant même que la réponse HTTP de `getUser()` puisse revenir, garantissant que
      // le pré-remplissage de la cascade (onCityChange -> cityObj = this.cities.find())
      // trouve toujours la bonne ville. Devenu asynchrone, il faut attendre que
      // `getAllCountries()` ait fini avant d'appeler `getUser()`, sinon la cascade peut
      // s'exécuter avant que `this.cities` soit peuplé.
      this.getAllCountries(() => this.getUser(this.currentUserId!));
    }
  }

  // generer code qr en image
  generateQRCode(data: string): string {
    // Utiliser une API tierce pour générer le QR code
    return data ? data : "Pas de code QR généré";
  }
  renewQRCode(clientId: string) {
    console.log("renewQRCode clientId>>>>>>>>>>>",clientId);
    this.authService.generateQRCode(clientId).subscribe({
      next:(response)=>{
        this.getUser(this.currentUserId!);
        console.log("Générer QR code", response);
      }
    });
  }
  // generer code qr en pdf
  async downloadQRCodePDF(data: string) {
    if (!data) {
      console.error("Donnée QR vide");
      return;
    }
    try {
      // Génère le QR code en base64 PNG
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        width: 256,
        margin: 2,
      });
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Votre QR Code", 20, 20);
      // Ajoute l'image au PDF
      doc.addImage(qrCodeDataUrl, "PNG", 40, 40, 120, 120);
      doc.save("qrcode.pdf");
    } catch (err) {
      console.error("Erreur lors de la génération du PDF QR:", err);
    }
  }

  // async generateQRCodePDF(data: string): Promise<string> {
  //   if (!data) return '';
  //   try {
  //     return await QRCode.toDataURL(data, { width: 256, margin: 2 });
  //   } catch (err) {
  //     console.error('Erreur QRCode:', err);
  //     return '';
  //   }
  // }

  getUser(userID: string) {
    this.authService.getUserProfile(userID).subscribe((response: RegisterUserData | null) => {
      this.user = response?.data;
      this.userData = response?.data as RegisterUserData;
      console.log("loggedUser::>", this.user);
      console.log("loggedUser.address::>", this.user.address);
      // Sécurise l'accès à address
      if (!this.user.address) {
        this.user.address = {};
      }
      // Chantier "migrer le frontend vers TerritoryHttpService" — avant ce chantier,
      // arrondissement/secteur étaient pré-remplis ICI en plus d'être déjà re-déclenchés
      // par la cascade interne d'onCityChange() (appel HTTP en double, redondant même du
      // temps du service synchrone). onCityChange() enchaîne désormais tout seul
      // onArrondissementChange() puis onSecteurChange() une fois chaque étage résolu (si
      // les valeurs existent sur l'adresse) — un seul déclenchement, jamais deux requêtes
      // pour le même niveau.
      if (this.user.address.city) {
        this.onCityChange(this.user.address.city);
      }
      // Pour agency, charger tous les secteurs
      this.allSecteurs = this.arrondissements.flatMap((a) => a.secteurs);
    });
    console.log("Current User", this.user);
  }

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      client: "Client",
      agency: "Agence",
      collector: "Collecteur",
      municipality: "Mairie",
    };
    return roleLabels[role] || role;
  }

  // onSave(): void {
  //   if (this.user.role === "client") {
  //     const userEdit = {
  //       firstName: this.user.firstName,
  //       lastName: this.user.lastName,
  //       phone: this.user.phone,
  //       address: {
  //         street: this.user.address?.street || "",
  //         doorNumber: this.user.address?.doorNumber || "",
  //         doorColor: this.user.address?.doorColor || "",
  //         arrondissement: this.user.address?.arrondissement || "",
  //         sector: this.user.address?.sector || "",
  //         neighborhood: this.user.address?.neighborhood || "",
  //         city: this.user.address?.city || "",
  //         postalCode: this.user.address?.postalCode || "",
  //       },
  //       termsAccepted: !!this.user.termsAccepted,
  //       receiveOffers: !!this.user.receiveOffers,
  //     };
      
  //     this.authService.updateClient(this.user?._id, userEdit).subscribe(
  //       (response) => {
  //         // this.notificationService.showSuccess(
  //         //   "Modification réussie",
  //         //   "Votre profil a été mis à jour avec succès."
  //         // );
  //         this.getUser(this.user?._id); // Recharger les données utilisateur
  //       },
  //       (error) => {
  //         this.notificationService.showError(
  //           "Erreur",
  //           "Une erreur est survenue lors de la modification du profil."
  //         );
  //       }
  //     );
  //   } else if (this.user.role === "agency") {
  //     const agencyEdit = {
  //       agencyName: this.user.agencyName,
  //       agencyDescription: this.user.agencyDescription,
  //       phone: this.user.phone,
  //       email: this.user.email,
  //       serviceZones: this.user.serviceZones || [],
  //       services: this.user.services || [],
  //       termsAccepted: !!this.user.termsAccepted,
  //       receiveOffers: !!this.user.receiveOffers,
  //     };
  //     this.authService.updateClient(this.user?._id, agencyEdit).subscribe(
  //       (response) => {
  //         // this.notificationService.showSuccess(
  //         //   "Modification réussie",
  //         //   "Le profil de l’agence a été mis à jour avec succès."
  //         // );
  //         this.getUser(this.user?._id); // Recharger les données utilisateur
  //       },
  //       (error) => {
  //         this.notificationService.showError(
  //           "Erreur",
  //           "Une erreur est survenue lors de la modification du profil agence."
  //         );
  //       }
  //     );
  //   }
  // }

  //Edit agency
  edit: boolean = false;
  onArrondissementChange(arrondissement?: string) {
    this.secteurss = [];
    this.quartierss = [];
    this.quartiers = [];
    if (!arrondissement) return;

    const sectorObj = this.arrondissementss.find((a) => a.name === arrondissement);
    this.userData.address.sector = this.userData.address.sector || "";
    this.userData.address.neighborhood = this.userData.address.neighborhood || "";
    if (!sectorObj?.id) return;

    this.isLoadingSecteurs = true;
    this.territoryService.getSectorsByArrondissement(sectorObj.id).subscribe({
      next: (sectors) => {
        this.secteurss = sectors;
        this.isLoadingSecteurs = false;
        if (this.userData.address.sector) this.onSecteurChange(this.userData.address.sector);
      },
      error: () => { this.secteurss = []; this.isLoadingSecteurs = false; },
    });
  }

  onSecteurChange(secteur: string) {
    this.quartierss = [];
    this.quartiers = [];
    this.userData.address.neighborhood = this.userData.address.neighborhood || "";
    if (!secteur) return;

    const secteurObj = this.secteurss.find((s) => s.name === secteur);
    if (!secteurObj?.id) return;

    this.isLoadingQuartiers = true;
    this.territoryService.getNeighborhoodsBySector(secteurObj.id).subscribe({
      next: (quartiers) => { this.quartierss = quartiers; this.isLoadingQuartiers = false; },
      error: () => { this.quartierss = []; this.isLoadingQuartiers = false; },
    });
  }

  onCityChange(city: string) {
    this.arrondissementss = [];
    this.secteurss = [];
    this.quartierss = [];
    this.secteurs = [];
    this.quartiers = [];
    if (!city) return;

    const cityObj = this.cities.find((c) => c.name === city);
    this.userData.address.arrondissement = this.userData.address.arrondissement || "";
    this.userData.address.sector = this.userData.address.sector || "";
    this.userData.address.neighborhood = this.userData.address.neighborhood || "";
    if (!cityObj?.id) return;

    this.isLoadingArrondissements = true;
    this.territoryService.getArrondissementsByCity(cityObj.id).subscribe({
      next: (arr) => {
        this.arrondissementss = arr;
        this.isLoadingArrondissements = false;
        if (this.userData.address.arrondissement) this.onArrondissementChange(this.userData.address.arrondissement);
      },
      error: () => { this.arrondissementss = []; this.isLoadingArrondissements = false; },
    });
  }

  getAllCountries(onDone?: () => void) {
    this.isLoadingCities = true;
    this.territoryService.getAllCities().subscribe({
      next: (cities) => { this.cities = cities; this.isLoadingCities = false; onDone?.(); },
      error: () => { this.cities = []; this.isLoadingCities = false; onDone?.(); },
    });
  }
  isButtonDisabled(): boolean {
    const disabled = this.isLoading;
    return disabled;
  }
  /**
   * Handles registration errors and displays appropriate messages
   */
  private handleRegistrationError(
    error: string | { [key: string]: string[] } | undefined,
    fallbackMessage?: string
  ): void {
    this.validationErrors = {};
    this.generalError = "";

    if (typeof error === "object" && error !== null) {
      // Handle field-specific validation errors
      this.validationErrors = error;
      this.notificationService.showError(
        "Erreurs de validation",
        "Veuillez corriger les erreurs dans le formulaire"
      );
    } else if (typeof error === "string" && error.trim()) {
      // Handle general error message
      this.generalError = error;
      this.notificationService.showError("Erreur lors de l'inscription", error);
    } else {
      // Handle fallback error
      const message = fallbackMessage || "Une erreur inconnue s'est produite";
      this.generalError = message;
      this.notificationService.showError(
        "Erreur lors de l'inscription",
        message
      );
    }
  }

  onUpdateUser(): void {
    console.log("[DEBUG] onRegister() appelée");
    console.log("[DEBUG] Données utilisateur:", this.userData);

    // Clear previous errors
    this.validationErrors = {};
    this.generalError = "";

    console.log(
      "[DEBUG] Validation réussie, démarrage inscription...",
      this.userData
    );

    // Handle AGENCY role using the unified register method

    // Prepare agency registration data
    // const registrationData: any = this.userData;
    const registrationData: RegisterUserData =
      this.authService.prepareRegistrationData(this.userData);

    console.log(
      "[DEBUG] Données de modification agence préparées:",
      registrationData
    );
    console.log("[DEBUG] agencyName value:", this.userData.firstName);
    console.log("[DEBUG] agencyId value:", this.userData._id);
    console.log(
      "[DEBUG] agencyDescription value:",
      this.userData.agencyDescription
    );

    this.sharedService
      .updateUser(this.userData._id, registrationData)
      .subscribe({
        next: (response) => {
          // this.isLoading = false;

          console.log("[DEBUG] Réponse modification agence:", response);
          // Use the unified RegisterResponse structure
          const isSuccess = response.success;

          if (isSuccess) {
            this.notificationService.showSuccess(
              "Modification agence réussie",
              "Votre profil a été mis à jour avec succès."
            );
            this.getUser(this.user?._id);
          } else {
            this.handleRegistrationError(response.message || response.error);
          }
        },
        error: (error) => {
          this.handleRegistrationError(error.error || error.message || error);
        },
      });
    return;
  }
}
