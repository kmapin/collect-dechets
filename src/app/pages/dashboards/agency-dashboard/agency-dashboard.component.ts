import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AgencyService } from '../../../services/agency.service';
import { CollectionService } from '../../../services/collection.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { Agency, Employee, ServiceZone, CollectionSchedule } from '../../../models/agency.model';
import { Collection, CollectionStatus } from '../../../models/collection.model';

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
  id: string;
  clientId: string;
  clientName: string;
  type: 'missed_collection' | 'incomplete_collection' | 'damage' | 'complaint';
  description: string;
  date: Date;
  status: 'open' | 'in_progress' | 'resolved';
  assignedTo?: string;
}

interface Statistics {
  totalClients: number;
  activeCollectors: number;
  todayCollections: number;
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
                Gérer Zones
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
                <span class="stat-trend positive">+12 ce mois</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collectors">
                <i class="material-icons">local_shipping</i>
              </div>
              <div class="stat-info">
                <h3>Collecteurs actifs</h3>
                <p class="stat-value">{{ statistics.activeCollectors }}</p>
                <span class="stat-trend neutral">{{ getActiveCollectorsToday() }} en tournée</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collections">
                <i class="material-icons">check_circle</i>
              </div>
              <div class="stat-info">
                <h3>Collectes aujourd'hui</h3>
                <p class="stat-value">{{ statistics.completedCollections }}/{{ statistics.todayCollections }}</p>
                <span class="stat-trend" [class.positive]="getCollectionRate() >= 90" [class.negative]="getCollectionRate() < 80">
                  {{ getCollectionRate() }}% réalisées
                </span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon revenue">
                <i class="material-icons">euro</i>
              </div>
              <div class="stat-info">
                <h3>Revenus du mois</h3>
                <p class="stat-value">{{ statistics.monthlyRevenue | number:'1.0-0' }}€</p>
                <span class="stat-trend positive">+8.5% vs mois dernier</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon rating">
                <i class="material-icons">star</i>
              </div>
              <div class="stat-info">
                <h3>Note moyenne</h3>
                <p class="stat-value">{{ statistics.averageRating }}/5</p>
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
                <p class="stat-value">{{ statistics.pendingReports }}</p>
                <span class="stat-trend" [class.negative]="statistics.pendingReports > 5">
                  En attente de traitement
                </span>
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
                <div *ngFor="let employee of employees" class="employee-card card">
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
                    <div class="employee-actions">
                      <button class="action-btn" (click)="editEmployee(employee.id)">
                        <i class="material-icons">edit</i>
                      </button>
                      <button class="action-btn danger" (click)="deleteEmployee(employee.id)">
                        <i class="material-icons">delete</i>
                      </button>
                    </div>
                  </div>

                  <div class="employee-details">
                    <div class="detail-item">
                      <i class="material-icons">email</i>
                      <span>{{ employee.email }}</span>
                    </div>
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

                  <div class="employee-stats" *ngIf="employee.role === 'collector'">
                    <div class="stat-item">
                      <span class="stat-label">Collectes aujourd'hui</span>
                      <span class="stat-value">{{ getEmployeeCollections(employee.id) }}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Note moyenne</span>
                      <span class="stat-value">{{ getEmployeeRating(employee.id) }}/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Gestion des Zones -->
            <div *ngIf="activeTab === 'zones'" class="zones-tab">
              <div class="zones-header">
                <h2>Gestion des Zones de Couverture</h2>
                <div class="zones-actions">
                  <button class="btn btn-primary" (click)="showZoneModal = true">
                    <i class="material-icons">add_location</i>
                    Ajouter Zone
                  </button>
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
                <h2>Gestion des Clients</h2>
                <div class="clients-filters">
                  <input type="text" [(ngModel)]="clientsSearch" (input)="filterClients()" 
                         placeholder="Rechercher un client..." class="search-input">
                  <select [(ngModel)]="clientsFilter" (change)="filterClients()" class="filter-select">
                    <option value="all">Tous les clients</option>
                    <option value="active">Actifs</option>
                    <option value="suspended">Suspendus</option>
                    <option value="cancelled">Résiliés</option>
                  </select>
                </div>
              </div>

