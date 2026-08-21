import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule, DatePipe, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AgencyService } from '../../../services/agency.service';
import { RegisterUserData } from '../../../models/user.model';
interface Incident {
  _id: string;
  agency?: {
    _id: string;
    name?: string;
  };
  agencyId?: {
    _id: string;
    name?: string;
  };
  clientId?:{
    _id: string;
    firstName?: string;
    lastName ?:string;
    email?:string
  };
  collectorId?: {
    _id: string;
    firstName?: string;
    lastName ?:string;
    email?:string
  }
  reportedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  photos?: string[];
  // Optionnel : le vrai backend (GET /api/signalements) ne renvoie jamais ce champ à plat,
  // seulement `agencyId.name` une fois peuplé — typé requis jusqu'ici, ce qui rendait le
  // fallback `?? incident.agencyName ?? '—'` du drawer de détail toujours mort selon TS.
  agencyName?: string;
  type:
    | "missed_collection"
    | "compliance_issue"
    | "complaint"
    | "technical_issue";
  comment: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  date: Date;
  // "open"/"in_progress"/"resolved" : valeurs réelles de Signalement.status (models/Signalement.js).
  // 'pending'/'Collected'/'Reported'/'Scheduled' ne subsistent que pour d'éventuelles
  // données historiques Collecte-based non migrées.
  status: "open" | "in_progress" | "pending" | "resolved" | 'Collected' | 'Reported' | 'Scheduled';
  /** Champ réel Collecte.resolutionTeamId (renommé depuis assignedTeamId, Phase 2 du
   * nettoyage Planning/Signalement/Assignation) — l'équipe à qui le signalement a été
   * affecté pour résolution. Distinct de `collectorId` (le collecteur de la collecte
   * planifiée d'origine, sans rapport avec le traitement du signalement) et
   * d'`executedByTeamId` (l'équipe qui devait EXÉCUTER la collecte). */
  resolutionTeamId?: { _id: string; name?: string } | null;
  /** Champ réel Collecte.resolutionStatus — `status` ci-dessus reste 'Reported' pour
   * toujours après résolution, donc c'est le seul champ qui indique un signalement traité. */
  resolutionStatus?: "pending" | "in_progress" | "resolved";
  createdAt?: Date;
  updatedAt?: Date;
  // Champs du modèle Signalement unifié (Prompt 04 backend / Prompt 06 frontend) —
  // absents des anciens signalements Collecte-based.
  collecteId?: string | null;
  planningId?: { _id: string; reference?: string; libelle?: string; date?: Date } | null;
  origine?: "collecte" | "independant";
  // Renseigné par PATCH /signalements/:id/resolve une fois status='resolved'.
  resolutionComment?: string;
  resolvedAt?: Date;
}
@Component({
  selector: 'app-signalement',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signalement.html',
  styleUrl: './signalement.scss',
})


export class Signalement implements OnDestroy {

  @Input() incidents: Incident[] = [];
  @Input() currentUser:RegisterUserData | null = null;
  filteredIncidents: Incident[] = [];


  //Filter 

  incidentsFilter: "all" | "open" | "pending" | "resolved" = "all";
  severityFilter: "all" | "Low" | "Medium" | "High" | "Critical" = "all";


  //Loading states 

  @Output() isLoadingIncidents = new EventEmitter<boolean>()
  /**
   * Remplace l'ancien `assignReport: EventEmitter<Incident>` (Prompt 06) : celui-ci
   * n'émettait que l'incident brut, sans aucune équipe choisie — le vrai backend
   * (`PATCH /collectes/:id/assign-team`) exige un `teamId`, qu'aucune UI ne permettait
   * de sélectionner jusqu'ici (le bouton "Assigner" et le bouton "Traiter" faisaient
   * tous deux le même emit sans sélection réelle). Le picker d'équipe vit maintenant
   * ici, dans le composant partagé, et n'émet qu'une fois une équipe confirmée.
   */
  @Output() assignReportToTeam = new EventEmitter<{ incidentId: string; teamId: string }>();
  // resoudre un incident signaler emetter
  @Output() resolvedIncident = new EventEmitter<string>() ;

