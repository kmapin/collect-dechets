import { map } from "rxjs";
import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { AgencyService } from "../../../services/agency.service";
import { CollectionService } from "../../../services/collection.service";
import { NotificationService } from "../../../services/notification.service";
import { User, UserRole } from "../../../models/user.model";
import {
  Agency,
  Employee,
  Employees,
  ServiceZone,
  ServiceZones,
  CollectionSchedule,
  EmployeeRole,
  WasteService,
  tarif,
  Tariff,
} from "../../../models/agency.model";
import { Collection, CollectionStatus } from "../../../models/collection.model";
import { ClientService, ClientApi } from "../../../services/client.service";
import { OUAGA_DATA, QuartierData } from "../../../data/mock-data";
import { Message } from "../../../models/message.model";
import { MessagesService } from "../../../services/messages.service";
import { SharedService } from "../../../services/shared-service";
import { MatExpansionModule } from "@angular/material/expansion";
import { CountriesOrgMockService } from "../../../services/countries-org-mock.service";
import { Arrondissement, City, Quartier, Sector } from "../../../models/countries-org.model";
import { MatIcon } from "@angular/material/icon";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  subscriptionStatus: "active" | "suspended" | "cancelled";
  lastPayment: Date;
  totalPaid: number;
  joinDate: Date;
}

interface Report {
  _id: string;
  clientId: string;
  clientName: string;
  client?: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  severity: "critical" | "high" | "medium" | "low";
  type: "missed_collection" | "incomplete_collection" | "damage" | "complaint";
  description: string;
  date: Date;
  createdAt: Date;
  status: "open" | "in_progress" | "resolved";
  assignedTo?: string;
  reportType?: string;
  photos?: string[];
}

interface Statistics {
  totalClients: number;
  totalEmployees: number;
  totalZones: number;
  totalCollectors: number;
  totalSignalements: number;
  resolvedSignalements?: number;
  activeCollectors: number;
  todayCollections: number;
  pendingSignalements: number;
  completedCollections: number;
  monthlyRevenue: number;
  averageRating: number;
  pendingReports: number;
}

