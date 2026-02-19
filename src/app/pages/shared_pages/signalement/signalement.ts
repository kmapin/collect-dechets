import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { CommonModule, DatePipe, NgIf } from '@angular/common';
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
  createdAt?: Date;
  updatedAt?: Date;
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
  // assigner un planning à un collecteur emetter
  @Output() assignReport = new EventEmitter<Incident>() ;
  // resoudre un incident signaler emetter
  @Output() resolvedIncident = new EventEmitter<string>() ;
 

  selectedEmployee: string[] = [];
    constructor(
      // private authService: AuthService,
      // private agencyService: AgencyService,
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
  showPicture: boolean = false;
  showPictures(): void {
    this.showPicture = !this.showPicture
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
      regular: "Incident non précisé",
    };
    return types[type as keyof typeof types] || type;
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      // open: "Ouvert",
      pending: "En cours",
      resolved: "Résolue",
      reported : "En cours",
      scheduled: "Programmée",
      collected: "Effectuée",

    };
    return statuses[status as keyof typeof statuses] || status;
  }

  selectedImage: string | null = null;
  incidentSelected: Incident | null = null;
  openImageModal(imageUrl: string, incident: Incident): void {
    this.selectedImage = imageUrl;
    this.incidentSelected = incident;
  }

  closeImageModal(): void {
    this.selectedImage = null;
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

  //Assigner un incident à un collecteur
  openAssignModal(report: Incident): void {
    this.assignReport.emit(report);
  } 
  assignIncident(incident: Incident): void {
    this.assignReport.emit(incident);
  }

}