  // Team picker (Prompt 06)
  showTeamPickerModal = false;
  teamPickerIncident: Incident | null = null;
  teams: any[] = [];
  selectedTeamId = '';
  isLoadingTeams = false;

  // Pagination
  pageSize = 10;
  currentPage = 1;

  get pagedIncidents(): Incident[] {
    const source = this.filteredIncidents.length ? this.filteredIncidents : this.incidents;
    const start = (this.currentPage - 1) * this.pageSize;
    return source.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    const total = this.filteredIncidents.length ? this.filteredIncidents.length : this.incidents.length;
    return Math.ceil(total / this.pageSize) || 1;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }
    constructor(
      private authService: AuthService,
      private agencyService: AgencyService,
      // private collectionService: CollectionService,
      // private adminService: Admin,
      // private clientService: ClientService,
      private notificationService: NotificationService,
      // private sharedService: SharedService,
      private router: Router,
      private cd: ChangeDetectorRef
    ) {
      this.currentUser = this.authService.getCurrentUser();
      console.log("currentUser", this.currentUser);
    }

  filterIncidents(): void {
    this.filteredIncidents = this.incidents.filter((incident) => {
      const statusMatch =
        this.incidentsFilter === "all" ||
        incident.status === this.incidentsFilter;
      const severityMatch =
        this.severityFilter === "all" ||
        incident.severity === this.severityFilter;
      return statusMatch && severityMatch;
    });
    this.currentPage = 1;
  }
  showPicture: boolean = false;
  showPictures(): void {
    this.showPicture = !this.showPicture
  }