@Component({
  selector: "app-agency-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule,MatExpansionModule, MatIcon],
  template: `
    <div class="agency-dashboard">
      <div class="page-header">
        <div class="container">
          <div class="header-content">
            <div class="welcome-section">
              <h1 class="page-title">Tableau de Bord Agence</h1>
              <p class="page-subtitle">
                {{ agency?.agencyName }} - Gestion complète de votre agence de
                collecte
              </p>
            </div>
            <div class="quick-actions">
              <button
                class="btn btn-primary"
                (click)="showAddEmployeeModal = true"
              >
                <i class="material-icons">person_add</i>
                Ajouter Employé
              </button>

              <button class="btn btn-secondary" (click)="showZoneModal = true">
                <i class="material-icons">map</i>
                creer un tarif
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="container">
        <div class="dashboard-content">
          <!-- Statistiques principales -->
          <div class="stats-grid">
            <div class="stat-card card">
              <div class="stat-icon clients">
                <i class="material-icons">people</i>
              </div>
              <div class="stat-info">
                <h3>Clients actifs</h3>
                <p class="stat-value">{{ statistics.totalClients }}</p>
                <!-- <span class="stat-trend positive">+2 ce mois</span> -->
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collectors">
                <i class="material-icons">local_shipping</i>
              </div>
              <div class="stat-info">
                <h3>Employés</h3>
                <!-- <p class="stat-value">{{ statistics.activeCollectors }}</p>
                <span class="stat-trend neutral">{{ getActiveCollectorsToday() }} en tournée</span> -->
                <p class="stat-value">{{ statistics.totalEmployees }}</p>
                <span class="stat-trend neutral"
                  >{{ getActiveCollectorsToday() }} en tournée</span
                >
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collections">
                <i class="material-icons">check_circle</i>
              </div>
              <div class="stat-info">
                <h3>zones</h3>
           
                <p class="stat-value">{{ statistics.totalZones }}</p>
                <span
                  class="stat-trend"
                  [class.positive]="getCollectionRate() >= 90"
                  [class.negative]="getCollectionRate() < 80"
                >
                 
                </span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon revenue">
                <i class="material-icons">perso</i>
              </div>
              <div class="stat-info">
                <h3>Collecteurs</h3>
                <!-- <p class="stat-value">{{ statistics.monthlyRevenue | number:'1.0-0' }}€</p>
                <span class="stat-trend positive">+8.5% vs mois dernier</span> -->
                <p class="stat-value">{{ statistics.totalCollectors }}</p>
                <!-- <span class="stat-trend positive">+8.5% vs mois dernier</span> -->
              </div>
            </div>

            

            <div class="stat-card card">
              <div class="stat-icon reports">
                <i class="material-icons">report_problem</i>
              </div>
              <div class="stat-info">
                <h3>Signalements</h3>
                <p class="stat-value">{{ statistics.pendingSignalements }}</p>
                <span
                  class="stat-trend"
                  [class.negative]="statistics.totalSignalements"
                >
                  en attente
                </span>
              </div>
            </div>
          </div>

          <!-- Navigation par onglets -->
          <div class="tabs-navigation">
            <button
              *ngFor="let tab of tabs"
              class="tab-btn"
              [class.active]="activeTab === tab.id"
              (click)="activeTab = tab.id"
            >
              <i class="material-icons">{{ tab.icon }}</i>
              {{ tab.label }}
              <span
                *ngIf="tab.label === 'Messages' && unreadMessageCount >= 0"
                class="tab-badge"
                >{{ unreadMessageCount }}</span
              >
              <span *ngIf="tab.badge" class="tab-badge">{{ tab.badge }}</span>
            </button>
          </div>

          <!-- Contenu des onglets -->

          <div class="tab-content">
            <!-- Onglet Suivi des Collectes -->
            <div *ngIf="activeTab === 'collections'" class="collections-tab">
              <div class="collections-header">
                <h2>Suivi des Collectes en Temps Réel</h2>
                <div class="collections-filters">
                  <select
                    [(ngModel)]="collectionsFilter"
                    (change)="filterCollections()"
                    class="filter-select"
                  >
                    <option value="all">Toutes les collectes</option>
                    <option value="scheduled">Programmées</option>
                    <option value="in_progress">En cours</option>
                    <option value="collected">Collectées</option>
                    <option value="missed">Manquées</option>
                  </select>

                  <!-- Bouton historique -->
                  <button
                    class="action-btn"
                    title="Voir l’historique des collectes"
                    style="margin-left: 10px;"
                    (click)="openHistoryModal()"
                  >
                    <i class="material-icons">history</i>
                  </button>
                </div>
              </div>

              <div class="collections-grid">
                <div
                  *ngFor="let collecte of dayCollectes"
                  class="collection-card card"
                >
                  <!-- Header -->
                  <div class="collection-header">
                    <div class="collection-status">
                      <span
                        class="status-badge"
                        [class]="'status-' + collecte.status"
                      >
                        {{ collecte.status }}
                      </span>
                      <span class="collection-time">
                        {{ collecte.createdAt | date : "dd/MM/yyyy HH:mm" }}
                      </span>
                    </div>

                    <div class="collection-actions">
                      <button
                        class="action-btn"
                        (click)="trackCollection(collecte._id)"
                        *ngIf="collecte.status === 'in_progress'"
                      >
                        <i class="material-icons">location_on</i>
                      </button>
                      <!-- <button
              class="action-btn"
              (click)="contactClient(collecte.clientId)"
            >
              <i class="material-icons">phone</i>
            </button> -->
                    </div>
                  </div>

                  <!-- Infos -->
                  <div class="collection-info">
                    <i class="material-icons">group</i>
                    {{
                      collecte.clientId.firstName +
                        " " +
                        collecte.clientId.lastName
                    }}
                    <p>
                      <i class="material-icons">person</i>
                      Collecteur :
                      {{
                        collecte.collectorId.firstName +
                          " " +
                          collecte.collectorId.lastName
                      }}
                    </p>
                    <p>
                      <i class="material-icons">apartment</i>
                      Agence : {{ collecte.agencyId.agencyName }}
                    </p>
                    <p>
                      <i class="material-icons">schedule</i>
                      Scannée à :
                      {{ collecte.scannedAt | date : "dd/MM/yyyy HH:mm" }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- État vide -->
              <div *ngIf="dayCollectes.length === 0" class="empty-state">
                <i class="material-icons">event_available</i>
                <h3>Aucune collecte</h3>
                <p>Aucune collecte disponible pour l’instant</p>
              </div>
            </div>

            <!-- Onglet Gestion des Employés -->
            <div *ngIf="activeTab === 'employees'" class="employees-tab">
              <div class="employees-header">
                <h2>Gestion des Employés</h2>
                <div class="employees-actions">
                  <button
                    class="btn btn-primary"
                    (click)="showAddEmployeeModal = true"
                  >
                    <i class="material-icons">person_add</i>
                    Ajouter Employé
                  </button>
                </div>
              </div>

              <div class="employees-grid">
                <div
                  *ngFor="let employee of allEmployees"
                  class="employee-card card"
                  [ngClass]="
                    employee.role
                      ? 'client-audit-card-' + employee.role
                      : 'client-audit-card'
                  "
                >
                  <div class="employee-header">
                    <div class="employee-avatar">
                      <ng-container *ngIf="employee?.avatar; else noImage">
                        <img
                          [src]="
                            employee.avatar || '/assets/default-avatar.png'
                          "
                          [alt]="employee.firstName"
                        />
                      </ng-container>
                      <ng-template #noImage>
                        <div
                          class="rounded-circle text-white font-bold uppercase"
                          [style.background-color]="getRandomColor(employee)"
                        >
                          {{
                            getInitials(
                              employee?.firstName + " " + employee?.lastName
                            )
                          }}
                        </div>
                      </ng-template>
                    </div>
                    <div class="employee-info">
                      <h4>{{ employee.firstName }} {{ employee.lastName }}</h4>
                      <p class="employee-role">
                        {{ getRoleText(employee.role) }}
                      </p>
                      <p
                        class="employee-status"
                        [class]="employee.isActive ? 'active' : 'inactive'"
                      >
                        {{ employee.isActive ? "Actif" : "Inactif" }}
                      </p>
                    </div>
                    <ng-template #noEmployees>
                      <p class="text-center text-gray-500">
                        Aucun employé pour le moment.
                      </p>
                    </ng-template>
                    <!-- <div class="employee-actions">
                      <button class="action-btn" (click)="editEmployee(employee.id)">
                        <i class="material-icons">edit</i>
                      </button>
                      <button class="action-btn danger" (click)="deleteEmployee(employee.id)">
                        <i class="material-icons">delete</i>
                      </button>
                    </div> -->
                  </div>

                  <div class="employee-details">
                    <!-- <div class="detail-item">
                      <i class="material-icons">email</i>
                      <span>{{ employee.userId.email}}</span>
                    </div> -->
                    <div class="detail-item">
                      <i class="material-icons">phone</i>
                      <span>{{ employee.phone }}</span>
                    </div>
                    <div class="detail-item">
                      <!-- <i class="material-icons">map</i> -->
                      <!-- <span>{{getZoneLengthByEmployeeId(employee._id)}} zone(s) assignée(s)</span> -->
                      <!-- <span>{{ employee.zones.length }} zone(s) assignée(s)</span> -->
                    </div>
                    <div class="detail-item">
                      <i class="material-icons">event</i>
                      <span
                        >Embauché le
                        {{ employee.hiredAt | date : "dd/MM/yyyy" }}</span
                      >
                    </div>
                  </div>

                  <div class="employee-actions">
                    <button class="action-btn" (click)="editEmployee(employee)">
                      <i class="material-icons">edit</i>
                    </button>
                    <button
                      class="action-btn danger"
                      (click)="deleteEmployee(currentUser, employee)"
                    >
                      <i class="material-icons">delete</i>
                    </button>
                    <button
                      class="action-btn"
                      [class.active]="employee.isActive"
                      (click)="toggleEmployeeStatus(employee)"
                    >
                      <i class="material-icons">{{
                        employee.isActive ? "toggle_on" : "toggle_off"
                      }}</i>
                    </button>
                  </div>
                  <!-- <div class="employee-stats" *ngIf="employee.role === 'collector'">
                    <div class="stat-item">
                      <span class="stat-label">Collectes aujourd'hui</span>
                      <span class="stat-value">{{ getEmployeeCollections(employee._id) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Note moyenne</span>
                      <span class="stat-value">{{ getEmployeeRating(employee._id) }}/5</span>
                    </div>
                  </div> -->
                </div>
              </div>
            </div>

            <!-- Onglet Gestion des Zones -->
            <div *ngIf="activeTab === 'zones'" class="zones-tab">
              <div class="zones-header">
                <h2>Gestion des Zones de Couverture</h2>
                <div class="zones-actions">
                  <button class="btn btn-primary" (click)="openTariffsModal()">
                    <i class="material-icons">visibility</i>
                    Voir mes tarifs
                  </button>
 
                </div>

              </div>
                 <button class="btn btn-primary" (click)="openZoneModalcouverture()">
  <i class="material-icons">edit_location</i>
  Modifier les zones couvertes
</button>
              <div class="zones-content">
                
                <div class="zones-map">
                  <div class="map-container">
                    <div class="map-placeholder">
                      <i class="material-icons">map</i>
                      
                    <div class="zone-container" *ngIf="zones?.length">
  <h4 class="zone-title">Zones couvertes</h4>
  <div class="zone-list">
    <div class="zone-card" *ngFor="let zone of zones">
           <div class="zone-details">
                <p><strong>Quartier :</strong> {{ zone.neighborhood || zone }}</p>
      </div>
    </div>
  </div>
</div>

<div *ngIf="!zones?.length && !isLoading" class="no-zone">
  <p>Aucune zone chargée pour cette agence.</p>
</div>
                      
                    </div>
                  </div>
                </div>

                <div class="zones-list">
                  <div *ngFor="let zone of serviceZones" class="zone-card card">
                    <div class="zone-header">
                      <h4>{{ zone.name }}</h4>
                      <div class="zone-actions">
                        <button class="action-btn" (click)="editZone(zone.id)">
                          <i class="material-icons">edit</i>
                        </button>
                        <button
                          class="action-btn danger"
                          (click)="deleteZone(zone.id)"
                        >
                          <i class="material-icons">delete</i>
                        </button>
                      </div>
                    </div>

                    <div class="zone-info">
                      <p class="zone-description">{{ zone.description }}</p>
                      <div class="zone-details">
                        <div class="detail-item">
                          <i class="material-icons">location_city</i>
                          <span>{{ zone.cities.join(", ") }}</span>
                        </div>
                        <div class="detail-item">
                          <i class="material-icons">home</i>
                          <span>{{ zone.neighborhoods.join(", ") }}</span>
                        </div>
                        <div class="detail-item">
                          <i class="material-icons">people</i>
                          <span>{{ getZoneClients(zone.id) }} clients</span>
                        </div>
                      </div>
                    </div>

                    <div class="zone-status">
                      <span
                        class="status-badge"
                        [class]="
                          zone.isActive ? 'status-active' : 'status-inactive'
                        "
                      >
                        {{ zone.isActive ? "Active" : "Inactive" }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Plannings -->
            <div *ngIf="activeTab === 'schedules'" class="schedules-tab">
              <div class="schedules-header">
                <h2>Gestion des Plannings de Collecte</h2>
                <div class="schedules-actions">
                  <button
                    class="btn btn-primary"
                    (click)="showScheduleModal = true"
                  >
                    <i class="material-icons">schedule</i>
                    Nouveau Planning
                  </button>
                </div>
              </div>

              <div class="schedules-calendar">
                <div class="calendar-header">
                  <button class="calendar-nav" (click)="previousWeek()">
                    <i class="material-icons">chevron_left</i>
                  </button>
                  <h3>{{ getCurrentWeekText() }}</h3>
                  <button class="calendar-nav" (click)="nextWeek()">
                    <i class="material-icons">chevron_right</i>
                  </button>
                </div>

                <div class="calendar-grid">
                  <div class="calendar-days">
                    <div *ngFor="let day of weekDays" class="day-header">
                      {{ day }}
                    </div>
                  </div>

                  <div class="calendar-content">
                    <div
                      *ngFor="let day of weekDays; let i = index"
                      class="day-column"
                    >
                      <div
                        *ngFor="let schedule of getSchedulesForDay(i)"
                        class="schedule-item"
                        (click)="openScheduleDetails(schedule)"
                      >
                        <!-- <div class="schedule-time">
                          <span class="schedule-time">Debut:</span>
                          {{ schedule.startTime }}
                        </div> -->
                        <div class="schedule-time">
                          <!-- <span class="schedule-time">Zone:</span> -->
                          <i class="material-icons">location_on:</i> {{ getZoneName(schedule.zone) }}
                        </div>
                        <div class="schedule-time">
                          <!-- <span class="schedule-time">Heure:</span>
                            -->
                          <i class="material-icons">schedule:</i>

                          {{ schedule.startTime }} - {{ schedule.endTime }}
                      
                        </div>

                        <div class="schedule-time">
                          <!-- <span class="schedule-time">Collecteur:</span> -->
                          <i class="material-icons">person:</i>

                          {{ getCollectorName(schedule.collectorId) }}
                            


                        </div>
                        <div class="schedule-actions">
                          <button
                            class="action-btn danger"
                            (click)="deletePlanning(schedule._id)"
                          >
                            <i class="material-icons">delete</i>
                          </button>
                          <!-- <button
    class="action-btn"
    [class.active]="schedule.isActive"
    (click)="toggleScheduleStatus(schedule)"
  >
    <i class="material-icons">{{ schedule.isActive ? 'toggle_on' : 'toggle_off' }}</i>
  </button> -->
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Clients -->
            <!-- Clients Actifs  -->
            <div *ngIf="activeTab === 'clients'" class="clients-tab">
              <div class="clients-header">
                <h2>Clients Actifs ({{ activeClients.length }})</h2>
              </div>
              <div class="clients-table">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Adresse</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="activeClients.length === 0">
                      <td colspan="6" style="text-align:center; color:#888;">
                        Aucun client à afficher
                      </td>
                    </tr>
                    <tr *ngFor="let client of activeClients">
                      <td>{{ client.firstName }} {{ client.lastName }}</td>
                      <td></td>
                      <td>{{ client.phone }}</td>
                      <td>
                        {{ client.address.street }},
                        {{ client.address.neighborhood }}
                      </td>
                      <td>
                        <span class="status-badge status-active">Actif</span>
                      </td>
                      <td>
                        <!-- <button
                          class="action-btn"
                          (click)="suspendClient(client._id)"
                          title="Suspendre"
                        >
                          <i class="material-icons">pause</i>
                        </button> -->
                        <button
                          class="action-btn danger"
                          (click)="viewClientDetails(client._id)"
                        >
                          <i class="material-icons">visibility</i>
                        </button>
                        <!-- <button
                          class="action-btn danger"
                          (click)="deleteClient()"
                          title="Supprimer"
                        >
                          <i class="material-icons">delete</i>
                        </button> -->
                        <!-- <button
                            class="btn btn-secondary"
                            (click)="viewClientDetails(client?._id)"
                          >
                            <i class="material-icons">visibility</i>
                            Détails
                          </button> -->
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Clients en attente de validation  -->
              <!-- Clients en attente de validation  -->
              <!-- <div class="clients-header" style="margin-top:2em;">
                <h2>
                  Clients en attente de validation ({{ pendingClients.length }})
                </h2>
              </div>
              <div class="clients-table">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Téléphone</th>
                      <th>Adresse</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="pendingClients.length === 0">
                      <td colspan="6" style="text-align:center; color:#888;">
                        Aucun client à afficher
                      </td>
                    </tr>
                    <tr *ngFor="let client of pendingClients">
                      <td>{{ client.firstName }} {{ client.lastName }}</td>
                      <td>paul&#64;gmail.com</td>
                      <td>{{ client.phone }}</td>
                      <td>
                        {{ client.address.street }},
                        {{ client.address.neighborhood }}
                      </td>
                      <td>
                        <span class="status-badge status-pending"
                          >En attente</span
                        >
                      </td>
                      <td>
                        <button
                          class="btn btn-primary"
                          (click)="validateClient(client._id)"
                        >
                          Valider
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div> -->
            </div>

            <!-- Onglet Signalements -->
            <div *ngIf="activeTab === 'reports'" class="reports-tab">
              <div class="reports-header">
                <h2>Signalements</h2>
                <div class="incidents-filters">
                  <select
                    [(ngModel)]="incidentsFilter"
                    (change)="filterIncidents()"
                    class="filter-select"
                  >
                    <option value="all">Tous les incidents</option>
                    <option value="open">Ouverts</option>
                    <option value="pending">En cours</option>
                    <option value="resolved">Résolus</option>
                  </select>
                  <select
                    [(ngModel)]="severityFilter"
                    (change)="filterIncidents()"
                    class="filter-select"
                  >
                    <option value="all">Toutes gravités</option>
                    <option value="critical">Critique</option>
                    <option value="high">Élevée</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Faible</option>
                  </select>
                </div>
              </div>
              <div class="reports-list">
                <div
                  *ngFor="let report of agencyReports"
                  class="report-card card"
                >
                  <div class="incident-header">
                    <div
                      class="incident-severity"
                      [class]="'severity-' + report?.severity"
                    >
                      <i class="material-icons">{{
                        getSeverityIcon(report.severity)
                      }}</i>
                      <span>{{
                        getSeverityText(report.severity)
                          ? getSeverityText(report.severity)
                          : "Faible"
                      }}</span>
                    </div>
                    <div class="incident-status">
                      <span
                        class="status-badge"
                        [class]="'status-' + report.status"
                      >
                        {{ getIncidentStatusText(report.status) }}
                      </span>
                    </div>
                  </div>
                  <h4>
                    {{ report?.client?.firstName }}
                    {{ report?.client?.lastName }}
                  </h4>
                  <div class="incident-content">
                    <h4>{{ getIncidentTypeText(report.type) }}</h4>
                    <p class="incident-description">{{ report.description }}</p>
                    <p class="incident-date">
                      Date : {{ report.date | date : "dd/MM/yyyy" }}
                    </p>
                    <p class="incident-date">
                      Heure : {{ report.date | date : "HH:mm:ss" }}
                    </p>
                  </div>
                  <!-- Affichage des photos -->
                  <div *ngIf="report.photos && report.photos.length">
                    <div *ngFor="let photo of report.photos">
                      <img
                        [src]="photo"
                        alt="Photo du signalement"
                        class="report-photo circular-image"
                        (click)="openImageModal(photo)"
                      />
                    </div>
                  </div>
                  <div *ngIf="!report.photos || !report.photos.length">
                    <p><em>Aucune photo associée</em></p>
                  </div>
                  <div *ngIf="agencyReports.length === 0" class="empty-state">
                    <i class="material-icons">report_problem</i>
                    <h3>Aucun signalement pour le moment</h3>
                  </div>
                  <div class="incident-actions">
                    <button
                      class="btn btn-accent"
                      (click)="openAssignModal(report._id)"
                       (click)="openAssignModal(report._id)"
                        *ngIf="!report.assignedTo"
                    >
                      <i class="material-icons">assignment_ind</i>
                   Traiter
                    </button>

                    <!-- <button class="btn btn-primary" (click)="investigateIncident()" >
                    <i class="material-icons">search</i>
                    Enquêter
                  </button> -->
                    <button
                      class="btn btn-success"
                      (click)="resolveIncident(report._id)"
                        (click)="resolveIncident(report._id)"
                      *ngIf="report.assignedTo"
                    >
                      <i class="material-icons">check</i>
                      Résoudre
                    </button>
                    <!--<button class="btn btn-accent" (click)="contactAgencyForIncident()">
                    <i class="material-icons">phone</i>
                                Contacter Agence
                  </button>-->
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Messages -->
            <div *ngIf="activeTab === 'messages'" class="reports-tab">
              <div class="reports-header">
                <h2>Messages</h2>
                <div class="incidents-filters">
                  <span>{{ unreadMessageCount }} message(s) non lu(s)</span>
                </div>
              </div>
              <div class="parent">
              <!-- Header -->
              <div class="chat-header-column">
                <span  *ngIf="displayAgencyName">Vous discutez avec {{ displayAgencyName }}</span>
              </div>

              <div class="message-content">
                <!-- Sidebar -->
                <div class="chat-left-column">
                  <div class="chat-left-column-header">
                    <div class="chat-left-column-header-title">
                      Mes discussions
                    </div>
                  </div>

                  <div class="chat-left-column-content">
                    <ng-container *ngFor="let message of connectedUserMessages">
                      <button
                      class="chat-left-column-content-item"
                      *ngIf="message.firstName"
                      (click)="
                        userAndAgencyConversation(
                          message
                        )
                      "
                    >
                      {{ message.firstName }} {{message.lastName}}
                    </button>
                    </ng-container>
                    
                  </div>
                </div>

                <!-- Messages + Input -->
                <div class="chat-area">
                  <div class="chat-messages">
                    <ng-container *ngFor="let message of receivedMessages">
                      <div
                        class="received "
                        *ngIf="message.sender !== currentUser?.userId"
                      >
                        <div class="div5 chat-bubble">
                          <span> {{ message.content }}</span>
                          <span class="chat-time"
                            >reçu le
                            {{
                              message.timestamp
                                | date : "dd/MMM/yyyy à HH:mm"
                            }}
                            <mat-icon class="chat-read">
                              {{ message.read=== 'true' ? 'done_all' : 'done' }}
                            </mat-icon>
                          </span>
                        </div>
                      </div>
                      <div
                        class="sent"
                        *ngIf="message.sender === currentUser?.userId"
                      >
                        <div class="div6 chat-bubble">
                          <span> {{ message.content }}</span>
                          <span class="chat-time"
                            >envoyé le
                            {{
                              message.timestamp
                                | date : "dd/MMM/yyyy  à HH:mm"
                            }}
                            <mat-icon class="chat-read">
                              {{ message.read=== 'true' ? 'done_all' : 'done' }}
                            </mat-icon>
                          </span>
                          
                        </div>
                      </div>
                    </ng-container>
                  </div>

                  <!-- Input fixé en bas -->
                  <div class="div7 chat-input-row">
                    
                      <input
                        class="sendChatMessage"
                        [(ngModel)]="messageData.content"
                        name="content"
                        type="text"
                        placeholder="Composez votre message"
                      />
                      <div class="chat-actions">
                        <button type="button"
                            (click)="submitMessage()"
                            class="btn_send btn-secondary"
                        >
                          <mat-icon class="material-icons">send</mat-icon>
                        </button>
                      </div>
                    
                  </div>
                </div>
              </div>
            </div>



            </div>
            <!-- Message -->
            <div
              class="modal-overlay"
              *ngIf="showMessageModal"
              (click)="showMessageModal = false"
            >
              <div class="modal-content" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>Décrivez nous votre besoins</h3>
                  <button class="close-btn" (click)="showMessageModal = false">
                    <i class="material-icons">close</i>
                  </button>
                </div>
                <form class="report-form">
                  <!-- <div class="form-group">
                      <label>Destinataire</label>
                      <select [(ngModel)]="messageData.receiver" name="receiver" required>
                        <option value="">Sélectionnez</option>
                        <option value="missed_collection">Collecte manquée</option>
                        <option value="compliance_issue">Non-conformité</option>
                        <option value="technical_issue">Problème technique</option>
                        <option value="complaint">Réclamation</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>-->

                  <div class="form-group">
                    <label>Message</label>
                    <textarea
                      [(ngModel)]="messageData.content"
                      name="content"
                      rows="4"
                      placeholder="Votre message..."
                      required
                    ></textarea>
                  </div>
                  <div class="form-actions">
                    <button
                      type="button"
                      class="btn btn-secondary"
                      (click)="showMessageModal = false"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      class="btn btn-primary"
                      (click)="submitMessage(); showMessageModal = false"
                    >
                      <i class="material-icons">send</i>
                      Envoyer
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Onglet Rapports -->
            <!-- <div class="analytics-tab">
              <div class="analytics-header">
                <h2>Rapports et Statistiques</h2>
                <div class="analytics-filters">
                  <select
                    [(ngModel)]="analyticsPeriod"
                    (change)="updateAnalytics()"
                    class="filter-select"
                  >
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="quarter">Ce trimestre</option>
                    <option value="year">Cette année</option>
                  </select>
                  <button class="btn btn-secondary" (click)="exportReport()">
                    <i class="material-icons">download</i>
                    Exporter
                  </button>
                </div>
              </div>

              <div class="analytics-content">
                <div class="analytics-cards">
                  <div class="analytics-card card">
                    <h3>Performance des Collectes</h3>
                    <div class="chart-placeholder">
                      <i class="material-icons">bar_chart</i>
                      <p>Graphique des collectes réalisées vs programmées</p>
                    </div>
                  </div>

                  <div class="analytics-card card">
                    <h3>Évolution du Chiffre d'Affaires</h3>
                    <div class="chart-placeholder">
                      <i class="material-icons">trending_up</i>
                      <p>Courbe d'évolution des revenus</p>
                    </div>
                  </div>

                  <div class="analytics-card card">
                    <h3>Performance par Collecteur</h3>
                    <div class="performance-list">
                      <div
                        *ngFor="let collector of getCollectorPerformance()"
                        class="performance-item"
                      >
                        <div class="collector-info">
                          <strong>{{ collector.name }}</strong>
                          <span
                            >{{ collector.collectionsCount }} collectes</span
                          >
                        </div>
                        <div class="performance-score">
                          <div class="score-bar">
                            <div
                              class="score-fill"
                              [style.width]="collector.score + '%'"
                            ></div>
                          </div>
                          <span>{{ collector.score }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="analytics-card card">
                    <h3>Répartition par Zone</h3>
                    <div class="zone-stats">
                      <div
                        *ngFor="let zoneStat of getZoneStatistics()"
                        class="zone-stat"
                      >
                        <div class="zone-name">{{ zoneStat.name }}</div>
                        <div class="zone-metrics">
                          <span>{{ zoneStat.clients }} clients</span>
                          <span>{{ zoneStat.collections }} collectes</span>
                          <span>{{ zoneStat.revenue }}€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div> -->
          </div>
          <!-- Onglet tarif -->
          <div class="analytics-tab">
            <div class="analytics-header"></div>

            <div class="analytics-content">
              <div
                class="modal-overlay"
                *ngIf="showAddEmployeeModal"
                (click)="showAddEmployeeModal = false"
              >
                <div class="modal-content" (click)="$event.stopPropagation()">
                  <div class="modal-header">
                    <h3>Ajouter un Employé</h3>
                    <button
                      class="close-btn"
                      (click)="showAddEmployeeModal = false"
                    >
                      <i class="material-icons">close</i>
                    </button>
                  </div>
                  <form class="employee-form" (ngSubmit)="addEmployee()">
                    <div class="form-row">
                      <div class="form-group">
                        <label>Prénom *</label>
                        <input
                          type="text"
                          [(ngModel)]="newEmployee.firstName"
                          name="firstName"
                          required
                        />
                      </div>
                      <div class="form-group">
                        <label>Nom *</label>
                        <input
                          type="text"
                          [(ngModel)]="newEmployee.lastName"
                          name="lastName"
                          required
                        />
                      </div>
                    </div>
                    <div class="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        [(ngModel)]="newEmployee.email"
                        name="email"
                        required
                      />
                    </div>
                    <div class="form-group">
                      <label>Téléphone *</label>
                      <input
                        type="tel"
                        [(ngModel)]="newEmployee.phone"
                        name="phone"
                        required
                      />
                    </div>
                    <div class="form-group">
                      <label>Rôle *</label>
                      <select
                        [(ngModel)]="newEmployee.role"
                        name="role"
                        required
                      >
                        <option value="">Sélectionner un rôle</option>
                        <option value="manager">Manager</option>
                        <option value="collector">Collecteur</option>
                      </select>
                    </div>
                    <div
                      class="form-group"
                      *ngIf="newEmployee.role === 'collector'"
                    >
                      <label>Zones assignées</label>
                      <div class="zones-checkboxes">
                        <label
                          *ngFor="let zone of serviceZones"
                          class="checkbox-label"
                        >
                          <input
                            type="checkbox"
                            [value]="zone.id"
                            (change)="toggleZoneAssignment(zone.id, $event)"
                          />
                          <span class="checkmark"></span>
                          {{ zone.name }}
                        </label>
                      </div>
                    </div>
                    <div class="form-actions">
                      <button
                        type="button"
                        class="btn btn-secondary"
                        (click)="showAddEmployeeModal = false"
                      >
                        Annuler
                      </button>
                      <button type="submit" class="btn btn-primary">
                        <i class="material-icons">person_add</i>
                        Ajouter
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <!-- Modal Gestion Zone -->
              <div
                class="modal-overlay"
                *ngIf="showZoneModal"
                (click)="showZoneModal = false"
              >
                <div class="modal-content" (click)="$event.stopPropagation()">
                  <div class="modal-header">
                    <h3>Ajouter un Tarif</h3>
                    <button class="close-btn" (click)="showZoneModal = false">
                      <i class="material-icons">close</i>
                    </button>
                  </div>

                  <form class="tariff-form" (ngSubmit)="addTariff()">
                    <!-- Type -->
                    <div class="form-group">
                      <label>Type *</label>
                      <select [(ngModel)]="newTariff.type" name="type" required>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>

                    <!-- Prix -->
                    <div class="form-group">
                      <label>Prix *</label>
                      <input
                        type="number"
                        [(ngModel)]="newTariff.price"
                        name="price"
                        min="0"
                        required
                      />
                    </div>

                    <!-- Nombre de passages -->
                    <div class="form-group">
                      <label>Nombre de passages *</label>
                      <input
                        type="number"
                        [(ngModel)]="newTariff.nbPassages"
                        name="nbPassages"
                        min="0"
                        required
                      />
                    </div>

                    <!-- Description -->
                    <div class="form-group">
                      <label>Description</label>
                      <textarea
                        [(ngModel)]="newTariff.description"
                        name="description"
                        rows="3"
                      ></textarea>
                    </div>

                    <div class="form-actions">
                      <button
                        type="button"
                        class="btn btn-secondary"
                        (click)="showZoneModal = false"
                      >
                        Annuler
                      </button>
                      <button type="submit" class="btn btn-primary">
                        <i class="material-icons">add_circle</i>
                        Ajouter
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <!-- Modal Planning -->
              <div
                class="modal-overlay"
                *ngIf="showScheduleModal"
                (click)="showScheduleModal = false"
              >
                <div class="modal-content" (click)="$event.stopPropagation()">
                  <div class="modal-header">
                    <h3>Nouveau Planning de Collecte</h3>
                    <button
                      class="close-btn"
                      (click)="showScheduleModal = false"
                    >
                      <i class="material-icons">close</i>
                    </button>
                  </div>

                  <form
                    [formGroup]="scheduleForm"
                    class="schedule-form"
                    (ngSubmit)="addSchedule()"
                  >
                    <!-- Zone -->
                    <div class="form-group">
                      <label>Zone *</label>
                      <select formControlName="zone">
                        <option value="">Sélectionner une zone</option>
                        <!-- <option
                          value="Tampouy
"
                        >
                          Tampouy
                        </option>
                        <option value="Kilwin">Kilwin</option>
                        <option value="Darsalam">Darsalam</option>
                        <option value="Cissin">Cissin</option>
                        <option value="Zongho">Zongho</option>
                        <option value="Dassohgho">Dassohgho</option>
                        <option
                          value="Marcoussis
"
                        >
                          Marcoussis
                        </option> -->
                            <option *ngFor="let zone of zones" [value]="zone.neighborhood || zone">
      {{ zone.neighborhood || zone }}
    </option>

                      </select>
                      <small
                        class="error-message"
                        *ngIf="
                          scheduleForm.get('zone')?.invalid &&
                          scheduleForm.get('zone')?.touched
                        "
                      >
                        Veuillez sélectionner une zone
                      </small>
                    </div>

                    <!-- Date -->
                    <div class="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        formControlName="date"
                        class="full-width"
                        [min]="minDate"
                      />
                      <small
                        class="error-message"
                        *ngIf="
                          scheduleForm.get('date')?.invalid &&
                          scheduleForm.get('date')?.touched
                        "
                      >
                        Veuillez sélectionner une date
                      </small>
                    </div>

                    <!-- Heures -->
                    <div class="form-row">
                      <div class="form-group">
                        <label>Heure de début *</label>
                        <input type="time" formControlName="startTime" />
                        <small
                          class="error-message"
                          *ngIf="
                            scheduleForm.get('startTime')?.invalid &&
                            scheduleForm.get('startTime')?.touched
                          "
                        >
                          Veuillez définir une heure de début
                        </small>
                      </div>

                      <div class="form-group">
                        <label>Heure de fin *</label>
                        <input type="time" formControlName="endTime" />
                        <small
                          class="error-message"
                          *ngIf="
                            scheduleForm.get('endTime')?.invalid &&
                            scheduleForm.get('endTime')?.touched
                          "
                        >
                          Veuillez définir une heure de fin
                        </small>
                        <small
                          class="error-message"
                          *ngIf="scheduleForm.hasError('invalidTimeOrder')"
                        >
                          L'heure de fin doit être postérieure à l'heure de
                          début
                        </small>
                      </div>
                    </div>

                    <!-- Collecteur -->
                    <div class="form-group">
                      <label>Collecteur *</label>
                      <select formControlName="collectorId">
                        <option value="">Sélectionner un collecteur</option>
                        <option
                          *ngFor="let collector of collectors"
                          [value]="collector._id"
                        >
                          {{ collector.firstName }} {{ collector.lastName }} 
                        </option>
                      </select>
                      <small
                        class="error-message"
                        *ngIf="
                          scheduleForm.get('collectorId')?.invalid &&
                          scheduleForm.get('collectorId')?.touched
                        "
                      >
                        Veuillez sélectionner un collecteur
                      </small>
                    </div>

                    <!-- Actions -->
                    <div class="form-actions">
                      <button
                        type="button"
                        class="btn btn-secondary"
                        (click)="showScheduleModal = false"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        class="btn btn-primary"
                        [disabled]="scheduleForm.invalid"
                      >
                        <i class="material-icons">schedule</i> Créer Planning
                      </button>
                    </div>
                  </form>
                </div>
                <div
                  class="modal-overlay"
                  *ngIf="showAssignModal"
                  (click)="showAssignModal = false"
                >
                  <div class="modal-content" (click)="$event.stopPropagation()">
                    <div class="modal-header">
                      <h3>Assigner des employés</h3>
                      <button
                        class="close-btn"
                        (click)="showAssignModal = false"
                      >
                        <i class="material-icons">close</i>
                      </button>
                    </div>
                    <div class="modal-body">
                      <label>Employés disponibles :</label>
                      <div
                        *ngFor="let employee of allEmployees"
                        class="checkbox-group"
                      >
                        <input
                          type="checkbox"
                          [value]="employee._id"
                          (change)="
                            toggleEmployeeSelection(employee._id, $event)
                          "
                        />
                        {{ employee.firstName }} {{ employee.lastName }}
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button
                        class="btn btn-secondary"
                        (click)="showAssignModal = false"
                      >
                        Annuler
                      </button>
                      <button
                        class="btn btn-primary"
                        (click)="assignEmployeesToReport()"
                      >
                        soumettre
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="modal-backdrop"
              *ngIf="selectedSchedule"
              (click)="closeModal()"
            >
              <div class="modal">
                <h3>Détails du planning</h3>
                <p>
                  <strong>Date :</strong>
                  {{ selectedSchedule.date | date : "fullDate" }}
                </p>
                <p><strong>Zone :</strong> {{ selectedSchedule.zone }}</p>
                <p>
                  <strong>Heure :</strong> {{ selectedSchedule.startTime }} -
                  {{ selectedSchedule.endTime }}
                </p>
                <p>
                  <strong>Collecteur(s) :</strong>
                  <span *ngFor="let c of selectedSchedule.collectors">
                    {{ c.firstName }} {{ c.lastName }} ({{ c.phone }})
                  </span>
                </p>
                <!-- <button class="close-btn" (click)="selectedSchedule = null">Fermer</button> -->
              </div>
            </div>
            <div
              class="modal-backdrop"
              *ngIf="showAssignModal"
              (click)="closeAssignModal()"
            >
              <div class="modal" (click)="$event.stopPropagation()">
                <h3>Assigner un signalement</h3>
                <p><strong>Signalement ID :</strong> {{ selectedReportId }}</p>

                <div
                  *ngIf="
                    allEmployees && allEmployees.length > 0;
                    else noEmployees
                  "
                  class="employee-grid"
                >
                  <label
                    *ngFor="let employee of allEmployees"
                    class="employee-card"
                  >
                    <input
                      type="checkbox"
                      [value]="employee._id"
                      (change)="onEmployeeToggle($event)"
                    />
                    <div class="employee-info">
                      <span class="employee-name"
                        >{{ employee.firstName }} {{ employee.lastName }}</span
                      >
                      <span class="employee-role">{{ employee.role }}</span>
                    </div>
                  </label>
                </div>

                <ng-template #noEmployees>
                  <p>Aucun employé disponible.</p>
                </ng-template>

                <div class="modal-actions">
                  <button class="btn btn-primary" (click)="assignReport()">
                    Assigner
                  </button>
                  <button
                    class="btn btn-secondary"
                    (click)="closeAssignModal()"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
            <!-- Modal -->
            <div class="tariffs-modal" *ngIf="showTariffsModal">
              <div class="modal-backdrop" (click)="closeTariffsModal()"></div>

              <div class="modal-content">
                <div class="modal-header">
                  <h3>Mes Tarifs</h3>
                  <button class="close-btn" (click)="closeTariffsModal()">
                    <i class="material-icons">close</i>
                  </button>
                </div>

                <div class="modal-body">
                  <div
                    class="tariff-cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                  >
                    <div *ngFor="let tariff of tariffs" class="tariff-card">
                      <div class="tariff-header">
                        <h4 class="price">
                          {{ tariff.price | number : "1.0-0" }} FCFA
                        </h4>
                        <span class="type-chip">
                          <i class="material-icons text-sm">category</i>
                          {{ tariff.type }}
                        </span>
                      </div>

                      <p class="tariff-description">
                        <i class="material-icons text-sm align-middle">info</i>
                        {{ tariff.description }}
                      </p>
                      
                      <!-- Boutons d’action dans le modal -->
                      <div class="tariff-actions">
                        <!-- <button class="btn btn-warning flex items-center gap-1">
              <i class="material-icons text-base">edit</i>
              Renommer
            </button> -->
                        <button
                          class="btn btn-danger flex items-center gap-1"
                          (click)="deleteTariff(tariff)"
                        >
                          <i class="material-icons text-base">delete</i>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="modal-footer">
                  <button
                    class="btn btn-secondary"
                    (click)="closeTariffsModal()"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      class="modal-overlay"
      *ngIf="showClientDetailsModal"
      (click)="closeClientDetailsModal()"
    >
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Détails du Client</h3>
          <button class="close-btn" (click)="closeClientDetailsModal()">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="modal-body">
          <p>
            <strong>Nom :</strong> {{ selectedClient?.firstName }}
            {{ selectedClient?.lastName }}
          </p>
          <p><strong>Email :</strong> {{ selectedClient?.userId?.email }}</p>
          <p><strong>Téléphone :</strong> {{ selectedClient?.phone }}</p>
          <p>
            <strong>Adresse :</strong> {{ selectedClient?.address?.street }},
            {{ selectedClient?.address?.neighborhood }}
          </p>
          <p><strong>Rôle :</strong> {{ selectedClient?.userId?.role }}</p>
          <p>
            <strong>Sigalement:</strong>
            {{ selectedClient?.nonPassageReports.length }}
          </p>
          <p>
            <strong>Nombre de souscription:</strong>
            {{ selectedClient?.subscriptionHistory.length }}
          </p>

          <ul>
            <!-- <span>Souscription:</span> -->
            <!-- <li *ngFor="let subscription of selectedClient?.subscriptionHistory">
          {{ subscription.type }} - {{ subscription.status }}
        </li>  
            -->
          </ul>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="closeClientDetailsModal()">
            Fermer
          </button>
        </div>
      </div>
    </div>
    <!-- Modal pour modifier un employé -->
    <div
      class="modal-overlay"
      *ngIf="showUpdateEmployeeModal"
      (click)="closeUpdateEmployeeModal()"
    >
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Modifier un Employé</h3>
          <button class="close-btn" (click)="closeUpdateEmployeeModal()">
            <i class="material-icons">close</i>
          </button>
        </div>
        <form [formGroup]="employeeForm" (ngSubmit)="updateEmployee()">
          <div class="form-group">
            <label>Prénom</label>
            <input formControlName="firstName" type="text" />
          </div>
          <div class="form-group">
            <label>Nom</label>
            <input formControlName="lastName" type="text" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input formControlName="email" type="email" />
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input formControlName="phone" type="tel" />
          </div>
          <div class="form-group">
            <label>Rôle</label>
            <select formControlName="role">
              <option value="manager">Manager</option>
              <option value="collector">Collecteur</option>
            </select>
          </div>
          <div class="form-actions">
            <button
              type="button"
              class="btn btn-secondary"
              (click)="closeUpdateEmployeeModal()"
            >
              Annuler
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="employeeForm.invalid"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
    <div
      class="modal-overlay"
      *ngIf="selectedImage"
      (click)="closeImageModal()"
    >
      <div class="modal-content" (click)="$event.stopPropagation()">
        <img
          [src]="selectedImage"
          alt="Image en plein écran"
          class="full-image"
        />

        <button class="close-btn" (click)="closeImageModal()">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div
      class="modal-overlay"
      *ngIf="showHistoryModal"
      (click)="closeHistoryModal()"
    >
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Historique des Collectes</h3>
          <button class="close-btn" (click)="closeHistoryModal()">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="modal-body">
          <ul>
            <li *ngFor="let collecte of historyCollecte">
              <p>
                <strong>Date :</strong>
                {{ collecte?.scannedAt | date : "dd/MM/yyyy" }}
              </p>
              <p><strong>Statut :</strong> {{ collecte.status }}</p>
              <p>
                <strong>Client :</strong> {{ collecte?.clientId.firstName }}
                {{ collecte?.clientId.clientName }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>



<!-- Modal pour gérer les zones -->
<div class="modal-overlay" *ngIf="showZoneModalcouverture" (click)="closeZoneModalcouverture()">
  <div class="modal-content" (click)="$event.stopPropagation()">
    <div class="modal-header">
      <h3>Définir les zones couvertes</h3>
      <button class="close-btn" (click)="closeZoneModalcouverture()">
        <i class="material-icons">close</i>
      </button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="city">Ville</label>
        <select
          id="city"
          [(ngModel)]="userData.address.city"
          (change)="onCityChange(userData.address.city)"
          class="form-control"
        >
          <option value="">Sélectionner une ville</option>
          <option *ngFor="let city of cities" [value]="city.name">
            {{ city.name }}
          </option>
        </select>
         </div>

      <div class="form-group">
        <label for="arrondissement">Arrondissement</label>
        <select
          id="arrondissement"
          [(ngModel)]="userData.address.arrondissement"
          (change)="onArrondissementChange(userData.address.arrondissement)"
          class="form-control"
          [disabled]="!arrondissementss.length"
        >
          <option value="">Sélectionner un arrondissement</option>
          <option *ngFor="let arr of arrondissementss" [value]="arr.name">
            {{ arr.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="sector">Secteur</label>
        <select
          id="sector"
          [(ngModel)]="userData.address.sector"
          (change)="onSecteurChange(userData.address.sector)"
          class="form-control"
          [disabled]="!secteurss.length"
        >
          <option value="">Sélectionner un secteur</option>
          <option *ngFor="let secteur of secteurss" [value]="secteur.name">
            {{ secteur.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="neighborhood">Quartier</label>
        <select
          id="neighborhood"
          [(ngModel)]="userData.address.neighborhood"
          class="form-control"
          multiple
          [disabled]="!quartierss.length"
          
        >
   
          <option *ngFor="let quartier of quartierss" [value]="quartier.name">
            {{ quartier.name }}
          </option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" (click)="closeZoneModalcouverture()">Annuler</button>
      <button class="btn btn-primary" (click)="editZoneAgency()">Modifier</button>
    </div>
  </div>
</div>

  `,
  styles: [
    `
      .agency-dashboard {
        min-height: 100vh;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
      }
      .full-image {
        width: 100%;
        height: auto;
        max-height: 80vh;
        border-radius: 8px;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .modal-content {
        position: relative;
        background: transparent;
        padding: 0;
      }

      .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
      }
      .employee-grid {
        display: grid;
        grid-template-columns: repeat(
          auto-fill,
          minmax(220px, 1fr)
        ); /* responsive */
        gap: 15px;
        margin: 20px 0;
        max-height: 350px;
        overflow-y: auto; /* scroll si trop d’employés */
        padding-right: 5px;
      }

      .employee-card {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .modal-body ul {
        list-style: none;
        padding: 0;
      }

      .modal-body ul li {
        margin-bottom: 16px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #f9f9f9;
      }

      .modal-body ul li p {
        margin: 4px 0;
      }
      .employee-card:hover {
        background: #edf6f9;
        border-color: #38bdf8;
        transform: translateY(-2px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      }

      .employee-card input[type="checkbox"] {
        transform: scale(1.2);
        cursor: pointer;
      }

      .employee-info {
        display: flex;
        flex-direction: column;
      }

      .employee-name {
        font-weight: 600;
        font-size: 15px;
        color: #111827;
      }

      .employee-role {
        font-size: 13px;
        color: #6b7280;
      }

      .modal-actions {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      .welcome-section h1 {
        color: var(--white);
        margin-bottom: 8px;
      }
     
      .modal-footer .btn {
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 0.9rem;
        cursor: pointer;
      }

      .modal-footer .btn-secondary {
        background: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
      }

      .modal-footer .btn-secondary:hover {
        background: #e0e0e0;
      }

      .welcome-section p {
        color: rgba(255, 255, 255, 0.9);
      }
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .modal {
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      }
      
      .modal {
        transition: transform 0.2s ease, opacity 0.2s ease;
        transform: scale(1);
        opacity: 1;
      }
      .modal-backdrop {
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .quick-actions {
        display: flex;
        gap: 12px;
      }
      .error-message {
        color: red;
        font-size: 0.85em;
        margin-top: 4px;
        display: block;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }
      .full-width {
        width: 100%;
        padding: 8px;
        box-sizing: border-box;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        transition: all 0.3s ease;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
      }

      .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 24px;
      }

      .stat-icon.clients {
        background: var(--primary-color);
      }
      .stat-icon.collectors {
        background: var(--secondary-color);
      }
      .stat-icon.collections {
        background: var(--success-color);
      }
      .stat-icon.revenue {
        background: var(--accent-color);
      }
      .stat-icon.rating {
        background: var(--warning-color);
      }
      .stat-icon.reports {
        background: var(--error-color);
      }

      .stat-info h3 {
        font-size: 0.9rem;
        font-weight: 500;
        margin-bottom: 4px;
        color: var(--text-secondary);
      }

      .stat-value {
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: var(--text-primary);
      }
      /* Modal backdrop */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
      }

      /* Modal content */
      /* Backdrop du modal */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
      }

      /* Contenu du modal */
      .tariffs-modal .modal-content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        max-width: 800px; /* largeur maximale raisonnable */
        width: 90%; /* responsive */
        max-height: 80vh;
        z-index: 1000;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* Header */
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
      }

      .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #6b7280;
        font-size: 1.5rem;
        transition: color 0.3s ease;
      }

      .close-btn:hover {
        color: #ef4444; /* Rouge pour fermer */
      }

      /* Body et cartes */
      .modal-body {
        max-height: 500px;
        overflow-y: auto;
        padding-right: 8px;
      }

      .tariff-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 20px;
      }

      /* Carte */
      .tariff-card {
        background: #f9fafb;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid #e5e7eb;
        transition: all 0.3s ease;
        position: relative;
      }

      .tariff-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        border-color: #3b82f6;
      }

      /* Header carte */
      .tariff-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .price {
        font-weight: 700;
        font-size: 1.25rem;
        color: #111827;
      }

      .type-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #bfdbfe;
        color: #1e40af;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      /* Description */
      .tariff-description {
        font-size: 0.9rem;
        color: #4b5563;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* Boutons action */
      .tariff-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .tariff-actions .btn {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 8px;
        transition: all 0.3s ease;
      }

      .tariff-actions .btn-warning {
        background: #fbbf24;
        color: #ffffff;
        border: none;
      }

      .tariff-actions .btn-warning:hover {
        background: #f59e0b;
      }

      .tariff-actions .btn-danger {
        background: #ef4444;
        color: #ffffff;
        border: none;
      }

      .tariff-actions .btn-danger:hover {
        background: #dc2626;
      }

      /* Footer modal */
      .modal-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
      }

      .modal-footer .btn-secondary {
        background: #6b7280;
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.3s ease;
      }

      .modal-footer .btn-secondary:hover {
        background: #4b5563;
      }

      .stat-trend {
        font-size: 0.8rem;
        font-weight: 500;
      }

      .stat-trend.positive {
        color: var(--success-color);
      }
      .stat-trend.negative {
        color: var(--error-color);
      }
      .stat-trend.neutral {
        color: var(--text-secondary);
      }

      .rating-stars {
        display: flex;
        gap: 2px;
        margin-top: 4px;
      }

      .star {
        font-size: 14px;
        color: var(--warning-color);
      }

      .tabs-navigation {
        display: flex;
        gap: 4px;
        margin-bottom: 24px;
        background: var(--white);
        padding: 4px;
        border-radius: 12px;
        box-shadow: var(--shadow-light);
        overflow-x: auto;
      }

      .tab-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: transparent;
        border: none;
        border-radius: 8px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.3s ease;
        white-space: nowrap;
        font-weight: 500;
        position: relative;
      }

      .tab-btn:hover {
        background: var(--light-gray);
        color: var(--text-primary);
      }

      .tab-btn.active {
        background: var(--primary-color);
        color: var(--white);
      }

      .tab-badge {
        background: var(--error-color);
        color: var(--white);
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
      }

      .tab-btn.active .tab-badge {
        background: rgba(255, 255, 255, 0.3);
      }

      .tab-content {
        background: var(--white);
        border-radius: 12px;
        padding: 24px;
        box-shadow: var(--shadow-light);
      }

      .collections-header,
      .employees-header,
      .zones-header,
      .schedules-header,
      .clients-header,
      .reports-header,
      .analytics-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--medium-gray);
      }

      .collections-filters,
      .clients-filters,
      .reports-filters,
      .analytics-filters,
      .incidents-filters {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .filter-select,
      .search-input {
        padding: 8px 12px;
        border: 2px solid var(--medium-gray);
        border-radius: 6px;
        font-size: 0.9rem;
        transition: border-color 0.3s ease;
      }

      .filter-select:focus,
      .search-input:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .search-input {
        min-width: 250px;
      }

      .collections-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 20px;
      }

      .collection-card {
        padding: 20px;
        border-left: 4px solid var(--primary-color);
      }

      .collection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: capitalize;
        color: #fff;
      }

      .status-collected {
        background-color: #4caf50; /* Vert */
      }

      .status-in_progress {
        background-color: #ff9800; /* Orange */
      }

      .status-scheduled {
        background-color: #2196f3; /* Bleu */
      }

      .status-missed {
        background-color: #f44336; /* Rouge */
      }

      .collection-status {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .status-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.85em;
        font-weight: 600;
        color: #fff;
      }

      .status-badge.status-active {
        background: rgba(76, 175, 80, 0.7);
        color: #fff;
      }

      .status-badge.status-pending,
      .status-badge.read-false {
        background: rgba(255, 140, 0, 0.7);
        color: #fff;
      }

      .status-scheduled {
        background: #e3f2fd;
        color: var(--primary-color);
      }
      .status-in_progress {
        background: #fff3e0;
        color: #f57c00;
      }
      .status-completed {
        background: #e8f5e8;
        color: var(--success-color);
      }
      .status-missed {
        background: #ffebee;
        color: var(--error-color);
      }
      .status-active {
        background: #e8f5e8;
        color: var(--success-color);
      }
      .status-inactive {
        background: #f5f5f5;
        color: var(--text-secondary);
      }
      .status-suspended {
        background: #fff3e0;
        color: #f57c00;
      }
      .status-cancelled {
        background: #ffebee;
        color: var(--error-color);
      }
      .status-open {
        background: #ffebee;
        color: var(--error-color);
      }
      .status-in_progress {
        background: #fff3e0;
        color: #f57c00;
      }
      .status-resolved,
      .read-true {
        background: #e8f5e8;
        color: var(--success-color);
      }

      .collection-time {
        font-size: 0.9rem;
        color: var(--text-secondary);
        font-weight: 500;
      }
      .incident-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .collection-actions {
        display: flex;
        gap: 8px;
      }
      .rounded-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 35px;
        font-weight: bold;
        color: white;
        width: 70px;
        height: 70px;
        border-radius: 50%;
        object-fit: cover;
        box-shadow: 0 4px 16px rgba(0, 188, 212, 0.12);
        margin-bottom: 8px;
      }
      .incident-severity {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }

      .severity-critical {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        background: #f42c2cff;
        border-radius: 5px;
        font-size: 17px;
      }

      .severity-high {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        background: #ef692bff;
        border-radius: 5px;
        font-size: 17px;
      }

      .severity-medium {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        background: #f5ab57ff;
        border-radius: 5px;
        font-size: 17px;
      }

      .severity-low {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        background: #f8e962ff;
        border-radius: 5px;
        font-size: 17px;
      }

      .action-btn {
        width: 32px;
        height: 32px;
        border: 1px solid var(--medium-gray);
        background: var(--white);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        color: var(--text-secondary);
      }

      .action-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .action-btn.danger:hover {
        border-color: var(--error-color);
        color: var(--error-color);
      }

      .collection-info h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-primary);
      }

      .collection-address,
      .collection-waste,
      .collection-collector {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin: 4px 0;
      }

      .collection-progress {
        margin-top: 16px;
      }

      .progress-bar {
        height: 6px;
        background: var(--medium-gray);
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .progress-fill {
        height: 100%;
        background: var(--primary-color);
        transition: width 0.3s ease;
      }

      .progress-text {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .employees-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 20px;
      }

      .employee-card {
        padding: 20px;
      }

      .employee-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }

      .employee-avatar {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        overflow: hidden;
      }

      .employee-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .employee-info {
        flex: 1;
      }

      .employee-info h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .employee-role {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }

      .employee-status {
        font-size: 0.8rem;
        font-weight: 500;
      }

      .employee-status.active {
        color: var(--success-color);
      }
      .employee-status.inactive {
        color: var(--error-color);
      }

      .employee-actions {
        display: flex;
        gap: 8px;
      }

      .employee-details {
        margin-bottom: 16px;
      }

      .detail-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin: 6px 0;
      }

      .detail-item i {
        font-size: 18px;
        color: var(--primary-color);
      }

      .employee-stats {
        display: flex;
        gap: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--medium-gray);
      }

      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .stat-label {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .stat-item .stat-value {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .zones-content {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 24px;
      }

      .zones-map {
        background: var(--light-gray);
        border-radius: 8px;
        overflow: hidden;
      }

      .map-container {
        height: 400px;
      }

      .map-placeholder {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--text-secondary);
      }

      .map-placeholder i {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .zones-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 400px;
        overflow-y: auto;
      }

      .zone-card {
        padding: 16px;
      }

      .zone-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .zone-header h4 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .zone-info {
        margin-bottom: 12px;
      }

      .zone-description {
        color: var(--text-secondary);
        margin-bottom: 8px;
        font-size: 0.9rem;
      }

      .zone-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .zone-status {
        text-align: right;
      }

      .schedules-calendar {
        background: var(--light-gray);
        border-radius: 8px;
        padding: 20px;
      }

      .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }

      .calendar-nav {
        background: var(--white);
        border: 1px solid var(--medium-gray);
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .calendar-nav:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .calendar-grid {
        background: var(--white);
        border-radius: 8px;
        overflow: hidden;
      }

      .calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        background: var(--primary-color);
        color: var(--white);
      }

      .day-header {
        padding: 12px;
        text-align: center;
        font-weight: 600;
      }

      .calendar-content {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        min-height: 300px;
      }

      .day-column {
        border-right: 1px solid var(--medium-gray);
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .day-column:last-child {
        border-right: none;
      }

      .schedule-item {
        background: var(--light-gray);
        padding: 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        position: relative;
      }

      .schedule-time {
        font-weight: 600;
        color: var(--primary-color);
        margin-bottom: 4px;
      }

      .schedule-zone,
      .schedule-collector {
        color: var(--text-secondary);
        margin: 2px 0;
      }
      button,
      a,
      .action-btn {
        cursor: pointer;
      }
      .schedule-actions {
        position: absolute;
        top: 4px;
        right: 4px;
        display: flex;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .schedule-item:hover .schedule-actions {
        opacity: 1;
      }

      .schedule-actions .action-btn {
        width: 20px;
        height: 20px;
        font-size: 12px;
      }

      .clients-table {
        overflow-x: auto;
      }

      .table {
        width: 100%;
        border-collapse: collapse;
        background: var(--white);
      }

      .table th,
      .table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--medium-gray);
      }

      .table th {
        background: var(--light-gray);
        font-weight: 600;
        color: var(--text-primary);
      }

      .table tr:hover {
        background: #f9f9f9;
      }

      .client-info strong {
        display: block;
        margin-bottom: 4px;
      }

      .client-contact {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .table-actions {
        display: flex;
        gap: 8px;
      }

      .reports-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        max-height: 600px;
        overflow-y: auto;
      }

      .incident-content h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--text-primary);
      }
      .incident-description,
      .incident-date {
        margin: 4px 0;
        color: var(--text-secondary);
      }
      .report-card {
        padding: 20px;
        border-left: 4px solid var(--error-color);
      }

      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .report-info h4 {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .report-type {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }

      .report-date {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .report-content {
        margin-bottom: 16px;
      }

      .report-description {
        color: var(--text-secondary);
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .report-assignment {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
        color: var(--text-secondary);
      }

      .report-actions {
        display: flex;
        gap: 12px;
      }

      .analytics-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 24px;
      }

      .analytics-card {
        padding: 20px;
      }

      .analytics-card h3 {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 16px;
        color: var(--text-primary);
      }

      .chart-placeholder {
        height: 200px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--light-gray);
        border-radius: 8px;
        color: var(--text-secondary);
      }

      .chart-placeholder i {
        font-size: 48px;
        margin-bottom: 12px;
      }

      .performance-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .performance-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: var(--light-gray);
        border-radius: 6px;
      }

      .collector-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .collector-info strong {
        font-weight: 600;
        color: var(--text-primary);
      }

      .collector-info span {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .performance-score {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .incident-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }
      .score-bar {
        width: 100px;
        height: 6px;
        background: var(--medium-gray);
        border-radius: 3px;
        overflow: hidden;
      }

      .score-fill {
        height: 100%;
        background: var(--success-color);
        transition: width 0.3s ease;
      }

      .zone-stats {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .zone-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: var(--light-gray);
        border-radius: 6px;
      }

      .zone-name {
        font-weight: 600;
        color: var(--text-primary);
      }

      .zone-metrics {
        display: flex;
        gap: 16px;
        font-size: 0.9rem;
        color: var(--text-secondary);
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
      }

      .empty-state i {
        font-size: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .form-group input.ng-invalid.ng-touched,
      .form-group select.ng-invalid.ng-touched {
        border-color: var(--error-color);
      }

      button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      .empty-state h3 {
        font-size: 1.3rem;
        margin-bottom: 8px;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      .client-audit-card {
        border-left: 4px solid var(--error-color);
      }
      .client-audit-card-manager {
        border-left: 4px solid var(--primary-color);
      }
      .client-audit-card-client {
        border-left: 4px solid var(--accent-color);
      }
      .client-audit-card-collector {
        border-left: 4px solid var(--success-color);
      }

      .read-border-true {
        border-left: 4px solid var(--success-color);
      }

      .read-border-false {
        border-left: 4px solid var(--error-color);
      }
      .modal-content {
        background: var(--white);
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }

      .zone-modal {
        max-width: 600px;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--medium-gray);
      }

      .modal-header h3 {
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .close-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .close-btn:hover {
        background: var(--light-gray);
      }

      .employee-form,
      .zone-form,
      .schedule-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .form-group label {
        font-weight: 500;
        color: var(--text-primary);
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        padding: 12px 16px;
        border: 2px solid var(--medium-gray);
        border-radius: 8px;
        font-family: "Inter", sans-serif;
        transition: border-color 0.3s ease;
      }

      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .form-group small {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .zones-checkboxes {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 150px;
        overflow-y: auto;
        padding: 8px;
        border: 1px solid var(--medium-gray);
        border-radius: 6px;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        color: var(--text-primary);
      }

      .checkbox-label input[type="checkbox"] {
        display: none;
      }

      .circular-image {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #ccc;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .checkmark {
        width: 16px;
        height: 16px;
        border: 2px solid var(--medium-gray);
        border-radius: 3px;
        position: relative;
        transition: all 0.3s ease;
      }

      .checkbox-label input[type="checkbox"]:checked + .checkmark {
        background: var(--primary-color);
        border-color: var(--primary-color);
      }

      .checkbox-label input[type="checkbox"]:checked + .checkmark::after {
        content: "✓";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: var(--white);
        font-size: 10px;
        font-weight: bold;
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--medium-gray);
      }
   
            /**Grid messagerie start */

      .parent {
        display: flex;
        flex-direction: column;
        height: 700px; /* prend toute la hauteur */
      }

      /* Header */
      .chat-header-column {
        background-color: var(--medium-gray);
        padding: 10px;
        height: 50px;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        text-align: center;
      }

      /* Zone centrale (sidebar + chat) */
      .message-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      /* Sidebar */
      .chat-left-column {
        width: 30%;
        background-color: var(--medium-gray);
        padding: 10px;
      }

      /* Zone chat (messages + input) */
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: #f9f9f9;
        background-image: url("../../../../assets/chatBg/chat_background.png");
        background-size: cover;
      }

      /* Messages scrollables */
      .chat-messages {
        flex: 1;
        padding: 10px;
        overflow-y: auto;
      }
      /* Messages reçus (à gauche) */
      .received {
        display: flex;
        justify-content: flex-start;
      }

      .div5 {
        background-color: var(--medium-gray);
        padding: 10px;
        border-radius: 10px;
        max-width: 60%;
      }

      /* Messages envoyés (à droite) */
      .sent {
        display: flex;
        justify-content: flex-end;
      }

      .div6 {
        background-color: var(--message-send);
        padding: 10px;
        border-radius: 10px;
        max-width: 60%;
      }
      .received .chat-bubble {
        background: #eff3f1;
        color: #000;
        padding: 8px 14px;
        border-radius: 8px;
        display: inline-block;
        margin: 2% 0;
        max-width: 80%;
        font-size: 14px;
      }

      .sent .chat-bubble {
        background: #6cee9e;
        color: #000;
        padding: 8px 14px;
        border-radius: 6px;
        display: inline-block;
        margin: 2% 0;
        max-width: 80%;
        /* font-weight: bold; */
        font-size: 14px;
      }

      /* Input en bas */
      .div7 {
        display: flex;
        align-items: center;
        background-color: var(--medium-gray);
        padding: 10px;
      }

      .div7 input {
        flex: 1;
        padding: 8px;
        border-radius: 6px;
        border: none;
      }

      .chat-actions button {
        margin-left: 10px;
        width: fit-content;
      }

      .sendChatMessage {
        flex: 1;
        border-radius: 30px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        border: 1px solid #ccc;
        padding: 10px 20px;
        outline: none;
        width: 100%;
        font-size: 14px;
        transition: box-shadow 0.2s ease;
      }
      .chat-input-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .chat-actions > button {
        justify-content: center;
        align-items: center;
        display: flex;
        height: 40px;
      }
      .chat-actions mat-icon {
        font-size: 25px;
      }

      .material-icons {
        font-family: "Material Icons";
        font-weight: normal;
        font-style: normal;
      }
      .sendChatMessage:focus {
        box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.3);
        border-color: #6495ff;
      }
      .chat-time {
        display: block;
        justify-items: center;
        text-align: right;
        font-size: 8px;
        margin-top: 5px;
      }
      .chat-read {
        font-size: 14px;
        margin-top: 0px;
        padding-top: 5px;
        width:fit-content;
        height:fit-content;
      }
      /**left column chat css */
      .chat-left-column-header {
        padding: 16px;
        background-color: var(--surface-400, #4caf50);
        color: #fff;
        margin-bottom: 10px;
        font-weight: bold;
        font-size: 16px;
        border-bottom: 1px solid #ddd;
        border-radius: 5px 5px 0 0;
      }

      /*Liste des discussions*/
      .chat-left-column-content {
        flex: 1;
        max-height: 500px;
        overflow-y: auto;
      }

      .chat-left-column-content-item {
        display: flex;
        padding: 12px 16px;
        min-width: 100%;
        font-size: 14px;
        align-self:start;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        background-color: var(--surface-300);
        transition: background-color 0.2s;
      }

      .chat-left-column-content-item:hover {
        background-color: #f9f9f9;
      }

      .chat-left-column-content-item.active {
        background-color: #e6f4ea;
        font-weight: bold;
      }
      /** Grid messagerie end */
      @media (max-width: 1024px) {
        .header-content {
          flex-direction: column;
          text-align: center;
        }

        .zones-content {
          grid-template-columns: 1fr;
        }

        .collections-grid,
        .employees-grid {
          grid-template-columns: 1fr;
        }

        .tabs-navigation {
          overflow-x: auto;
        }
      }

      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .collections-filters,
        .clients-filters,
        .reports-filters,
        .analytics-filters {
          flex-direction: column;
          align-items: stretch;
        }
        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-row {
          grid-template-columns: 1fr;
        }

        .modal-content {
          margin: 20px;
          width: calc(100% - 40px);
        }

        .calendar-content {
          grid-template-columns: 1fr;
        }

        .day-column {
          border-right: none;
          border-bottom: 1px solid var(--medium-gray);
        }
      }
    `,
  ],
})
export class AgencyDashboardComponent implements OnInit {
  scheduleForm: FormGroup;