              <div class="clients-table">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Adresse</th>
                      <th>Statut</th>
                      <th>Dernier paiement</th>
                      <th>Total payé</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let client of filteredClients">
                      <td>
                        <div class="client-info">
                          <strong>{{ client.name }}</strong>
                          <div class="client-contact">
                            <span>{{ client.email }}</span>
                            <span>{{ client.phone }}</span>
                          </div>
                        </div>
                      </td>
                      <td>{{ client.address }}</td>
                      <td>
                        <span class="status-badge" [class]="'status-' + client.subscriptionStatus">
                          {{ getSubscriptionStatusText(client.subscriptionStatus) }}
                        </span>
                      </td>
                      <td>{{ client.lastPayment | date:'dd/MM/yyyy' }}</td>
                      <td>{{ client.totalPaid }}€</td>
                      <td>
                        <div class="table-actions">
                          <button class="action-btn" (click)="viewClientDetails(client.id)">
                            <i class="material-icons">visibility</i>
                          </button>
                          <button class="action-btn" (click)="contactClient(client.id)">
                            <i class="material-icons">phone</i>
                          </button>
                          <button class="action-btn" (click)="suspendClient(client.id)" 
                                  *ngIf="client.subscriptionStatus === 'active'">
                            <i class="material-icons">pause</i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Onglet Signalements -->
            <div *ngIf="activeTab === 'reports'" class="reports-tab">
              <div class="reports-header">
                <h2>Traitement des Signalements</h2>
                <div class="reports-filters">
                  <select [(ngModel)]="reportsFilter" (change)="filterReports()" class="filter-select">
                    <option value="all">Tous les signalements</option>
                    <option value="open">Ouverts</option>
                    <option value="in_progress">En cours</option>
                    <option value="resolved">Résolus</option>
                  </select>
                  <select [(ngModel)]="reportsTypeFilter" (change)="filterReports()" class="filter-select">
                    <option value="all">Tous les types</option>
                    <option value="missed_collection">Collecte manquée</option>
                    <option value="incomplete_collection">Collecte incomplète</option>
                    <option value="damage">Dommage</option>
                    <option value="complaint">Réclamation</option>
                  </select>
                </div>
              </div>

              <div class="reports-list">
                <div *ngFor="let report of filteredReports" class="report-card card">
                  <div class="report-header">
                    <div class="report-info">
                      <h4>{{ report.clientName }}</h4>
                      <p class="report-type">{{ getReportTypeText(report.type) }}</p>
                      <p class="report-date">{{ report.date | date:'dd/MM/yyyy HH:mm' }}</p>
                    </div>
                    <div class="report-status">
                      <span class="status-badge" [class]="'status-' + report.status">
                        {{ getReportStatusText(report.status) }}
                      </span>
                    </div>
                  </div>

                  <div class="report-content">
                    <p class="report-description">{{ report.description }}</p>
                    <div class="report-assignment" *ngIf="report.assignedTo">
                      <i class="material-icons">person</i>
                      <span>Assigné à {{ getEmployeeName(report.assignedTo) }}</span>
                    </div>
                  </div>

                  <div class="report-actions">
                    <button class="btn btn-secondary" (click)="assignReport(report.id)" 
                            *ngIf="report.status === 'open'">
                      <i class="material-icons">assignment_ind</i>
                      Assigner
                    </button>
                    <button class="btn btn-primary" (click)="resolveReport(report.id)" 
                            *ngIf="report.status !== 'resolved'">
                      <i class="material-icons">check</i>
                      Résoudre
                    </button>
                    <button class="btn btn-secondary" (click)="contactReportClient(report.clientId)">
                      <i class="material-icons">phone</i>
                      Contacter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Rapports -->
            <div *ngIf="activeTab === 'analytics'" class="analytics-tab">
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

