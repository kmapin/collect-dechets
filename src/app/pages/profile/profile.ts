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
      if (this.user.address.city) {
        this.onCityChange(this.user.address.city);
      }
      if (this.profileMap) {
        this._setProfileMarkerPosition(
          this.userData.address.latitude || this.DEFAULT_MAP_CENTER[0],
          this.userData.address.longitude || this.DEFAULT_MAP_CENTER[1],
        );
      }
    });
    console.log("Current User", this.user);
  }

  private readonly DEFAULT_MAP_CENTER: [number, number] = [12.3714, -1.5197];

  private _initProfileMap(container: HTMLDivElement): void {
    const lat = this.userData.address.latitude || this.DEFAULT_MAP_CENTER[0];
    const lng = this.userData.address.longitude || this.DEFAULT_MAP_CENTER[1];

    this.profileMap = L.map(container, { center: [lat, lng], zoom: 15, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(this.profileMap);

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
    this.profileMap.on('click', (e: L.LeafletMouseEvent) => {
      this._applyPosition(e.latlng.lat, e.latlng.lng);
    });

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

  useMyLocation(): void {
    if (this.isLocatingMe) return;
    if (!navigator.geolocation) {
      this.notificationService.showError('Erreur', "La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
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