  currentUser: User | null = null;
  agencyReports: Report[] = [];
  ouagaData: QuartierData[] = OUAGA_DATA;
  agency: Agency | null = null;
  activeTab = "collections";
  collectors: Employees[] = [];
  zonesAgency: ServiceZone[] = [];
  manager: Employees[] = [];
  // Data
  // statistics: Statistics = {
  //   totalClients: 1250,
  //   activeCollectors: 8,
  //   todayCollections: 45,
  //   completedCollections: 38,
  //   monthlyRevenue: 32450,
  //   averageRating: 4.3,
  //   pendingReports: 3
  // };
  incidentsFilter = "all";
  severityFilter = "all";
  filteredIncidents: any[] = [];
  statistics: Statistics = {
    totalClients: 0,
    totalEmployees: 0,
    totalZones: 0,
    totalCollectors: 0,
    totalSignalements: 0,
    activeCollectors: 0,
    todayCollections: 0,
    resolvedSignalements: 0,
    completedCollections: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    pendingReports: 0,
    pendingSignalements: 0,
  };
   userData = {
      _id: '',
      role: UserRole.CLIENT as UserRole | null,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      address: {
        arrondissement: '',
        sector: '',
        street: '',
        doorNumber: '',
        doorColor: '',
     neighborhood: [] as string[],
        city: '',
        postalCode: '',
        // latitude: '',
        // longitude: ''
      },
      agencyName: '',
      agencyDescription: '',
      termsAccepted: false,
      acceptTerms: true,
      receiveOffers: false,
      commune: {
        name: '',
        region: '',
        province: ''
      }
    };
  