  investigateIncident(incidentId: string): void {
    const incident = this.incidents.find((i) => i._id === incidentId);
    if (incident) {
      incident.status = "pending";
      this.filterIncidents();
      this.notificationService.showSuccess(
        "Enquête",
        "Incident pris en charge pour enquête"
      );
    }
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      critical: "error",
      high: "warning",
      medium: "info",
      low: "help",
    };
    return icons[severity as keyof typeof icons] || "help";
  }

  getSeverityText(severity: string): string {
    const texts = {
      critical: "Critique",
      high: "Élevée",
      medium: "Moyenne",
      low: "Faible",
    };
    return texts[severity as keyof typeof texts] || severity;
  }

  getIncidentTypeText(type: string): string {
    const types = {
      missed_collection: "Collecte manquée",
      compliance_issue: "Non-conformité",
      complaint: "Réclamation",
      technical_issue: "Problème technique",
      problem: "Collecte manquée",
      regular: "Incident non précisé",
    };
    return types[type as keyof typeof types] || type;
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      open: "Ouvert",
      pending: "En cours",
      // Valeur réelle du nouveau modèle Signalement unifié (Prompt 04/05) —
      // absente jusqu'ici, s'affichait en texte brut non traduit.
      in_progress: "En cours",
      resolved: "Résolu",
      reported : "En cours",
      scheduled: "Programmée",
      collected: "Effectuée",

    };
    return statuses[status as keyof typeof statuses] || status;
  }

  // Détail d'un signalement — même principe que le drawer d'admin-dashboard.ts
  // (openIncidentDrawer/visibleIncidentDrawer), absent jusqu'ici de ce composant partagé :
  // seules les actions rapides (assigner/résoudre/voir photo/contacter) étaient possibles
  // depuis la ligne/carte, aucune vue détaillée complète du signalement.
  visibleIncidentDrawer = false;
  detailIncident: Incident | null = null;

  openIncidentDrawer(incident: Incident): void {
    this.detailIncident = incident;
    this.visibleIncidentDrawer = true;
    this.actualiserDrawerOuvertSurBody();
  }

  closeIncidentDrawer(): void {
    this.visibleIncidentDrawer = false;
    this.detailIncident = null;
    this.actualiserDrawerOuvertSurBody();
  }

  // Bug remonté en usage réel : le drawer ".drawer-overlay" (position: fixed, censé
  // couvrir tout le viewport) apparaissait confiné à la zone de la carte "Historique de
  // mes signalements" plutôt qu'en plein écran. Cause : `.card:hover` (styles.scss,
  // classe globale très utilisée) applique un `transform`, et un `transform` sur un
  // ANCÊTRE crée un nouveau bloc de référence pour tout descendant en `position: fixed`
  // — le fixed cesse alors d'être relatif au viewport et devient relatif à cet ancêtre
  // transformé (piège CSS connu). Le survol reste actif juste après le clic qui ouvre le
  // drawer (le curseur n'a pas bougé), donc le bug était systématique dans cet usage.
  // Correctif : neutraliser ce transform le temps qu'un drawer de ce composant est ouvert
  // (classe posée sur <body>, règle globale dans styles.scss) — plutôt que de retirer
  // l'effet de survol de `.card` pour toute l'application.
  private actualiserDrawerOuvertSurBody(): void {
    const unDrawerEstOuvert = this.visibleIncidentDrawer || !!this.selectedImage || this.showTeamPickerModal;
    document.body.classList.toggle('signalement-drawer-open', unDrawerEstOuvert);
  }

  // Évite une classe restée collée sur <body> si le composant est détruit (changement
  // de page) pendant qu'un drawer était encore ouvert.
  ngOnDestroy(): void {
    document.body.classList.remove('signalement-drawer-open');
  }

  selectedImage: string | null = null;
  incidentSelected: Incident | null = null;
  openImageModal(imageUrl: string, incident: Incident): void {
    this.selectedImage = imageUrl;
    this.incidentSelected = incident;
    this.actualiserDrawerOuvertSurBody();
  }

  closeImageModal(): void {
    this.selectedImage = null;
    this.actualiserDrawerOuvertSurBody();
  }
  resolveIncident(incidentId: string): void {
  this.resolvedIncident.emit(incidentId);
    
  }

  //For Actons butttons
  contactAgency(agencyId?: string): void {
    this.router.navigate(["/agencies", agencyId]);
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact"
    );
  }

  contactAgencyForIncident(agencyId?: string): void {
    this.contactAgency(agencyId);
  }

  // Une équipe n'est sélectionnable dans le picker que si elle est réellement
  // disponible (TeamV2.status === 'active') — les autres statuts
  // ('inactive'|'on_mission'|'maintenance') restent visibles mais grisés,
  // plutôt que masqués, pour que le manager comprenne pourquoi une équipe
  // qu'il connaît n'apparaît pas sélectionnable.
  isTeamAvailable(team: any): boolean {
    return !team?.status || team.status === 'active';
  }

  getTeamStatusLabel(team: any): string {
    const labels: Record<string, string> = {
      inactive: 'Inactive',
      on_mission: 'En mission',
      maintenance: 'En maintenance',
    };
    return labels[team?.status] || 'Indisponible';
  }

  //Assigner un incident à une équipe (Prompt 06) — remplace les 2 anciens boutons
  //("Assigner"/"Traiter") qui faisaient tous deux le même emit sans choix d'équipe.
  openTeamPicker(incident: Incident): void {
    this.teamPickerIncident = incident;
    this.selectedTeamId = incident.resolutionTeamId?._id ?? '';
    this.showTeamPickerModal = true;
    this.actualiserDrawerOuvertSurBody();
    this.teams = [];
    const agencyId = incident.agencyId?._id ?? incident.agency?._id;
    if (!agencyId) return;
    this.isLoadingTeams = true;
    this.agencyService.getTeamsV2$(agencyId).subscribe({
      next: (teams) => {
        this.teams = teams || [];
        this.isLoadingTeams = false;
      },
      error: () => {
        this.teams = [];
        this.isLoadingTeams = false;
      },
    });
  }

  closeTeamPicker(): void {
    this.showTeamPickerModal = false;
    this.teamPickerIncident = null;
    this.selectedTeamId = '';
    this.actualiserDrawerOuvertSurBody();
  }

  confirmAssignTeam(): void {
    if (!this.teamPickerIncident || !this.selectedTeamId) return;
    this.assignReportToTeam.emit({ incidentId: this.teamPickerIncident._id, teamId: this.selectedTeamId });
    this.closeTeamPicker();
  }

}
