import { City } from './../../models/countries-org.model';
import { map } from 'rxjs';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import * as L from "leaflet";

import { FormsModule } from "@angular/forms";
import { AuthService } from "../../services/auth.service";
import { RegisterUserData, User } from "../../models/user.model";
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
export class Profile implements OnInit, OnDestroy {
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

  // Pour agency
  allServices: string[] = [
    "Collecte ménagère",
    "Recyclage",
    "Collecte industrielle",
    "Collecte spéciale",
    "Traitement déchets dangereux",
  ];
  isLoading: boolean = false;
  currentUserId: string | null = null;

  // ── Position géographique réelle (chantier "coordonnées client") ─────────
  // Setter plutôt qu'un @ViewChild classique : cette carte vit dans une section
  // affichée seulement `@if (user?.role === 'client')`, donc le <div> n'existe pas
  // encore au moment de ngOnInit/ngAfterViewInit — le setter est rappelé par Angular
  // dès que l'élément apparaît réellement dans le DOM (une fois `user` chargé).
  private profileMap?: L.Map;
  private profileMarker?: L.Marker;
  isLocatingMe = false;
  @ViewChild('profileMapEl') set profileMapEl(el: ElementRef<HTMLDivElement> | undefined) {
    if (el && !this.profileMap) this._initProfileMap(el.nativeElement);
  }

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

  ngOnDestroy(): void {
    this.profileMap?.remove();
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
      // La carte peut déjà exister si l'utilisateur avait déjà le rôle 'client' au
      // premier rendu (le setter @ViewChild ne se redéclenche pas juste parce que
      // `userData` change) — on repositionne alors le marqueur sur la vraie valeur
      // fraîchement chargée depuis le serveur, plutôt que de la laisser sur 0/0.
      if (this.profileMap) {
        this._setProfileMarkerPosition(
          this.userData.address.latitude || this.DEFAULT_MAP_CENTER[0],
          this.userData.address.longitude || this.DEFAULT_MAP_CENTER[1],
        );
      }
    });
    console.log("Current User", this.user);
  }

  // Centre par défaut (Ouagadougou) — utilisé uniquement tant qu'aucune coordonnée
  // réelle n'est encore enregistrée pour ce client (latitude/longitude à 0).
  private readonly DEFAULT_MAP_CENTER: [number, number] = [12.3714, -1.5197];

  private _initProfileMap(container: HTMLDivElement): void {
    const lat = this.userData.address.latitude || this.DEFAULT_MAP_CENTER[0];
    const lng = this.userData.address.longitude || this.DEFAULT_MAP_CENTER[1];

    this.profileMap = L.map(container, { center: [lat, lng], zoom: 15, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(this.profileMap);

    // Icône explicite : l'icône par défaut de Leaflet référence des images relatives
    // (images/marker-icon.png) qui ne survivent pas au bundling Angular — sans ceci le
    // marqueur s'affiche comme une image cassée. Même contournement déjà utilisé dans
    // ce projet pour la position utilisateur sur la carte d'accueil (home.ts).
    const pinIcon = L.icon({
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    this.profileMarker = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(this.profileMap);
    this.profileMarker.on('dragend', () => {
      const pos = this.profileMarker!.getLatLng();
      this._applyPosition(pos.lat, pos.lng);
    });
    // Cliquer ailleurs sur la carte déplace aussi le marqueur — plus rapide qu'un
    // glisser-déposer précis pour une première position approximative.
    this.profileMap.on('click', (e: L.LeafletMouseEvent) => {
      this._applyPosition(e.latlng.lat, e.latlng.lng);
    });

    // Le conteneur peut être mesuré avec une taille nulle si la section vient tout
    // juste de devenir visible (transition CSS/reflow pas encore terminé) — sans ce
    // recalcul différé, Leaflet peut afficher une carte grise tant qu'aucun geste
    // utilisateur (zoom/pan) ne force un redraw.
    setTimeout(() => this.profileMap?.invalidateSize(), 200);
  }

  private _setProfileMarkerPosition(lat: number, lng: number): void {
    this.profileMarker?.setLatLng([lat, lng]);
    this.profileMap?.setView([lat, lng], this.profileMap.getZoom());
  }

  private _applyPosition(lat: number, lng: number): void {
    this.userData.address.latitude = lat;
    this.userData.address.longitude = lng;
    this._setProfileMarkerPosition(lat, lng);
  }

  /**
   * Utilise la géolocalisation réelle de l'appareil (plus précise qu'un
   * clic approximatif sur la carte) — l'utilisateur doit ensuite cliquer sur
   * "Modifier le compte" pour persister, exactement comme les autres champs
   * de ce formulaire (aucun appel réseau supplémentaire introduit ici).
   */
  useMyLocation(): void {
    if (this.isLocatingMe) return;
    if (!navigator.geolocation) {
      this.notificationService.showError('Erreur', "La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    // Les navigateurs refusent la géolocalisation hors "contexte sécurisé" (HTTPS, ou
    // localhost) — sans cette vérification, getCurrentPosition() renvoie un message
    // d'erreur brut du navigateur ("Only secure origins are allowed...") peu clair pour
    // l'utilisateur final. Vérifié AVANT l'appel plutôt que découvert seulement via
    // l'échec, pour donner tout de suite un message exploitable.
    if (!window.isSecureContext) {
      this.notificationService.showError(
        'Géolocalisation indisponible',
        "La géolocalisation nécessite une connexion sécurisée (HTTPS). Placez votre position manuellement sur la carte en attendant.",
      );
      return;
    }
    this.isLocatingMe = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocatingMe = false;
        this._applyPosition(position.coords.latitude, position.coords.longitude);
        this.notificationService.showSuccess('Position détectée', "Votre position a été placée sur la carte — n'oubliez pas d'enregistrer.");
      },
      (error) => {
        this.isLocatingMe = false;
        const detail = error.code === error.PERMISSION_DENIED
          ? "Vous avez refusé l'accès à votre position — autorisez la géolocalisation dans les réglages de votre navigateur, ou placez votre position manuellement sur la carte."
          : "Impossible d'obtenir votre position. Placez-la manuellement sur la carte.";
        this.notificationService.showError('Géolocalisation indisponible', detail);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
    if (this.isLoading) return;
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

    this.isLoading = true;
    this.sharedService
      .updateUser(this.userData._id, registrationData)
      .subscribe({
        next: (response) => {
          this.isLoading = false;

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
          this.isLoading = false;
          this.handleRegistrationError(error.error || error.message || error);
        },
      });
    return;
  }
}
