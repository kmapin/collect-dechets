import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { AuthService } from "../../../services/auth.service";
import {
  Collection,
  CollectionStatus,
  CollectionRoute,
} from "../../../models/collection.model";
import { RegisterUserData, User } from "../../../models/user.model";
import { ZXingScannerModule } from "@zxing/ngx-scanner";
import { BarcodeFormat } from "@zxing/library";
import { ClientService, ClientApi } from "../../../services/client.service";

interface CollectionPoint {
  id: string;
  address: string;
  doorNumber: string;
  doorColor?: string;
  wasteTypes: string[];
  scheduledTime: Date;
  status: CollectionStatus;
  notes?: string;
  photos?: string[];
  clientName: string;
  priority: "normal" | "urgent";
  estimatedDuration: number;
  distance?: number;
}

interface RouteOptimization {
  totalDistance: number;
  estimatedDuration: number;
  optimizedOrder: string[];
  currentPosition: number;
}

interface IncidentReport {
  id: string;
  collectionId: string;
  type: "non_compliant" | "access_blocked" | "equipment_issue" | "other";
  description: string;
  photos?: string[];
  timestamp: Date;
  location: { latitude: number; longitude: number };
  status: "open" | "resolved";
}

@Component({
  selector: 'app-collector-dashboard',
  imports: [CommonModule, FormsModule, RouterModule, ZXingScannerModule],
  templateUrl: './collector-dashboard.html',
  styleUrl: './collector-dashboard.css'
})
export class CollectorDashboard  implements OnInit {
  currentUser: RegisterUserData | null = null;
  today = new Date();
  selectedView = "today";
  routeStarted = false;
  locationEnabled = false;
  showIncidentModal = false;
  showQrScanner = false;
  lastQrResult: string | null = null;
  selectedDevice: any = null;
  qrFormats = [BarcodeFormat.QR_CODE];
  // scannedClient: ClientApi | null = null;
  scannedClient: any | null = null;
  showClientModal = false;

  // File input pour l'import de QR code
  @ViewChild("fileInput", { static: false })
  fileInput!: ElementRef<HTMLInputElement>;

  // Gestion des erreurs de caméra
  cameraError = false;
  cameraErrorMessage = '';
  availableCameras: any[] = [];

  // Collections data
  collectionPoints: CollectionPoint[] = [];
  currentCollectionIndex = 0;
  currentCollection: CollectionPoint | null = null;
  currentDestination: any = null;
  completedCollections = 0;
  totalCollections = 0;

  // Route optimization
  routeOptimization: RouteOptimization = {
    totalDistance: 0,
    estimatedDuration: 0,
    optimizedOrder: [],
    currentPosition: 0,
  };

  // Collection confirmation
  collectionNotes = "";
  selectedPhotos: any[] = [];

  // Incidents
  todayIncidents: IncidentReport[] = [];
  incidentData = {
    type: "",
    collectionId: "",
    description: "",
  };
  incidentPhotos: any[] = [];

  // History
  recentHistory: any[] = [];

  constructor(
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private clientService: ClientService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    console.log("this.currentUser", this.currentUser);

    this.loadCollectorData();
    this.onQrCodeResult(
      "https://projectwise.onrender.com/api/collecte/scan?id=687fe508693b96642442a30b&ts=1757606939990"
    );
  }

  loadCollectorData(): void {
    this.loadTodayCollections();
    this.loadTodayIncidents();
    this.loadRecentHistory();
    this.initializeRouteOptimization();
  }

  loadTodayCollections(): void {
    // Simuler les collectes du jour
    this.collectionPoints = [
      {
        id: "1",
        address: "15 Rue de la cité, Azimmo",
        doorNumber: "15",
        doorColor: "bleue",
        wasteTypes: ["Déchets ménagers"],
        scheduledTime: new Date("2024-01-15T09:00:00"),
        status: CollectionStatus.SCHEDULED,
        clientName: "GUIGMA W Paulin",
        priority: "normal",
        estimatedDuration: 5,
        distance: 2.3,
      },
      {
        id: "2",
        address: "32 Avenue de la Liberté, Quartier Gargin",
        doorNumber: "32",
        doorColor: "rouge",
        wasteTypes: ["Recyclables"],
        scheduledTime: new Date("2024-01-15T09:30:00"),
        status: CollectionStatus.SCHEDULED,
        clientName: "SANFO Adama",
        priority: "urgent",
        estimatedDuration: 8,
        distance: 1.8,
      },
      {
        id: "3",
        address: "7 Place du Marché, Centre-ville",
        doorNumber: "7",
        wasteTypes: ["Déchets organiques"],
        scheduledTime: new Date("2024-01-15T10:00:00"),
        status: CollectionStatus.COMPLETED,
        clientName: "Tolo Bernard",
        priority: "normal",
        estimatedDuration: 6,
        distance: 0.9,
      },
    ];

    this.totalCollections = this.collectionPoints.length;
    this.completedCollections = this.collectionPoints.filter(
      (p) => p.status === CollectionStatus.COMPLETED
    ).length;
    this.currentCollection =
      this.collectionPoints.find(
        (p) => p.status !== CollectionStatus.COMPLETED
      ) || null;
  }