      <!-- Modal Gestion Zone -->
      <div class="modal-overlay" *ngIf="showZoneModal" (click)="showZoneModal = false">
        <div class="modal-content zone-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingZone ? 'Modifier' : 'Ajouter' }} une Zone</h3>
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
          <form class="schedule-form" (ngSubmit)="addSchedule()">
            <div class="form-group">
              <label>Zone *</label>
              <select [(ngModel)]="newSchedule.zoneId" name="zoneId" required>
                <option value="">Sélectionner une zone</option>
                <option *ngFor="let zone of serviceZones" [value]="zone.id">{{ zone.name }}</option>
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
                <option *ngFor="let collector of getCollectors()" [value]="collector.id">
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
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .agency-dashboard {
      min-height: 100vh;
      background: var(--light-gray);
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
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
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

    .collection-actions {
      display: flex;
      gap: 8px;
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
      display: flex;
      flex-direction: column;
      gap: 16px;
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
  agency: Agency | null = null;
  activeTab = 'collections';
  
  // Data
  statistics: Statistics = {
    totalClients: 1250,
    activeCollectors: 8,
    todayCollections: 45,
    completedCollections: 38,
    monthlyRevenue: 32450,
    averageRating: 4.3,
    pendingReports: 3
  };

  collections: Collection[] = [];
  filteredCollections: Collection[] = [];
  employees: Employee[] = [];
  serviceZones: ServiceZone[] = [];
  schedules: CollectionSchedule[] = [];
  clients: Client[] = [];
  filteredClients: Client[] = [];
  reports: Report[] = [];
  filteredReports: Report[] = [];

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

  citiesInput = '';
  neighborhoodsInput = '';

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
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadAgencyData();
  }

  loadAgencyData(): void {
    // Charger les données de l'agence
            this.loadCollections();
            this.loadEmployees();
            this.loadServiceZones();
            this.loadSchedules();
            this.loadClients();
            this.loadReports();
  }

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
          city: 'Paris',
          postalCode: '75001'
        },
        wasteTypes: [{ id: '1', name: 'Déchets ménagers', description: '', icon: 'delete', color: '#4caf50', instructions: [], acceptedItems: [], rejectedItems: [] }],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    this.filteredCollections = [...this.collections];
  }

  loadEmployees(): void {
    this.employees = [
      {
        id: '1',
        userId: 'user1',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@agency.com',
        phone: '+33123456789',
        role: 'collector' as any,
        zones: ['zone1'],
        isActive: true,
        hiredAt: new Date('2023-01-15')
      }
    ];
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
        id: '1',
        zoneId: 'zone1',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '12:00',
        collectorId: '1',
        isActive: true
      }
    ];
  }

  loadClients(): void {
    this.clients = [
      {
        id: 'client1',
        name: 'Marie Dupont',
        email: 'marie.dupont@email.com',
        phone: '+33987654321',
        address: '15 Rue des Roses, Centre-ville, Paris',
        subscriptionStatus: 'active',
        lastPayment: new Date('2024-01-01'),
        totalPaid: 155.94,
        joinDate: new Date('2023-06-15')
      }
    ];
      this.filteredClients = [...this.clients];
  }

  loadReports(): void {
    this.reports = [
      {
        id: '1',
        clientId: 'client1',
        clientName: 'Marie Dupont',
        type: 'missed_collection',
        description: 'La collecte n\'a pas eu lieu à l\'heure prévue',
        date: new Date(),
        status: 'open',
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

  getStars(rating: number): number[] {
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
    this.notificationService.showInfo('Suivi', 'Ouverture du suivi en temps réel');
  }

  contactClient(clientId: string): void {
    this.notificationService.showInfo('Contact', 'Ouverture des informations de contact');
  }

  editEmployee(employeeId: string): void {
    this.notificationService.showInfo('Modification', 'Ouverture du formulaire de modification');
  }

  deleteEmployee(employeeId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
      this.employees = this.employees.filter(e => e.id !== employeeId);
      this.notificationService.showSuccess('Supprimé', 'Employé supprimé avec succès');
    }
  }

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
      this.notificationService.showSuccess('Supprimé', 'Zone supprimée avec succès');
    }
  }

  editSchedule(scheduleId: string): void {
    this.notificationService.showInfo('Modification', 'Ouverture du formulaire de modification');
  }

  deleteSchedule(scheduleId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce planning ?')) {
      this.schedules = this.schedules.filter(s => s.id !== scheduleId);
      this.notificationService.showSuccess('Supprimé', 'Planning supprimé avec succès');
    }
  }

  viewClientDetails(clientId: string): void {
    this.notificationService.showInfo('Détails', 'Ouverture des détails du client');
  }

  suspendClient(clientId: string): void {
    const client = this.clients.find(c => c.id === clientId);
    if (client) {
      client.subscriptionStatus = 'suspended';
      this.notificationService.showSuccess('Suspendu', 'Client suspendu avec succès');
    }
  }

  assignReport(reportId: string): void {
    this.notificationService.showInfo('Attribution', 'Ouverture du formulaire d\'attribution');
  }

  resolveReport(reportId: string): void {
    const report = this.reports.find(r => r.id === reportId);
    if (report) {
      report.status = 'resolved';
      this.filterReports();
      this.notificationService.showSuccess('Résolu', 'Signalement marqué comme résolu');
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
    this.notificationService.showInfo('Mise à jour', 'Actualisation des statistiques');
  }

  exportReport(): void {
    this.notificationService.showInfo('Export', 'Génération du rapport en cours...');
  }

  // Form methods
  toggleZoneAssignment(zoneId: string, event: any): void {
    if (event.target.checked) {
      this.newEmployee.zones.push(zoneId);
    } else {
      this.newEmployee.zones = this.newEmployee.zones.filter((id: string) => id !== zoneId);
    }
  }

  addEmployee(): void {
    if (this.newEmployee.firstName && this.newEmployee.lastName && this.newEmployee.email && this.newEmployee.role) {
      const employee: Employee = {
        id: Math.random().toString(36).substr(2, 9),
        userId: Math.random().toString(36).substr(2, 9),
        firstName: this.newEmployee.firstName,
        lastName: this.newEmployee.lastName,
        email: this.newEmployee.email,
        phone: this.newEmployee.phone,
        role: this.newEmployee.role,
        zones: this.newEmployee.zones,
        isActive: true,
        hiredAt: new Date()
      };

      this.employees.push(employee);
      this.showAddEmployeeModal = false;
      this.newEmployee = { firstName: '', lastName: '', email: '', phone: '', role: '', zones: [] };
      this.notificationService.showSuccess('Ajouté', 'Employé ajouté avec succès');
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
        this.notificationService.showSuccess('Modifié', 'Zone modifiée avec succès');
      } else {
        const zone: ServiceZone = {
          id: Math.random().toString(36).substr(2, 9),
          name: this.newZone.name,
          description: this.newZone.description,
          boundaries: [],
          neighborhoods: this.newZone.neighborhoods,
          cities: this.newZone.cities,
          isActive: this.newZone.isActive
        };
        this.serviceZones.push(zone);
        this.notificationService.showSuccess('Ajouté', 'Zone ajoutée avec succès');
      }

      this.showZoneModal = false;
      this.editingZone = false;
      this.newZone = { name: '', description: '', cities: [], neighborhoods: [], isActive: true };
      this.citiesInput = '';
      this.neighborhoodsInput = '';
    }
  }

  addSchedule(): void {
    if (this.newSchedule.zoneId && this.newSchedule.dayOfWeek && this.newSchedule.startTime && this.newSchedule.endTime && this.newSchedule.collectorId) {
      const schedule: CollectionSchedule = {
        id: Math.random().toString(36).substr(2, 9),
        zoneId: this.newSchedule.zoneId,
        dayOfWeek: parseInt(this.newSchedule.dayOfWeek),
        startTime: this.newSchedule.startTime,
        endTime: this.newSchedule.endTime,
        collectorId: this.newSchedule.collectorId,
        isActive: true
      };

      this.schedules.push(schedule);
      this.showScheduleModal = false;
      this.newSchedule = { zoneId: '', dayOfWeek: '', startTime: '', endTime: '', collectorId: '' };
      this.notificationService.showSuccess('Créé', 'Planning créé avec succès');
    }
  }
}