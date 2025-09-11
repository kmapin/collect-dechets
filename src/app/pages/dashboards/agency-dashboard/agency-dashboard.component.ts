import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AgencyService } from '../../../services/agency.service';
import { CollectionService } from '../../../services/collection.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { Agency, Employee, Employees, ServiceZone, ServiceZones, CollectionSchedule, EmployeeRole, WasteService, tarif, Tariff } from '../../../models/agency.model';
import { Collection, CollectionStatus } from '../../../models/collection.model';
import { ClientService, ClientApi } from '../../../services/client.service';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  subscriptionStatus: 'active' | 'suspended' | 'cancelled';
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
  },
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'missed_collection' | 'incomplete_collection' | 'damage' | 'complaint';
  description: string;
  date: Date;
  createdAt: Date;
  status: 'open' | 'in_progress' | 'resolved';
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
  activeCollectors: number;
  todayCollections: number;
  totalpendingSignalements: number;
  completedCollections: number;
  monthlyRevenue: number;
  averageRating: number;
  pendingReports: number;
}

@Component({
  selector: 'app-agency-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="agency-dashboard">
      <div class="page-header">
        <div class="container">
          <div class="header-content">
            <div class="welcome-section">
              <h1 class="page-title">Tableau de Bord Agence</h1>
              <p class="page-subtitle">{{ agency?.agencyName }} - Gestion complète de votre agence de collecte</p>
            </div>
            <div class="quick-actions">
              <button class="btn btn-primary" (click)="showAddEmployeeModal = true">
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
                <p class="stat-value">{{statistics.totalClients}}</p>
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
<span class="stat-trend neutral">{{ getActiveCollectorsToday() }} en tournée</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collections">
                <i class="material-icons">check_circle</i>
              </div>
              <div class="stat-info">
                <h3>zones</h3>
                <!-- <p class="stat-value">{{ statistics.completedCollections }}/{{ statistics.todayCollections }}</p>
                <span class="stat-trend" [class.positive]="getCollectionRate() >= 90" [class.negative]="getCollectionRate() < 80">
                  {{ getCollectionRate() }}% réalisées
                </span> -->
                <p class="stat-value">{{ statistics.totalZones}}</p>
<span class="stat-trend" [class.positive]="getCollectionRate() >= 90" [class.negative]="getCollectionRate() < 80">
  <!-- {{ getCollectionRate() }}% réalisées -->
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
                <p class="stat-value">{{statistics.totalCollectors}}</p>
<!-- <span class="stat-trend positive">+8.5% vs mois dernier</span> -->
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon rating">
                <i class="material-icons">star</i>
              </div>
              <div class="stat-info">
                <h3>Note moyenne</h3>
                <p class="stat-value"></p>
                <div class="rating-stars">
                  <i *ngFor="let star of getStars(statistics.averageRating)" class="material-icons star">star</i>
                </div>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon reports">
                <i class="material-icons">report_problem</i>
              </div>
              <div class="stat-info">
                <h3>Signalements</h3>
                              <p class="stat-value">{{statistics.totalpendingSignalements}}</p>
<span>  En attente de traitement</span>
                <!-- <span class="stat-trend" [class.negative]="statistics.totalpendingSignalements"> -->
                
                <!-- </span> -->
              </div>
            </div>
          </div>

          <!-- Navigation par onglets -->
          <div class="tabs-navigation">
            <button *ngFor="let tab of tabs" 
                    class="tab-btn"
                    [class.active]="activeTab === tab.id"
                    (click)="activeTab = tab.id">
                <i class="material-icons">{{ tab.icon }}</i>
    {{ tab.label }}
              <!-- <span *ngIf="tab.label === 'Clients' && tab.badge" class="tab-badge">{{ activeClientNbr }}</span> -->
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
                  <select [(ngModel)]="collectionsFilter" (change)="filterCollections()" class="filter-select">
                    <option value="all">Toutes les collectes</option>
                    <option value="scheduled">Programmées</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminées</option>
                    <option value="missed">Manquées</option>
                  </select>
                  <select [(ngModel)]="selectedZone" (change)="filterCollections()" class="filter-select">
                    <option value="">Toutes les zones</option>
                    <option *ngFor="let zone of serviceZones" [value]="zone.id">{{ zone.name }}</option>
                  </select>
                </div>
              </div>
              <div class="collections-grid">
                <div *ngFor="let collection of filteredCollections" class="collection-card card">
                  <div class="collection-header">
                    <div class="collection-status">
                      <span class="status-badge" [class]="'status-' + collection.status">
                        {{ getStatusText(collection.status) }}
                      </span>
                      <span class="collection-time">{{ collection.scheduledDate | date:'HH:mm' }}</span>
                    </div>
                    <div class="collection-actions">
                      <button class="action-btn" (click)="trackCollection(collection.id)" 
                              *ngIf="collection.status === 'in_progress'">
                        <i class="material-icons">location_on</i>
                      </button>
                      <button class="action-btn" (click)="contactClient(collection.clientId)">
                        <i class="material-icons">phone</i>
                      </button>
                    </div>
                  </div>
                    <div class="collection-info">
                    <h4>{{ getClientName(collection.clientId) }}</h4>
                    <p class="collection-address">
                      <i class="material-icons">location_on</i>
                      {{ collection.address.doorNumber }} {{ collection.address.street }}, {{ collection.address.neighborhood }}
                    </p>
                    <p class="collection-waste">
                      <i class="material-icons">delete</i>
                      {{ getWasteTypeName(collection.wasteTypes[0]) }}
                    </p>
                    <p class="collection-collector" *ngIf="collection.collectorId">
                      <i class="material-icons">person</i>
                      {{ getCollectorName(collection.collectorId) }}
                    </p>
                  </div>

                  <div class="collection-progress" *ngIf="collection.status === 'in_progress'">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width]="getCollectionProgress(collection) + '%'"></div>
                    </div>
                    <span class="progress-text">{{ getCollectionProgress(collection) }}% terminé</span>
                  </div>
                </div>
              </div>

              <div *ngIf="filteredCollections.length === 0" class="empty-state">
                <i class="material-icons">event_available</i>
                <h3>Aucune collecte</h3>
                <p>Aucune collecte ne correspond aux filtres sélectionnés</p>
              </div>
              <div class="collections-grid">
  
</div>

            </div>
            

            <!-- Onglet Gestion des Employés -->
            <div *ngIf="activeTab === 'employees'" class="employees-tab">
              <div class="employees-header">
                <h2>Gestion des Employés</h2>
                <div class="employees-actions">
                  <button class="btn btn-primary" (click)="showAddEmployeeModal = true">
                    <i class="material-icons">person_add</i>
                    Ajouter Employé
                  </button>
                </div>
              </div>
         

              <div class="employees-grid">
                <div *ngFor="let employee of allEmployees" class="employee-card card">
                  <div class="employee-header">
                    <div class="employee-avatar">
                      <img [src]="employee.avatar || '/assets/default-avatar.png'" [alt]="employee.firstName">
                    </div>
                    <div class="employee-info">
                      <h4>{{ employee.firstName }} {{ employee.lastName }}</h4>
                      <p class="employee-role">{{ getRoleText(employee.role) }}</p>
                      <p class="employee-status" [class]="employee.isActive ? 'active' : 'inactive'">
                        {{ employee.isActive ? 'Actif' : 'Inactif' }}
                      </p>
     
                    </div>
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
                      <i class="material-icons">map</i>
                      <span>{{ employee.zones.length }} zone(s) assignée(s)</span>
                    </div>
                    <div class="detail-item">
                      <i class="material-icons">event</i>
                      <span>Embauché le {{ employee.hiredAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                 <div class="employee-actions">
      <button class="action-btn" (click)="showUpdateEmployeeModal = true">
        <i class="material-icons">edit</i>
      </button>
<button class="action-btn danger" (click)="deleteEmployee(currentUser, employee)">
  <i class="material-icons">delete</i>
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
                  <!-- <button class="btn btn-primary" (click)="showZoneModal = true">
                    <i class="material-icons">add_location</i>
                    Ajouter un tarif
                  </button> -->
                </div>
              </div>

              <div class="zones-content">
                <div class="zones-map">
                  <div class="map-container">
                    <div class="map-placeholder">
                      <i class="material-icons">map</i>
                      <p>Carte interactive des zones</p>
                      <small>Cliquez sur une zone pour la modifier</small>
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
                        <button class="action-btn danger" (click)="deleteZone(zone.id)">
                          <i class="material-icons">delete</i>
                        </button>
                      </div>
                    </div>
                    
                    <div class="zone-info">
                      <p class="zone-description">{{ zone.description }}</p>
                      <div class="zone-details">
                        <div class="detail-item">
                          <i class="material-icons">location_city</i>
                          <span>{{ zone.cities.join(', ') }}</span>
                        </div>
                        <div class="detail-item">
                          <i class="material-icons">home</i>
                          <span>{{ zone.neighborhoods.join(', ') }}</span>
                        </div>
                        <div class="detail-item">
                          <i class="material-icons">people</i>
                          <span>{{ getZoneClients(zone.id) }} clients</span>
                        </div>
                      </div>
                    </div>

                    <div class="zone-status">
                      <span class="status-badge" [class]="zone.isActive ? 'status-active' : 'status-inactive'">
                        {{ zone.isActive ? 'Active' : 'Inactive' }}
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
                  <button class="btn btn-primary" (click)="showScheduleModal = true">
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
                    <div *ngFor="let day of weekDays" class="day-header">{{ day }}</div>
                  </div>
                  
                  <div class="calendar-content">
                    <div *ngFor="let day of weekDays; let i = index" class="day-column">
                      <div *ngFor="let schedule of getSchedulesForDay(i)" class="schedule-item">
                        <div class="schedule-time">{{ schedule.startTime }} - {{ schedule.endTime }}</div>
                        <div class="schedule-zone">{{ getZoneName(schedule.zoneId) }}</div>
                        <div class="schedule-collector">{{ getCollectorName(schedule.collectorId) }}</div>
                        <div class="schedule-actions">
                          <button class="action-btn" (click)="editSchedule(schedule.id)">
                            <i class="material-icons">edit</i>
                          </button>
                          <button class="action-btn danger" (click)="deleteSchedule(schedule.id)">
                            <i class="material-icons">delete</i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Clients -->
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
                      <td colspan="6" style="text-align:center; color:#888;">Aucun client à afficher</td>
                    </tr>
                    <tr *ngFor="let client of activeClients">
                      <td>{{ client.firstName }} {{ client.lastName }}</td>
                      <td>{{ client.userId.email }}</td>
                      <td>{{ client.phone }}</td>
                      <td>{{ client.address.street }}, {{ client.address.neighborhood }}</td>
                      <td>
                        <span class="status-badge status-active">Actif</span>
                      </td>
                      <td>
                        <button class="action-btn" (click)="suspendClient(client._id)" title="Suspendre">
                          <i class="material-icons">pause</i>
                        </button>
                        <button class="action-btn danger" (click)="deleteClient(client._id)" title="Supprimer">
                          <i class="material-icons">delete</i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="clients-header" style="margin-top:2em;">
                <h2>Clients en attente de validation ({{ pendingClients.length }})</h2>
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
                      <td colspan="6" style="text-align:center; color:#888;">Aucun client à afficher</td>
                    </tr>
                    <tr *ngFor="let client of pendingClients">
                      <td>{{ client.firstName }} {{ client.lastName }}</td>
                      <td>{{ client.userId.email }}</td>
                      <td>{{ client.phone }}</td>
                      <td>{{ client.address.street }}, {{ client.address.neighborhood }}</td>
                      <td>
                        <span class="status-badge status-pending">En attente</span>
                      </td>
                      <td>
                        <button class="btn btn-primary" (click)="validateClient(client._id)">Valider</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

           
          <div *ngIf="activeTab === 'reports'" class="reports-tab">
            <div class="reports-header">
              <h2>Signalements</h2>
            </div>
            <div class="reports-list">
            <div *ngFor="let report of agencyReports" class="report-card card">
              <div class="incident-header">
                <div class="incident-severity" [class]="'severity-' + report?.severity">
                  <i class="material-icons">{{ getSeverityIcon(report.severity) }}</i>
                  <span>{{ getSeverityText(report.severity)? getSeverityText(report.severity) : "Faible" }}</span>
                </div>
                <div class="incident-status">
                  <span class="status-badge" [class]="'status-' + report.status">
                    {{ getIncidentStatusText(report.status) }}
                  </span>
                </div>
              </div>
              <h4>{{ report?.client?.firstName }} {{ report?.client?.lastName }}</h4>
              <div class="incident-content">
                <h4>{{ getIncidentTypeText(report.type) }}</h4>
                <p class="incident-description">{{ report.description }}</p>
                <p class="incident-date">Date : {{ report.date | date:'dd/MM/yyyy' }}</p>
                <p class="incident-date">Heure : {{ report.date | date:'HH:mm:ss' }}</p>
              </div>
              <!-- Affichage des photos -->
              <div *ngIf="report.photos && report.photos.length">
                <div *ngFor="let photo of report.photos">
                  <img [src]="photo" alt="Photo du signalement" class="report-photo" />
                </div>
              </div>
              <div *ngIf="!report.photos || !report.photos.length">
                <p><em>Aucune photo associée</em></p>
              </div>
              <div class="incident-actions">
                  <button class="btn btn-accent" (click)="assignIncident()" >
                    <i class="material-icons">assignment_ind</i>
                    Assigner
                  </button>
                  <!-- <button class="btn btn-primary" (click)="investigateIncident()" >
                    <i class="material-icons">search</i>
                    Enquêter
                  </button> -->
                  <button class="btn btn-success" (click)="resolveIncident(report._id)" >
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

                      <!-- Onglet Rapports -->
                      <div  class="analytics-tab">
                        <div class="analytics-header">
                          <h2>Rapports et Statistiques</h2>
                          <div class="analytics-filters">
                            <select [(ngModel)]="analyticsPeriod" (change)="updateAnalytics()" class="filter-select">
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
                                <div *ngFor="let collector of getCollectorPerformance()" class="performance-item">
                                  <div class="collector-info">
                                    <strong>{{ collector.name }}</strong>
                                    <span>{{ collector.collectionsCount }} collectes</span>
                                  </div>
                                  <div class="performance-score">
                                    <div class="score-bar">
                                      <div class="score-fill" [style.width]="collector.score + '%'"></div>
                                    </div>
                                    <span>{{ collector.score }}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div class="analytics-card card">
                              <h3>Répartition par Zone</h3>
                              <div class="zone-stats">
                                <div *ngFor="let zoneStat of getZoneStatistics()" class="zone-stat">
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
                    

                          </div>
                      </div>
          <!-- Onglet tarif -->
                      <div class="analytics-tab">
            <div class="analytics-header">
            
            </div>

            <div class="analytics-content">
              <div class="analytics-cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                
                <!-- Boucle sur les tarifs -->
                <div *ngFor="let tariff of tariffs" class="analytics-card card p-4">
                  <div class="tariff-header flex justify-between items-center border-b pb-2 mb-3">
                    <h4 class="text-lg font-semibold text-gray-800">
                      {{ tariff.price | number:'1.0-0' }} FCFA
                    </h4>
                    <span class="type-chip bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                      <i class="material-icons text-sm">category</i>
                      {{ tariff.type }}
                    </span>
                  </div>

                  <p class="text-gray-600 mb-2">
                    <i class="material-icons text-sm align-middle">info</i>
                    {{ tariff.description }}
                  </p>

                  <!-- Boutons d’action -->
                  <div class="flex justify-end gap-2 mt-3">
                    <button class="btn btn-warning flex items-center gap-1"
                          >
                      <i class="material-icons text-base">edit</i>
                      Renommer
                    </button>
                  <button class="btn btn-danger flex items-center gap-1"
                  (click)="deleteTariff(tariff)">
            <i class="material-icons text-base">delete</i>
            Supprimer
          </button>
                  </div>
                </div>

              </div>
            </div>
          </div>


                          
        
        </div>
      </div>

      <!-- Modal Ajout Employé -->
      <div class="modal-overlay" *ngIf="showAddEmployeeModal" (click)="showAddEmployeeModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Ajouter un Employé</h3>
            <button class="close-btn" (click)="showAddEmployeeModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <form class="employee-form" (ngSubmit)="addEmployee()">
            <div class="form-row">
              <div class="form-group">
                <label>Prénom *</label>
                <input type="text" [(ngModel)]="newEmployee.firstName" name="firstName" required>
              </div>
              <div class="form-group">
                <label>Nom *</label>
                <input type="text" [(ngModel)]="newEmployee.lastName" name="lastName" required>
              </div>
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input type="email" [(ngModel)]="newEmployee.email" name="email" required>
            </div>
            <div class="form-group">
              <label>Téléphone *</label>
              <input type="tel" [(ngModel)]="newEmployee.phone" name="phone" required>
            </div>
            <div class="form-group">
              <label>Rôle *</label>
              <select [(ngModel)]="newEmployee.role" name="role" required>
                <option value="">Sélectionner un rôle</option>
                <option value="manager">Manager</option>
                <option value="collector">Collecteur</option>
              </select>
            </div>
            <div class="form-group" *ngIf="newEmployee.role === 'collector'">
              <label>Zones assignées</label>
              <div class="zones-checkboxes">
                <label *ngFor="let zone of serviceZones" class="checkbox-label">
                  <input type="checkbox" [value]="zone.id" 
                         (change)="toggleZoneAssignment(zone.id, $event)">
                  <span class="checkmark"></span>
                  {{ zone.name }}
                </label>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="showAddEmployeeModal = false">
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
 <!-- Modal update Employé -->
   <div class="modal-overlay" *ngIf="showUpdateEmployeeModal" (click)="showUpdateEmployeeModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Modifier un Employé</h3>
            <button class="close-btn" (click)="showUpdateEmployeeModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <form class="employee-form" >
            <div class="form-row">
              <div class="form-group"> 
                <label>Prénom *</label>
                <input type="text" [(ngModel)]="newEmployee.firstName" name="firstName" required>
              </div>
              <div class="form-group">
                <label>Nom *</label>
                <input type="text" [(ngModel)]="newEmployee.lastName" name="lastName" required>
              </div>
            </div>
            <div class="form-group">
              <label>Email *</label>
              <input type="email" [(ngModel)]="newEmployee.email" name="email" required>
            </div>
            <div class="form-group">
              <label>Téléphone *</label>
              <input type="tel" [(ngModel)]="newEmployee.phone" name="phone" required>
            </div>
            <div class="form-group">
              <label>Rôle *</label>
              <select [(ngModel)]="newEmployee.role" name="role" required>
                <option value="">Sélectionner un rôle</option>
                <option value="manager">Manager</option>
                <option value="collector">Collecteur</option>
              </select>
            </div>
            <div class="form-group" *ngIf="newEmployee.role === 'collector'">
              <label>Zones assignées</label>
              <div class="zones-checkboxes">
                <label *ngFor="let zone of serviceZones" class="checkbox-label">
                  <input type="checkbox" [value]="zone.id" 
                         (change)="toggleZoneAssignment(zone.id, $event)">
                  <span class="checkmark"></span>
                  {{ zone.name }}
                </label>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="showAddEmployeeModal = false">
                Annuler
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">person_add</i>
               modifier
              </button>
            </div>
          </form>
        </div>
      </div>
      <!-- Modal Gestion Zone -->
      <!-- <div class="modal-overlay" *ngIf="showZoneModal" (click)="showZoneModal = false">
        <div class="modal-content zone-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingZone ? 'Modifier' : 'Ajouter' }} un tarif</h3>
            <button class="close-btn" (click)="showZoneModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <form class="zone-form" (ngSubmit)="saveZone()">
            <div class="form-group">
              <label>Nom de la zone *</label>
              <input type="text" [(ngModel)]="newZone.name" name="name" required>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea [(ngModel)]="newZone.description" name="description" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>Villes couvertes *</label>
              <input type="text" [(ngModel)]="citiesInput" name="cities" 
                     placeholder="Paris, Lyon, Marseille..." required>
              <small>Séparez les villes par des virgules</small>
            </div>
            <div class="form-group">
              <label>Quartiers</label>
              <input type="text" [(ngModel)]="neighborhoodsInput" name="neighborhoods" 
                     placeholder="Centre-ville, Quartier Latin...">
              <small>Séparez les quartiers par des virgules</small>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="newZone.isActive" name="isActive">
                <span class="checkmark"></span>
                Zone active
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="showZoneModal = false">
                Annuler
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">save</i>
                {{ editingZone ? 'Modifier' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div> -->

      <div class="modal-overlay" *ngIf="showZoneModal" (click)="showZoneModal = false">
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
        <input type="number" [(ngModel)]="newTariff.price" name="price" min="0" required>
      </div>

      <!-- Nombre de passages -->
      <div class="form-group">
        <label>Nombre de passages *</label>
        <input type="number" [(ngModel)]="newTariff.nbPassages" name="nbPassages" min="0" required>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label>Description</label>
        <textarea [(ngModel)]="newTariff.description" name="description" rows="3"></textarea>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" (click)="showZoneModal = false">
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
      <div class="modal-overlay" *ngIf="showScheduleModal" (click)="showScheduleModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Nouveau Planning de Collecte</h3>
            <button class="close-btn" (click)="showScheduleModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <!-- <form class="schedule-form" (ngSubmit)="addSchedule()">
            <div class="form-group">
              <label>Zone *</label>
              <select [(ngModel)]="newSchedule.zoneId" name="zoneId" required>
                <option value="">Sélectionner une zone</option>
                <option *ngFor="let zone of zonesAgency" [value]="zone.id">{{ zone.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Jour de la semaine *</label>
              <select [(ngModel)]="newSchedule.dayOfWeek" name="dayOfWeek" required>
                <option value="">Sélectionner un jour</option>
                <option value="1">Lundi</option>
                <option value="2">Mardi</option>
                <option value="3">Mercredi</option>
                <option value="4">Jeudi</option>
                <option value="5">Vendredi</option>
                <option value="6">Samedi</option>
                <option value="0">Dimanche</option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Heure de début *</label>
                <input type="time" [(ngModel)]="newSchedule.startTime" name="startTime" required>
              </div>
              <div class="form-group">
                <label>Heure de fin *</label>
                <input type="time" [(ngModel)]="newSchedule.endTime" name="endTime" required>
              </div>
            </div>
            <div class="form-group">
  <label>Collecteur *</label>
<select [(ngModel)]="newSchedule.collectorId" name="collectorId" required>
  <option value="">Sélectionner un collecteur</option>
  <option *ngFor="let collector of collectors" >
    {{ collector.firstName }} {{ collector.lastName }}
  </option>
</select>
</div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="showScheduleModal = false">
                Annuler
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">schedule</i>
                Créer Planning
              </button>
            </div>
          </form> -->
          <form class="schedule-form" (ngSubmit)="addSchedule()">
  <div class="form-group">
    <label>Zone *</label>
    <select [(ngModel)]="newSchedule.zoneId" name="zoneId" required>
      <option value="">Sélectionner une zone</option>
      <option *ngFor="let zone of zonesAgency" [value]="zone.id">
        {{ zone.name }}
      </option>
    </select>
    <small class="error-message" *ngIf="formErrors.zoneId">
      {{ formErrors.zoneId }}
    </small>
  </div>

  <div class="form-group">
    <label>Jour de la semaine *</label>
    <select [(ngModel)]="newSchedule.dayOfWeek" name="dayOfWeek" required>
      <option value="">Sélectionner un jour</option>
      <option value="1">Lundi</option>
      <option value="2">Mardi</option>
      <option value="3">Mercredi</option>
      <option value="4">Jeudi</option>
      <option value="5">Vendredi</option>
      <option value="6">Samedi</option>
      <option value="7">Dimanche</option>
    </select>
    <small class="error-message" *ngIf="formErrors.dayOfWeek">
      {{ formErrors.dayOfWeek }}
    </small>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label>Heure de début *</label>
      <input type="time" 
             [(ngModel)]="newSchedule.startTime" 
             name="startTime" 
             required>
      <small class="error-message" *ngIf="formErrors.startTime">
        {{ formErrors.startTime }}
      </small>
    </div>

    <div class="form-group">
      <label>Heure de fin *</label>
      <input type="time" 
             [(ngModel)]="newSchedule.endTime" 
             name="endTime" 
             required>
      <small class="error-message" *ngIf="formErrors.endTime">
        {{ formErrors.endTime }}
      </small>
    </div>
  </div>

  <div class="form-group">
    <label>Collecteur *</label>
    <select [(ngModel)]="newSchedule.collectorId" 
            name="collectorId" 
            required>
      <option value="">Sélectionner un collecteur</option>
      <option *ngFor="let collector of collectors" >
        {{ collector.firstName }} {{ collector.lastName }}
      </option>
    </select>
    <small class="error-message" *ngIf="formErrors.collectorId">
      {{ formErrors.collectorId }}
    </small>
  </div>

  <div class="form-actions">
    <button type="button" 
            class="btn btn-secondary" 
            (click)="showScheduleModal = false">
      Annuler
    </button>
    <button type="submit" 
            class="btn btn-primary"
            [disabled]="!newSchedule.zoneId || 
                       !newSchedule.dayOfWeek || 
                       !newSchedule.startTime || 
                       !newSchedule.endTime || 
                       !newSchedule.collectorId">
      <i class="material-icons">schedule</i>
      Créer Planning
    </button>
  </div>
</form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .agency-dashboard {
      min-height: 100vh;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .welcome-section h1 {
      color: var(--white);
      margin-bottom: 8px;
    }

    .welcome-section p {
      color: rgba(255, 255, 255, 0.9);
    }

    .quick-actions {
      display: flex;
      gap: 12px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
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

    .stat-icon.clients { background: var(--primary-color); }
    .stat-icon.collectors { background: var(--secondary-color); }
    .stat-icon.collections { background: var(--success-color); }
    .stat-icon.revenue { background: var(--accent-color); }
    .stat-icon.rating { background: var(--warning-color); }
    .stat-icon.reports { background: var(--error-color); }

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

    .stat-trend {
      font-size: 0.8rem;
      font-weight: 500;
    }

    .stat-trend.positive { color: var(--success-color); }
    .stat-trend.negative { color: var(--error-color); }
    .stat-trend.neutral { color: var(--text-secondary); }

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
    .analytics-filters {
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
      background: rgba(76,175,80,0.7);
      color: #fff;
    }

    .status-badge.status-pending {
      background: rgba(255,140,0,0.7);
      color: #fff;
    }

    .status-scheduled { background: #e3f2fd; color: var(--primary-color); }
    .status-in_progress { background: #fff3e0; color: #f57c00; }
    .status-completed { background: #e8f5e8; color: var(--success-color); }
    .status-missed { background: #ffebee; color: var(--error-color); }
    .status-active { background: #e8f5e8; color: var(--success-color); }
    .status-inactive { background: #f5f5f5; color: var(--text-secondary); }
    .status-suspended { background: #fff3e0; color: #f57c00; }
    .status-cancelled { background: #ffebee; color: var(--error-color); }
    .status-open { background: #ffebee; color: var(--error-color); }
    .status-in_progress { background: #fff3e0; color: #f57c00; }
    .status-resolved { background: #e8f5e8; color: var(--success-color); }

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
    .incident-severity {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
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
      width: 50px;
      height: 50px;
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

    .employee-status.active { color: var(--success-color); }
    .employee-status.inactive { color: var(--error-color); }

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
      grid-template-columns: repeat(2,1fr);
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
.error-message {
  color: var(--error-color);
  font-size: 0.8rem;
  margin-top: 4px;
  display: block;
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
      font-family: 'Inter', sans-serif;
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
      content: '✓';
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
  `]
})
export class AgencyDashboardComponent implements OnInit {

  currentUser: User | null = null;
  agencyReports: Report[] = [];

  agency: Agency | null = null;
  activeTab = 'collections';
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
  incidentsFilter = 'all';
  severityFilter = 'all';
  filteredIncidents: any[] = [];
  statistics: Statistics = {
    totalClients: 0,
    totalEmployees: 0,
    totalZones: 0,
    totalCollectors: 0,
    totalSignalements: 0,
    activeCollectors: 0,
    todayCollections: 0,
    completedCollections: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    pendingReports: 0,
    totalpendingSignalements: 0,
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
  schedules: CollectionSchedule[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];
  reports: Report[] = [];
  filteredReports: Report[] = [];
  isDeleting: boolean = false;
  // Filters
  collectionsFilter = 'all';
  selectedZone = '';
  clientsSearch = '';
  clientsFilter = 'all';
  reportsFilter = 'all';
  reportsTypeFilter = 'all';
  analyticsPeriod = 'monthly';
  analyticsFilter = 'all';

  // Modals
  showAddEmployeeModal = false;
  showUpdateEmployeeModal = false;
  showZoneModal = false;
  showScheduleModal = false;
  editingZone = false;

  // Forms
  newEmployee: any = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    zones: []
  };
  newTariff: any = {
    // agencyId: "",
    type: "",
    price: "",
    description: "",
    nbPassages: ""
  }


  newZone: any = {
    name: '',
    description: '',
    cities: [],
    neighborhoods: [],
    isActive: true
  };

  newSchedule: any = {
    zoneId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    collectorId: ''
  };
  formErrors = {
    zoneId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    collectorId: ''
  };
  citiesInput = '';

  neighborhoodsInput = '';
  activeClients: ClientApi[] = [];
  activeClientNbrs!: number;
  pendingClients: ClientApi[] = [];
  isLoading: boolean = false;
  // get activeClientNbr(): number {
  //   return this.activeClients.length;
  // }

  tabs = [
    { id: 'collections', label: 'Collectes', icon: 'local_shipping', badge: null },
    { id: 'employees', label: 'Employés', icon: 'people', badge: null },
    { id: 'zones', label: 'Zones', icon: 'map', badge: null },
    { id: 'schedules', label: 'Plannings', icon: 'schedule', badge: null },
    { id: 'clients', label: 'Clients', icon: 'person', badge: null },
    { id: 'reports', label: 'Signalements', icon: 'report_problem', badge: 3 },
    { id: 'analytics', label: 'Rapports', icon: 'analytics', badge: null }
  ];

  weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  currentWeek = new Date();



  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,

  ) {

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
    this.cdr.detectChanges();

    const testTarifId = '687cc316091944da1fc7c2c5';
    const role = EmployeeRole.COLLECTOR;

    this.agencyService.getEmployeesByAgencyAndRole$(testTarifId, role).subscribe(response => {
      if (response.success && response.data.length > 0) {
        console.log('Liste des collecteurs :');
        response.data.forEach(employee => {
          console.log(`- ${employee} (${employee.id})`);
        });
      } else {
        console.log('Aucun collecteur trouvé ou erreur de requête.');
      }
    });





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
      console.log('[loadAgencyData] agency simulée:', this.agency);
      this.loadEmployees(this.currentUser);
    }
    this.loadCollections();
    this.loadServiceZones();
    this.loadSchedules();
    console.log('[loadAgencyData] agency avant loadClients:', this.agency);
    this.loadClients();
    this.loadReports();
    //this.activeClientNbrs = this.activeClientNbr(); // Mettez à jour le nombre d'actifs
    //this.updateTabs(); // Mettez à jour les tabs après avoir récupéré les clients
  }
  loadCollectors(currentUser: any): void {
    if (currentUser?._id) {
      this.agencyService.getAgencyEmployeesByRole$(currentUser._id, EmployeeRole.COLLECTOR).subscribe(
        (employee) => {
          this.collectors = employee;
          console.log("Collecteurs chargés via l api service  :", this.collectors);
        },
        (error) => {
          console.error("Erreur lors du chargement des collecteurs :", error);
          ;
        }
      );
    } else {
      this.agencyService.getAgencyEmployeesByRole$(currentUser._id, EmployeeRole.MANAGER).subscribe(
        (manager) => {
          this.collectors = manager;
          console.log("Collecteurs chargés via l api service  :", this.collectors);
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
        'Erreur',
        'Impossible d\'identifier l\'employé à supprimer'
      );
      this.isDeleting = false;
      return;
    }

    // Demander confirmation avant suppression
    if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
      this.agencyService.deleteEmployee$(employeeId.userId._id).subscribe({
        next: (response) => {
          // Vérifier si la réponse indique un succès
          if (response) {
            this.notificationService.showSuccess(
              'Succès',
              'L\'employé a été supprimé avec succès.'
            );
            // Recharger la liste des employés
            this.loadEmployees(currentUser);

            // Mettre à jour le badge du nombre d'employés
            const employeesTab = this.tabs.find(tab => tab.id === 'employees');
            if (employeesTab && this.allEmployees) {
              employeesTab.badge = this.allEmployees.length - 1;
            }
          } else {
            this.notificationService.showError(
              'Erreur',
              'La suppression a échoué. Veuillez réessayer.'
            );
          }
          this.isDeleting = false;
        },
        error: (error) => {
          console.error("Erreur lors de la suppression de l'employé :", error);
          this.notificationService.showError(
            'Erreur',
            'Impossible de supprimer l\'employé. ' +
            (error.error?.message || 'Veuillez réessayer.')
          );
          this.isDeleting = false;
        },
        complete: () => {
          this.isDeleting = false;
        }
      });
    } else {
      this.isDeleting = false;
    }
  }
  assignIncident(): void {
    this.notificationService.showInfo('Attribution', 'Ouverture du formulaire d\'attribution');
    return
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
        id: '1',
        clientId: 'client1',
        agencyId: 'agency1',
        collectorId: 'collector1',
        scheduledDate: new Date(),
        status: CollectionStatus.IN_PROGRESS,
        address: {
          street: 'Rue des Roses',
          doorNumber: '15',
          doorColor: 'blue',
          neighborhood: 'Centre-ville',
          city: 'Oouagadougou',
          postalCode: '75001'
        },
        wasteTypes: [{ id: '1', name: 'Déchets ménagers', description: '', icon: 'delete', color: '#4caf50', instructions: [], acceptedItems: [], rejectedItems: [] }],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    this.filteredCollections = [...this.collections];
  }

  employeesNbrs!: number;
  activesEmployeesNbrs!: number;
  loadEmployees(currentUser: any): void {
    if (currentUser?._id) {
      this.agencyService.getAgencyAllEmployees(currentUser?._id).subscribe({
        next: (employees) => {
          this.allEmployees = employees;
          console.log("loadEmployees > :", this.allEmployees); // Changed from error to log
          const employeesTab = this.tabs.find(tab => tab.id === 'employees');
          if (employeesTab) {
            employeesTab.badge = employees.length;
            this.cdr.detectChanges(); // Force la détection des changements
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement des employés :", error);
          this.notificationService.showError(
            'Erreur',
            'Impossible de charger les employés. Veuillez réessayer.'
          );
        }
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
          const SignalementsTab = this.tabs.find(tab => tab.id === 'reports');
          if (SignalementsTab) {
            SignalementsTab.badge = reports.length;
            this.cdr.detectChanges(); // Force la détection des changements
          }
        },
        error: (error) => {
          console.error("Erreur lors du chargement des signalements :", error);
          this.notificationService.showError(
            'Erreur',
            'Impossible de charger les signalements. Veuillez réessayer.'
          );
        }
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
          console.error("Erreur lors du chargement des statistiques de l'agence :", error);
          this.notificationService.showError(
            'Erreur',
            'Impossible de charger les statistiques de l\'agence. Veuillez réessayer.'
          );
        }
      });
    } else {
      console.warn("Aucun ID d'utilisateur courant disponible.");
    }
  }
  loadServiceZones(): void {
    this.serviceZones = [
      {
        id: 'zone1',
        name: 'Zone Centre',
        description: 'Centre-ville et quartiers adjacents',
        boundaries: [],
        neighborhoods: ['Centre-ville', 'Quartier Latin'],
        cities: ['Paris'],
        isActive: true
      }
    ];
  }

  loadSchedules(): void {
    this.schedules = [
      {
        // id: '1',
        zoneId: 'zone1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '12:00',
        collectorId: '1',
        // isActive: true
      }
    ];
  }

  // Helper pour récupérer le statut d'abonnement
  getClientSubscriptionStatus(c: any): string | undefined {
    return c.subscriptionHistory && c.subscriptionHistory.length
      ? c.subscriptionHistory[c.subscriptionHistory.length - 1].status?.toLowerCase()
      : undefined;
  }

  clientNbrs!: number;

  loadClients(): void {
    console.log('[loadClients] called, agency:', this.agency);
    if (!this.agency || !this.agency?._id) return;
    this.clientService.getClientsByAgency(this.agency._id).subscribe({
      next: (clients) => {

        console.log('[loadClients] clients number:', this.activeClientNbrs, clients.length);
        this.activeClients = clients.filter(c => this.getClientSubscriptionStatus(c) === 'active');
        this.pendingClients = clients.filter(c => this.getClientSubscriptionStatus(c) === 'pending');
        console.log('[loadClients] active:', this.activeClients, 'pending:', this.pendingClients);


        if (clients) {
          this.clientNbrs = clients.length;
          console.log('[loadClients] clients received:', this.clientNbrs);
          // Vérifiez si activeClients est défini et mettez à jour le nombre d'actifs
          if (this.activeClients) {
            this.activeClientNbrs = this.activeClients.length; // Directement obtenir le nombre d'actifs
            // Trouver l'onglet "Clients" et mettre à jour son badge
            const clientsTab = this.tabs.find(tab => tab.label === 'Clients');
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
        console.error('[loadClients] error:', err);
        this.activeClients = [];
        this.pendingClients = [];
      }
    });
  }

  loadReports(): void {
    this.reports = [
      {
        _id: '1',
        clientId: 'client1',
        clientName: 'Marie Dupont',
        type: 'missed_collection',
        description: 'La collecte n\'a pas eu lieu à l\'heure prévue',
        date: new Date(),
        status: 'open',
        severity: 'medium',
        createdAt: new Date(),
        assignedTo: undefined
      }
    ];
    this.filteredReports = [...this.reports];
  }

  // Utility methods
  getActiveCollectorsToday(): number {
    return this.employees.filter(e => e.role === 'collector' && e.isActive).length;
  }

  getCollectionRate(): number {
    return Math.round((this.statistics.completedCollections / this.statistics.todayCollections) * 100);
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
      [CollectionStatus.SCHEDULED]: 'Programmé',
      [CollectionStatus.IN_PROGRESS]: 'En cours',
      [CollectionStatus.COMPLETED]: 'Terminé',
      [CollectionStatus.MISSED]: 'Manqué',
      [CollectionStatus.CANCELLED]: 'Annulé',
      [CollectionStatus.REPORTED]: 'Signalé'
    };
    return statusTexts[status] || status;
  }

  getClientName(clientId: string): string {
    const client = this.clients.find(c => c.id === clientId);
    return client ? client.name : 'Client inconnu';
  }

  getWasteTypeName(wasteType: any): string {
    return wasteType?.name || 'Type inconnu';
  }

  getCollectorName(collectorId: string): string {
    const collector = this.employees.find(e => e.id === collectorId);
    return collector ? `${collector.firstName} ${collector.lastName}` : 'Collecteur inconnu';
  }

  getCollectionProgress(collection: Collection): number {
    // Simuler le progrès de collecte avec une valeur stable
    const seed = collection.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return (seed % 100);
  }

  getRoleText(role: string): string {
    const roleTexts = {
      'admin': 'Administrateur',
      'manager': 'Manager',
      'collector': 'Collecteur'
    };
    return roleTexts[role as keyof typeof roleTexts] || role;
  }

  getZoneName(zoneId: string): string {
    const zone = this.serviceZones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Zone inconnue';
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
    const employee = this.employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu';
  }

  getSubscriptionStatusText(status: string): string {
    const statusTexts = {
      'active': 'Actif',
      'suspended': 'Suspendu',
      'cancelled': 'Résilié'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getReportTypeText(type: string): string {
    const typeTexts = {
      'missed_collection': 'Collecte manquée',
      'incomplete_collection': 'Collecte incomplète',
      'damage': 'Dommage',
      'complaint': 'Réclamation'
    };
    return typeTexts[type as keyof typeof typeTexts] || type;
  }

  getReportStatusText(status: string): string {
    const statusTexts = {
      'open': 'Ouvert',
      'in_progress': 'En cours',
      'resolved': 'Résolu'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getCurrentWeekText(): string {
    const startOfWeek = new Date(this.currentWeek);
    startOfWeek.setDate(this.currentWeek.getDate() - this.currentWeek.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return `${startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  }

  getSchedulesForDay(dayIndex: number): any[] {
    return this.schedules.filter(s => s.dayOfWeek === dayIndex + 1);
  }

  getCollectors(): Employee[] {
    return this.employees.filter(e => e.role === 'collector');
  }




  getCollectorPerformance(): any[] {
    return this.employees
      .filter(e => e.role === 'collector')
      .map(e => ({
        name: `${e.firstName} ${e.lastName}`,
        collectionsCount: this.getEmployeeCollections(e.id),
        score: Math.floor(Math.random() * 30) + 70
      }));
  }

  getZoneStatistics(): any[] {
    return this.serviceZones.map(zone => ({
      name: zone.name,
      clients: this.getZoneClients(zone.id),
      collections: Math.floor(Math.random() * 100) + 50,
      revenue: Math.floor(Math.random() * 5000) + 2000
    }));
  }

  // Filter methods
  filterCollections(): void {
    this.filteredCollections = this.collections.filter(collection => {
      const statusMatch = this.collectionsFilter === 'all' || collection.status === this.collectionsFilter;
      const zoneMatch = !this.selectedZone || collection.address.neighborhood === this.selectedZone;
      return statusMatch && zoneMatch;
    });
  }

  filterClients(): void {
    this.filteredClients = this.clients.filter(client => {
      const searchMatch = !this.clientsSearch ||
        client.name.toLowerCase().includes(this.clientsSearch.toLowerCase()) ||
        client.email.toLowerCase().includes(this.clientsSearch.toLowerCase());
      const statusMatch = this.clientsFilter === 'all' || client.subscriptionStatus === this.clientsFilter;
      return searchMatch && statusMatch;
    });
  }

  filterReports(): void {
    this.filteredReports = this.reports.filter(report => {
      const statusMatch = this.reportsFilter === 'all' || report.status === this.reportsFilter;
      const typeMatch = this.reportsTypeFilter === 'all' || report.type === this.reportsTypeFilter;
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

  editEmployee(employeeId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  // deleteEmployee(employeeId: string): void {
  //   if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
  //     this.employees = this.employees.filter(e => e.id !== employeeId);

  //   }
  // }


  // Zone Side 
  editZone(zoneId: string): void {
    const zone = this.serviceZones.find(z => z.id === zoneId);
    if (zone) {
      this.newZone = { ...zone };
      this.citiesInput = zone.cities.join(', ');
      this.neighborhoodsInput = zone.neighborhoods.join(', ');
      this.editingZone = true;
      this.showZoneModal = true;
    }
  }

  deleteZone(zoneId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) {
      this.serviceZones = this.serviceZones.filter(z => z.id !== zoneId);
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }

  editSchedule(scheduleId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  deleteSchedule(scheduleId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      // this.schedules = this.schedules.filter(s => s.id !== scheduleId);
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }

  viewClientDetails(clientId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  suspendClient(clientId: string): void {
    const client = this.clients.find(c => c.id === clientId);
    if (client) {
      client.subscriptionStatus = 'suspended';
      // No need to call notificationService.showSuccess here, as it's already handled in the template
      this.notificationService.showSuccess('Client suspendu', 'Le client a bien été suspendu.');
    }
  }

  deleteClient(clientId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      // Ajoute la logique de suppression ici (API ou local)
      // ...
      this.notificationService.showSuccess('Client supprimé', 'Le client a bien été supprimé.');
    }
  }

  assignReport(reportId: string): void {
    // No need to call notificationService.showInfo here, as it's already handled in the template
  }

  resolveReport(reportId: string): void {
    const report = this.reports.find(r => r._id === reportId);
    if (report) {
      report.status = 'resolved';
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
      this.newEmployee.zones = this.newEmployee.zones.filter((id: string) => id !== zoneId);
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

  addEmployee(): void {
    if (this.newEmployee.firstName && this.newEmployee.lastName && this.newEmployee.email && this.newEmployee.role) {
      const employee: Employees = {
        // id: Math.random().toString(36).substr(2, 9),
        // userId: Math.random().toString(36).substr(2, 9),
        firstName: this.newEmployee.firstName,
        lastName: this.newEmployee.lastName,
        email: this.newEmployee.email,
        phone: this.newEmployee.phone,
        role: this.newEmployee.role,
        zones: this.newEmployee.zones,

        isActive: true,
        hiredAt: new Date()
      };

      this.agencyService.addEmployee(employee).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log('[DEBUG] Réponse inscription collector:', response);
          const isSuccess =
            response.success ||
            response.status === 'success' ||
            (typeof response.message === 'string' && (
              response.message.toLowerCase().includes('succès') ||
              response.message.toLowerCase().includes('réussi')
            )) ||
            !!response;

          if (isSuccess) {
            this.notificationService.showSuccess('Inscription réussie',
              'Le collaborateur a été créé avec succès ! Vous pouvez maintenant vous connecter.');
            // setTimeout(() => {
            //   this.router.navigate(['/login']);
            // }, 2000);
          } else {
            const errorMsg = this.getFriendlyMessage((response?.message || response?.error || ''), false);
            this.notificationService.showError('Erreur lors de l\'inscription', errorMsg);
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage((error?.error?.message || error?.error?.message || error?.error || ''), false);
          this.notificationService.showError('Erreur lors de l\'inscription', errorMsg);
          this.loadEmployees(this.currentUser);
        }
      });
      this.showAddEmployeeModal = false;
      this.newEmployee = { firstName: '', lastName: '', email: '', phone: '', role: '', zones: [] };
      // No need to call notificationService.showSuccess here, as it's already handled in the template
    }
  }

  //creation d un tarif 
  addTariff(): void {
    if (this.newTariff.type && this.newTariff.price !== undefined) {
      const agencyId = this.currentUser?.id;
      const tariff: Tariff = {
        agencyId: agencyId || '',
        type: this.newTariff.type,
        price: this.newTariff.price,
        description: this.newTariff.description,
        nbPassages: this.newTariff.nbPassages,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.agencyService.addTariff(tariff).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log('[DEBUG] Réponse ajout tarif:', response);

          const isSuccess =
            response?.success ||
            response?.status === 'success' ||
            (typeof response?.message === 'string' &&
              (response.message.toLowerCase().includes('succès') ||
                response.message.toLowerCase().includes('réussi'))) ||
            !!response;

          if (isSuccess) {
            // La condition de succès est simplifiée. Si la réponse de l'API n'est pas nulle, on considère que c'est un succès.
            // Votre service `addTariff` retourne `null` en cas d'erreur.
            if (response) {
              this.notificationService.showSuccess(
                'Ajout réussi',
                'Le tarif a été créé avec succès !'
              );
              this.showZoneModal = false;
              this.showZoneModal = false; // Fermeture de la modale
              this.loadTariffs(); // Rechargement de la liste des tarifs
              // Réinitialisation du formulaire pour une nouvelle saisie
              this.newTariff = { type: "", price: "", description: "", nbPassages: "" };
            } else {
              const errorMsg = this.getFriendlyMessage(
                (response?.message || response?.error || ''),
                false
              );
              this.notificationService.showError(
                'Erreur lors de l’ajout du tarif',
                errorMsg
              );
              this.newTariff = {
                agencyId: '',
                type: '',
                price: 0,
                description: '',
                nbPassages: 0,
                createdAt: new Date(),

              };
            };
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            (error?.error?.message || error?.error || ''),
            false
          );
          this.notificationService.showError(
            'Erreur lors de l’ajout du tarif',
            errorMsg
          );
        }
      });
    }
  }
  // recuperations des tarifs liee a une agences
  tariffs: Tariff[] = [];
  loadTariffs(): void {
    this.isLoading = true;
    const agencyId = this.currentUser?.id;
    if (!agencyId) {
      console.error('[DEBUG] Aucun agencyId trouvé pour l’utilisateur courant');
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
      next: (data: Tariff[]) => {
        this.tariffs = data;
        console.log('Tarifs récupérés :', this.tariffs);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[DEBUG] Erreur lors du chargement des tarifs :', error);
        this.isLoading = false;
      }
    });
  }

  tariffToUpdate: Tariff | null = null;
  //update un tarif via l api
  updateTariff(tariffId: string): void {
    if (this.tariffToUpdate && this.tariffToUpdate.type && this.tariffToUpdate.price !== undefined) {
      this.isLoading = true;

      const payload = {
        type: this.tariffToUpdate.type,
        price: this.tariffToUpdate.price,
        description: this.tariffToUpdate.description,
        nbPassages: this.tariffToUpdate.nbPassages,
        updatedAt: new Date()
      };

      this.agencyService.getUpdateTarifs$(tariffId, payload).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log('[DEBUG] Réponse modification tarif:', response);

          const isSuccess =
            response?.success ||
            response?.status === 'success' ||
            (typeof response?.message === 'string' &&
              (response.message.toLowerCase().includes('succès') ||
                response.message.toLowerCase().includes('réussi'))) ||
            !!response;

          if (isSuccess) {
            this.notificationService.showSuccess(
              'Modification réussie',
              'Le tarif a été modifié avec succès !'
            );
            // this.loadTariffs(this.currentUser?.id!); // recharger la liste après update
          } else {
            const errorMsg = this.getFriendlyMessage(
              (response?.message || response?.error || ''),
              false
            );
            this.notificationService.showError(
              'Erreur lors de la modification du tarif',
              errorMsg
            );
          }
        },
        error: (error) => {
          this.isLoading = false;
          const errorMsg = this.getFriendlyMessage(
            (error?.error?.message || error?.error || ''),
            false
          );
          this.notificationService.showError(
            'Erreur lors de la modification du tarif',
            errorMsg
          );
        }
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
            'Succès',
            'L\'tarif été supprimé avec succès.'
          );
          // this.loadEmployees(currentUser);
          this.isDeleting = false;
          this.loadTariffs();
        },
        (error) => {
          this.notificationService.showError(
            'Erreur',
            'Impossible de supprimer l\'tarif. Veuillez réessayer.'
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
      this.newZone.cities = this.citiesInput.split(',').map(city => city.trim());
      this.newZone.neighborhoods = this.neighborhoodsInput.split(',').map(n => n.trim()).filter(n => n);

      if (this.editingZone) {
        const index = this.serviceZones.findIndex(z => z.id === this.newZone.id);
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
          isActive: this.newZone.isActive
        };
        // this.agencyService.
        this.serviceZoness.push(zone);
        // No need to call notificationService.showSuccess here, as it's already handled in the template
      }

      this.showZoneModal = false;
      this.editingZone = false;
      this.newZone = { name: '', description: '', cities: [], neighborhoods: [], isActive: true };
      this.citiesInput = '';
      this.neighborhoodsInput = '';
    }
  }

  // addSchedule(): void {
  //   if (this.newSchedule.zoneId && this.newSchedule.dayOfWeek && this.newSchedule.startTime && this.newSchedule.endTime && this.newSchedule.collectorId) {
  //     const schedule: CollectionSchedule = {
  //       id: Math.random().toString(36).substr(2, 9),
  //       zoneId: this.newSchedule.zoneId,
  //       dayOfWeek: parseInt(this.newSchedule.dayOfWeek),
  //       startTime: this.newSchedule.startTime,
  //       endTime: this.newSchedule.endTime,
  //       collectorId: this.newSchedule.collectorId,
  //       isActive: true
  //     };

  //     this.schedules.push(schedule);
  //     this.showScheduleModal = false;
  //     this.newSchedule = { zoneId: '', dayOfWeek: '', startTime: '', endTime: '', collectorId: '' };
  //   }
  // }

  validateClient(clientId: string): void {
    console.log('[validateClient] called for', clientId);
    this.clientService.validateClientSubscription(clientId).subscribe({
      next: () => {
        console.log('[validateClient] success for', clientId);
        this.notificationService.showSuccess('Validation', 'Abonnement validé avec succès !');
        this.loadClients();
      },
      error: (err) => {
        console.error('[validateClient] error for', clientId, err);
      }
    });
  }
  // addSchedule(): void {
  //   if (this.newSchedule.zoneId && this.newSchedule.dayOfWeek && this.newSchedule.startTime && this.newSchedule.endTime && this.newSchedule.collectorId) {
  //     const schedule = {
  //       zoneId: this.newSchedule.zoneId,
  //       dayOfWeek: this.newSchedule.dayOfWeek ? Number(this.newSchedule.dayOfWeek) : 0,

  //       startTime: this.newSchedule.startTime,
  //       endTime: this.newSchedule.endTime,
  //       collectorId: this.newSchedule.collectorId
  //     };

  //     this.agencyService.addSchedule$(schedule).subscribe({
  //       next: () => {
  //         console.log('Horaire envoyé avec succès');
  //         this.loadSchedules();
  //         this.showScheduleModal = false;
  //         this.newSchedule = { zoneId: '', dayOfWeek: '', startTime: '', endTime: '', collectorId: '' };
  //       },
  //       error: (err) => {
  //         console.error('Erreur lors de l\'envoi', err);
  //       }
  //     });
  //   }
  // }

  addSchedule(): void {
    // Réinitialiser les erreurs
    this.formErrors = {
      zoneId: '',
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      collectorId: ''
    };
    let isValid = true;
    if (!this.newSchedule.zoneId) {
      this.formErrors.zoneId = 'Veuillez sélectionner une zone';
      isValid = false;
    }
    if (!this.newSchedule.dayOfWeek) {
      this.formErrors.dayOfWeek = 'Veuillez sélectionner un jour';
      isValid = false;
    }
    if (!this.newSchedule.startTime) {
      this.formErrors.startTime = 'Veuillez définir une heure de début';
      isValid = false;
    }
    if (!this.newSchedule.endTime) {
      this.formErrors.endTime = 'Veuillez définir une heure de fin';
      isValid = false;
    }
    if (!this.newSchedule.collectorId) {
      this.formErrors.collectorId = 'Veuillez sélectionner un collecteur';
      isValid = false;
    }
    if (this.newSchedule.startTime && this.newSchedule.endTime) {
      const start = new Date(`1970-01-01T${this.newSchedule.startTime}`);
      const end = new Date(`1970-01-01T${this.newSchedule.endTime}`);
      if (end <= start) {
        this.formErrors.endTime = 'L\'heure de fin doit être postérieure à l\'heure de début';
        isValid = false;
      }
    }

    if (!isValid) {
      this.notificationService.showError(
        'Erreur de validation',
        'Veuillez corriger les erreurs dans le formulaire'
      );
      return;
    }
    // Création de l'objet planning
    const schedule: CollectionSchedule = {
      zoneId: this.newSchedule.zoneId,
      dayOfWeek: Number(this.newSchedule.dayOfWeek),
      startTime: this.newSchedule.startTime,
      endTime: this.newSchedule.endTime,
      collectorId: this.newSchedule.collectorId
    };

    // Envoi au service
    this.agencyService.addSchedule$(schedule).subscribe({
      next: (response) => {
        this.notificationService.showSuccess(
          'Succès',
          'Le planning a été créé avec succès'
        );
        this.showScheduleModal = false;
        this.loadSchedules();
        // Réinitialisation du formulaire
        this.newSchedule = {
          zoneId: '',
          dayOfWeek: '',
          startTime: '',
          endTime: '',
          collectorId: ''
        };
      },
      error: (error) => {
        let errorMessage = 'Une erreur est survenue lors de la création du planning';

        // Gestion des erreurs spécifiques
        if (error.error?.message) {
          switch (error.error.message) {
            case 'COLLECTOR_NOT_AVAILABLE':
              errorMessage = 'Le collecteur n\'est pas disponible sur ce créneau';
              break;
            case 'ZONE_NOT_FOUND':
              errorMessage = 'La zone sélectionnée n\'existe pas';
              break;
            case 'TIME_CONFLICT':
              errorMessage = 'Il existe déjà un planning sur ce créneau horaire';
              break;
            default:
              errorMessage = error.error.message;
          }
        }

        this.notificationService.showError(
          'Erreur',
          errorMessage
        );
      }
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
    this.notificationService.showSuccess('Résolu', 'Incident marqué comme résolu');
    // }
  }
  contactAgencyForIncident(): void {
    this.contactAgency();
  }

  contactAgency(): void {
    this.notificationService.showInfo('Contact', 'Ouverture des informations de contact');
  }


  getSeverityText(severity: string): string {
    const texts = {
      'critical': 'Critique',
      'high': 'Élevée',
      'medium': 'Moyenne',
      'low': 'Faible'
    };
    return texts[severity as keyof typeof texts] || severity;
  }

  getIncidentTypeText(type: string): string {
    const types = {
      'missed_collection': 'Collecte manquée',
      'compliance_issue': 'Non-conformité',
      'complaint': 'Réclamation',
      'technical_issue': 'Problème technique',
      'problem': 'Collecte manquée'
    };
    return types[type as keyof typeof types] || type;
  }

  getSeverityIcon(severity: string): string {
    const icons = {
      'critical': 'error',
      'high': 'warning',
      'medium': 'info',
      'low': 'help'
    };
    return icons[severity as keyof typeof icons] || 'help';
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      'open': 'Ouvert',
      'pending': 'En cours',
      'resolved': 'Résolu'
    };
    return statuses[status as keyof typeof statuses] || status;
  }
  resolveIncident(id: string) {
    const body = {
      status:"resolved" 
      // status:"pending" 
    };
    console.log('Status envoyé :', body);
    this.agencyService.resolveIncident$(id,body).subscribe({
      
      next: (response: any) => {
        console.log("[DEBUG] Réponse de resolution d'incidant:", response);
        if (response.message) {
          this.notificationService.showSuccess('Resolu', response.message);
           this.loadAgencyReports(this.currentUser);
          // this.notificationService.showSuccess('Résolu', 'Incident marqué comme résolu');
        } else {
          this.notificationService.showError('Activation', 'Erreur lors de l\'activation de l\'agence');
        }
      },
      error: (error: any) => {
        console.error('Error activating agency:', error);
        const msg = error?.error?.message || 'Error activating agency';
        this.notificationService.showSuccess('Activation', msg);
      }
    });
  }

}