  loadTodayIncidents(): void {
    this.todayIncidents = [
      {
        id: "1",
        collectionId: "1",
        type: "non_compliant",
        description: "Déchets non triés correctement",
        timestamp: new Date("2024-01-15T08:30:00"),
        location: { latitude: 48.8566, longitude: 2.3522 },
        status: "open",
      },
    ];
  }

  loadRecentHistory(): void {
    this.recentHistory = [
      {
        id: "1",
        clientName: "YARO Juste",
        address: "25 Rue de la Paix",
        collectedDate: new Date("2024-01-14T14:30:00"),
        wasteTypes: ["Déchets ménagers"],
      },
      {
        id: "2",
        clientName: "Djiguemde Fahouziatou",
        address: "18 Boulevard Charles De GAULLE",
        collectedDate: new Date("2024-01-14T15:15:00"),
        wasteTypes: ["Recyclables", "Verre"],
      },
    ];
  }

  initializeRouteOptimization(): void {
    this.routeOptimization = {
      totalDistance: 15.2,
      estimatedDuration: 180,
      optimizedOrder: this.collectionPoints.map((p) => p.id),
      currentPosition: 0,
    };

    this.currentDestination = {
      address: this.collectionPoints[0]?.address,
      distance: this.collectionPoints[0]?.distance,
      estimatedDuration: this.collectionPoints[0]?.estimatedDuration,
    };
  }

  // Actions principales
  startRoute(): void {
    this.routeStarted = true;
    this.notificationService.showSuccess(
      "Tournée démarrée",
      "Bonne collecte !"
    );
  }

  optimizeRoute(): void {
    this.notificationService.showInfo(
      "Optimisation",
      "Itinéraire optimisé avec succès"
    );
  }

  recalculateRoute(): void {
    this.notificationService.showInfo("Recalcul", "Itinéraire recalculé");
  }

  updateView(): void {
    // Mettre à jour la vue selon la sélection
  }

  // Navigation
  navigateToPoint(pointId: string): void {
    this.notificationService.showInfo(
      "Navigation",
      "Ouverture de l'application de navigation"
    );
  }

  openMapsNavigation(): void {
    this.notificationService.showInfo(
      "Navigation",
      "Ouverture dans Google Maps"
    );
  }

  // Confirmation de collecte
  confirmCollection(pointId: string): void {
    const point = this.collectionPoints.find((p) => p.id === pointId);
    if (point) {
      point.status = CollectionStatus.IN_PROGRESS;
      this.currentCollection = point;
    }
  }

  confirmCurrentCollection(): void {
    if (this.currentCollection) {
      this.currentCollection.status = CollectionStatus.COMPLETED;
      this.currentCollection.notes = this.collectionNotes;
      this.currentCollection.photos = this.selectedPhotos.map((p) => p.preview);

      this.completedCollections++;
      this.collectionNotes = "";
      this.selectedPhotos = [];

      // Passer à la collecte suivante
      this.currentCollection =
        this.collectionPoints.find(
          (p) => p.status === CollectionStatus.SCHEDULED
        ) || null;

      this.notificationService.showSuccess(
        "Collecte confirmée",
        "Collecte enregistrée avec succès"
      );
    }
  }