  collections: Collection[] = [];
  filteredCollections: Collection[] = [];
  employees: Employee[] = [];
  tarif: tarif[] = [];
  editingEmployeeId: string | null = null;
  isEditing: boolean = false;
  allEmployees: Employees[] = [];
  allTarif: Tariff[] = [];
  serviceZones: ServiceZone[] = [];
  serviceZoness: ServiceZones[] = []; //from API
  // schedules: CollectionSchedule[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];
  reports: Report[] = [];
  filteredReports: Report[] = [];
  isDeleting: boolean = false;
  // assigner un planning à un collecteur
  showAssignModal: boolean = false;
  selectedReportId: string = "";

  selectedEmployee: string[] = [];
  // Filters
  collectionsFilter = "all";
  selectedZone = "";
  clientsSearch = "";
  clientsFilter = "all";
  reportsFilter = "all";
  reportsTypeFilter = "all";
  analyticsPeriod = "monthly";
  analyticsFilter = "all";

  // Modals
  showAddEmployeeModal = false;
  showUpdateEmployeeModal = false;
  showZoneModal = false;
  showZoneModalcouverture = false;

  showScheduleModal = false;
  editingZone = false;

  // Forms
  newEmployee: any = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    zones: [],
  };
  newTariff: any = {
    // agencyId: "",
    type: "",
    price: "",
    description: "",
    nbPassages: "",
  };

  newZone: any = {
    name: "",
    description: "",
    cities: [],
    neighborhoods: [],
    isActive: true,
  };

  newSchedule: any = {
    zoneId: "",
    dayOfWeek: "",
    startTime: "",
    // endTime: "",
    collectorId: "",
    // endDate: "",
  };
  // formErrors = {
  //   zoneId: '',
  //   dayOfWeek: '',
  //   startTime: '',
  //   endTime: '',
  //   collectorId: ''
  // };
  formErrors = {
    zone: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    collectorId: "",
    // endDate: "",
  };
  citiesInput = "";
  minDate: string;

  neighborhoodsInput = "";
  activeClients: ClientApi[] = [];
  activeClientNbrs!: number;
  pendingClients: ClientApi[] = [];
  isLoading: boolean = false;
  // get activeClientNbr(): number {
  //   return this.activeClients.length;
  // }

  tabs = [
    {
      id: "collections",
      label: "Collectes",
      icon: "local_shipping",
      badge: 0,
    },
    { id: "employees", label: "Employés", icon: "people", badge: null },
    { id: "zones", label: "Zones", icon: "map", badge: null },
    { id: "schedules", label: "Plannings", icon: "schedule", badge: null },
    { id: "clients", label: "Clients", icon: "person", badge: null },
    { id: "reports", label: "Signalements", icon: "report_problem", badge: 0 },
    { id: "messages", label: "Messages", icon: "message", badge: 0 },
    // { id: "analytics", label: "Rapports", icon: "analytics", badge: null },
  ];

  weekDays = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
    "Dimanche",
  ];
  currentWeek = new Date();
  unreadMessageCount: any;
  receivedMessages: any;

  showMessageModal: boolean = false;
  messageData: Message = {
    sender: "",
    receiver: "",
    content: "",
  };
  connectedUserMessages: any;
  receivedId: string = "";
  client: any;
  displayAgencyName: string = ""
  employeeForm: FormGroup;
  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private messageService: MessagesService,
    private sharedService: SharedService,
        private countriesOrgMockService: CountriesOrgMockService,
        private route: ActivatedRoute
    
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split("T")[0];
    this.scheduleForm = this.fb.group(
      {
        zone: [""],
        date: ["", Validators.required],
        startTime: ["", Validators.required],
        endTime: ["", Validators.required],
        collectorId: ["", Validators.required],
      },
      {
        validators: [this.validateTimeOrder],
      }
    );
    this.employeeForm = this.fb.group({
      firstName: ["", Validators.required],
      lastName: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
      phone: ["", Validators.required],
      role: ["", Validators.required],
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    console.log("this.currentUser", this.currentUser);
    this.loadAgencyStatistics(this.currentUser);
    this.loadAgencyData();
    this.loadCollectors(this.currentUser);
    // this.loadZonesForAgency(this.currentUser);
    this.loadAgencyReports(this.currentUser);
    this.loadTariffs();
    this.loadPlannings();
    this.loadCollectorPlannings();
    this.cdr.detectChanges();
    this.loadZones(this.currentUser);
    this.loadCollectDay();
     this.getAllCountries();

    setInterval(() => {
      this.loadCollectDay();
    }, 30000);
    this.loadCollectHistory();
    this.filterIncidents();
    this.countUnreadMessages();
    this.userMessages();
     // Écouter les changements de fragment
    this.route.fragment.subscribe(fragment => {
      if (fragment) {
        // Faire défiler jusqu'à la section
        const element = document.getElementById(fragment);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });

    // Écouter les queryParams
    this.route.queryParams.subscribe(params => {
      if (params['source'] === 'notification') {
        // Traitement spécifique pour les notifications
        this.handleNotificationParams(params);
      }
    });
  }
 private handleNotificationParams(params: any) {
    // Logique pour traiter les paramètres selon le contexte
    if (params['id']) {
      // Charger les données spécifiques
    }
  }
  // /**Gestion des messages recus par le client connecté */
  // countUnreadMessages() {
  //   this.messageService
  //     .getUserUnreadMessagesCount(this.currentUser?.userId || "")
  //     .subscribe({
  //       next: (response: any) => {
  //         if (response) {
  //           console.log("API > getUserUnreadMessagesCount:", response);
  //           this.unreadMessageCount = response.unreadCount || 0;
  //         }
  //       },
  //       error: (error: any) => {
  //         console.error("API > getUserUnreadMessagesCount:", error);
  //       },
  //     });
  // }

  // userMessages() {
  //   this.messageService
  //     .getMessagesForAgency(this.currentUser?.userId || "")
  //     .subscribe({
  //       next: (response: any) => {
  //         if (response) {
  //           console.log("API > getMessagesForUser:", response);
  //           this.receivedMessages = response.messages || [];
  //           this.receivedMessages.forEach((message: any) => {
  //             message.read = message.read.toString();
  //             this.clientService
  //               .getClientById(message.sender)
  //               .subscribe((response: any) => {
  //                 if (response.success && response.data) {
  //                   this.client = response.data;
  //                   console.log("Client data:", this.client);
  //                   message.senderName =
  //                     this.client.firstName + " " + this.client.lastName;
  //                 }
  //               });
  //             console.log("Message:", message);
  //           });
  //         }
  //       },
  //       error: (error: any) => {
  //         console.error("API > getMessagesForUser:", error);
  //       },
  //     });
  // }
  // readAndRespondMessage(message: Message): void {
  //   console.log("Marquer le message comme lu:", message);
  //   this.messageService.markMessagesAsRead(message._id || "").subscribe({
  //     next: (response: any) => {
  //       this.showMessageModal = true;
  //       this.receivedId = message.sender;
  //       this.countUnreadMessages();
  //       this.userMessages();
  //       console.log("Lire et répondre au message:", message._id);
  //     },
  //     error: (error: any) => {
  //       console.error("Erreur lors de la lecture du message:", error);
  //     },
  //   });
  // }
  // submitMessage(): void {
  //   if (!this.currentUser) {
  //     this.notificationService.showError(
  //       "Connexion requise",
  //       "Vous devez être connecté pour envoyer un message"
  //     );
  //     return;
  //   }
  //   if (!this.agency) {
  //     this.notificationService.showError("Erreur", "Agence non trouvée");
  //     return;
  //   }
  //   this.messageData.sender = this.currentUser?.userId || "";
  //   this.messageData.receiver = this.receivedId || "";
  //   this.messageData.content = this.messageData.content.trim();
  //   if (!this.messageData.content) {
  //     this.notificationService.showError(
  //       "Message vide",
  //       "Le contenu du message ne peut pas être vide"
  //     );
  //     return;
  //   }

  //   console.log("Envoi du message:", this.messageData);
  //   this.messageService.sendMessage(this.messageData).subscribe({
  //     next: (response: any) => {
  //       console.log("API > sendMessage:", response);
  //       this.notificationService.showSuccess(
  //         "Message envoyé",
  //         "Votre message a bien été envoyé"
  //       );
  //       this.showMessageModal = false;
  //       this.userMessages();
  //     },
  //     error: (error: any) => {
  //       console.error("API > sendMessage:", error);
  //       this.notificationService.showError(
  //         "Message non envoyé",
  //         "Une erreur s'est produite lors de l'envoi du message"
  //       );
  //     },
  //   });
  // }

  // deleteMessage(messageId: string): void {
  //   if (confirm("Êtes-vous sûr de vouloir supprimer ce message ?")) {
  //     this.messageService.deleteMessage(messageId).subscribe({
  //       next: (response: any) => {
  //         console.log("API > deleteMessage:", response);
  //         this.notificationService.showSuccess(
  //           "Message supprimé",
  //           "Le message a bien été supprimé"
  //         );
  //         this.showMessageModal = false;
  //         this.countUnreadMessages();
  //         this.userMessages();
  //       },
  //       error: (error: any) => {
  //         console.error("API > deleteMessage:", error);
  //         this.notificationService.showError(
  //           "Message non supprimé",
  //           "Une erreur s'est produite lors de la suppression du message"
  //         );
  //       },
  //     });
  //   }
  // }
  // /**Gestion des messages recus par le client connecté fin */

  /**Gestion des messages recus par le client connecté */
  countUnreadMessages() {
    this.messageService
      .getUserUnreadMessagesCount(this.currentUser?.userId || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            console.log("API > getUserUnreadMessagesCount:", response);
            this.unreadMessageCount = response.unreadCount || 0;
          }
        },
        error: (error: any) => {
          console.error("API > getUserUnreadMessagesCount:", error);
        },
      });
  }

  userMessages() {
    this.messageService
      .getMessagesForUser(this.currentUser?.userId || "")
      .subscribe({
        next: (response: any) => {
          if (response) {
            console.log("API > getMessagesForUser:", response);
            this.connectedUserMessages = response|| [];
            console.log("this.connectedUserMessages:", this.connectedUserMessages);
          }
        },
        error: (error: any) => {
          console.error("API > getMessagesForUser:", error);
        },
      });
  }

  userAndAgencyConversation(client: any) {
    this.displayAgencyName = client.firstName+ " " + client.lastName;
    const clientId= client?.userId
    this.clientService
      .userAndAgencyConversation(this.currentUser?.userId || "", clientId)
      .subscribe((response: any) => {
        console.log("API >userAndAgencyConversation:", response);
        if (response) {
          console.log("API >userAndAgencyConversation:", response);
          this.receivedMessages = response.messages || [];
          if(!clientId){
              this.receivedId = this.currentUser?.userId || "";
          } else {
              this.receivedId = clientId;
          }
          this.receivedMessages.forEach((message: any) => {
            if(message.receiver === this.currentUser?.userId){
              this.readAndRespondMessage(message);
            }
            message.read = message.read.toString();
          });
        }else{
          this.receivedMessages = [];
          this.notificationService.showError("Erreur", "Aucun message, veuillez contacter l'agence !");
        }
      });
  }
  readAndRespondMessage(message: Message): void {
    this.messageService.markMessagesAsRead(message._id || "").subscribe({
      next: (response: any) => {
        this.receivedId = message.sender;
        console.log("Lire et répondre au message:", message._id);
      },
      error: (error: any) => {
        console.error("Erreur lors de la lecture du message:", error);
      },
    });
  }
  submitMessage() {
    if (!this.currentUser) {
      this.notificationService.showError(
        "Connexion requise",
        "Vous devez être connecté pour envoyer un message"
      );
      return;
    }
    if (!this.receivedId) {
      this.notificationService.showError("Erreur", "Agence non trouvée");
      return;
    }
    this.messageData.sender = this.currentUser?.userId || "";
    this.messageData.receiver = this.receivedId || "";
    this.messageData.content = this.messageData.content.trim();
    if (!this.messageData.content) {
      this.notificationService.showError(
        "Message vide",
        "Le contenu du message ne peut pas être vide"
      );
      return;
    }

    console.log("Envoi du message:", this.messageData);
    this.messageService.sendMessage(this.messageData).subscribe({
      next: (response: any) => {
        console.log("API > sendMessage:", response);
        this.userAndAgencyConversation(
          this.receivedId || ""
        )
        this.notificationService.showSuccess(
          "Message envoyé",
          "Votre message a bien été envoyé"
        );
        this.messageData.content = "";
      },
      error: (error: any) => {
        console.error("API > sendMessage:", error);
        this.notificationService.showError(
          "Message non envoyé",
          "Une erreur s'est produite lors de l'envoi du message"
        );
      },
    });
  }

  /**Gestion des messages recus par le client connecté fin */

  openAssignModal(reportId: string): void {
    this.selectedReportId = reportId;
    this.selectedEmployee = [];
    this.showAssignModal = true;
  }
  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedEmployee = [];
  }

  validateTimeOrder(group: FormGroup) {
    const start = group.get("startTime")?.value;
    const end = group.get("endTime")?.value;

    if (start && end && end <= start) {
      return { invalidTimeOrder: true };
    }
    return null;
  }

  assignEmployeesToReport(): void {
    // if (this.selectedReportId && this.selectedEmployees.length > 0) {
    //   const payload = {
    //     reportId: this.selectedReportId,
    //     assignedEmployees: this.selectedEmployees,
    //   };
    //   this.agencyService.assignEmployeesToReport$(payload).subscribe({
    //     next: () => {
    //       this.notificationService.showSuccess('Succès', 'Les employés ont été assignés au signalement.');
    //       this.showAssignModal = false;
    //       this.loadAgencyReports(this.currentUser); // Recharger les signalements
    //     },
    //     error: (err) => {
    //       console.error('Erreur lors de l\'assignation des employés :', err);
    //       this.notificationService.showError('Erreur', 'Impossible d\'assigner les employés.');
    //     },
    //   });
    // } else {
    //   this.notificationService.showError('Erreur', 'Veuillez sélectionner au moins un employé.');
    // }
  }
  toggleEmployeeSelection(employeeId: string, event: any): void {
    if (event.target.checked) {
      this.selectedEmployee.push(employeeId);
    } else {
      this.selectedEmployee = this.selectedEmployee.filter(
        (id) => id !== employeeId
      );
    }
  }
  // updateTabs(): void {
  //   this.tabs = [
  //     { id: 'collections', label: 'Collectes', icon: 'local_shipping', badge: null },
  //     { id: 'employees', label: 'Employés', icon: 'people', badge: null },
  //     { id: 'zones', label: 'Zones', icon: 'map', badge: null },
  //     { id: 'schedules', label: 'Plannings', icon: 'schedule', badge: null },
  //     { id: 'clients', label: 'Clients', icon: 'person', badge: this.activeClientNbrs },
  //     { id: 'reports', label: 'Signalements', icon: 'report_problem', badge: 3 },
  //     { id: 'analytics', label: 'Rapports', icon: 'analytics', badge: null }
  //   ];

  // }
  // activeClientNbr() {
  //   return this.activeClients.length;
  // }

  // loadTariffsForAgency(): void {
  //     const userString = localStorage.getItem('currentUser');
  //     if (userString) {
  //       const currentUser = JSON.parse(userString);
  //       const agencyId = currentUser._id;

  //       this.agencyService.getAgencyTariffs(agencyId).subscribe({
  //         next: (tariffs) => {
  //           this.agencyTariffs = tariffs;
  //           console.log('Tarifs récupérés :', tariffs);
  //         },
  //         error: (err) => {
  //           console.error("Erreur lors du chargement des tarifs de l'agence", err);
  //         }
  //       });
  //     } else {
  //       console.error("Aucun utilisateur trouvé dans le stockage local.");
  //     }
  //   }

  loadAgencyData(): void {
    // Charger les données de l'agence
    // Simule une agence si null pour debug
    if (this.currentUser) {
      // this.agency = { _id: 'agency1', agencyName: 'Agence Demo' } as any;
      this.agency = this.currentUser as any;
      console.log("[loadAgencyData] agency simulée:", this.agency);
      this.loadEmployees(this.currentUser);
    }
    this.loadCollections();
    // this.loadServiceZones();
    // this.loadSchedules();
    console.log("[loadAgencyData] agency avant loadClients:", this.agency);
    this.loadClients();
    this.loadReports();
    //this.activeClientNbrs = this.activeClientNbr(); // Mettez à jour le nombre d'actifs
    //this.updateTabs(); // Mettez à jour les tabs après avoir récupéré les clients
  }
  loadCollectors(currentUser: any): void {
    if (currentUser?._id) {
      this.agencyService
        .getAgencyEmployeesByRole$(currentUser._id, EmployeeRole.COLLECTOR)
        .subscribe(
          (employee) => {
            this.collectors = employee;
            console.log(
              "Collecteurs chargés via l api service  :",
              this.collectors
            );
          },
          (error) => {
            console.error("Erreur lors du chargement des collecteurs :", error);
          }
        );
    } else {
      this.agencyService
        .getAgencyEmployeesByRole$(currentUser._id, EmployeeRole.MANAGER)
        .subscribe(
          (manager) => {
            this.collectors = manager;
            console.log(
              "Collecteurs chargés via l api service  :",
              this.collectors
            );
          },
          (error) => {
            console.error("Erreur lors du chargement des collecteurs :", error);
          }
        );
    }
  }

  //suppression d un employé
  // deleteEmployee(currentUser: any, employeeId: any): void {
  //   this.isDeleting = true;

  //   if (currentUser?._id && employeeId?.userId?._id) {
  //     this.agencyService.deleteEmployee$( employeeId.userId._id).subscribe(
  //       () => {
  //         this.notificationService.showSuccess(
  //           'Succès',
  //           'L\'employé a été supprimé avec succès.'
  //         );
  //         this.loadEmployees(currentUser);
  //         this.isDeleting = false;
  //       },
  //       (error) => {
  //         this.notificationService.showError(
  //           'Erreur',
  //           'Impossible de supprimer l\'employé. Veuillez réessayer.'
  //         );
  //         console.error("Erreur lors de la suppression de l'employé :", error);
  //         this.isDeleting = false;
  //       }
  //     );
  //   } else {
  //     console.warn("Aucun ID d'agence trouvé dans l'utilisateur courant.");
  //     this.isDeleting = false;
  //   }
  // }
  deleteEmployee(currentUser: any, employeeId: any): void {
    this.isDeleting = true;

    // Vérification des IDs nécessaires
    if (!currentUser?._id || !employeeId?.userId?._id) {
      this.notificationService.showError(
        "Erreur",
        "Impossible d'identifier l'employé à supprimer"
      );
      this.isDeleting = false;
      return;
    }

    // Demander confirmation avant suppression
    if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
      this.agencyService.deleteEmployee$(employeeId.userId._id).subscribe({
        next: (response) => {
          // Vérifier si la réponse indique un succès
          if (response) {
            this.notificationService.showSuccess(
              "Succès",
              "L'employé a été supprimé avec succès."
            );
            // Recharger la liste des employés
            this.loadEmployees(currentUser);

            // Mettre à jour le badge du nombre d'employés
            const employeesTab = this.tabs.find(
              (tab) => tab.id === "employees"
            );
            if (employeesTab && this.allEmployees) {
              employeesTab.badge = this.allEmployees.length - 1;
            }
          } else {
            this.notificationService.showError(
              "Erreur",
              "La suppression a échoué. Veuillez réessayer."
            );
          }
          this.isDeleting = false;
        },
        error: (error) => {
          console.error("Erreur lors de la suppression de l'employé :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de supprimer l'employé. " +
              (error.error?.message || "Veuillez réessayer.")
          );
          this.isDeleting = false;
        },
        complete: () => {
          this.isDeleting = false;
        },
      });
    } else {
      this.isDeleting = false;
    }
  }
  assignIncident(): void {
    this.notificationService.showInfo(
      "Attribution",
      "Ouverture du formulaire d'attribution"
    );
    return;
  }
  // onEditEmployee(emp: any) {
  //   this.editingEmployeeId = emp._id;
  //   this.editForm.patchValue({
  //     firstname: emp.firstname,
  //     lastname: emp.lastname,
  //     email: emp.email,
  //     phone: emp.phone,
  //     role: emp.role
  //   });
  //   this.isEditing = true;
  // }

  loadCollections(): void {
    // Simuler les collectes
    this.collections = [
      {
        id: "1",
        clientId: "client1",
        agencyId: "agency1",
        collectorId: "collector1",
        scheduledDate: new Date(),
        status: CollectionStatus.IN_PROGRESS,
        address: {
          street: "Rue des Roses",
          doorNumber: "15",
          doorColor: "blue",
          neighborhood: "Centre-ville",
          city: "Oouagadougou",
          postalCode: "75001",
        },
        wasteTypes: [
          {
            id: "1",
            name: "Déchets ménagers",
            description: "",
            icon: "delete",
            color: "#4caf50",
            instructions: [],
            acceptedItems: [],
            rejectedItems: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    this.filteredCollections = [...this.collections];
  }

  employeesNbrs!: number;
  activesEmployeesNbrs!: number;
  zoneLength!: number;
  getZoneLengthByEmployeeId(employeeId: string): number {
    const employee = this.allEmployees.find((emp) => emp._id === employeeId);
    this.zoneLength = employee ? employee.zones.length : 0;
    console.log("Employee found for zone length:", this.zoneLength);
    return this.zoneLength;
  }

  loadEmployees(currentUser: any): void {
    if (currentUser?._id) {
      this.agencyService.getAgencyAllEmployees(currentUser?._id).subscribe({
        next: (employees) => {
          this.allEmployees = employees;
          console.log("loadEmployees > :", this.allEmployees);
          const employeesTab = this.tabs.find((tab) => tab.id === "employees");
          if (employeesTab) {
            employeesTab.badge = employees.length;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement des employés :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les employés. Veuillez réessayer."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }

  // fonction to load zones for the current agency
  // loadZonesForAgency(currentUser: any): void {
  //   if (currentUser?._id) {
  //     this.agencyService.getAgencyZones$(currentUser?._id).subscribe({
  //       next: (zonesAgency) => {
  //         this.zonesAgency = zonesAgency;
  //       },
  //       error: (err) => {
  //         console.error('Erreur lors du chargement des zones de l agence', err);
  //       },
  //     });
  //   } else {
  //     console.error("Aucun agencyId trouvé dans le stockage local.");
  //   }
  // }
  //chargement des signalements
  loadAgencyReports(currentUser: any): void {
    if (currentUser && currentUser._id) {
      const agencyId = currentUser._id;
      this.agencyService.getAgencyReports$(agencyId).subscribe({
        next: (reports: any) => {
          this.agencyReports = reports?.reports;
          console.log("Signalements chargés >>>>>> :", this.agencyReports);
          // Mise à jour du badge des Signalements
          const SignalementsTab = this.tabs.find((tab) => tab.id === "reports");
          if (SignalementsTab) {
            SignalementsTab.badge = this.statistics.pendingSignalements;
            this.cdr.detectChanges(); // Force la détection des changements
          }
          const repportTab = this.tabs.find((tab) => tab.id === "reports");
          if (repportTab) {
            repportTab.badge = this.statistics.pendingSignalements;
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement des signalements :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les signalements. Veuillez réessayer."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }

  //recuperations des statistiques de l'agence
  loadAgencyStatistics(currentUser: any): void {
    if (currentUser && currentUser._id) {
      const agencyId = currentUser._id;
      this.agencyService.getAgencyStats$(agencyId).subscribe({
        next: (statistics) => {
          this.statistics = statistics;
          console.log("Statistiques de l'agence chargées :", this.statistics);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des statistiques de l'agence :",
            error
          );
          this.notificationService.showError(
            "Erreur",
            "Impossible de charger les statistiques de l'agence. Veuillez réessayer."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }
  // loadServiceZones(): void {
  //   this.serviceZones = [
  //     {
  //       id: "zone1",
  //       name: "Zone Centre",
  //       description: "Centre-ville et quartiers adjacents",
  //       boundaries: [],
  //       neighborhoods: ["Centre-ville", "Quartier Latin"],
  //       cities: ["Paris"],
  //       isActive: true,
  //     },
  //   ];
  // }

  // loadSchedules(): void {
  //   this.schedules = [
  //     {
  //       // id: '1',
  //       zoneId: 'zone1',
  //       dayOfWeek: 1,
  //       startTime: '08:00',
  //       endTime: '12:00',
  //       collectorId: '1',
  //       // isActive: true
  //     }
  //   ];
  // }

  // Helper pour récupérer le statut d'abonnement
  getClientSubscriptionStatus(c: any): string | undefined {
    return c.subscriptionHistory && c.subscriptionHistory.length
      ? c.subscriptionHistory[
          c.subscriptionHistory.length - 1
        ].status?.toLowerCase()
      : undefined;
  }

  clientNbrs!: number;

  loadClients(): void {
    console.log("[loadClients] called, agency:", this.agency);
    if (!this.agency || !this.agency?._id) return;
    this.clientService.getClientsByAgency(this.agency._id).subscribe({
      next: (clients) => {
        console.log(
          "[loadClients] clients number:",
          this.activeClientNbrs,
          clients.length
        );
        console.log("ALL Agency_clients", clients);
        this.activeClients = clients.filter(
          (c) => this.getClientSubscriptionStatus(c) === "active"
        );
        this.pendingClients = clients.filter(
          (c) => this.getClientSubscriptionStatus(c) === "pending"
        );
        console.log(
          "[loadClients] active:",
          this.activeClients,
          "pending:",
          this.pendingClients
        );

        if (clients) {
          this.clientNbrs = clients.length;
          this.activeClients = clients;
          console.log("[loadClients] clients received:", this.clientNbrs);
          // Vérifiez si activeClients est défini et mettez à jour le nombre d'actifs
          if (this.activeClients) {
            this.activeClientNbrs = this.activeClients.length; // Directement obtenir le nombre d'actifs
            // Trouver l'onglet "Clients" et mettre à jour son badge
            const clientsTab = this.tabs.find((tab) => tab.label === "Clients");
            if (clientsTab) {
              clientsTab.badge = this.clientNbrs; // Mettre à jour le badge
              console.log("badge >>", clientsTab.badge);
              console.log("activeClientNbrs >>", this.activeClientNbrs);
            } else {
              console.warn("L'onglet 'Clients' n'a pas été trouvé.");
            }
          }
        }
      },
      error: (err) => {
        console.error("[loadClients] error:", err);
        this.activeClients = [];
        this.pendingClients = [];
      },
    });
  }

  loadReports(): void {
    this.reports = [
      {
        _id: "1",
        clientId: "client1",
        clientName: "Marie Dupont",
        type: "missed_collection",
        description: "La collecte n'a pas eu lieu à l'heure prévue",
        date: new Date(),
        status: "open",
        severity: "medium",
        createdAt: new Date(),
        assignedTo: undefined,
      },
    ];
    this.filteredReports = [...this.reports];
  }

  // Utility methods
  getActiveCollectorsToday(): number {
    return this.employees.filter((e) => e.role === "collector" && e.isActive)
      .length;
  }

  getCollectionRate(): number {
    return Math.round(
      (this.statistics.completedCollections /
        this.statistics.todayCollections) *
        100
    );
  }

  // getStars(rating: number): number[] {
  //   return new Array(Math.floor(rating)).fill(0);
  // }
  getStars(rating: number): number[] {
    // console.log('Rating reçu dans getStars:', rating);
    if (!rating || rating < 0) {
      return [];
    }
    return new Array(Math.floor(rating)).fill(0);
  }

  getStatusText(status: CollectionStatus): string {
    const statusTexts = {
      [CollectionStatus.SCHEDULED]: "Programmé",
      [CollectionStatus.IN_PROGRESS]: "En cours",
      [CollectionStatus.COMPLETED]: "Terminé",
      [CollectionStatus.MISSED]: "Manqué",
      [CollectionStatus.CANCELLED]: "Annulé",
      [CollectionStatus.REPORTED]: "Signalé",
    };
    return statusTexts[status] || status;
  }

  getClientName(clientId: string): string {
    const client = this.clients.find((c) => c.id === clientId);
    return client ? client.name : "Client inconnu";
  }

  getWasteTypeName(wasteType: any): string {
    return wasteType?.name || "Type inconnu";
  }
  getCollectorName(ids: string[]): string {
    return ids
      .map((id) => {
        const collector = this.collectors.find((c) => c._id === id);
        return collector
          ? `${collector.firstName} ${collector.lastName} `
          : "Inconnu";
      })
      .join(", ");
  }

  getCollectionProgress(collection: Collection): number {
    // Simuler le progrès de collecte avec une valeur stable
    const seed = collection.id
      .split("")
      .reduce((a, b) => a + b.charCodeAt(0), 0);
    return seed % 100;
  }

  getRoleText(role: string): string {
    const roleTexts = {
      admin: "Administrateur",
      manager: "Manager",
      collector: "Collecteur",
    };
    return roleTexts[role as keyof typeof roleTexts] || role;
  }

  getZoneName(zone: string): string {
    // Exemple simple
    return zone || "Zone inconnue";
  }

  getZoneClients(zoneId: string): number {
    // Simuler le nombre de clients par zone
    return Math.floor(Math.random() * 200) + 50;
  }

  getEmployeeCollections(employeeId: string): number {
    return Math.floor(Math.random() * 20) + 5;
  }

  getEmployeeRating(employeeId: string): number {
    return Math.round((Math.random() * 2 + 3) * 10) / 10;
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees.find((e) => e.id === employeeId);
    return employee
      ? `${employee.firstName} ${employee.lastName}`
      : "Employé inconnu";
  }

  getSubscriptionStatusText(status: string): string {
    const statusTexts = {
      active: "Actif",
      suspended: "Suspendu",
      cancelled: "Résilié",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getReportTypeText(type: string): string {
    const typeTexts = {
      missed_collection: "Collecte manquée",
      incomplete_collection: "Collecte incomplète",
      damage: "Dommage",
      complaint: "Réclamation",
    };
    return typeTexts[type as keyof typeof typeTexts] || type;
  }

  getReportStatusText(status: string): string {
    const statusTexts = {
      open: "Ouvert",
      in_progress: "enregistré",
      resolved: "Résolu",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getCurrentWeekText(): string {
    const startOfWeek = new Date(this.currentWeek);
    startOfWeek.setDate(
      this.currentWeek.getDate() - this.currentWeek.getDay() + 1
    );
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return `${startOfWeek.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })} - ${endOfWeek.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    })}`;
  }

  // getSchedulesForDay(dayIndex: number): any[] {
  //   return this.schedules.filter(s => s.dayOfWeek === dayIndex + 1);
  // }
  // getSchedulesForDay(dayIndex: number): any[] {
  //   const startOfWeek = new Date(this.currentWeek);
  //   startOfWeek.setDate(
  //     this.currentWeek.getDate() - this.currentWeek.getDay() + 1
  //   ); // Lundi
  //   const targetDate = new Date(startOfWeek);
  //   targetDate.setDate(startOfWeek.getDate() + dayIndex);

  //   return this.plannings.filter((schedule) => {
  //     const scheduleDate = new Date(schedule.date);
  //     return (
  //       scheduleDate.toDateString() === targetDate.toDateString() &&
  //       schedule.dayOfWeek === dayIndex + 1
  //     );
  //   });
  // }

  getSchedulesForDay(dayIndex: number): any[] {
    if (!Array.isArray(this.schedules)) {
      return [];
    }

    const startOfWeek = new Date(this.currentWeek);
    const day = this.currentWeek.getDay();
    const diff = this.currentWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + dayIndex);

    return this.schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.date);
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate.getTime() === targetDate.getTime();
    });
  }

  getCollectorPerformance(): any[] {
    return this.employees
      .filter((e) => e.role === "collector")
      .map((e) => ({
        name: `${e.firstName} ${e.lastName}`,
        collectionsCount: this.getEmployeeCollections(e.id),
        score: Math.floor(Math.random() * 30) + 70,
      }));
  }

  getZoneStatistics(): any[] {
    return this.serviceZones.map((zone) => ({
      name: zone.name,
      clients: this.getZoneClients(zone.id),
      collections: Math.floor(Math.random() * 100) + 50,
      revenue: Math.floor(Math.random() * 5000) + 2000,
    }));
  }

  // Filter methods
  filterCollections(): void {
    this.filteredCollections = this.collections.filter((collection) => {
      const statusMatch =
        this.collectionsFilter === "all" ||
        collection.status === this.collectionsFilter;
      const zoneMatch =
        !this.selectedZone ||
        collection.address.neighborhood === this.selectedZone;
      return statusMatch && zoneMatch;
    });
  }

  filterClients(): void {
    this.filteredClients = this.clients.filter((client) => {
      const searchMatch =
        !this.clientsSearch ||
        client.name.toLowerCase().includes(this.clientsSearch.toLowerCase()) ||
        client.email.toLowerCase().includes(this.clientsSearch.toLowerCase());
      const statusMatch =
        this.clientsFilter === "all" ||
        client.subscriptionStatus === this.clientsFilter;
      return searchMatch && statusMatch;
    });
  }

  filterReports(): void {
    this.filteredReports = this.reports.filter((report) => {
      const statusMatch =
        this.reportsFilter === "all" || report.status === this.reportsFilter;
      const typeMatch =
        this.reportsTypeFilter === "all" ||
        report.type === this.reportsTypeFilter;
      return statusMatch && typeMatch;
    });
  }

  // Action methods
  trackCollection(collectionId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  contactClient(clientId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  // deleteEmployee(employeeId: string): void {
  //   if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
  //     this.employees = this.employees.filter(e => e.id !== employeeId);

  //   }
  // }

  // Zone Side
  editZone(zoneId: string): void {
    const zone = this.serviceZones.find((z) => z.id === zoneId);
    if (zone) {
      this.newZone = { ...zone };
      this.citiesInput = zone.cities.join(", ");
      this.neighborhoodsInput = zone.neighborhoods.join(", ");
      this.editingZone = true;
      this.showZoneModal = true;
    }
  }

  deleteZone(zoneId: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette zone ?")) {
      this.serviceZones = this.serviceZones.filter((z) => z.id !== zoneId);
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }

  editSchedule(scheduleId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  deleteSchedule(scheduleId: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce planning ?")) {
      // this.schedules = this.schedules.filter(s => s.id !== scheduleId);
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }
  selectedClient: any = null;
  showClientDetailsModal: boolean = false;
  viewClientDetails(clientId: string): void {
    this.notificationService.showInfo(
      "Détails",
      "Récupération des détails du client..."
    );

    this.agencyService.getClientById(clientId).subscribe({
      next: (client: any) => {
        this.selectedClient = client.data;
        console.log("voici les details du client:", client);
        this.showClientDetailsModal = true;
      },
      error: (err: any) => {
        console.error(
          "Erreur lors de la récupération des détails du client :",
          err
        );
        this.notificationService.showError(
          "Erreur",
          "Impossible de récupérer les détails du client."
        );
      },
    });
  }
  suspendClient(clientId: string): void {
    const client = this.clients.find((c) => c.id === clientId);
    if (client) {
      client.subscriptionStatus = "suspended";
      // No need to call notificationService.showSuccess here, as it's already handled in the template
      this.notificationService.showSuccess(
        "Client suspendu",
        "Le client a bien été suspendu."
      );
    }
  }

  deleteClient(): void {
    // Ajoute la logique de suppression ici (API ou local)
    // ...
    this.notificationService.showSuccess("Désole", "Suppression non autorisée");
  }

  resolveReport(reportId: string): void {
    const report = this.reports.find((r) => r._id === reportId);
    if (report) {
      report.status = "resolved";
      this.filterReports();
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }

  contactReportClient(clientId: string): void {
    this.contactClient(clientId);
  }

  previousWeek(): void {
    this.currentWeek.setDate(this.currentWeek.getDate() - 7);
  }

  nextWeek(): void {
    this.currentWeek.setDate(this.currentWeek.getDate() + 7);
  }

  updateAnalytics(): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  exportReport(): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  // Form methods
  toggleZoneAssignment(zoneId: string, event: any): void {
    if (event.target.checked) {
      this.newEmployee.zones.push(zoneId);
    } else {
      this.newEmployee.zones = this.newEmployee.zones.filter(
        (id: string) => id !== zoneId
      );
    }
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
      "User created successfully":
        "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
      "Missing required fields":
        "Veuillez remplir tous les champs obligatoires.",
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

  addEmployee(): void {
    if (
      this.newEmployee.firstName &&
      this.newEmployee.lastName &&
      this.newEmployee.email &&
      this.newEmployee.role
    ) {
      const employee: Employees = {
        _id: Math.random().toString(36).substr(2, 9),
        // userId: Math.random().toString(36).substr(2, 9),
        firstName: this.newEmployee.firstName,
        lastName: this.newEmployee.lastName,
        email: this.newEmployee.email,
        phone: this.newEmployee.phone,
        role: this.newEmployee.role,
        zones: this.newEmployee.zones,

        isActive: true,
        hiredAt: new Date(),
      };

      this.agencyService.addEmployee(employee).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log("[DEBUG] Réponse inscription collector:", response);
          const isSuccess =
            response.success ||
            response.status === "success" ||
            (typeof response.message === "string" &&
              (response.message.toLowerCase().includes("succès") ||
                response.message.toLowerCase().includes("réussi"))) ||
            !!response;

          if (isSuccess) {
            this.notificationService.showSuccess(
              "Inscription réussie",
              "Le collaborateur a été créé avec succès ! Vous pouvez maintenant vous connecter."
            );
            // 🔄 Recharger la liste après ajout
            this.loadEmployees(this.currentUser);
            // setTimeout(() => {
            //   this.router.navigate(['/login']);
            // }, 2000);
          } else {
            const errorMsg = this.getFriendlyMessage(
              response?.message || response?.error || "",
              false
            );
            this.notificationService.showError(
              "Erreur lors de l'inscription",
              errorMsg
            );
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            error?.error?.message ||
              error?.error?.message ||
              error?.error ||
              "",
            false
          );
          this.notificationService.showError(
            "Erreur lors de l'inscription",
            errorMsg
          );
          this.loadEmployees(this.currentUser);
        },
      });
      this.showAddEmployeeModal = false;
      this.newEmployee = {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "",
        zones: [],
      };
    }
  }

  //creation d un tarif
  addTariff(): void {
    if (this.newTariff.type && this.newTariff.price !== undefined) {
      const agencyId = this.currentUser?._id;
      const tariff: Tariff = {
        agencyId: agencyId || "",
        type: this.newTariff.type,
        price: this.newTariff.price,
        description: this.newTariff.description,
        nbPassages: this.newTariff.nbPassages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.agencyService.addTariff(tariff).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log("[DEBUG] Réponse ajout tarif:", response);

          const isSuccess =
            response?.success ||
            response?.status === "success" ||
            (typeof response?.message === "string" &&
              (response.message.toLowerCase().includes("succès") ||
                response.message.toLowerCase().includes("réussi"))) ||
            !!response;

          if (isSuccess) {
            if (response) {
              this.notificationService.showSuccess(
                "Le tarif a été ajouté avec succès !",
                "vous pouvez désormais le consulter dans la liste des tarifs, disponible dans la section Zones"
              );
              this.showZoneModal = false;
              this.showZoneModal = false;
              this.loadTariffs(); //

              this.newTariff = {
                type: "",
                price: "",
                description: "",
                nbPassages: "",
              };
            } else {
              const errorMsg = this.getFriendlyMessage(
                response?.message || response?.error || "",
                false
              );
              this.notificationService.showError(
                "Erreur lors de l’ajout du tarif",
                errorMsg
              );
              this.newTariff = {
                agencyId: "",
                type: "",
                price: 0,
                description: "",
                nbPassages: 0,
                createdAt: new Date(),
              };
            }
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            error?.error?.message || error?.error || "",
            false
          );
          this.notificationService.showError(
            "Erreur lors de l’ajout du tarif",
            errorMsg
          );
        },
      });
    }
  }
  // recuperations des tarifs liee a une agences
  tariffs: Tariff[] = [];
  loadTariffs(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;
    if (!agencyId) {
      console.error("[DEBUG] Aucun tarif trouvé pour cette agence");
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
      next: (data: Tariff[]) => {
        this.tariffs = data;
        console.log("Tarifs récupérés :", this.tariffs);
        this.isLoading = false;
      },
      error: (error) => {
        // console.error("[DEBUG] Erreur lors du chargement des tarifs :", error);
        this.isLoading = false;
      },
    });
  }
  //recupere les planning d une agence
  schedules: CollectionSchedule[] = [];

  loadPlannings(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;

    if (!agencyId) {
      console.error("[DEBUG] Aucun agencyId trouvé pour l’utilisateur courant");
      this.isLoading = false;
      return;
    }

    this.agencyService.getAllPlaningAgency$(agencyId).subscribe({
      next: (response: { plannings: CollectionSchedule[] }) => {
        this.schedules = response.plannings;
        console.log("Plannings récupérés :", this.schedules);

        const schedulesTab = this.tabs.find((tab) => tab.id === "schedules");
        if (schedulesTab) {
          schedulesTab.badge = this.schedules.length;
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error(
          "[DEBUG] Erreur lors du chargement des plannings :",
          error
        );
        this.isLoading = false;
      },
    });
  }

  // recuperation des planning d un colector
  collectorplannings: any[] = [];
  loadCollectorPlannings(): void {
    this.isLoading = true;
    const collectorId = "68c3f853a00747732407d946";
    if (!collectorId) {
      console.error("[DEBUG] Aucun collectorId trouvé ");
      this.isLoading = false;
      return;
    }
    this.agencyService.getPlaningCollectory$(collectorId).subscribe({
      next: (data: any[]) => {
        this.collectorplannings = data;
        console.log(
          "Plannings récupérés pour le collecteur :",
          this.collectorplannings
        );
        this.isLoading = false;
      },
      error: (error) => {
        // console.error(
        //   "[DEBUG] Erreur lors du chargement des plannings du collecteur :",
        //   error
        // );
        this.isLoading = false;
      },
    });
  }

  // supprimer un tarif
  deletePlanning(schedulesId: string): void {
    this.isDeleting = true;

    if (schedulesId) {
      this.agencyService.deletePlanning$(schedulesId).subscribe(
        () => {
          this.notificationService.showSuccess(
            "Succès",
            "Planning a été supprimé avec succès."
          );
          this.loadPlannings();
          this.isDeleting = false;
        },
        (error) => {
          this.notificationService.showError(
            "Erreur",
            "Impossible de supprimer le planning. Veuillez réessayer."
          );
          console.error("Erreur lors de la suppression du planning :", error);
          this.isDeleting = false;
        }
      );
    } else {
      console.warn("Aucun ID de planning fourni.");
      this.isDeleting = false;
    }
  }

  tariffToUpdate: Tariff | null = null;
  //update un tarif via l api
  updateTariff(tariffId: string): void {
    if (
      this.tariffToUpdate &&
      this.tariffToUpdate.type &&
      this.tariffToUpdate.price !== undefined
    ) {
      this.isLoading = true;

      const payload = {
        type: this.tariffToUpdate.type,
        price: this.tariffToUpdate.price,
        description: this.tariffToUpdate.description,
        nbPassages: this.tariffToUpdate.nbPassages,
        updatedAt: new Date(),
      };

      this.agencyService.getUpdateTarifs$(tariffId, payload).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log("[DEBUG] Réponse modification tarif:", response);

          const isSuccess =
            response?.success ||
            response?.status === "success" ||
            (typeof response?.message === "string" &&
              (response.message.toLowerCase().includes("succès") ||
                response.message.toLowerCase().includes("réussi"))) ||
            !!response;

          if (isSuccess) {
            this.notificationService.showSuccess(
              "Modification réussie",
              "Le tarif a été modifié avec succès !"
            );
            // this.loadTariffs(this.currentUser?.id!); // recharger la liste après update
          } else {
            const errorMsg = this.getFriendlyMessage(
              response?.message || response?.error || "",
              false
            );
            this.notificationService.showError(
              "Erreur lors de la modification du tarif",
              errorMsg
            );
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            error?.error?.message || error?.error || "",
            false
          );
          this.notificationService.showError(
            "Erreur lors de la modification du tarif",
            errorMsg
          );
        },
      });
    }
  }

  // supprimer un tarif
  deleteTariff(tariff: any): void {
    this.isDeleting = true;
    const tariffId = tariff._id;

    if (tariffId) {
      this.agencyService.deleteTariff$(tariffId).subscribe(
        () => {
          this.notificationService.showSuccess(
            "Succès",
            "L'tarif été supprimé avec succès."
          );
          // this.loadEmployees(currentUser);
          this.isDeleting = false;
          this.loadTariffs();
        },
        (error) => {
          this.notificationService.showError(
            "Erreur",
            "Impossible de supprimer l'tarif. Veuillez réessayer."
          );
          console.error("Erreur lors de la suppression de l'tarif :", error);
          this.isDeleting = false;
        }
      );
    } else {
      console.warn("Aucun ID d'agence trouvé dans l'utilisateur courant.");
      this.isDeleting = false;
    }
  }

  saveZone(): void {
    if (this.newZone.name && this.citiesInput) {
      this.newZone.cities = this.citiesInput
        .split(",")
        .map((city) => city.trim());
      this.newZone.neighborhoods = this.neighborhoodsInput
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n);

      if (this.editingZone) {
        const index = this.serviceZones.findIndex(
          (z) => z.id === this.newZone.id
        );
        if (index !== -1) {
          this.serviceZones[index] = { ...this.newZone };
        }
        // No need to call notificationService.showSuccess here, as it's already handled in the template
      } else {
        const zone: ServiceZones = {
          // id: Math.random().toString(36).substr(2, 9),
          name: this.newZone.name,
          description: this.newZone.description,
          boundaries: [],
          neighborhoods: this.newZone.neighborhoods,
          cities: this.newZone.cities,
          assignedCollectors: this.newZone.assignedCollectors,
          isActive: this.newZone.isActive,
        };
        // this.agencyService.
        this.serviceZoness.push(zone);
        // No need to call notificationService.showSuccess here, as it's already handled in the template
      }

      this.showZoneModal = false;
      this.editingZone = false;
      this.newZone = {
        name: "",
        description: "",
        cities: [],
        neighborhoods: [],
        isActive: true,
      };
      this.citiesInput = "";
      this.neighborhoodsInput = "";
    }
  }

  validateClient(clientId: string): void {
    console.log("[validateClient] called for", clientId);
    this.clientService.validateClientSubscription(clientId).subscribe({
      next: () => {
        console.log("[validateClient] success for", clientId);
        this.notificationService.showSuccess(
          "Validation",
          "Abonnement validé avec succès !"
        );
        this.loadClients();
      },
      error: (err) => {
        this.notificationService.showError(
          "Validation",
          "Validation a échoué  ! " + err?.error?.error
        );
        console.error("[validateClient] error for", clientId, err);
      },
    });
  }

  addSchedule(): void {
    const { collectorId, date, startTime, endTime } = this.scheduleForm.value;
    if (
      this.checkCollectorAvailability(collectorId, date, startTime, endTime)
    ) {
      this.notificationService.showWarning(
        "Attention",
        "Le collecteur est déjà programmé sur ce créneau."
      );
      return;
    }

    const formValues = this.scheduleForm.value;

    const schedule: CollectionSchedule = {
      zone: formValues.zone,
      date: formValues.date,
      startTime: formValues.startTime,
      endTime: formValues.endTime,
      collectorId: Array.isArray(formValues.collectorId)
        ? formValues.collectorId
        : [formValues.collectorId],
      agencyId: this.currentUser?._id || "",
    };

    this.agencyService.addSchedule$(schedule).subscribe({
      next: (schedule) => {
      if (schedule) {
        this.schedules.push(schedule); 
        this.notificationService.showSuccess('Succès', 'Le planning a été créé avec succès.');
      }
      this.loadPlannings(),
        this.showScheduleModal = false;
        this.scheduleForm.reset();
      },
      error: (error) => {
        let errorMessage =
          "Une erreur est survenue lors de la création du planning";
        if (error.error?.message) {
          switch (error.error.message) {
            case "COLLECTOR_NOT_AVAILABLE":
              errorMessage =
                "Le collecteur n'est pas disponible sur ce créneau";
              break;
            case "ZONE_NOT_FOUND":
              errorMessage = "La zone sélectionnée n'existe pas";
              break;
            case "TIME_CONFLICT":
              errorMessage =
                "Il existe déjà un planning sur ce créneau horaire";
              break;
            default:
              errorMessage = error.error.message;
          }
        }
        this.notificationService.showError("Erreur", errorMessage);
      },
    });
  }
  investigateIncident(): void {
    // const incident = this.incidents.find(i => i.id === incidentId);
    // if (incident) {
    //   incident.status = 'investigating';
    //   incident.assignedTo = 'Inspecteur Municipal';
    //   this.filterIncidents();
    //   this.notificationService.showSuccess('Enquête', 'Incident pris en charge pour enquête');
    // }
  }
  filterIncidents(): void {
    // this.filteredIncidents = this.incidents.filter(incident => {
    //   const statusMatch = this.incidentsFilter === 'all' || incident.status === this.incidentsFilter;
    //   const severityMatch = this.severityFilter === 'all' || incident.severity === this.severityFilter;
    //   return statusMatch && severityMatch;
    // });
  }
  resolveIncident1(): void {
    // const incident = this.incidents.find(i => i.id === incidentId);
    // if (incident) {
    //   incident.status = 'resolved';
    this.filterIncidents();
    this.statistics.pendingReports--;
    this.notificationService.showSuccess(
      "Résolu",
      "Incident marqué comme résolu"
    );
    // }
  }
  contactAgencyForIncident(): void {
    this.contactAgency();
  }

  contactAgency(): void {
    this.notificationService.showInfo(
      "Contact",
      "Ouverture des informations de contact"
    );
  }

  getSeverityText(severity: string): string {
    const texts = {
      critical: "Critique",
      high: "Élevé",
      medium: "Moyen",
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
    };
    return types[type as keyof typeof types] || type;
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      critical: "dangerous",
      high: "priority_high",
      medium: "warning",
      low: "info",
    };
    return icons[severity as keyof typeof icons] || "help";
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      open: "Ouvert",
      pending: "En cours",
      resolved: "Résolu",
    };
    return statuses[status as keyof typeof statuses] || status;
  }
  resolveIncident(id: string) {
    const body = {
      status: "resolved",
      // status:"pending"
    };
    console.log("Status envoyé :", body);
    this.agencyService.resolveIncident$(id, body).subscribe({
      next: (response: any) => {
        console.log("[DEBUG] Réponse de resolution d'incidant:", response);
        if (response.message) {
          this.notificationService.showSuccess("Resolu", response.message);
          this.loadAgencyReports(this.currentUser);
          // this.notificationService.showSuccess('Résolu', 'Incident marqué comme résolu');
        } else {
          this.notificationService.showError(
            "Activation",
            "Erreur lors de l'activation de l'agence"
          );
        }
      },
      error: (error: any) => {
        console.error("Error activating agency:", error);
        const msg = error?.error?.message || "Error activating agency";
        this.notificationService.showSuccess("Activation", msg);
      },
    });
  }
  selectedSchedule: any = null;

  openScheduleDetails(schedule: any): void {
    this.selectedSchedule = schedule;
  }
  closeModal(): void {
    this.selectedSchedule = null;
  }
  onEmployeeToggle(event: any): void {
    const employeeId = event.target.value;
    if (event.target.checked) {
      this.selectedEmployee.push(employeeId);
    } else {
      this.selectedEmployee = this.selectedEmployee.filter(
        (id) => id !== employeeId
      );
    }
  }
  assignReport(): void {
    if (!this.selectedReportId || this.selectedEmployee.length === 0) {
      this.notificationService.showError(
        "Erreur",
        "Veuillez sélectionner au moins un employé."
      );
      return;
    }

    this.selectedEmployee.forEach((employeeId) => {
      this.agencyService
        .assignReportToEmployee$(this.selectedReportId, employeeId)
        .subscribe({
          next: () => {
            this.notificationService.showSuccess(
              "Succès",
              "Signalement assigné avec succès."
            );
             this.loadReports(); 
          },
          error: (err) => {
            console.error("Erreur assignation :", err);

            const message =
              err?.error?.error || err?.message || "Échec de l'assignation.";
            this.notificationService.showError("Erreur", message);
          },
        });
    });

    this.closeAssignModal();
  }

  showTariffsModal = false;

  openTariffsModal() {
    this.showTariffsModal = true;
  }

  closeTariffsModal() {
    this.showTariffsModal = false;
  }
  zones: any[] = [];
  //recuperation des zones
  loadZones(currentUser: any): void {
    this.isLoading = true;
    if (currentUser && currentUser._id) {
      const agencyId = currentUser._id;
      this.agencyService.getAllzones$(agencyId).subscribe({
        next: (zones: any) => {
          this.zones = zones.serviceZones
;
          console.log("zones charger>>>>>> :", this.zones);
        },
        error: (error) => {
          console.error(
            "Erreur lors du chargement des Zones de l agence:",
            error
          );
          this.notificationService.showError(
            "Erreur",
            "Erreur lors du chargement des Zones de l agence."
          );
        },
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }

  getInitials(fullName: string) {
    return this.sharedService.getInitials(fullName);
  }

  getRandomColor(item: any): string {
    return this.sharedService.getRandomColor(item);
  }
  closeClientDetailsModal(): void {
    this.showClientDetailsModal = false;
    this.selectedClient = null;
  }
  editEmployee(employee: any): void {
    this.notificationService.showInfo("Modification", "ouvert...");
    this.selectedEmployee = employee;
    this.employeeForm.patchValue(employee);
    this.showUpdateEmployeeModal = true;
  }

  closeUpdateEmployeeModal(): void {
    this.showUpdateEmployeeModal = false;
    this.selectedEmployee = [];
  }

  updateEmployee(): void {
    if (this.employeeForm.invalid) {
      this.notificationService.showError("Erreur", "Formulaire invalide.");
      return;
    }
    // On extrait uniquement les champs nécessaires
    const { _id, createdAt, updatedAt, agencyId, userId, ...employeeData } = {
      ...this.selectedEmployee,
      ...this.employeeForm.value,
    };

    this.agencyService.updateEmployee$(_id, employeeData).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          "Succès",
          "Employé mis à jour avec succès."
        );
        this.showUpdateEmployeeModal = false;
        this.loadEmployees(this.currentUser); // Recharge la liste
      },
      error: (err) => {
        console.error("Erreur lors de la mise à jour :", err);
        this.notificationService.showError(
          "Erreur",
          "Impossible de mettre à jour l'employé."
        );
      },
    });
  }

  // recuperations des collecte par jour d une agences
  dayCollectes: any[] = [];

  loadCollectDay(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;

    if (!agencyId) {
      console.error(
        "[DEBUG] Aucune collecte trouvée pour cette agence en jour"
      );
      this.notificationService.showError(
        "Erreur",
        "Aucune agence sélectionnée."
      );
      this.isLoading = false;
      return;
    }
    this.agencyService.getAgencyAllCollectes$(agencyId).subscribe({
      next: (response) => {
        this.dayCollectes = response.data || [];
        console.log("Collectes journalières récupérées :", this.dayCollectes);
        const CollectesTab = this.tabs.find((tab) => tab.id === "collections");
        if (CollectesTab) {
          CollectesTab.badge = this.dayCollectes.length;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error("Erreur récupération collectes :", error);
        const message =
          error?.error?.message || "Impossible de récupérer les collectes.";
        this.notificationService.showError("Erreur", message);

        this.isLoading = false;
      },
    });
  }
  // recuperations des tarifs liee a une agences
  historyCollecte: any[] = [];

  loadCollectHistory(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?._id;

    if (!agencyId) {
      console.error(
        "[DEBUG] Aucune collecte trouvée pour cette agence en jour"
      );
      this.notificationService.showError(
        "Erreur",
        "Aucune agence sélectionnée."
      );
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyAllCollectes$(agencyId).subscribe({
      next: (response) => {
        this.historyCollecte = response.data || [];
        console.log(
          "Historique des Collectes récupérées :",
          this.historyCollecte
        );
        this.isLoading = false;
      },
      error: (error) => {
        console.error(
          "Erreur récupération de l historique des collectes :",
          error
        );
        const message =
          error?.error?.message || "Impossible de récupérer les collectes.";
        this.notificationService.showError("Erreur", message);

        this.isLoading = false;
      },
    });
  }
  selectedImage: string | null = null;

  openImageModal(imageUrl: string): void {
    this.selectedImage = imageUrl;
  }

  closeImageModal(): void {
    this.selectedImage = null;
  }
  showHistoryModal: boolean = false;
  openHistoryModal(): void {
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
  }
  //modification  du status de l employee
  toggleEmployeeStatus(employee: any): void {
    const updatedStatus = !employee.isActive;
    this.agencyService
      .updateEmployee$(employee._id, { isActive: updatedStatus })
      .subscribe({
        next: () => {
          employee.isActive = updatedStatus;
          this.notificationService.showSuccess(
            "Succès",
            `L'employé a été ${
              updatedStatus ? "activé" : "désactivé"
            } avec succès.`
          );
        },
        error: (error) => {
          console.error("Erreur lors de la mise à jour du statut :", error);
          this.notificationService.showError(
            "Erreur",
            "Impossible de mettre à jour le statut de l'employé."
          );
        },
      });
  }
  
  //methode de verification de la disponibilite de l employee
  checkCollectorAvailability(
    collectorId: string,
    date: string,
    startTime: string,
    endTime: string
  ): boolean {
    return this.schedules.some(
      (schedule) =>
        schedule.collectorId.includes(collectorId) &&
        schedule.date === date &&
        ((startTime >= schedule.startTime && startTime < schedule.endTime) ||
          (endTime > schedule.startTime && endTime <= schedule.endTime))
    );
  }
 

//   toggleScheduleStatus(schedule: any): void {
//   const updatedStatus = !schedule.isActive;
//   this.agencyService.updateSchedule$(schedule._id, { isActive: updatedStatus }).subscribe({
//     next: () => {
//       schedule.isActive = updatedStatus;
//       this.notificationService.showSuccess(
//         "Succès",
//         `Le planning a été ${updatedStatus ? "activé" : "désactivé"} avec succès.`
//       );
//     },
//     error: (error) => {
//       console.error("Erreur lors de la mise à jour du statut du planning :", error);
//       this.notificationService.showError(
//         "Erreur",
//         "Impossible de mettre à jour le statut du planning."
//       );
//     },
//   });
// }
loadZonesMock(): void {
  this.serviceZones = OUAGA_DATA.map((arrondissement) => ({
    id: Math.random().toString(36).substr(2, 9), 
    name: arrondissement.arrondissement,
    description: arrondissement.secteurs
      .map((secteur) => `${secteur.secteur}: ${secteur.quartiers.join(", ")}`)
      .join("; "),
    boundaries: [], 
    neighborhoods: arrondissement.secteurs.flatMap((secteur) => secteur.quartiers),
    cities: ["Ouagadougou"], 
    isActive: true, 
  }));
}
 arrondissements: QuartierData[] = OUAGA_DATA;
  arrondissementss: Arrondissement[] = [];
  cities: City[] = [];
  secteurss: Sector[] = [];
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];
  quartierss: Quartier[] = [];
  onArrondissementChange(arrondissement?: string) {
    if (arrondissement) {
      const sectorObj = this.arrondissementss.find(a => a.name === arrondissement);
      const sectors = this.countriesOrgMockService.getSectorsByArrondissement(sectorObj?.id || '');
      this.secteurss = sectors ? sectors : [];
      console.log("Secteurs  ==> ", this.secteurss);
      this.quartiers = [];
      this.userData.address.sector = '';
     this.userData.address.neighborhood = [];

    }
  }

  onSecteurChange(secteur: string) {
    if (secteur) {
      const secteurObj = this.secteurss.find(s => s.name === secteur);
      const quartiers = this.countriesOrgMockService.getNeighborhoodsBySector(secteurObj?.id || '');
      console.log("Quartiers  ==> ", quartiers);
      this.quartierss = quartiers;
      this.userData.address.neighborhood = this.userData.address.neighborhood = [];
;
    }
    const secteurObj = this.secteurs.find(s => s.secteur === secteur);
    this.quartiers = secteurObj ? secteurObj.quartiers : [];
    this.userData.address.neighborhood =this.userData.address.neighborhood = [];
;
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
  this.userData.address.neighborhood = [];

    };

  }

  

openZoneModalcouverture(): void {
  this.showZoneModalcouverture = true;
}

closeZoneModalcouverture(): void {
  this.showZoneModalcouverture = false;
}

editZoneAgency(): void {
  if (
    this.userData.address.city &&
    this.userData.address.arrondissement &&
    this.userData.address.sector &&
 this.userData.address.neighborhood.length > 0
  ) {
    const zoneData = {
  serviceZones: this.userData.address.neighborhood, 
};


    const agencyId = this.currentUser?._id;

    if (!agencyId) {
      this.notificationService.showError("Erreur", "ID agence manquant.");
      return;
    }

    this.agencyService.updateAgencyZones$(agencyId, zoneData).subscribe({
      next: (response) => {
        console.log("Zone mise à jour :", response);
        this.notificationService.showSuccess(
          "Succès",
          "La zone a été mise à jour avec succès."
        );
    this.loadZones(this.currentUser);

        this.closeZoneModalcouverture();
        // this.loadZones(this.currentUser?._id); 
      },
      error: (error) => {
        console.error("Erreur lors de la mise à jour de la zone :", error);
        this.notificationService.showError(
          "Erreur",
          "Impossible de mettre à jour la zone. Veuillez réessayer."
        );
      },
    });
  } else {
    this.notificationService.showError(
      "Erreur",
      "Veuillez remplir tous les champs obligatoires."
    );
  }
}

getAllCountries() {
  this.cities = this.countriesOrgMockService.getCitiesByCountry("1");
  console.log("Villes chargées :", this.cities);
}
}
