import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule, DatePipe } from '@angular/common';
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
  photos?:[];
  agencyName: string;
  type:
    | "missed_collection"
    | "compliance_issue"
    | "complaint"
    | "technical_issue";
  comment: string;
  description: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  date: Date;
  status: "open" | "pending" | "resolved"|'Collected' |'Reported'|'Scheduled';
  assignedTo?: string;
}
@Component({
  selector: 'app-signalement',
  imports: [CommonModule],
  templateUrl: './signalement.html',
  styleUrl: './signalement.scss',
})


export class Signalement {

  @Input() incidents: Incident[] = [];
  @Input() currentUser:RegisterUserData | null = null;
  filteredIncidents: Incident[] = [];


  //Filter 

  incidentsFilter: "all" | "open" | "pending" | "resolved" = "all";
  severityFilter: "all" | "Low" | "Medium" | "High" | "Critical" = "all";


  //Loading states 

  @Output() isLoadingIncidents = new EventEmitter<boolean>()

  // assigner un planning à un collecteur
  showAssignModal: boolean = false;
  selectedReportId: string = "";

  selectedEmployee: string[] = [];
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
  }

  
  assignIncident(incidentId: string): void {
    this.notificationService.showInfo(
      "Attribution",
      "Ouverture du formulaire d'attribution"
    );
  }

  investigateIncident(incidentId: string): void {
    const incident = this.incidents.find((i) => i._id === incidentId);
    if (incident) {
      incident.status = "pending";
      incident.assignedTo = "Inspecteur Municipal";
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
      regular: "Collecte manquée",
    };
    return types[type as keyof typeof types] || type;
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      // open: "Ouvert",
      pending: "En cours",
      resolved: "Résolue",
      reported : "En cours",
      scheduled: "En cours",
      collected: "Collecté",

    };
    return statuses[status as keyof typeof statuses] || status;
  }

  selectedImage: string | null = null;

  openImageModal(imageUrl: string): void {
    this.selectedImage = imageUrl;
  }

  closeImageModal(): void {
    this.selectedImage = null;
  }
  resolveIncident(incidentId: string): void {
    const incident = this.incidents.find((i) => i._id === incidentId);
    
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

  openAssignModal(reportId: string): void {
    this.selectedReportId = reportId;
    this.selectedEmployee = [];
    this.showAssignModal = true;
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedEmployee = [];
  }
  

}