  enableLocation(): void {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.locationEnabled = true;
          this.notificationService.showSuccess(
            "Géolocalisation",
            "Position activée"
          );
        },
        (error) => {
          this.notificationService.showError(
            "Erreur",
            "Impossible d'obtenir la position"
          );
        }
      );
    }
  }

  // Gestion des photos
  onPhotosSelected(event: any): void {
    const files = event.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedPhotos.push({
          file: file,
          preview: e.target.result,
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(photo: any): void {
    this.selectedPhotos = this.selectedPhotos.filter((p) => p !== photo);
  }

  // Gestion des incidents
  submitIncident(): void {
    if (
      this.incidentData.type &&
      this.incidentData.collectionId &&
      this.incidentData.description
    ) {
      const newIncident: IncidentReport = {
        id: Math.random().toString(36).substr(2, 9),
        collectionId: this.incidentData.collectionId,
        type: this.incidentData.type as any,
        description: this.incidentData.description,
        photos: this.incidentPhotos.map((p) => p.preview),
        timestamp: new Date(),
        location: { latitude: 48.8566, longitude: 2.3522 },
        status: "open",
      };

      this.todayIncidents.push(newIncident);
      this.showIncidentModal = false;
      this.incidentData = { type: "", collectionId: "", description: "" };
      this.incidentPhotos = [];

      this.notificationService.showSuccess(
        "Incident signalé",
        "Votre signalement a été transmis"
      );
    }
  }

  onIncidentPhotosSelected(event: any): void {
    const files = event.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.incidentPhotos.push({
          file: file,
          preview: e.target.result,
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeIncidentPhoto(photo: any): void {
    this.incidentPhotos = this.incidentPhotos.filter((p) => p !== photo);
  }

  resolveIncident(incidentId: string): void {
    const incident = this.todayIncidents.find((i) => i.id === incidentId);
    if (incident) {
      incident.status = "resolved";
      this.notificationService.showSuccess(
        "Incident résolu",
        "Incident marqué comme résolu"
      );
    }
  }

  getIncidentIcon(type: string): string {
    const icons = {
      non_compliant: "warning",
      access_blocked: "block",
      equipment_issue: "build",
      other: "help",
    };
    return icons[type as keyof typeof icons] || "help";
  }

  getIncidentTypeText(type: string): string {
    const texts = {
      non_compliant: "Déchets non conformes",
      access_blocked: "Accès bloqué",
      equipment_issue: "Problème d'équipement",
      other: "Autre",
    };
    return texts[type as keyof typeof texts] || type;
  }

  onQrCodeResult(result: string) {
    // S'assurer que nous avons bien une chaîne
    const qrCodeValue = result ?? "";

    // Extraire l'ID de l'URL si c'est une URL complète
    let clientId = qrCodeValue;
    if (qrCodeValue.includes("/api/collecte/scan?id=")) {
      const urlParams = new URLSearchParams(qrCodeValue.split("?")[1]);
      clientId = urlParams.get("id") || qrCodeValue;
    }

    this.lastQrResult = clientId;
    this.showQrScanner = false;
    this.notificationService.showSuccess("QR Code détecté", clientId);
    // Appel API pour récupérer le client
    this.clientService.getClientById(clientId).subscribe({
      next: (client) => {
        this.scannedClient = client?.data;
        console.log("Scanned client :>", this.scannedClient);
        if (this.scannedClient) {
          this.showClientModal = true;
        }
      },
      error: () => {
        this.notificationService.showError(
          "Erreur",
          "Aucun client trouvé pour ce QR code."
        );
      },
    });
  }

  // Méthode helper pour extraire une string de l'événement
  private extractStringFromEvent(event: any): string {
    // Si c'est déjà une string, on la retourne
    if (typeof event === 'string') {
      return event;
    }
    
    // Si c'est un objet avec une propriété text ou data
    if (event && typeof event === 'object') {
      return event.text || event.data || event.toString() || '';
    }
    
    // Sinon, on convertit en string
    return event?.toString() || '';
  }

  // Utilitaires
  getProgressPercentage(): number {
    return this.totalCollections > 0
      ? (this.completedCollections / this.totalCollections) * 100
      : 0;
  }

  getRemainingTime(): string {
    const remaining =
      this.routeOptimization.estimatedDuration - this.completedCollections * 15;
    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;
    return `${hours}h ${minutes}min`;
  }

  getEstimatedEndTime(): string {
    const now = new Date();
    const endTime = new Date(
      now.getTime() + this.routeOptimization.estimatedDuration * 60000
    );
    return endTime.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getRemainingDistance(): number {
    return Math.round(
      this.routeOptimization.totalDistance *
        (1 - this.getProgressPercentage() / 100)
    );
  }

  getRemainingPoints(): number {
    return this.totalCollections - this.completedCollections;
  }

  getOpenIncidents(): number {
    return this.todayIncidents.filter((i) => i.status === "open").length;
  }

  // Nouvelles méthodes pour les boutons
  cancelCollection(): void {
    this.showClientModal = false;
    this.scannedClient = null;
    this.lastQrResult = null;
    this.notificationService.showInfo("Annulé", "Collecte annulée");
  }

  importQrFromFile(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérifier que c'est bien une image
      if (!file.type.startsWith("image/")) {
        this.notificationService.showError(
          "Erreur",
          "Veuillez sélectionner une image valide"
        );
        return;
      }

      // Créer un FileReader pour lire l'image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageData = e.target.result;
        this.processImageForQrCode(imageData);
      };
      reader.readAsDataURL(file);
    }
  }

  private processImageForQrCode(imageData: string): void {
    // Créer un élément image temporaire
    const img = new Image();
    img.onload = () => {
      // Créer un canvas pour traiter l'image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        this.notificationService.showError(
          "Erreur",
          "Impossible de traiter l'image"
        );
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Pour une solution simple, on va utiliser une approche basique
      // Dans un vrai projet, tu devrais utiliser une librairie comme jsQR ou qrcode-reader
      this.notificationService.showInfo(
        "Info",
        "Fonctionnalité d'import en cours de développement. Veuillez utiliser le scanner en direct."
      );

      // Réinitialiser l'input file
      this.fileInput.nativeElement.value = "";
    };
    img.src = imageData;
  }

  // Méthodes pour la gestion des erreurs de caméra
  onScanError(error: any): void {
    console.error('Erreur de scan:', error);
    this.cameraError = true;
    
    if (error.name === 'NotReadableError' || error.name === 'NotAllowedError') {
      this.cameraErrorMessage = 'Permission de caméra refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.';
    } else if (error.name === 'NotFoundError') {
      this.cameraErrorMessage = 'Aucune caméra trouvée. Veuillez connecter une caméra ou utiliser l\'import d\'image.';
    } else {
      this.cameraErrorMessage = 'Erreur d\'accès à la caméra. Veuillez réessayer ou utiliser l\'import d\'image.';
    }
    
    this.notificationService.showError('Erreur Caméra', this.cameraErrorMessage);
  }

  onCamerasFound(cameras: any[]): void {
    this.availableCameras = cameras;
    console.log('Caméras disponibles:', cameras);
    
    if (cameras.length === 0) {
      this.cameraError = true;
      this.cameraErrorMessage = 'Aucune caméra détectée sur cet appareil.';
      this.notificationService.showError('Erreur Caméra', 'Aucune caméra détectée');
    }
  }

  retryCamera(): void {
    this.cameraError = false;
    this.cameraErrorMessage = '';
    
    // Réinitialiser le scanner
    this.showQrScanner = false;
    setTimeout(() => {
      this.showQrScanner = true;
    }, 100);
    
    this.notificationService.showInfo('Info', 'Tentative de reconnexion à la caméra...');
  }

  useFileImport(): void {
    this.showQrScanner = false;
    this.importQrFromFile();
  }

  // Méthode pour ouvrir le scanner QR avec vérification des permissions
  async openQrScanner(): Promise<void> {
    try {
      // Vérifier si le navigateur supporte la caméra
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.notificationService.showError(
          'Erreur', 
          'Votre navigateur ne supporte pas l\'accès à la caméra. Veuillez utiliser l\'import d\'image.'
        );
        return;
      }

      // Vérifier les permissions
      const hasPermission = await this.checkCameraPermissions();
      if (!hasPermission) {
        this.notificationService.showError(
          'Permission refusée', 
          'Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.'
        );
        return;
      }

      // Réinitialiser l'état d'erreur et ouvrir le scanner
      this.cameraError = false;
      this.cameraErrorMessage = '';
      this.showQrScanner = true;
      
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du scanner:', error);
      this.notificationService.showError(
        'Erreur', 
        'Impossible d\'accéder à la caméra. Veuillez utiliser l\'import d\'image.'
      );
    }
  }

  // Méthode pour vérifier les permissions de caméra
  async checkCameraPermissions(): Promise<boolean> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur de permission caméra:', error);
      return false;
    }
  }
}
