import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AgencyService } from '../../../services/agency.service';
import { CollectionService } from '../../../services/collection.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { Agency } from '../../../models/agency.model';
import { Collection, CollectionStatus } from '../../../models/collection.model';
import { OUAGA_DATA } from '../../../data/mock-data'; // chemin à adapter

interface MunicipalityStatistics {
  totalAgencies: number;
  activeAgencies: number;
  totalClients: number;
  totalCollectors: number;
  todayCollections: number;
  completedCollections: number;
  totalRevenue: number;
  averageRating: number;
  pendingReports: number;
  complianceRate: number;
}

interface AgencyAudit {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  clients: number;
  collectors: number;
  zones: number;
  collectionsToday: number;
  completionRate: number;
  rating: number;
  revenue: number;
  lastAudit: Date;
  complianceScore: number;
  issues: string[];
}

interface WasteStatistic {
  type: string;
  quantity: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

interface ZoneStatistic {
  name: string;
  agencies: number;
  clients: number;
  collections: number;
  coverage: number;
  incidents: number;
}

interface Incident {
  id: string;
  agencyId: string;
  agencyName: string;
  type: 'missed_collection' | 'compliance_issue' | 'complaint' | 'technical_issue';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  date: Date;
  status: 'open' | 'investigating' | 'resolved';
  assignedTo?: string;
}

interface Communication {
  id: string;
  type: 'notification' | 'directive' | 'alert';
  title: string;
  message: string;
  recipients: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentAt: Date;
  readBy: string[];
}

@Component({
  selector: 'app-municipality-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="municipality-dashboard">
      <div class="page-header">
        <div class="container">
          <div class="header-content">
            <div class="welcome-section">
              <h1 class="page-title">Tableau de Bord Municipal</h1>
              <p class="page-subtitle">Audit et contrôle des agences de collecte - {{ currentUser?.firstName }} {{ currentUser?.lastName }}</p>
            </div>
            <div class="quick-actions">
              <button class="btn btn-primary" (click)="showCommunicationModal = true">
                <i class="material-icons">campaign</i>
                Nouvelle Communication
              </button>
              <button class="btn btn-secondary" (click)="generateGlobalReport()">
                <i class="material-icons">assessment</i>
                Rapport Global
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
              <div class="stat-icon agencies">
                <i class="material-icons">business</i>
              </div>
              <div class="stat-info">
                <h3>Agences</h3>
                <p class="stat-value">{{ statistics.activeAgencies }}/{{ statistics.totalAgencies }}</p>
                <span class="stat-trend" [class.positive]="statistics.activeAgencies === statistics.totalAgencies">
                  {{ getAgencyStatusText() }}
                </span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon clients">
                <i class="material-icons">people</i>
              </div>
              <div class="stat-info">
                <h3>Clients totaux</h3>
                <p class="stat-value">{{ statistics.totalClients | number }}</p>
                <span class="stat-trend positive">+{{ getClientGrowth() }}% ce mois</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon collections">
                <i class="material-icons">local_shipping</i>
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
                <h3>Revenus totaux</h3>
                <p class="stat-value">{{ statistics.totalRevenue | number:'1.0-0' }}€</p>
                <span class="stat-trend positive">+12.3% vs mois dernier</span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon compliance">
                <i class="material-icons">verified</i>
              </div>
              <div class="stat-info">
                <h3>Conformité</h3>
                <p class="stat-value">{{ statistics.complianceRate }}%</p>
                <span class="stat-trend" [class.positive]="statistics.complianceRate >= 95" [class.negative]="statistics.complianceRate < 85">
                  {{ getComplianceText() }}
                </span>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon incidents">
                <i class="material-icons">report_problem</i>
              </div>
              <div class="stat-info">
                <h3>Incidents</h3>
                <p class="stat-value">{{ statistics.pendingReports }}</p>
                <span class="stat-trend" [class.negative]="statistics.pendingReports > 10">
                  {{ getIncidentSeverity() }}
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
            <!-- Onglet Vue d'ensemble -->
            <div *ngIf="activeTab === 'overview'" class="overview-tab">
              <div class="overview-grid">
                <div class="overview-section card">
                  <h3>
                    <i class="material-icons">trending_up</i>
                    Performance Globale
                  </h3>
                  <div class="performance-metrics">
                    <div class="metric-item">
                      <div class="metric-label">Taux de collecte</div>
                      <div class="metric-value">{{ getCollectionRate() }}%</div>
                      <div class="metric-bar">
                        <div class="metric-fill" [style.width]="getCollectionRate() + '%'"></div>
                      </div>
                    </div>
                    <div class="metric-item">
                      <div class="metric-label">Satisfaction client</div>
                      <div class="metric-value">{{ statistics.averageRating }}/5</div>
                      <div class="rating-stars">
                        <i *ngFor="let star of getStars(statistics.averageRating)" class="material-icons star">star</i>
                      </div>
                    </div>
                    <div class="metric-item">
                      <div class="metric-label">Conformité réglementaire</div>
                      <div class="metric-value">{{ statistics.complianceRate }}%</div>
                      <div class="metric-bar">
                        <div class="metric-fill compliance" [style.width]="statistics.complianceRate + '%'"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="overview-section card">
                  <h3>
                    <i class="material-icons">pie_chart</i>
                    Répartition des Déchets
                  </h3>
                  <div class="waste-chart">
                    <div *ngFor="let waste of wasteStatistics" class="waste-item">
                      <div class="waste-color" [style.background-color]="waste.color"></div>
                      <div class="waste-info">
                        <div class="waste-type">{{ waste.type }}</div>
                        <div class="waste-quantity">{{ waste.quantity }}t ({{ waste.percentage }}%)</div>
                      </div>
                      <div class="waste-trend">
                        <i class="material-icons" [class]="'trend-' + waste.trend">
                          {{ getTrendIcon(waste.trend) }}
                        </i>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="overview-section card">
                  <h3>
                    <i class="material-icons">map</i>
                    Couverture Territoriale
                  </h3>
                  <div class="territory-stats scrollable-container">
                    <div *ngFor="let zone of zoneStatistics" class="zone-item">
                      <div class="zone-header">
                        <h4>{{ zone.name }}</h4>
                        <span class="coverage-badge" [class]="getCoverageBadgeClass(zone.coverage)">
                          {{ zone.coverage }}% couvert
                        </span>
                      </div>
                      <div class="zone-metrics">
                        <div class="zone-metric">
                          <i class="material-icons">business</i>
                          <span>{{ zone.agencies }} agences</span>
                        </div>
                        <div class="zone-metric">
                          <i class="material-icons">people</i>
                          <span>{{ zone.clients }} clients</span>
                        </div>
                        <div class="zone-metric">
                          <i class="material-icons">local_shipping</i>
                          <span>{{ zone.collections }} collectes</span>
                        </div>
                        <div class="zone-metric" *ngIf="zone.incidents > 0">
                          <i class="material-icons">warning</i>
                          <span>{{ zone.incidents }} incidents</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="overview-section card">
                  <h3>
                    <i class="material-icons">notifications</i>
                    Alertes Récentes
                  </h3>
                  <div class="alerts-list">
                    <div *ngFor="let incident of getRecentIncidents()" class="alert-item">
                      <div class="alert-severity" [class]="'severity-' + incident.severity">
                        <i class="material-icons">{{ getSeverityIcon(incident.severity) }}</i>
                      </div>
                      <div class="alert-content">
                        <div class="alert-title">{{ getIncidentTypeText(incident.type) }}</div>
                        <div class="alert-agency">{{ incident.agencyName }}</div>
                        <div class="alert-time">{{ incident.date | date:'dd/MM HH:mm' }}</div>
                      </div>
                      <div class="alert-status">
                        <span class="status-badge" [class]="'status-' + incident.status">
                          {{ getIncidentStatusText(incident.status) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Audit des Agences -->
            <div *ngIf="activeTab === 'agencies'" class="agencies-tab">
              <div class="agencies-header">
                <h2>Audit des Agences</h2>
                <div class="agencies-filters">
                  <select [(ngModel)]="agenciesFilter" (change)="filterAgencies()" class="filter-select">
                    <option value="all">Toutes les agences</option>
                    <option value="active">Actives</option>
                    <option value="inactive">Inactives</option>
                    <option value="suspended">Suspendues</option>
                  </select>
                  <select [(ngModel)]="complianceFilter" (change)="filterAgencies()" class="filter-select">
                    <option value="all">Tous niveaux</option>
                    <option value="excellent">Excellent (95%+)</option>
                    <option value="good">Bon (85-94%)</option>
                    <option value="poor">Faible (<85%)</option>
                  </select>
                </div>
              </div>

              <div class="agencies-grid">
                <div *ngFor="let agency of filteredAgencies" class="agency-audit-card card">
                  <div class="agency-audit-header">
                    <div class="agency-basic-info">
                      <h4>{{ agency.name }}</h4>
                      <span class="status-badge" [class]="'status-' + agency.status">
                        {{ getAgencyStatusText(agency.status) }}
                      </span>
                    </div>
                    <div class="agency-compliance">
                      <div class="compliance-score" [class]="getComplianceClass(agency.complianceScore)">
                        {{ agency.complianceScore }}%
                      </div>
                      <div class="compliance-label">Conformité</div>
                    </div>
                  </div>

                  <div class="agency-metrics">
                    <div class="metric-row">
                      <div class="metric">
                        <i class="material-icons">people</i>
                        <span>{{ agency.clients }} clients</span>
                      </div>
                      <div class="metric">
                        <i class="material-icons">person</i>
                        <span>{{ agency.collectors }} collecteurs</span>
                      </div>
                      <div class="metric">
                        <i class="material-icons">map</i>
                        <span>{{ agency.zones }} zones</span>
                      </div>
                    </div>
                    <div class="metric-row">
                      <div class="metric">
                        <i class="material-icons">local_shipping</i>
                        <span>{{ agency.collectionsToday }} collectes</span>
                      </div>
                      <div class="metric">
                        <i class="material-icons">check_circle</i>
                        <span>{{ agency.completionRate }}% réalisées</span>
                      </div>
                      <div class="metric">
                        <i class="material-icons">star</i>
                        <span>{{ agency.rating }}/5</span>
                      </div>
                    </div>
                  </div>

                  <div class="agency-issues" *ngIf="agency.issues.length > 0">
                    <h5>Problèmes identifiés</h5>
                    <div class="issues-list">
                      <div *ngFor="let issue of agency.issues" class="issue-item">
                        <i class="material-icons">warning</i>
                        <span>{{ issue }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="agency-actions">
                    <button class="btn btn-secondary" (click)="viewAgencyDetails(agency.id)">
                      <i class="material-icons">visibility</i>
                      Détails
                    </button>
                    <button class="btn btn-primary" (click)="auditAgency(agency.id)">
                      <i class="material-icons">fact_check</i>
                      Auditer
                    </button>
                    <button class="btn btn-accent" (click)="contactAgency(agency.id)">
                      <i class="material-icons">message</i>
                      Contacter
                    </button>
                  </div>

                  <div class="agency-footer">
                    <span class="last-audit">Dernier audit: {{ agency.lastAudit | date:'dd/MM/yyyy' }}</span>
                    <span class="revenue">{{ agency.revenue | number:'1.0-0' }}€/mois</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Statistiques -->
            <div *ngIf="activeTab === 'statistics'" class="statistics-tab">
              <div class="statistics-header">
                <h2>Statistiques Consolidées</h2>
                <div class="statistics-filters">
                  <select [(ngModel)]="statisticsPeriod" (change)="updateStatistics()" class="filter-select">
                    <option value="today">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="quarter">Ce trimestre</option>
                    <option value="year">Cette année</option>
                  </select>
                  <button class="btn btn-secondary" (click)="exportStatistics()">
                    <i class="material-icons">download</i>
                    Exporter
                  </button>
                </div>
              </div>

              <div class="statistics-content">
                <div class="statistics-cards">
                  <div class="statistics-card card">
                    <h3>Collectes par Type de Déchets</h3>
                    <div class="chart-container">
                      <div class="chart-placeholder">
                        <i class="material-icons">donut_large</i>
                        <p>Graphique en secteurs des types de déchets</p>
                      </div>
                    </div>
                    <div class="chart-legend">
                      <div *ngFor="let waste of wasteStatistics" class="legend-item">
                        <div class="legend-color" [style.background-color]="waste.color"></div>
                        <span>{{ waste.type }}: {{ waste.quantity }}t</span>
                      </div>
                    </div>
                  </div>

                  <div class="statistics-card card">
                    <h3>Performance par Agence</h3>
                    <div class="performance-chart">
                      <div *ngFor="let agency of getTopPerformingAgencies()" class="performance-bar">
                        <div class="agency-name">{{ agency.name }}</div>
                        <div class="performance-bar-container">
                          <div class="performance-bar-fill" [style.width]="agency.completionRate + '%'"></div>
                        </div>
                        <div class="performance-value">{{ agency.completionRate }}%</div>
                      </div>
                    </div>
                  </div>

                  <div class="statistics-card card">
                    <h3>Évolution des Collectes</h3>
                    <div class="chart-container">
                      <div class="chart-placeholder">
                        <i class="material-icons">show_chart</i>
                        <p>Graphique linéaire de l'évolution des collectes</p>
                      </div>
                    </div>
                  </div>

                  <div class="statistics-card card">
                    <h3>Incidents par Catégorie</h3>
                    <div class="incidents-breakdown">
                      <div *ngFor="let incident of getIncidentBreakdown()" class="incident-category">
                        <div class="incident-header">
                          <span class="incident-type">{{ incident.type }}</span>
                          <span class="incident-count">{{ incident.count }}</span>
                        </div>
                        <div class="incident-bar">
                          <div class="incident-fill" [style.width]="incident.percentage + '%'"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Incidents -->
            <div *ngIf="activeTab === 'incidents'" class="incidents-tab">
              <div class="incidents-header">
                <h2>Gestion des Incidents</h2>
                <div class="incidents-filters">
                  <select [(ngModel)]="incidentsFilter" (change)="filterIncidents()" class="filter-select">
                    <option value="all">Tous les incidents</option>
                    <option value="open">Ouverts</option>
                    <option value="investigating">En cours</option>
                    <option value="resolved">Résolus</option>
                  </select>
                  <select [(ngModel)]="severityFilter" (change)="filterIncidents()" class="filter-select">
                    <option value="all">Toutes gravités</option>
                    <option value="critical">Critique</option>
                    <option value="high">Élevée</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Faible</option>
                  </select>
                </div>
              </div>

              <div class="incidents-list">
                <div *ngFor="let incident of filteredIncidents" class="incident-card card">
                  <div class="incident-header">
                    <div class="incident-severity" [class]="'severity-' + incident.severity">
                      <i class="material-icons">{{ getSeverityIcon(incident.severity) }}</i>
                      <span>{{ getSeverityText(incident.severity) }}</span>
                    </div>
                    <div class="incident-status">
                      <span class="status-badge" [class]="'status-' + incident.status">
                        {{ getIncidentStatusText(incident.status) }}
                      </span>
                    </div>
                  </div>

                  <div class="incident-content">
                    <h4>{{ getIncidentTypeText(incident.type) }}</h4>
                    <p class="incident-agency">Agence: {{ incident.agencyName }}</p>
                    <p class="incident-description">{{ incident.description }}</p>
                    <p class="incident-date">{{ incident.date | date:'dd/MM/yyyy HH:mm' }}</p>
                  </div>

                  <div class="incident-assignment" *ngIf="incident.assignedTo">
                    <i class="material-icons">person</i>
                    <span>Assigné à {{ incident.assignedTo }}</span>
                  </div>

                  <div class="incident-actions">
                    <button class="btn btn-secondary" (click)="assignIncident(incident.id)" 
                            *ngIf="incident.status === 'open'">
                      <i class="material-icons">assignment_ind</i>
                      Assigner
                    </button>
                    <button class="btn btn-primary" (click)="investigateIncident(incident.id)" 
                            *ngIf="incident.status === 'open'">
                      <i class="material-icons">search</i>
                      Enquêter
                    </button>
                    <button class="btn btn-success" (click)="resolveIncident(incident.id)" 
                            *ngIf="incident.status === 'investigating'">
                      <i class="material-icons">check</i>
                      Résoudre
                    </button>
                    <button class="btn btn-accent" (click)="contactAgencyForIncident(incident.agencyId)">
                      <i class="material-icons">phone</i>
                      Contacter Agence
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Onglet Communications -->
            <div *ngIf="activeTab === 'communications'" class="communications-tab">
              <div class="communications-header">
                <h2>Communications</h2>
                <div class="communications-actions">
                  <button class="btn btn-primary" (click)="showCommunicationModal = true">
                    <i class="material-icons">add</i>
                    Nouvelle Communication
                  </button>
                </div>
              </div>

              <div class="communications-list">
                <div *ngFor="let comm of communications" class="communication-card card">
                  <div class="communication-header">
                    <div class="communication-type">
                      <i class="material-icons">{{ getCommunicationIcon(comm.type) }}</i>
                      <span>{{ getCommunicationTypeText(comm.type) }}</span>
                    </div>
                    <div class="communication-priority" [class]="'priority-' + comm.priority">
                      {{ getPriorityText(comm.priority) }}
                    </div>
                  </div>

                  <div class="communication-content">
                    <h4>{{ comm.title }}</h4>
                    <p>{{ comm.message }}</p>
                    <div class="communication-meta">
                      <span>Envoyé le {{ comm.sentAt | date:'dd/MM/yyyy HH:mm' }}</span>
                      <span>{{ comm.recipients.length }} destinataire(s)</span>
                      <span>{{ comm.readBy.length }} lu(s)</span>
                    </div>
                  </div>

                  <div class="communication-recipients">
                    <h5>Destinataires</h5>
                    <div class="recipients-list">
                      <span *ngFor="let recipient of comm.recipients" class="recipient-tag">
                        {{ getAgencyName(recipient) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Communication -->
      <div class="modal-overlay" *ngIf="showCommunicationModal" (click)="showCommunicationModal = false">
        <div class="modal-content communication-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Nouvelle Communication</h3>
            <button class="close-btn" (click)="showCommunicationModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <form class="communication-form" (ngSubmit)="sendCommunication()">
            <div class="form-group">
              <label>Type de communication *</label>
              <select [(ngModel)]="newCommunication.type" name="type" required>
                <option value="">Sélectionner un type</option>
                <option value="notification">Notification</option>
                <option value="directive">Directive</option>
                <option value="alert">Alerte</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priorité *</label>
              <select [(ngModel)]="newCommunication.priority" name="priority" required>
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Élevée</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div class="form-group">
              <label>Titre *</label>
              <input type="text" [(ngModel)]="newCommunication.title" name="title" 
                     placeholder="Titre de la communication" required>
            </div>
            <div class="form-group">
              <label>Message *</label>
              <textarea [(ngModel)]="newCommunication.message" name="message" 
                        rows="4" placeholder="Contenu du message..." required></textarea>
            </div>
            <div class="form-group">
              <label>Destinataires *</label>
              <div class="recipients-checkboxes">
                <label class="checkbox-label">
                  <input type="checkbox" (change)="toggleAllAgencies($event)">
                  <span class="checkmark"></span>
                  Toutes les agences
                </label>
                <label *ngFor="let agency of agencyAudits" class="checkbox-label">
                  <input type="checkbox" [value]="agency.id" 
                         (change)="toggleRecipient(agency.id, $event)">
                  <span class="checkmark"></span>
                  {{ agency.name }}
                </label>
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="showCommunicationModal = false">
                Annuler
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">send</i>
                Envoyer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .municipality-dashboard {
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
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

    .stat-icon.agencies { background: var(--primary-color); }
    .stat-icon.clients { background: var(--secondary-color); }
    .stat-icon.collections { background: var(--success-color); }
    .stat-icon.revenue { background: var(--accent-color); }
    .stat-icon.compliance { background: var(--warning-color); }
    .stat-icon.incidents { background: var(--error-color); }

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

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .overview-section {
      padding: 24px;
    }

    .overview-section h3 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text-primary);
    }

    .performance-metrics {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .metric-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .metric-label {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .metric-bar {
      height: 8px;
      background: var(--medium-gray);
      border-radius: 4px;
      overflow: hidden;
    }

    .metric-fill {
      height: 100%;
      background: var(--primary-color);
      transition: width 0.3s ease;
    }

    .metric-fill.compliance {
      background: var(--success-color);
    }

    .rating-stars {
      display: flex;
      gap: 2px;
    }

    .star {
      font-size: 16px;
      color: var(--warning-color);
    }

    .waste-chart {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .waste-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .waste-color {
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }

    .waste-info {
      flex: 1;
    }

    .waste-type {
      font-weight: 600;
      color: var(--text-primary);
    }

    .waste-quantity {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .waste-trend i {
      font-size: 18px;
    }

    .trend-up { color: var(--success-color); }
    .trend-down { color: var(--error-color); }
    .trend-stable { color: var(--text-secondary); }

    .territory-stats {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .zone-item {
      padding: 16px;
      background: var(--light-gray);
      border-radius: 8px;
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

.scrollable-container {
  max-height: 430px; 
  overflow-y: auto;
  padding-right: 10px;
}

.zone-item {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.zone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}


    .coverage-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .coverage-excellent { background: #e8f5e8; color: var(--success-color); }
    .coverage-good { background: #fff3e0; color: #f57c00; }
    .coverage-poor { background: #ffebee; color: var(--error-color); }

    .zone-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .zone-metric {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .zone-metric i {
      font-size: 16px;
      color: var(--primary-color);
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
      max-height: 280px;
      overflow-y: auto;
      max-height: 280px;
      overflow-y: auto;
      max-height: 300px;
      overflow-y: auto;
      max-height: 300px;
      overflow-y: auto;
    }

    .alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--light-gray);
      border-radius: 8px;
    }

    .alert-severity {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
    }

    .severity-critical { background: var(--error-color); }
    .severity-high { background: #ff7043; }
    .severity-medium { background: var(--warning-color); color: var(--text-primary); }
    .severity-low { background: var(--text-secondary); }

    .alert-content {
      flex: 1;
    }

    .alert-title {
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .alert-agency {
      font-size: 0.9rem;
      color: var(--text-secondary);
      margin-bottom: 2px;
    }

    .alert-time {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .alert-status {
      text-align: right;
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-active { background: #e8f5e8; color: var(--success-color); }
    .status-inactive { background: #f5f5f5; color: var(--text-secondary); }
    .status-suspended { background: #fff3e0; color: #f57c00; }
    .status-open { background: #ffebee; color: var(--error-color); }
    .status-investigating { background: #fff3e0; color: #f57c00; }
    .status-resolved { background: #e8f5e8; color: var(--success-color); }

    .agencies-header,
    .statistics-header,
    .incidents-header,
    .communications-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--medium-gray);
    }

    .agencies-filters,
    .statistics-filters,
    .incidents-filters {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .filter-select {
      padding: 8px 12px;
      border: 2px solid var(--medium-gray);
      border-radius: 6px;
      font-size: 0.9rem;
      transition: border-color 0.3s ease;
    }

    .filter-select:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .agencies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 24px;
    }

    .agency-audit-card {
      padding: 24px;
      border-left: 4px solid var(--primary-color);
    }

    .agency-audit-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .agency-basic-info h4 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .agency-compliance {
      text-align: center;
    }

    .compliance-score {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .compliance-score.excellent { color: var(--success-color); }
    .compliance-score.good { color: #f57c00; }
    .compliance-score.poor { color: var(--error-color); }

    .compliance-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .agency-metrics {
      margin-bottom: 16px;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .metric {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .metric i {
      font-size: 16px;
      color: var(--primary-color);
    }

    .agency-issues {
      margin-bottom: 16px;
      padding: 12px;
      background: #ffebee;
      border-radius: 6px;
    }

    .agency-issues h5 {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--error-color);
    }

    .issues-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .issue-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--error-color);
    }

    .issue-item i {
      font-size: 14px;
    }

    .agency-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .agency-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--medium-gray);
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .revenue {
      font-weight: 600;
      color: var(--primary-color);
    }

    .statistics-content {
      margin-top: 24px;
    }

    .statistics-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }

    .statistics-card {
      padding: 24px;
    }

    .statistics-card h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--text-primary);
    }

    .chart-container {
      height: 250px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--light-gray);
      border-radius: 8px;
      margin-bottom: 16px;
      margin: 16px 0;
    }

    .chart-placeholder {
      text-align: center;
      color: var(--text-secondary);
    }

    .chart-placeholder i {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .chart-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .performance-chart {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .performance-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .agency-name {
      min-width: 120px;
      font-size: 0.9rem;
      color: var(--text-primary);
    }

    .performance-bar-container {
      flex: 1;
      height: 20px;
      background: var(--medium-gray);
      border-radius: 10px;
      overflow: hidden;
    }

    .performance-bar-fill {
      height: 100%;
      background: var(--success-color);
      transition: width 0.3s ease;
    }

    .performance-value {
      min-width: 40px;
      text-align: right;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .incidents-breakdown {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .incident-category {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .incident-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .incident-type {
      font-weight: 600;
      color: var(--text-primary);
    }

    .incident-count {
      font-weight: 600;
      color: var(--error-color);
    }

    .incident-bar {
      height: 8px;
      background: var(--medium-gray);
      border-radius: 4px;
      overflow: hidden;
    }

    .incident-fill {
      height: 100%;
      background: var(--error-color);
      transition: width 0.3s ease;
    }
    .incidents-list {
      display: grid;
      grid-template-columns: repeat(2,1fr);
      gap: 16px;
      max-height: 600px;
      overflow-y: auto;
    }

    .incident-card {
      padding: 20px;
      border-left: 4px solid var(--error-color);
    }

    .incident-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .incident-severity {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .incident-content h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .incident-agency,
    .incident-description,
    .incident-date {
      margin: 4px 0;
      color: var(--text-secondary);
    }

    .incident-assignment {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0;
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .incident-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .communications-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 500px;
      overflow-y: auto;
    }

    .communication-card {
      padding: 20px;
      border-left: 4px solid var(--primary-color);
    }

    .communication-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .communication-type {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .communication-priority {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .priority-low { background: #f5f5f5; color: var(--text-secondary); }
    .priority-medium { background: #fff3e0; color: #f57c00; }
    .priority-high { background: #ffebee; color: var(--error-color); }
    .priority-urgent { background: var(--error-color); color: var(--white); }

    .communication-content h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .communication-content p {
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 12px;
    }

    .communication-meta {
      display: flex;
      gap: 16px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .communication-recipients {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--medium-gray);
    }

    .communication-recipients h5 {
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .recipients-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .recipient-tag {
      padding: 4px 8px;
      background: var(--light-gray);
      border-radius: 12px;
      font-size: 0.8rem;
      color: var(--text-primary);
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
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .communication-modal {
      max-width: 700px;
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

    .communication-form {
      display: flex;
      flex-direction: column;
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

    .recipients-checkboxes {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 200px;
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

    /* Améliorations responsive */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .agencies-grid {
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      }

      .statistics-cards {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }
    }

    @media (max-width: 1024px) {
      .header-content {
        flex-direction: column;
        text-align: center;
        gap: 16px;
      }

      .quick-actions {
        flex-wrap: wrap;
        justify-content: center;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .overview-grid,
      .agencies-grid,
      .statistics-cards {
        grid-template-columns: 1fr;
      }

      .statistics-cards {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }

      .tabs-navigation {
        overflow-x: auto;
        padding: 8px;
      }

      .tab-btn {
        min-width: 120px;
        padding: 10px 16px;
      }

      .chart-placeholder {
        height: 200px;
      }
    }

    @media (max-width: 768px) {
      .container {
        padding: 0 16px;
      }

      .page-header {
        padding: 30px 0;
      }

      .page-title {
        font-size: 1.8rem;
      }

      .stats-grid {
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .stat-card {
        padding: 16px;
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
      }

      .stat-value {
        font-size: 1.5rem;
      }

      .agencies-grid {
        grid-template-columns: 1fr;
      }

      .agency-card {
        padding: 16px;
      }

      .agency-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .agency-actions {
        width: 100%;
        justify-content: space-between;
      }

      .statistics-cards {
        grid-template-columns: 1fr;
      }

      .statistics-card {
        padding: 16px;
      }

      .agencies-filters,
      .statistics-filters,
      .incidents-filters {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .filter-select,
      .search-input {
        width: 100%;
      }

      .incidents-list,
      .communications-list {
        max-height: 400px;
      }

      .incident-card,
      .communication-card {
        padding: 16px;
      }

      .incident-header,
      .communication-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .incident-actions,
      .communication-actions {
        width: 100%;
        justify-content: space-between;
      }

      .modal-content {
        margin: 20px;
        width: calc(100% - 40px);
        padding: 20px;
      }

      .communication-modal {
        max-width: none;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
        gap: 8px;
      }

      .btn {
        width: 100%;
        justify-content: center;
      }

      .chart-placeholder {
        height: 150px;
      }

      .performance-item,
      .waste-item,
      .zone-item,
      .alert-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .performance-score,
      .waste-percentage,
      .zone-coverage-bar {
        width: 100%;
      }

      .tabs-navigation {
        flex-wrap: wrap;
        justify-content: center;
      }

      .tab-btn {
        flex: 1;
        min-width: 100px;
        padding: 8px 12px;
        font-size: 0.9rem;
      }

      .tab-btn i {
        font-size: 18px;
      }
    }

    @media (max-width: 480px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .stat-card {
        padding: 12px;
      }

      .page-title {
        font-size: 1.5rem;
      }

      .page-subtitle {
        font-size: 0.9rem;
      }

      .quick-actions {
        flex-direction: column;
        width: 100%;
      }

      .btn {
        padding: 12px 16px;
        font-size: 0.9rem;
      }

      .tab-content {
        padding: 16px;
      }

      .modal-content {
        margin: 10px;
        width: calc(100% - 20px);
        padding: 16px;
      }

      .incidents-list,
      .communications-list,
      .performance-list,
      .waste-distribution,
      .zone-coverage,
      .recent-alerts {
        max-height: 300px;
      }

      .chart-placeholder {
        height: 120px;
      }

      .chart-placeholder i {
        font-size: 32px;
      }

      .tabs-navigation {
        padding: 4px;
      }

      .tab-btn {
        padding: 6px 8px;
        font-size: 0.8rem;
        min-width: 80px;
      }

      .tab-btn span {
        display: none;
      }

      .tab-btn i {
        margin-right: 0;
      }
      .metric-row {
        flex-direction: column;
        gap: 8px;
      }

      .zone-metrics {
        flex-direction: column;
        gap: 8px;
      }
    }

    @media (max-width: 768px) {
      .incidents-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 600px;
        overflow-y: auto;
      }
    }
  `]
})
export class MunicipalityDashboardComponent implements OnInit {
  currentUser: User | null = null;
  activeTab = 'overview';

  // Data
  statistics: MunicipalityStatistics = {
    totalAgencies: 15,
    activeAgencies: 14,
    totalClients: 12500,
    totalCollectors: 85,
    todayCollections: 450,
    completedCollections: 425,
    totalRevenue: 485000,
    averageRating: 4.2,
    pendingReports: 8,
    complianceRate: 92
  };

  agencyAudits: AgencyAudit[] = [];
  filteredAgencies: AgencyAudit[] = [];
  wasteStatistics: WasteStatistic[] = [];
  zoneStatistics: ZoneStatistic[] = [];
  incidents: Incident[] = [];
  filteredIncidents: Incident[] = [];
  communications: Communication[] = [];

  // Filters
  agenciesFilter = 'all';
  complianceFilter = 'all';
  statisticsPeriod = 'month';
  incidentsFilter = 'all';
  severityFilter = 'all';

  // Modals
  showCommunicationModal = false;

  // Forms
  newCommunication: any = {
    type: '',
    priority: 'medium',
    title: '',
    message: '',
    recipients: []
  };

  tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: 'dashboard', badge: null },
    { id: 'agencies', label: 'Audit Agences', icon: 'business', badge: null },
    { id: 'statistics', label: 'Statistiques', icon: 'analytics', badge: null },
    { id: 'incidents', label: 'Incidents', icon: 'report_problem', badge: 8 },
    { id: 'communications', label: 'Communications', icon: 'campaign', badge: null }
  ];


  constructor(
    private authService: AuthService,
    private agencyService: AgencyService,
    private collectionService: CollectionService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMunicipalityData()
    this.loadZoneStatistics();

  }


  loadMunicipalityData(): void {
    this.loadAgencyAudits();
    this.loadWasteStatistics();
    this.loadZoneStatistics();
    this.loadIncidents();
    // this.loadCommunications();
  }

  loadAgencyAudits(): void {
    this.agencyService.getAllAgenciesFromApi().subscribe({
      next: (agencies) => {
        this.agencyAudits = agencies.data.map((agency) => ({
          id: agency?._id,
          name: agency?.agencyName,
          status: agency?.isActive ? "active" : "inactive",
          clients: agency?.clients?.length || 0,
          collectors: agency?.employees?.length || 0,
          zones: 0,
          userId: agency?.userId,
          collectionsToday: 0,
          completionRate: 0,
          rating: 0,
          revenue: 0,
          lastAudit: new Date(),
          complianceScore: 0,
          issues: []
        }));
        this.filteredAgencies = [...this.agencyAudits];
        console.log(' this.agencyAudits', this.agencyAudits);
        console.log(' this.agencies', agencies);
      }

    });

    //   this.agencyAudits = [
    //     {
    //       id: '1',
    //       name: 'EcoClean Services',
    //       status: 'active',
    //       clients: 1250,
    //       collectors: 8,
    //       zones: 3,
    //       collectionsToday: 45,
    //       completionRate: 96,
    //       rating: 4.5,
    //       revenue: 32450,
    //       lastAudit: new Date('2024-01-10'),
    //       complianceScore: 95,
    //       issues: []
    //     },
    //     {
    //       id: '2',
    //       name: 'GreenWaste Solutions',
    //       status: 'active',
    //       clients: 850,
    //       collectors: 6,
    //       zones: 2,
    //       collectionsToday: 32,
    //       completionRate: 88,
    //       rating: 4.2,
    //       revenue: 22100,
    //       lastAudit: new Date('2024-01-08'),
    //       complianceScore: 82,
    //       issues: ['Retards fréquents', 'Signalements clients']
    //     },
    //     {
    //       id: '3',
    //       name: 'WasteManager Pro',
    //       status: 'suspended',
    //       clients: 450,
    //       collectors: 3,
    //       zones: 1,
    //       collectionsToday: 0,
    //       completionRate: 0,
    //       rating: 3.8,
    //       revenue: 0,
    //       lastAudit: new Date('2024-01-05'),
    //       complianceScore: 65,
    //       issues: ['Non-conformité réglementaire', 'Licence expirée']
    //     }
    //   ];
   
  }

  loadWasteStatistics(): void {
    this.wasteStatistics = [
      { type: 'Déchets ménagers', quantity: 1250, percentage: 45, trend: 'stable', color: '#4caf50' },
      { type: 'Recyclables', quantity: 850, percentage: 30, trend: 'up', color: '#2196f3' },
      { type: 'Organiques', quantity: 425, percentage: 15, trend: 'up', color: '#8bc34a' },
      { type: 'Verre', quantity: 280, percentage: 10, trend: 'stable', color: '#00bcd4' }
    ];
  }

  loadZoneStatistics(): void {
    const stats = this.agencyService.getAgenceStats();
    this.zoneStatistics = OUAGA_DATA.map((zone, index) => ({
      name: zone.arrondissement,
      agencies: stats[index]?.agencies || 0,
      clients: stats[index]?.clients || 0,
      collections: stats[index]?.collections || 0,
      coverage: stats[index]?.coverage || 0,
      incidents: stats[index]?.incidents || 0
    }));
  }


  loadIncidents(): void {
    this.incidents = [
      {
        id: '1',
        agencyId: '2',
        agencyName: 'GreenWaste Solutions',
        type: 'missed_collection',
        description: 'Collecte manquée dans le secteur Nord',
        severity: 'medium',
        date: new Date(),
        status: 'open'
      },
      {
        id: '2',
        agencyId: '3',
        agencyName: 'WasteManager Pro',
        type: 'compliance_issue',
        description: 'Non-respect des horaires réglementaires',
        severity: 'high',
        date: new Date(Date.now() - 86400000),
        status: 'investigating',
        assignedTo: 'Inspecteur Martin'
      }
    ];
    this.filteredIncidents = [...this.incidents];
  }

  // loadCommunications(): void {
  //   this.communications = [
  //     {
  //       id: '1',
  //       type: 'directive',
  //       title: 'Nouvelle réglementation tri sélectif',
  //       message: 'Application des nouvelles consignes de tri à partir du 1er février',
  //       recipients: ['1', '2'],
  //       priority: 'high',
  //       sentAt: new Date(Date.now() - 3600000),
  //       readBy: ['1']
  //     }
  //   ];
  // }

  // Utility methods
  getAgencyStatusText(status?: string): string {
    if (!status) {
      return `${this.statistics.activeAgencies} actives`;
    }
    const statusTexts = {
      'active': 'Active',
      'inactive': 'Inactive',
      'suspended': 'Suspendue'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getClientGrowth(): number {
    return Math.floor(Math.random() * 10) + 5;
  }

  getCollectionRate(): number {
    return Math.round((this.statistics.completedCollections / this.statistics.todayCollections) * 100);
  }

  getComplianceText(): string {
    if (this.statistics.complianceRate >= 95) return 'Excellent';
    if (this.statistics.complianceRate >= 85) return 'Bon';
    return 'À améliorer';
  }

  getIncidentSeverity(): string {
    if (this.statistics.pendingReports <= 5) return 'Faible';
    if (this.statistics.pendingReports <= 10) return 'Modéré';
    return 'Élevé';
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  getTrendIcon(trend: string): string {
    const icons = {
      'up': 'trending_up',
      'down': 'trending_down',
      'stable': 'trending_flat'
    };
    return icons[trend as keyof typeof icons] || 'trending_flat';
  }

  getCoverageBadgeClass(coverage: number): string {
    if (coverage >= 95) return 'coverage-excellent';
    if (coverage >= 85) return 'coverage-good';
    return 'coverage-poor';
  }

  getRecentIncidents(): Incident[] {
    return this.incidents.slice(0, 5);
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
      'technical_issue': 'Problème technique'
    };
    return types[type as keyof typeof types] || type;
  }

  getIncidentStatusText(status: string): string {
    const statuses = {
      'open': 'Ouvert',
      'investigating': 'En cours',
      'resolved': 'Résolu'
    };
    return statuses[status as keyof typeof statuses] || status;
  }

  getComplianceClass(score: number): string {
    if (score >= 95) return 'excellent';
    if (score >= 85) return 'good';
    return 'poor';
  }

  getTopPerformingAgencies(): any[] {
    return this.agencyAudits
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5)
      .map(agency => ({
        name: agency.name,
        completionRate: agency.completionRate
      }));
  }

  getIncidentBreakdown(): any[] {
    const breakdown = [
      { type: 'Collectes manquées', count: 5, percentage: 62 },
      { type: 'Non-conformité', count: 2, percentage: 25 },
      { type: 'Réclamations', count: 1, percentage: 13 }
    ];
    return breakdown;
  }

  getCommunicationIcon(type: string): string {
    const icons = {
      'notification': 'notifications',
      'directive': 'assignment',
      'alert': 'warning'
    };
    return icons[type as keyof typeof icons] || 'message';
  }

  getCommunicationTypeText(type: string): string {
    const types = {
      'notification': 'Notification',
      'directive': 'Directive',
      'alert': 'Alerte'
    };
    return types[type as keyof typeof types] || type;
  }

  getPriorityText(priority: string): string {
    const priorities = {
      'low': 'Faible',
      'medium': 'Moyenne',
      'high': 'Élevée',
      'urgent': 'Urgente'
    };
    return priorities[priority as keyof typeof priorities] || priority;
  }

  getAgencyName(agencyId: string): string {
    const agency = this.agencyAudits.find(a => a.id === agencyId);
    return agency ? agency.name : 'Agence inconnue';
  }

  // Filter methods
  filterAgencies(): void {
    this.filteredAgencies = this.agencyAudits.filter(agency => {
      const statusMatch = this.agenciesFilter === 'all' || agency.status === this.agenciesFilter;
      let complianceMatch = true;

      if (this.complianceFilter === 'excellent') {
        complianceMatch = agency.complianceScore >= 95;
      } else if (this.complianceFilter === 'good') {
        complianceMatch = agency.complianceScore >= 85 && agency.complianceScore < 95;
      } else if (this.complianceFilter === 'poor') {
        complianceMatch = agency.complianceScore < 85;
      }

      return statusMatch && complianceMatch;
    });
  }

  filterIncidents(): void {
    this.filteredIncidents = this.incidents.filter(incident => {
      const statusMatch = this.incidentsFilter === 'all' || incident.status === this.incidentsFilter;
      const severityMatch = this.severityFilter === 'all' || incident.severity === this.severityFilter;
      return statusMatch && severityMatch;
    });
  }

  // Action methods
  generateGlobalReport(): void {
    this.notificationService.showInfo('Rapport', 'Génération du rapport global en cours...');
  }

  viewAgencyDetails(agencyId: string): void {
    this.notificationService.showInfo('Détails', 'Ouverture des détails de l\'agence');
    this.router.navigate(['/agencies', agencyId]);
  }

  auditAgency(agencyId: string): void {
    this.notificationService.showInfo('Audit', 'Lancement de l\'audit de l\'agence');
  }

  contactAgency(agencyId: string): void {
    this.notificationService.showInfo('Contact', 'Ouverture des informations de contact');
  }

  updateStatistics(): void {
    this.notificationService.showInfo('Mise à jour', 'Actualisation des statistiques');
  }

  exportStatistics(): void {
    this.notificationService.showInfo('Export', 'Génération du fichier d\'export...');
  }

  assignIncident(incidentId: string): void {
    this.notificationService.showInfo('Attribution', 'Ouverture du formulaire d\'attribution');
  }

  investigateIncident(incidentId: string): void {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.status = 'investigating';
      incident.assignedTo = 'Inspecteur Municipal';
      this.filterIncidents();
      this.notificationService.showSuccess('Enquête', 'Incident pris en charge pour enquête');
    }
  }

  resolveIncident(incidentId: string): void {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.status = 'resolved';
      this.filterIncidents();
      this.statistics.pendingReports--;
      this.notificationService.showSuccess('Résolu', 'Incident marqué comme résolu');
    }
  }

  contactAgencyForIncident(agencyId: string): void {
    this.contactAgency(agencyId);
  }

  // Communication methods
  toggleAllAgencies(event: any): void {
    if (event.target.checked) {
      this.newCommunication.recipients = this.agencyAudits.map(a => a.id);
    } else {
      this.newCommunication.recipients = [];
    }
  }

  toggleRecipient(agencyId: string, event: any): void {
    if (event.target.checked) {
      this.newCommunication.recipients.push(agencyId);
    } else {
      this.newCommunication.recipients = this.newCommunication.recipients.filter((id: string) => id !== agencyId);
    }
  }

  sendCommunication(): void {
    if (this.newCommunication.type && this.newCommunication.title &&
      this.newCommunication.message && this.newCommunication.recipients.length > 0) {

      const communication: Communication = {
        id: Math.random().toString(36).substr(2, 9),
        type: this.newCommunication.type,
        title: this.newCommunication.title,
        message: this.newCommunication.message,
        recipients: [...this.newCommunication.recipients],
        priority: this.newCommunication.priority,
        sentAt: new Date(),
        readBy: []
      };

      this.communications.unshift(communication);
      this.showCommunicationModal = false;
      this.newCommunication = { type: '', priority: 'medium', title: '', message: '', recipients: [] };
      this.notificationService.showSuccess('Envoyé', 'Communication envoyée avec succès');
    }
  }
}