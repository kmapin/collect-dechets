import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { AuthService } from "../../../services/auth.service";
import {
  CollectorPlanningService,
  CollectorCollecte,
  CollectorPlanning,
  ScanByAccountPayload,
  ScanByLocationPayload,
  CreateSignalementPayload,
} from "../../../services/collector-planning.service";
import {
  Collection,
  CollectionStatus,
  CollectionRoute,
} from "../../../models/collection.model";
import { RegisterUserData, User } from "../../../models/user.model";
import { ZXingScannerModule } from "@zxing/ngx-scanner";
import { BarcodeFormat } from "@zxing/library";
import { ClientService, ClientApi } from "../../../services/client.service";
import { ScrollLockDirective } from "../../../shared/scroll-lock.directive";

interface CollectionPoint {
  id: string;
  clientId: string;
  serviceLocationId: string | null;
  neighborhood: string;
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
  raw: CollectorCollecte;
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

// Catégories affichées au collecteur (langage métier terrain) -> catégories
// réellement acceptées par l'API Signalement (config/..., services/signalement.service.js
// TYPES_VALIDES) — les deux catalogues ne correspondent pas terme à terme, la
// description/le commentaire libre porte le détail exact, le `type` ne sert
// qu'à la catégorisation grossière côté agence.
const INCIDENT_TYPE_TO_SIGNALEMENT_TYPE: Record<string, CreateSignalementPayload["type"]> = {
  non_compliant: "compliance_issue",
  access_blocked: "other",
  equipment_issue: "technical_issue",
  other: "other",
};

@Component({
  selector: 'app-collector-dashboard',
  imports: [CommonModule, FormsModule, RouterModule, ZXingScannerModule, ScrollLockDirective],
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
  isLoadingCollections = false;

  // Payload de scan QR en attente de confirmation (rempli par onQrCodeResult,
  // consommé par confirmCurrentCollection) — voir le commentaire de cette
  // dernière pour le choix de réutiliser le même point d'entrée pour la
  // confirmation manuelle ET le scan QR.
  private pendingScanPayload: ScanByLocationPayload | ScanByAccountPayload | null = null;

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
    private clientService: ClientService,
    private collectorPlanningService: CollectorPlanningService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadCollectorData();
  }

  loadCollectorData(): void {
    this.loadTodayCollections();
  }

  // TEMPS-REEL-WEBSOCKET.md §4 (Collecteur) — remplace les données inventées
  // par le vrai planning du jour (GET /api/planning/collector/:id/collectes,
  // services/planning.js::getTeamPlanningCollectesForCollector) : résout les
  // plannings actifs de l'équipe de ce collecteur, puis les Collecte dues
  // AUJOURD'HUI pour ces plannings — même source que ce qui alimente déjà les
  // notifications temps réel de planning (resolvePlanningRecipients), donc ce
  // que voit le collecteur ici correspond exactement à ce pour quoi il est
  // notifié.
  loadTodayCollections(): void {
    const collectorId = (this.currentUser as any)?._id;
    if (!collectorId) return;

    this.isLoadingCollections = true;
    this.collectorPlanningService.getTodayCollectes(collectorId).subscribe({
      next: (data) => {
        const points: CollectionPoint[] = [];
        for (const planning of data.plannings) {
          for (const collecte of planning.collectes) {
            points.push(this.mapToCollectionPoint(planning, collecte));
          }
        }
        this.collectionPoints = points;
        this.totalCollections = points.length;
        this.completedCollections = points.filter(
          (p) => p.status === CollectionStatus.COMPLETED
        ).length;
        this.currentCollection =
          points.find((p) => p.status !== CollectionStatus.COMPLETED) || null;

        this.recentHistory = points
          .filter((p) => p.status === CollectionStatus.COMPLETED)
          .map((p) => ({
            id: p.id,
            clientName: p.clientName,
            address: p.address,
            collectedDate: new Date(),
            wasteTypes: p.wasteTypes,
          }));

        this.initializeRouteOptimization();
        this.isLoadingCollections = false;
      },
      error: () => {
        this.notificationService.showInfo(
          "Info",
          "Impossible de charger les collectes du jour pour le moment."
        );
        this.isLoadingCollections = false;
      },
    });
  }

  private mapToCollectionPoint(
    planning: CollectorPlanning,
    c: CollectorCollecte
  ): CollectionPoint {
    const addr = c.serviceLocation?.address || c.client?.address || {};
    const clientName = c.client
      ? `${c.client.firstName ?? ""} ${c.client.lastName ?? ""}`.trim()
      : "Client";
    const dateStr = (planning.date || "").toString().slice(0, 10);

    return {
      id: c.collecteId,
      clientId: c.client?._id || "",
      serviceLocationId: c.serviceLocation?._id || null,
      neighborhood: addr?.neighborhood || "",
      address: [addr?.doorNumber, addr?.street, addr?.neighborhood, addr?.city]
        .filter(Boolean)
        .join(", "),
      doorNumber: addr?.doorNumber || "",
      doorColor: addr?.doorColor,
      wasteTypes: c.wasteType ? [c.wasteType] : [],
      scheduledTime: dateStr
        ? new Date(`${dateStr}T${planning.startTime || "08:00"}`)
        : new Date(),
      // Le statut 'Completed' n'existe pas réellement sur Collecte (voir
      // models/Collecte.js) — c'est le libellé déjà utilisé par CE template
      // (collector-dashboard.html) pour l'état "fait" ; 'Collected' (le vrai
      // statut backend) y est mappé pour réutiliser le même style existant.
      status:
        c.status === "Collected"
          ? CollectionStatus.COMPLETED
          : c.status === "Scheduled"
          ? CollectionStatus.SCHEDULED
          : (c.status as CollectionStatus),
      clientName,
      priority: "normal",
      estimatedDuration: 5,
      raw: c,
    };
  }

  initializeRouteOptimization(): void {
    this.routeOptimization = {
      totalDistance: 0,
      estimatedDuration: this.collectionPoints.reduce(
        (sum, p) => sum + p.estimatedDuration,
        0
      ),
      optimizedOrder: this.collectionPoints.map((p) => p.id),
      currentPosition: 0,
    };

    this.currentDestination = this.collectionPoints[0]
      ? {
          address: this.collectionPoints[0].address,
          distance: this.collectionPoints[0].distance,
          estimatedDuration: this.collectionPoints[0].estimatedDuration,
        }
      : null;
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

  // Confirmation de collecte — bascule localement en "en cours" pendant que
  // le collecteur saisit notes/photos ; la validation RÉELLE (celle qui
  // modifie la Collecte en base) n'a lieu qu'à confirmCurrentCollection().
  confirmCollection(pointId: string): void {
    const point = this.collectionPoints.find((p) => p.id === pointId);
    if (point) {
      point.status = CollectionStatus.IN_PROGRESS;
      this.currentCollection = point;
    }
  }

  // Point d'entrée UNIQUE de validation réelle d'une collecte — appelé à la
  // fois par le bouton "Confirmer la collecte" (sans QR, collecte déjà
  // sélectionnée via confirmCollection) ET par le bouton "Confirmer" de la
  // fenêtre de scan QR (pendingScanPayload déjà rempli par onQrCodeResult).
  // Les deux chemins appellent la MÊME route backend (POST /api/collecte/scan,
  // services/qrValidation.js) — sans scan réel, on reconstruit le format
  // historique "par compte" ({code, id, name}) à partir des données déjà
  // chargées pour cette collecte, que le backend revalide intégralement
  // (jamais une confiance aveugle dans ce que le frontend envoie).
  confirmCurrentCollection(): void {
    if (!this.currentCollection) return;

    const payload =
      this.pendingScanPayload ?? this.buildAccountScanPayload(this.currentCollection);
    if (!payload) {
      this.notificationService.showInfo(
        "Info",
        "Informations insuffisantes pour valider cette collecte (nom/quartier manquant)."
      );
      return;
    }

    this.collectorPlanningService.scanCollecte(payload).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          "Collecte confirmée",
          "Collecte enregistrée avec succès"
        );
        this.collectionNotes = "";
        this.selectedPhotos = [];
        this.pendingScanPayload = null;
        this.showClientModal = false;
        this.scannedClient = null;
        this.lastQrResult = null;
        this.loadTodayCollections();
      },
      error: (err) => {
        this.notificationService.showError("Erreur", this.describeScanError(err));
      },
    });
  }

  private buildAccountScanPayload(point: CollectionPoint): ScanByAccountPayload | null {
    if (!point.clientId || !point.neighborhood || !point.clientName) return null;
    return { code: point.neighborhood, id: point.clientId, name: point.clientName };
  }

  private describeScanError(err: any): string {
    const code = err?.error?.code;
    switch (code) {
      case "AMBIGUOUS_COLLECTE":
        return "Plusieurs collectes correspondent à ce client aujourd'hui — désambiguïsation impossible.";
      case "COLLECTE_NOT_SCHEDULABLE":
        return "Cette collecte n'est plus programmée (déjà traitée ou annulée).";
      case "COLLECTE_NOT_ASSIGNED":
        return "Cette collecte n'est affectée à aucun collecteur/équipe.";
      case "UNAUTHORIZED_COLLECTE_ACCESS":
        return "Cette collecte ne vous est pas affectée.";
      case "NOT_FOUND":
        return "Aucune collecte programmée trouvée pour aujourd'hui.";
      default:
        return err?.error?.message || "Impossible de valider cette collecte pour le moment.";
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
          this.notificationService.showInfo(
            "Info",
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

  // Gestion des incidents — persiste réellement via POST /api/signalements
  // (services/signalement.service.js) au lieu de ne garder l'incident qu'en
  // mémoire locale. Les photos prises restent pour l'instant un aperçu local
  // uniquement : aucune route d'upload générique n'existe côté backend pour
  // les signalements (seule routes/planning.js::POST /:id/incidents a un
  // multer déjà branché, pour un besoin différent) — à ajouter séparément si
  // besoin, plutôt que d'envoyer des data URL brutes dans le JSON.
  submitIncident(): void {
    if (
      !(
        this.incidentData.type &&
        this.incidentData.collectionId &&
        this.incidentData.description
      )
    ) {
      return;
    }

    const signalementType =
      INCIDENT_TYPE_TO_SIGNALEMENT_TYPE[this.incidentData.type] ?? "other";

    this.collectorPlanningService
      .createSignalement({
        collecteId: this.incidentData.collectionId,
        type: signalementType,
        severity: "medium",
        description: this.incidentData.description,
        comment: this.incidentData.description,
      })
      .subscribe({
        next: (res) => {
          const newIncident: IncidentReport = {
            id: res?.data?._id || Math.random().toString(36).substr(2, 9),
            collectionId: this.incidentData.collectionId,
            type: this.incidentData.type as any,
            description: this.incidentData.description,
            photos: this.incidentPhotos.map((p) => p.preview),
            timestamp: new Date(),
            location: { latitude: 0, longitude: 0 },
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
        },
        error: () => {
          this.notificationService.showError(
            "Erreur",
            "Impossible d'envoyer le signalement pour le moment."
          );
        },
      });
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

  // Résolution locale uniquement (vue du collecteur sur SES PROPRES
  // signalements) — la résolution faisant foi (agence) reste gérée via
  // pages/shared_pages/signalement, jamais dupliquée ici.
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

  // Scan QR — deux formats réels possibles (services/serviceLocation.js::
  // getServiceLocationQrCode et services/auth.js::genereateQRCodeForUser),
  // toujours du JSON, jamais une URL (l'ancien déclenchement de test avec une
  // fausse URL projectwise.onrender.com a été retiré de ngOnInit). N'appelle
  // PAS le backend tout de suite : prépare le payload + un aperçu, la
  // validation réelle n'a lieu qu'au clic sur "Confirmer"
  // (confirmCurrentCollection), pour laisser le collecteur vérifier qu'il
  // scanne le bon client avant d'agir.
  onQrCodeResult(result: string) {
    this.showQrScanner = false;
    this.lastQrResult = result;

    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch {
      this.notificationService.showInfo(
        "QR invalide",
        "Ce code ne correspond pas à un QR ZéroDéchet+."
      );
      return;
    }

    if (parsed?.serviceLocationId && parsed?.qrToken) {
      this.pendingScanPayload = {
        serviceLocationId: parsed.serviceLocationId,
        qrToken: parsed.qrToken,
      };
      const match = this.collectionPoints.find(
        (p) => p.serviceLocationId === parsed.serviceLocationId
      );
      this.scannedClient = match
        ? this.toScannedClientPreview(match)
        : { firstName: "Lieu", lastName: "scanné", address: {} };
    } else if (parsed?.id && parsed?.code && parsed?.name) {
      this.pendingScanPayload = {
        code: parsed.code,
        id: parsed.id,
        name: parsed.name,
      };
      const match = this.collectionPoints.find((p) => p.clientId === parsed.id);
      this.scannedClient = match
        ? this.toScannedClientPreview(match)
        : { firstName: parsed.name, lastName: "", address: { neighborhood: parsed.code } };
    } else {
      this.notificationService.showInfo(
        "QR invalide",
        "Format de QR non reconnu."
      );
      return;
    }

    this.currentCollection = this.collectionPoints.find(
      (p) =>
        p.clientId === this.pendingScanPayload?.["id" as never] ||
        p.serviceLocationId === (this.pendingScanPayload as ScanByLocationPayload)?.serviceLocationId
    ) || this.currentCollection;

    this.showClientModal = true;
  }

  private toScannedClientPreview(point: CollectionPoint): any {
    const [firstName, ...rest] = point.clientName.split(" ");
    return {
      firstName,
      lastName: rest.join(" "),
      phone: point.raw.client?.phone,
      subscriptionStatus: "actif",
      address: {
        doorNumber: point.doorNumber,
        doorColor: point.doorColor,
        street: point.raw.serviceLocation?.address?.street,
        neighborhood: point.neighborhood,
        city: point.raw.serviceLocation?.address?.city || point.raw.client?.address?.city,
        arrondissement: point.raw.serviceLocation?.address?.arrondissement,
        sector: point.raw.serviceLocation?.address?.sector,
        postalCode: point.raw.serviceLocation?.address?.postalCode,
      },
    };
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
    this.pendingScanPayload = null;
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
        this.notificationService.showInfo(
          "Info",
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
        this.notificationService.showInfo(
          "Info",
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

    this.notificationService.showInfo('Info Caméra', this.cameraErrorMessage);
  }

  onCamerasFound(cameras: any[]): void {
    this.availableCameras = cameras;
    console.log('Caméras disponibles:', cameras);

    if (cameras.length === 0) {
      this.cameraError = true;
      this.cameraErrorMessage = 'Aucune caméra détectée sur cet appareil.';
      this.notificationService.showInfo('Info Caméra', 'Aucune caméra détectée');
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
        this.notificationService.showInfo(
          'Info',
          'Votre navigateur ne supporte pas l\'accès à la caméra. Veuillez utiliser l\'import d\'image.'
        );
        return;
      }

      // Vérifier les permissions
      const hasPermission = await this.checkCameraPermissions();
      if (!hasPermission) {
        this.notificationService.showInfo(
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
      this.notificationService.showInfo(
        'Info',
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
