import { Component, OnInit } from "@angular/core";
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
import { User } from "../../../models/user.model";
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
  selector: "app-collector-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ZXingScannerModule],
  template: `
    <div class="collector-dashboard">
      <div class="page-header">
        <div class="container">
          <div class="header-content">
            <div class="welcome-section">
              <h1 class="page-title">Interface Collecteur</h1>
              <p class="page-subtitle">
                {{ currentUser?.firstName }}, votre tournée du
                {{ today | date : "dd MMMM yyyy" }}
              </p>
            </div>
            <div class="quick-actions">
              <button
                class="btn btn-primary"
                (click)="startRoute()"
                [disabled]="routeStarted"
              >
                <i class="material-icons">play_arrow</i>
                {{ routeStarted ? "Tournée en cours" : "Démarrer la tournée" }}
              </button>
              <button
                class="btn btn-secondary"
                (click)="showIncidentModal = true"
              >
                <i class="material-icons">report_problem</i>
                Signaler un incident
              </button>
              <button
                class="btn btn-secondary qr-btn"
                (click)="showQrScanner = !showQrScanner"
              >
                <i class="material-icons">qr_code</i>
                Scanner QR
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="dashboard-content">
          <!-- Statistiques de la tournée -->
          <div class="stats-grid">
            <div class="stat-card card">
              <div class="stat-icon progress">
                <i class="material-icons">assignment</i>
              </div>
              <div class="stat-info">
                <h3>Progression</h3>
                <p class="stat-value">
                  {{ completedCollections }} / {{ totalCollections }}
                </p>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    [style.width.%]="getProgressPercentage()"
                  ></div>
                </div>
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon time">
                <i class="material-icons">schedule</i>
              </div>
              <div class="stat-info">
                <h3>Temps restant</h3>
                <p class="stat-value">{{ getRemainingTime() }}</p>
                <span class="stat-detail"
                  >Fin prévue: {{ getEstimatedEndTime() }}</span
                >
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon distance">
                <i class="material-icons">directions</i>
              </div>
              <div class="stat-info">
                <h3>Distance parcourue</h3>
                <p class="stat-value">
                  {{ routeOptimization.totalDistance }} km
                </p>
                <span class="stat-detail"
                  >{{ getRemainingDistance() }} km restants</span
                >
              </div>
            </div>

            <div class="stat-card card">
              <div class="stat-icon incidents">
                <i class="material-icons">warning</i>
              </div>
              <div class="stat-info">
                <h3>Incidents</h3>
                <p class="stat-value">{{ todayIncidents.length }}</p>
                <span class="stat-detail"
                  >{{ getOpenIncidents() }} en cours</span
                >
              </div>
            </div>
          </div>

          <!-- Contenu principal -->
          <div class="main-content">
            <div class="left-column">
              <!-- Planning de collecte -->
              <section class="collection-schedule card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">event</i>
                    Planning de collecte
                  </h2>
                  <div class="schedule-controls">
                    <select
                      [(ngModel)]="selectedView"
                      (change)="updateView()"
                      class="view-select"
                    >
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                    </select>
                    <button
                      class="btn btn-secondary btn-small"
                      (click)="optimizeRoute()"
                    >
                      <i class="material-icons">route</i>
                      Optimiser
                    </button>
                  </div>
                </div>

                <div class="schedule-timeline">
                  <div
                    *ngFor="let point of collectionPoints; let i = index"
                    class="timeline-item"
                    [class.current]="currentCollectionIndex === i"
                    [class.completed]="point.status === 'completed'"
                    [class.urgent]="point.priority === 'urgent'"
                  >
                    <div class="timeline-marker">
                      <div class="marker-icon">
                        <i
                          class="material-icons"
                          *ngIf="point.status === 'completed'"
                          >check_circle</i
                        >
                        <i
                          class="material-icons"
                          *ngIf="point.status === 'in_progress'"
                          >radio_button_checked</i
                        >
                        <i
                          class="material-icons"
                          *ngIf="point.status === 'scheduled'"
                          >radio_button_unchecked</i
                        >
                      </div>
                      <div class="marker-time">
                        {{ point.scheduledTime | date : "HH:mm" }}
                      </div>
                    </div>

                    <div class="timeline-content">
                      <div class="collection-header">
                        <h4>{{ point.clientName }}</h4>
                        <div class="collection-badges">
                          <span
                            class="priority-badge"
                            [class]="'priority-' + point.priority"
                          >
                            {{
                              point.priority === "urgent" ? "Urgent" : "Normal"
                            }}
                          </span>
                          <span class="duration-badge"
                            >{{ point.estimatedDuration }}min</span
                          >
                        </div>
                      </div>

                      <div class="collection-details">
                        <div class="address-info">
                          <i class="material-icons">location_on</i>
                          <span>{{ point.address }}</span>
                          <span class="door-info" *ngIf="point.doorColor">
                            (Porte {{ point.doorColor }})
                          </span>
                        </div>

                        <div class="waste-types">
                          <span
                            *ngFor="let type of point.wasteTypes"
                            class="waste-tag"
                          >
                            {{ type }}
                          </span>
                        </div>
                      </div>

                      <div
                        class="collection-actions"
                        *ngIf="point.status !== 'completed'"
                      >
                        <button
                          class="action-btn navigate"
                          (click)="navigateToPoint(point.id)"
                        >
                          <i class="material-icons">directions</i>
                          Navigation
                        </button>
                        <button
                          class="action-btn collect"
                          (click)="confirmCollection(point.id)"
                          [disabled]="point.status === 'in_progress'"
                        >
                          <i class="material-icons">check</i>
                          {{
                            point.status === "in_progress"
                              ? "En cours..."
                              : "Confirmer"
                          }}
                        </button>
                      </div>

                      <div class="collection-notes" *ngIf="point.notes">
                        <i class="material-icons">note</i>
                        <span>{{ point.notes }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Navigation et itinéraire -->
              <section class="navigation-section card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">navigation</i>
                    Navigation
                  </h2>
                  <button
                    class="btn btn-secondary btn-small"
                    (click)="recalculateRoute()"
                  >
                    <i class="material-icons">refresh</i>
                    Recalculer
                  </button>
                </div>

                <div class="navigation-content">
                  <div class="current-destination" *ngIf="currentDestination">
                    <h3>Prochaine destination</h3>
                    <div class="destination-info">
                      <div class="destination-address">
                        <i class="material-icons">place</i>
                        <span>{{ currentDestination.address }}</span>
                      </div>
                      <div class="destination-distance">
                        <i class="material-icons">directions_walk</i>
                        <span
                          >{{ currentDestination.distance }} km -
                          {{ currentDestination.estimatedDuration }} min</span
                        >
                      </div>
                    </div>
                    <button
                      class="btn btn-primary btn-full"
                      (click)="openMapsNavigation()"
                    >
                      <i class="material-icons">map</i>
                      Ouvrir dans Maps
                    </button>
                  </div>

                  <div class="route-summary">
                    <h4>Résumé de l'itinéraire</h4>
                    <div class="route-stats">
                      <div class="route-stat">
                        <span class="stat-label">Distance totale:</span>
                        <span class="stat-value"
                          >{{ routeOptimization.totalDistance }} km</span
                        >
                      </div>
                      <div class="route-stat">
                        <span class="stat-label">Durée estimée:</span>
                        <span class="stat-value"
                          >{{ routeOptimization.estimatedDuration }} min</span
                        >
                      </div>
                      <div class="route-stat">
                        <span class="stat-label">Points restants:</span>
                        <span class="stat-value">{{
                          getRemainingPoints()
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div class="right-column">
              <!-- Confirmation de collecte -->
              <section class="collection-confirmation card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">fact_check</i>
                    Confirmation de collecte
                  </h2>
                </div>

                <div class="confirmation-form" *ngIf="currentCollection">
                  <div class="collection-info">
                    <h3>{{ currentCollection.clientName }}</h3>
                    <p>{{ currentCollection.address }}</p>
                  </div>

                  <div class="form-group">
                    <label>Notes (optionnel)</label>
                    <textarea
                      [(ngModel)]="collectionNotes"
                      placeholder="Observations, remarques..."
                      rows="3"
                    ></textarea>
                  </div>

                  <div class="form-group">
                    <label>Photos (optionnel)</label>
                    <div class="photo-upload">
                      <input
                        type="file"
                        #photoInput
                        multiple
                        accept="image/*"
                        (change)="onPhotosSelected($event)"
                        style="display: none;"
                      />
                      <button class="upload-btn" (click)="photoInput.click()">
                        <i class="material-icons">camera_alt</i>
                        Ajouter des photos
                      </button>
                      <div
                        class="photo-preview"
                        *ngIf="selectedPhotos.length > 0"
                      >
                        <div
                          *ngFor="let photo of selectedPhotos"
                          class="photo-item"
                        >
                          <img [src]="photo.preview" alt="Photo" />
                          <button
                            class="remove-photo"
                            (click)="removePhoto(photo)"
                          >
                            <i class="material-icons">close</i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="geolocation-info">
                    <div
                      class="location-status"
                      [class.active]="locationEnabled"
                    >
                      <i class="material-icons">{{
                        locationEnabled ? "location_on" : "location_off"
                      }}</i>
                      <span>{{
                        locationEnabled
                          ? "Géolocalisation activée"
                          : "Géolocalisation désactivée"
                      }}</span>
                    </div>
                    <button
                      class="btn btn-secondary btn-small"
                      (click)="enableLocation()"
                      *ngIf="!locationEnabled"
                    >
                      Activer la géolocalisation
                    </button>
                  </div>

                  <div class="confirmation-actions">
                    <button
                      class="btn btn-success btn-full"
                      (click)="confirmCurrentCollection()"
                    >
                      <i class="material-icons">check_circle</i>
                      Confirmer la collecte
                    </button>
                  </div>
                </div>

                <div class="no-current-collection" *ngIf="!currentCollection">
                  <i class="material-icons">assignment_turned_in</i>
                  <p>Sélectionnez une collecte dans le planning</p>
                </div>
              </section>

              <!-- Incidents du jour -->
              <section class="incidents-section card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">report_problem</i>
                    Incidents du jour
                  </h2>
                  <button
                    class="btn btn-secondary btn-small"
                    (click)="showIncidentModal = true"
                  >
                    <i class="material-icons">add</i>
                    Nouveau
                  </button>
                </div>

                <div class="incidents-list">
                  <div
                    *ngFor="let incident of todayIncidents"
                    class="incident-item"
                  >
                    <div
                      class="incident-icon"
                      [class]="'incident-' + incident.type"
                    >
                      <i class="material-icons">{{
                        getIncidentIcon(incident.type)
                      }}</i>
                    </div>
                    <div class="incident-content">
                      <h4>{{ getIncidentTypeText(incident.type) }}</h4>
                      <p>{{ incident.description }}</p>
                      <div class="incident-meta">
                        <span class="incident-time">{{
                          incident.timestamp | date : "HH:mm"
                        }}</span>
                        <span
                          class="incident-status"
                          [class]="'status-' + incident.status"
                        >
                          {{ incident.status === "open" ? "Ouvert" : "Résolu" }}
                        </span>
                      </div>
                    </div>
                    <button
                      class="resolve-btn"
                      *ngIf="incident.status === 'open'"
                      (click)="resolveIncident(incident.id)"
                    >
                      <i class="material-icons">check</i>
                    </button>
                  </div>

                  <div
                    *ngIf="todayIncidents.length === 0"
                    class="empty-incidents"
                  >
                    <i class="material-icons">check_circle</i>
                    <p>Aucun incident signalé aujourd'hui</p>
                  </div>
                </div>
              </section>

              <!-- Historique des collectes -->
              <section class="collection-history card">
                <div class="section-header">
                  <h2>
                    <i class="material-icons">history</i>
                    Historique récent
                  </h2>
                  <button
                    class="btn btn-secondary btn-small"
                    routerLink="/collector/history"
                  >
                    <i class="material-icons">open_in_new</i>
                    Voir tout
                  </button>
                </div>

                <div class="history-list">
                  <div
                    *ngFor="let collection of recentHistory"
                    class="history-item"
                  >
                    <div class="history-date">
                      <div class="day">
                        {{ collection.collectedDate | date : "dd" }}
                      </div>
                      <div class="month">
                        {{ collection.collectedDate | date : "MMM" }}
                      </div>
                    </div>
                    <div class="history-info">
                      <h4>{{ collection.clientName }}</h4>
                      <p>{{ collection.address }}</p>
                      <div class="history-meta">
                        <span class="collection-time">{{
                          collection.collectedDate | date : "HH:mm"
                        }}</span>
                        <span class="waste-types">{{
                          collection.wasteTypes.join(", ")
                        }}</span>
                      </div>
                    </div>
                    <div class="history-status">
                      <span class="status-badge status-completed"
                        >Collecté</span
                      >
                    </div>
                  </div>

                  <div *ngIf="recentHistory.length === 0" class="empty-history">
                    <i class="material-icons">history</i>
                    <p>Aucun historique récent</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de signalement d'incident -->
      <div
        class="modal-overlay"
        *ngIf="showIncidentModal"
        (click)="showIncidentModal = false"
      >
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Signaler un incident</h3>
            <button class="close-btn" (click)="showIncidentModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <form class="incident-form" (ngSubmit)="submitIncident()">
            <div class="form-group">
              <label>Type d'incident</label>
              <select [(ngModel)]="incidentData.type" name="type" required>
                <option value="">Sélectionnez un type</option>
                <option value="non_compliant">Déchets non conformes</option>
                <option value="access_blocked">Accès bloqué</option>
                <option value="equipment_issue">Problème d'équipement</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div class="form-group">
              <label>Collection concernée</label>
              <select
                [(ngModel)]="incidentData.collectionId"
                name="collectionId"
                required
              >
                <option value="">Sélectionnez une collecte</option>
                <option
                  *ngFor="let point of collectionPoints"
                  [value]="point.id"
                >
                  {{ point.clientName }} - {{ point.address }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Description</label>
              <textarea
                [(ngModel)]="incidentData.description"
                name="description"
                rows="4"
                placeholder="Décrivez l'incident..."
                required
              ></textarea>
            </div>
            <div class="form-group">
              <label>Photos (optionnel)</label>
              <div class="photo-upload">
                <input
                  type="file"
                  #incidentPhotoInput
                  multiple
                  accept="image/*"
                  (change)="onIncidentPhotosSelected($event)"
                  style="display: none;"
                />
                <button
                  type="button"
                  class="upload-btn"
                  (click)="incidentPhotoInput.click()"
                >
                  <i class="material-icons">camera_alt</i>
                  Ajouter des photos
                </button>
                <div class="photo-preview" *ngIf="incidentPhotos.length > 0">
                  <div *ngFor="let photo of incidentPhotos" class="photo-item">
                    <img [src]="photo.preview" alt="Photo incident" />
                    <button
                      type="button"
                      class="remove-photo"
                      (click)="removeIncidentPhoto(photo)"
                    >
                      <i class="material-icons">close</i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="showIncidentModal = false"
              >
                Annuler
              </button>
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">send</i>
                Signaler
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal QR Scanner -->
      <div
        class="modal-overlay"
        *ngIf="showQrScanner"
        (click)="showQrScanner = !showQrScanner"
      >
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Scanner un QR Code</h3>
            <button class="close-btn" (click)="showQrScanner = !showQrScanner">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="scanner-container">
            <zxing-scanner
              [formats]="qrFormats"
              (scanSuccess)="onQrCodeResult($event)"
              [torch]="false"
              [tryHarder]="true"
              [device]="selectedDevice"
              [autostart]="true"
              [previewFitMode]="'cover'"
            ></zxing-scanner>
          </div>
          <div class="scanner-controls">
            <button
              class="btn btn-secondary"
              (click)="showQrScanner = !showQrScanner"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
      <!-- Modal infos client scanné -->
      <div
        class="modal-overlay"
        *ngIf="showClientModal"
        (click)="showClientModal = false"
      >
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Informations du client</h3>
            <button class="close-btn" (click)="showClientModal = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div *ngIf="scannedClient">
            <p>
              <strong>Nom :</strong> {{ scannedClient?.firstName }}
              {{ scannedClient?.lastName }}
            </p>
            <p><strong>Téléphone :</strong> {{ scannedClient?.phone }}</p>
            <p>
              <strong>Statut :</strong> {{ scannedClient?.subscriptionStatus }}
            </p>
            <p>
              <strong>Adresse :</strong>
              {{ scannedClient?.address?.doorNumber }}
              {{ scannedClient?.address?.street }},
              {{ scannedClient?.address?.neighborhood }},
              {{ scannedClient?.address?.city }}
            </p>
            <p>
              <strong>Couleur porte :</strong>
              {{ scannedClient?.address?.doorColor }}
            </p>
            <p>
              <strong>Arrondissement :</strong>
              {{ scannedClient?.address?.arrondissement }}
            </p>
            <p>
              <strong>Secteur :</strong> {{ scannedClient?.address?.sector }}
            </p>
            <p>
              <strong>Code postal :</strong>
              {{ scannedClient?.address?.postalCode }}
            </p>
          </div>
          <div class="confirmation-actions">
            <button
              class="btn btn-success btn-full"
              (click)="confirmCurrentCollection()"
            >
              <i class="material-icons">check_circle</i>
              Confirmer la collecte
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .collector-dashboard {
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
        gap: 24px;
        margin-bottom: 32px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 24px;
        transition: all 0.3s ease;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
      }

      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 28px;
      }

      .stat-icon.progress {
        background: var(--primary-color);
      }
      .stat-icon.time {
        background: var(--accent-color);
      }
      .stat-icon.distance {
        background: var(--secondary-color);
      }
      .stat-icon.incidents {
        background: var(--error-color);
      }

      .stat-info h3 {
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 4px;
        color: var(--text-secondary);
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: var(--text-primary);
      }

      .stat-detail {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .progress-bar {
        width: 100%;
        height: 6px;
        background: var(--medium-gray);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 8px;
      }

      .progress-fill {
        height: 100%;
        background: var(--success-color);
        transition: width 0.3s ease;
      }

      .main-content {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 32px;
      }

      .left-column,
      .right-column {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--medium-gray);
      }

      .section-header h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      .schedule-controls {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .view-select {
        padding: 8px 12px;
        border: 1px solid var(--medium-gray);
        border-radius: 6px;
        font-size: 0.9rem;
      }

      .btn-small {
        padding: 8px 16px;
        font-size: 0.9rem;
      }

      .schedule-timeline {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .timeline-item {
        display: flex;
        gap: 16px;
        padding: 16px;
        border-radius: 8px;
        transition: all 0.3s ease;
        border-left: 4px solid var(--medium-gray);
      }

      .timeline-item.current {
        background: #e3f2fd;
        border-left-color: var(--primary-color);
      }

      .timeline-item.completed {
        background: #e8f5e8;
        border-left-color: var(--success-color);
        opacity: 0.8;
      }

      .timeline-item.urgent {
        border-left-color: var(--error-color);
      }

      .timeline-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 60px;
      }

      .marker-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--white);
        border: 2px solid var(--medium-gray);
        margin-bottom: 4px;
      }

      .timeline-item.current .marker-icon {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .timeline-item.completed .marker-icon {
        border-color: var(--success-color);
        color: var(--success-color);
      }

      .marker-time {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .timeline-content {
        flex: 1;
      }

      .collection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .collection-header h4 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .collection-badges {
        display: flex;
        gap: 8px;
      }

      .priority-badge,
      .duration-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
      }

      .priority-normal {
        background: #e3f2fd;
        color: var(--primary-color);
      }

      .priority-urgent {
        background: #ffebee;
        color: var(--error-color);
      }

      .duration-badge {
        background: var(--light-gray);
        color: var(--text-secondary);
      }

      .collection-details {
        margin-bottom: 12px;
      }

      .address-info {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        color: var(--text-secondary);
      }

      .door-info {
        font-style: italic;
        color: var(--text-secondary);
      }

      .waste-types {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .waste-tag {
        padding: 2px 8px;
        background: var(--secondary-color);
        color: var(--white);
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 500;
      }

      .collection-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .action-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .action-btn.navigate {
        background: var(--primary-color);
        color: var(--white);
      }

      .action-btn.collect {
        background: var(--success-color);
        color: var(--white);
      }

      .action-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .collection-notes {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding: 8px;
        background: var(--light-gray);
        border-radius: 6px;
        font-size: 0.9rem;
        color: var(--text-secondary);
      }

      .navigation-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .current-destination {
        padding: 20px;
        background: linear-gradient(
          135deg,
          var(--primary-color),
          var(--secondary-color)
        );
        color: var(--white);
        border-radius: 12px;
      }

      .current-destination h3 {
        margin-bottom: 12px;
        font-size: 1.1rem;
      }

      .destination-info {
        margin-bottom: 16px;
      }

      .destination-address,
      .destination-distance {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .route-summary {
        padding: 16px;
        background: var(--light-gray);
        border-radius: 8px;
      }

      .route-summary h4 {
        margin-bottom: 12px;
        color: var(--text-primary);
      }

      .route-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .route-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .stat-label {
        color: var(--text-secondary);
      }

      .stat-value {
        font-weight: 600;
        color: var(--text-primary);
      }

      .confirmation-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .collection-info {
        padding: 16px;
        background: var(--light-gray);
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .collection-info h3 {
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .collection-info p {
        color: var(--text-secondary);
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

      .form-group textarea,
      .form-group select {
        padding: 12px 16px;
        border: 2px solid var(--medium-gray);
        border-radius: 8px;
        font-family: "Inter", sans-serif;
        transition: border-color 0.3s ease;
      }

      .form-group textarea:focus,
      .form-group select:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .photo-upload {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .upload-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: var(--white);
        border: 2px dashed var(--medium-gray);
        border-radius: 8px;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .upload-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .photo-preview {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
        gap: 8px;
      }

      .photo-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
      }

      .photo-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .remove-photo {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        background: rgba(0, 0, 0, 0.7);
        color: var(--white);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .geolocation-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: var(--light-gray);
        border-radius: 8px;
      }

      .location-status {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
      }

      .location-status.active {
        color: var(--success-color);
      }

      .confirmation-actions {
        margin-top: 16px;
      }

      .confirmation-methods {
        display: flex;
        gap: 8px;
      }

      .method-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: var(--white);
        border: 2px solid var(--medium-gray);
        border-radius: 8px;
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
      }

      .method-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      .method-btn.active {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: var(--white);
      }

      .qr-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: #e3f2fd;
        border-radius: 8px;
        margin-top: 12px;
        color: var(--primary-color);
        font-size: 0.9rem;
      }

      .qr-scanner-section {
        margin: 20px 0;
      }

      .scanner-container {
        position: relative;
        width: 100%;
        max-width: 400px;
        margin: 0 auto 16px;
        border-radius: 12px;
        overflow: hidden;
        background: #000;
      }

      .scanner-container zxing-scanner {
        width: 100%;
        height: 300px;
      }

      .scanner-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .scan-frame {
        position: relative;
        width: 200px;
        height: 200px;
      }

      .scan-corners {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .corner {
        position: absolute;
        width: 30px;
        height: 30px;
        border: 3px solid var(--primary-color);
      }

      .corner.top-left {
        top: 0;
        left: 0;
        border-right: none;
        border-bottom: none;
      }

      .corner.top-right {
        top: 0;
        right: 0;
        border-left: none;
        border-bottom: none;
      }

      .corner.bottom-left {
        bottom: 0;
        left: 0;
        border-right: none;
        border-top: none;
      }

      .corner.bottom-right {
        bottom: 0;
        right: 0;
        border-left: none;
        border-top: none;
      }

      .scan-instruction {
        position: absolute;
        bottom: -40px;
        left: 50%;
        transform: translateX(-50%);
        color: var(--white);
        font-size: 0.9rem;
        text-align: center;
        background: rgba(0, 0, 0, 0.7);
        padding: 8px 16px;
        border-radius: 20px;
        white-space: nowrap;
      }

      .scanner-controls {
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }

      .camera-select {
        padding: 8px 12px;
        border: 2px solid var(--medium-gray);
        border-radius: 8px;
        font-size: 0.9rem;
        max-width: 200px;
      }

      .qr-status {
        margin-top: 16px;
      }

      .scan-success,
      .scan-error {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-radius: 8px;
      }

      .scan-success {
        background: #e8f5e8;
        color: var(--success-color);
        border: 1px solid #c8e6c9;
      }

      .scan-error {
        background: #ffebee;
        color: var(--error-color);
        border: 1px solid #ffcdd2;
      }

      .scan-success i,
      .scan-error i {
        font-size: 24px;
        flex-shrink: 0;
      }

      .scan-success h4,
      .scan-error h4 {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 4px 0;
      }

      .scan-success p,
      .scan-error p {
        font-size: 0.9rem;
        margin: 0;
        opacity: 0.9;
      }

      .btn-full {
        width: 100%;
      }

      .no-current-collection {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-secondary);
      }

      .no-current-collection i {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .incidents-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .incident-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        background: var(--light-gray);
        border-radius: 8px;
      }

      .incident-icon {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--white);
        font-size: 16px;
        flex-shrink: 0;
      }

      .incident-non_compliant {
        background: var(--warning-color);
        color: var(--text-primary);
      }
      .incident-access_blocked {
        background: var(--error-color);
      }
      .incident-equipment_issue {
        background: var(--accent-color);
      }
      .incident-other {
        background: var(--text-secondary);
      }

      .incident-content {
        flex: 1;
      }

      .incident-content h4 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .incident-content p {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .incident-meta {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .incident-time {
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .incident-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 500;
        text-transform: uppercase;
      }

      .status-open {
        background: #ffebee;
        color: var(--error-color);
      }

      .status-resolved {
        background: #e8f5e8;
        color: var(--success-color);
      }

      .resolve-btn {
        background: var(--success-color);
        color: var(--white);
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .resolve-btn:hover {
        background: #388e3c;
      }

      .empty-incidents,
      .empty-history {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-secondary);
      }

      .empty-incidents i,
      .empty-history i {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .history-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .history-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px;
        background: var(--light-gray);
        border-radius: 8px;
      }

      .history-date {
        text-align: center;
        min-width: 50px;
      }

      .day {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--primary-color);
        line-height: 1;
      }

      .month {
        font-size: 0.7rem;
        color: var(--text-secondary);
        text-transform: uppercase;
      }

      .history-info {
        flex: 1;
      }

      .history-info h4 {
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 4px;
        color: var(--text-primary);
      }

      .history-info p {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }

      .history-meta {
        display: flex;
        gap: 12px;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .history-status {
        text-align: right;
      }

      .status-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
      }

      .status-completed {
        background: #e8f5e8;
        color: var(--success-color);
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

      .incident-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 16px;
      }

      .btn-secondary.qr-btn {
        background: linear-gradient(
          90deg,
          var(--primary-color),
          var(--secondary-color)
        );
        color: var(--white);
        position: relative;
        overflow: hidden;
        transition: background 0.3s;
      }
      .btn-secondary.qr-btn .material-icons {
        vertical-align: middle;
      }
      .btn-secondary.qr-btn::before {
        content: "";
        position: absolute;
        top: 0;
        left: -75%;
        width: 50%;
        height: 100%;
        background: linear-gradient(
          120deg,
          rgba(255, 255, 255, 0.2) 0%,
          rgba(255, 255, 255, 0.6) 60%,
          rgba(255, 255, 255, 0.2) 100%
        );
        transform: skewX(-20deg);
        transition: left 0.5s;
      }
      .btn-secondary.qr-btn:hover::before {
        left: 120%;
        transition: left 0.5s;
      }

      @media (max-width: 1024px) {
        .main-content {
          grid-template-columns: 1fr;
        }

        .header-content {
          flex-direction: column;
          text-align: center;
        }
      }

      @media (max-width: 768px) {
        .stats-grid {
          grid-template-columns: 1fr;
        }

        .timeline-item {
          flex-direction: column;
          gap: 12px;
        }

        .timeline-marker {
          flex-direction: row;
          min-width: auto;
        }

        .collection-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .collection-actions {
          flex-direction: column;
        }

        .modal-content {
          margin: 20px;
          width: calc(100% - 40px);
        }
      }
    `,
  ],
})
export class CollectorDashboardComponent implements OnInit {
  currentUser: User | null = null;
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
    this.loadCollectorData();
    // this.onQrCodeResult("68c293329b9e68227034e973");
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
        address: "15 Rue des Roses, Centre-ville",
        doorNumber: "15",
        doorColor: "bleue",
        wasteTypes: ["Déchets ménagers"],
        scheduledTime: new Date("2024-01-15T09:00:00"),
        status: CollectionStatus.SCHEDULED,
        clientName: "Marie Dupont",
        priority: "normal",
        estimatedDuration: 5,
        distance: 2.3,
      },
      {
        id: "2",
        address: "32 Avenue de la Liberté, Quartier Latin",
        doorNumber: "32",
        doorColor: "rouge",
        wasteTypes: ["Recyclables"],
        scheduledTime: new Date("2024-01-15T09:30:00"),
        status: CollectionStatus.SCHEDULED,
        clientName: "Jean Martin",
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
        clientName: "Sophie Bernard",
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
        clientName: "Pierre Durand",
        address: "25 Rue de la Paix",
        collectedDate: new Date("2024-01-14T14:30:00"),
        wasteTypes: ["Déchets ménagers"],
      },
      {
        id: "2",
        clientName: "Anne Moreau",
        address: "18 Boulevard Saint-Michel",
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

  onQrCodeResult(result: any) {
    // S'assurer que nous avons bien une chaîne
    const qrCodeValue = typeof result === 'string' ? result : result?.toString() || '';
    
    this.lastQrResult = qrCodeValue;
    this.showQrScanner = false;
    this.notificationService.showSuccess("QR Code détecté", qrCodeValue);
    // Appel API pour récupérer le client
    this.clientService.getClientById(qrCodeValue).subscribe({
      next: (client) => {
        this.scannedClient = client?.data;
        console.log("Scanned client :>", this.scannedClient);
        if(this.scannedClient){

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
}
