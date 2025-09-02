import { Component, OnInit } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';


// PrimeNG imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';


interface WasteType {
  type: string;
  icon: string;
  color: string;
  schedule: string;
  nextCollection: Date;
}

interface CollectionPoint {
  id: number;
  name: string;
  address: string;
  type: string;
  status: 'active' | 'maintenance' | 'full';
  lastCollection: Date;
}

interface Report {
  id: number;
  type: string;
  description: string;
  location: string;
  status: 'pending' | 'in-progress' | 'resolved';
  date: Date;
  citizen: string;
}

interface Campaign {
  id: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  type: 'awareness' | 'special-collection' | 'project';
}

@Component({
  selector: 'app-municipality-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TabsModule,        // ✅ Remplace TabViewModule
    TableModule,
    BadgeModule,
    ChipModule,
    ProgressBarModule,
    DatePickerModule,  // ✅ Remplace CalendarModule
    DialogModule,
    TextareaModule,    // ✅ Remplace InputTextareaModule
    SelectModule,      // ✅ Remplace DropdownModule
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center py-4">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <i class="pi pi-building text-white text-xl"></i>
              </div>
              <div>
                <h1 class="text-xl font-bold text-gray-900">{{mayoraltyInfo.name}}</h1>
                <p class="text-sm text-gray-600">Service de Collecte des Déchets</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p-tabs value="0">
          <p-tablist>
            <p-tab value="0" icon="pi pi-info-circle">Informations Générales</p-tab>
            <p-tab value="1" icon="pi pi-map">Zone de Couverture</p-tab>
            <p-tab value="2" icon="pi pi-truck">Services de Collecte</p-tab>
            <p-tab value="3" icon="pi pi-chart-bar">Suivi & Statistiques</p-tab>
            <p-tab value="4" icon="pi pi-exclamation-triangle">Signalements Citoyens</p-tab>
            <p-tab value="5" icon="pi pi-calendar">Événements & Sensibilisation</p-tab>
            <p-tab value="6" icon="pi pi-file">Documents & Ressources</p-tab>
          </p-tablist>

          <p-tabpanels>
            <!-- Informations Générales -->
            <p-tabpanel value="0">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Contact Info -->
              <p-card header="Informations de Contact">
                <div class="space-y-4">
                  <div class="flex items-start space-x-3">
                    <i class="pi pi-map-marker text-blue-600 mt-1"></i>
                    <div>
                      <p class="font-medium">Adresse</p>
                      <p class="text-gray-600">{{mayoraltyInfo.address}}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <i class="pi pi-phone text-blue-600 mt-1"></i>
                    <div>
                      <p class="font-medium">Téléphone</p>
                      <p class="text-gray-600">{{mayoraltyInfo.phone}}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <i class="pi pi-envelope text-blue-600 mt-1"></i>
                    <div>
                      <p class="font-medium">Email</p>
                      <p class="text-gray-600">{{mayoraltyInfo.email}}</p>
                    </div>
                  </div>
                  <div class="flex items-start space-x-3">
                    <i class="pi pi-user text-blue-600 mt-1"></i>
                    <div>
                      <p class="font-medium">Responsable Déchets</p>
                      <p class="text-gray-600">{{mayoraltyInfo.wasteManager}}</p>
                      <p class="text-sm text-gray-500">{{mayoraltyInfo.wasteManagerPhone}}</p>
                    </div>
                  </div>
                </div>
              </p-card>

              <!-- Horaires -->
              <p-card header="Horaires du Service">
                <div class="space-y-3">
                  <div *ngFor="let schedule of serviceSchedule" class="flex justify-between">
                    <span class="font-medium">{{schedule.day}}</span>
                    <span class="text-gray-600">{{schedule.hours}}</span>
                  </div>
                </div>
              </p-card>
            </div>
            </p-tabpanel>

            <!-- Zone de Couverture -->
            <p-tabpanel value="1">
                          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <!-- Carte (simulée) -->
              <div class="lg:col-span-2">
                <p-card header="Carte de la Commune">
                  <div class="h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div class="text-center">
                      <i class="pi pi-map text-4xl text-gray-400 mb-4"></i>
                      <p class="text-gray-600">Carte interactive de la commune</p>
                      <p class="text-sm text-gray-500">Zones de collecte et points de ramassage</p>
                    </div>
                  </div>
                </p-card>
              </div>

              <!-- Statistiques Zone -->
              <div class="space-y-4">
                <p-card header="Statistiques de Couverture">
                  <div class="space-y-4">
                    <div class="text-center">
                      <div class="text-3xl font-bold text-blue-600">{{coverageStats.totalArea}} km²</div>
                      <p class="text-sm text-gray-600">Superficie totale</p>
                    </div>
                    <div class="text-center">
                      <div class="text-3xl font-bold text-green-600">{{coverageStats.districts}}</div>
                      <p class="text-sm text-gray-600">Quartiers desservis</p>
                    </div>
                    <div class="text-center">
                      <div class="text-3xl font-bold text-purple-600">{{coverageStats.population | number}}</div>
                      <p class="text-sm text-gray-600">Habitants desservis</p>
                    </div>
                  </div>
                </p-card>
              </div>
            </div>
            </p-tabpanel>

            <!-- Services de Collecte -->
            <p-tabpanel value="2">
                         <div class="space-y-6">
              <!-- Types de Déchets -->
              <p-card header="Types de Déchets Collectés">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div *ngFor="let waste of wasteTypes" class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-center space-x-3 mb-3">
                      <div [class]="'w-10 h-10 rounded-full flex items-center justify-center ' + waste.color">
                        <i [class]="'pi ' + waste.icon + ' text-white'"></i>
                      </div>
                      <div>
                        <h6 class="font-semibold">{{waste.type}}</h6>
                        <p class="text-sm text-gray-600">{{waste.schedule}}</p>
                      </div>
                    </div>
                    <div class="text-sm">
                      <span class="text-gray-500">Prochaine collecte:</span>
                      <span class="font-medium ml-1">{{waste.nextCollection | date:'dd/MM/yyyy'}}</span>
                    </div>
                  </div>
                </div>
              </p-card>

              <!-- Points de Collecte -->
              <p-card header="Points de Collecte">
                <p-table [value]="collectionPoints" [paginator]="true" [rows]="5">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Nom</th>
                      <th>Adresse</th>
                      <th>Type</th>
                      <th>Statut</th>
                      <th>Dernière Collecte</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-point>
                    <tr>
                      <td>{{point.name}}</td>
                      <td>{{point.address}}</td>
                      <td>
                        <p-chip [label]="point.type"></p-chip>
                      </td>
                      <td>
                        <p-badge 
                          [value]="getStatusLabel(point.status)" 
                          >
                        </p-badge>
                      </td>
                      <td>{{point.lastCollection | date:'dd/MM/yyyy HH:mm'}}</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
            </div>
            </p-tabpanel>

            <!-- Suivi & Statistiques -->
            <p-tabpanel value="3">
                          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Statistiques Mensuelles -->
              <p-card header="Statistiques du Mois">
                <div class="space-y-6">
                  <div class="text-center">
                    <div class="text-4xl font-bold text-blue-600 mb-2">{{monthlyStats.totalWaste}} T</div>
                    <p class="text-gray-600">Volume total collecté</p>
                  </div>
                  
                  <div>
                    <div class="flex justify-between mb-2">
                      <span>Taux de recyclage</span>
                      <span class="font-semibold">{{monthlyStats.recyclingRate}}%</span>
                    </div>
                    <p-progressBar [value]="monthlyStats.recyclingRate" [showValue]="false"></p-progressBar>
                  </div>

                  <div class="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div class="text-2xl font-bold text-green-600">{{monthlyStats.activePoints}}</div>
                      <p class="text-sm text-gray-600">Points actifs</p>
                    </div>
                    <div>
                      <div class="text-2xl font-bold text-orange-600">{{monthlyStats.collections}}</div>
                      <p class="text-sm text-gray-600">Collectes réalisées</p>
                    </div>
                  </div>
                </div>
              </p-card>

              <!-- Historique -->
              <p-card header="Historique des Collectes">
                <p-table [value]="collectionHistory" [paginator]="true" [rows]="5">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Date</th>
                      <th>Zone</th>
                      <th>Type</th>
                      <th>Volume</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-collection>
                    <tr>
                      <td>{{collection.date | date:'dd/MM/yyyy'}}</td>
                      <td>{{collection.zone}}</td>
                      <td>{{collection.type}}</td>
                      <td>{{collection.volume}} kg</td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
            </div>
            </p-tabpanel>

            <!-- Signalements -->
            <p-tabpanel value="4">
                          <div class="space-y-6">
              <!-- Bouton Nouveau Signalement -->
              <div class="text-center">
                <button 
                  pButton 
                  type="button" 
                  icon="pi pi-plus" 
                  label="Nouveau Signalement"
                  class="p-button-lg p-button-success"
                  (click)="showReportDialog = true">
                </button>
              </div>

              <!-- Liste des Signalements -->
              <p-card header="Signalements Récents">
                <p-table [value]="reports" [paginator]="true" [rows]="8">
                  <ng-template pTemplate="header">
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Localisation</th>
                      <th>Citoyen</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </ng-template>
                  <ng-template pTemplate="body" let-report>
                    <tr>
                      <td>{{report.date | date:'dd/MM/yyyy HH:mm'}}</td>
                      <td>{{report.type}}</td>
                      <td>{{report.location}}</td>
                      <td>{{report.citizen}}</td>
                      <td>
                        <p-badge 
                          [value]="getReportStatusLabel(report.status)" 
                          [severity]="getReportStatusSeverity(report.status)">
                        </p-badge>
                      </td>
                      <td>
                        <button 
                          pButton 
                          type="button" 
                          icon="pi pi-eye" 
                          class="p-button-text p-button-sm"
                          pTooltip="Voir détails">
                        </button>
                      </td>
                    </tr>
                  </ng-template>
                </p-table>
              </p-card>
            </div>
            </p-tabpanel>

            <!-- Événements & Sensibilisation -->
            <p-tabpanel value="5">
                          <div class="space-y-6">
              <!-- Campagnes Actives -->
              <p-card header="Campagnes en Cours">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div *ngFor="let campaign of activeCampaigns" class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-3">
                      <h6 class="font-semibold text-lg">{{campaign.title}}</h6>
                      <p-chip 
                        [label]="getCampaignTypeLabel(campaign.type)" 
                        [class]="getCampaignTypeClass(campaign.type)">
                      </p-chip>
                    </div>
                    <p class="text-gray-600 mb-3">{{campaign.description}}</p>
                    <div class="text-sm text-gray-500">
                      <p>Du {{campaign.startDate | date:'dd/MM/yyyy'}} au {{campaign.endDate | date:'dd/MM/yyyy'}}</p>
                    </div>
                  </div>
                </div>
              </p-card>

              <!-- Prochains Événements -->
              <p-card header="Prochains Événements">
                <div class="space-y-4">
                  <div *ngFor="let event of upcomingEvents" class="flex items-center space-x-4 p-3 border rounded-lg">
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <i class="pi pi-calendar text-green-600"></i>
                    </div>
                    <div class="flex-1">
                      <h6 class="font-semibold">{{event.title}}</h6>
                      <p class="text-sm text-gray-600">{{event.description}}</p>
                      <p class="text-sm text-gray-500">{{event.date | date:'dd/MM/yyyy à HH:mm'}}</p>
                    </div>
                  </div>
                </div>
              </p-card>
            </div>
            </p-tabpanel>

            <!-- Documents & Ressources -->
            <p-tabpanel value="6">
                          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Documents Officiels -->
              <p-card header="Documents Officiels">
                <div class="space-y-3">
                  <div *ngFor="let doc of documents" class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div class="flex items-center space-x-3">
                      <i class="pi pi-file-pdf text-red-600"></i>
                      <div>
                        <p class="font-medium">{{doc.name}}</p>
                        <p class="text-sm text-gray-500">{{doc.size}} - {{doc.lastUpdate | date:'dd/MM/yyyy'}}</p>
                      </div>
                    </div>
                    <button 
                      pButton 
                      type="button" 
                      icon="pi pi-download" 
                      class="p-button-text p-button-sm">
                    </button>
                  </div>
                </div>
              </p-card>

              <!-- Liens Utiles -->
              <p-card header="Liens Utiles">
                <div class="space-y-3">
                  <div *ngFor="let link of usefulLinks" class="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <i [class]="'pi ' + link.icon + ' text-blue-600'"></i>
                    <div>
                      <p class="font-medium">{{link.name}}</p>
                      <p class="text-sm text-gray-500">{{link.description}}</p>
                    </div>
                    <i class="pi pi-external-link text-gray-400"></i>
                  </div>
                </div>
              </p-card>
            </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>
      </main>

      <!-- Dialog Signalement -->
      <p-dialog 
        header="Nouveau Signalement" 
        [(visible)]="showReportDialog" 
        [modal]="true" 
        [style]="{width: '500px'}"
        [closable]="true">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Type de problème</label>
            <p-select 
              [options]="reportTypes" 
              [(ngModel)]="newReport.type" 
              placeholder="Sélectionner un type"
              class="w-full">
            </p-select>
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Localisation</label>
            <input 
              type="text" 
              pInputText 
              [(ngModel)]="newReport.location" 
              placeholder="Adresse ou point de repère"
              class="w-full">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2">Description</label>
            <p-textarea 
              [(ngModel)]="newReport.description" 
              rows="4" 
              placeholder="Décrivez le problème..."
              class="w-full">
            </p-textarea>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <button pButton type="button" label="Annuler" class="p-button-text"
                  (click)="showReportDialog = false">
          </button>
          <button pButton type="button" label="Envoyer" class="p-button-success"
                  (click)="submitReport()">
          </button>
        </ng-template>
      </p-dialog>

      <p-toast></p-toast>
    </div>
  `,
  styles: [
    `
    :host ::ng-deep .p-tabview .p-tabview-nav li .p-tabview-nav-link {
      padding: 1rem 1.5rem;
    }

    :host ::ng-deep .p-card .p-card-header {
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
      font-weight: 600;
    }

    :host ::ng-deep .p-progressbar {
      height: 8px;
    }

    :host ::ng-deep .p-table .p-table-thead > tr > th {
      background: #f8f9fa;
      font-weight: 600;
    }

    :host ::ng-deep .p-badge.success {
      background: #10b981;
    }

    :host ::ng-deep .p-badge.warning {
      background: #f59e0b;
    }

    :host ::ng-deep .p-badge.danger {
      background: #ef4444;
    }

    .campaign-awareness { background: #dbeafe; color: #1e40af; }
    .campaign-special { background: #fef3c7; color: #d97706; }
    .campaign-project { background: #d1fae5; color: #059669; }
  `,
  ],
})
export class MunicipalityDetails implements OnInit {
 showReportDialog = false;

  mayoraltyInfo = {
    name: 'Mairie de Ville-Centre',
    address: '123 Avenue de la République, 75001 Paris',
    phone: '01 42 76 40 40',
    email: 'dechets@ville-centre.fr',
    wasteManager: 'Marie Dubois',
    wasteManagerPhone: '01 42 76 40 45',
  };

  serviceSchedule = [
    { day: 'Lundi - Vendredi', hours: '8h00 - 17h00' },
    { day: 'Samedi', hours: '8h00 - 12h00' },
    { day: 'Dimanche', hours: 'Fermé' },
  ];

  coverageStats = {
    totalArea: 45.2,
    districts: 12,
    population: 85000,
  };

  wasteTypes: WasteType[] = [
    {
      type: 'Déchets Ménagers',
      icon: 'pi-trash',
      color: 'bg-gray-600',
      schedule: 'Lundi, Mercredi, Vendredi',
      nextCollection: new Date(2025, 0, 20),
    },
    {
      type: 'Recyclables',
      icon: 'pi-refresh',
      color: 'bg-green-600',
      schedule: 'Mardi, Jeudi',
      nextCollection: new Date(2025, 0, 21),
    },
    {
      type: 'Déchets Verts',
      icon: 'pi-sun',
      color: 'bg-emerald-600',
      schedule: 'Samedi',
      nextCollection: new Date(2025, 0, 25),
    },
    {
      type: 'Encombrants',
      icon: 'pi-box',
      color: 'bg-orange-600',
      schedule: '1er lundi du mois',
      nextCollection: new Date(2025, 1, 3),
    },
    {
      type: 'Déchets Électroniques',
      icon: 'pi-desktop',
      color: 'bg-purple-600',
      schedule: 'Sur rendez-vous',
      nextCollection: new Date(2025, 0, 30),
    },
    {
      type: 'Déchets Dangereux',
      icon: 'pi-exclamation-triangle',
      color: 'bg-red-600',
      schedule: '3ème samedi du mois',
      nextCollection: new Date(2025, 0, 18),
    },
  ];

  collectionPoints: CollectionPoint[] = [
    {
      id: 1,
      name: 'Point Centre-Ville',
      address: 'Place de la Mairie',
      type: 'Conteneurs',
      status: 'active',
      lastCollection: new Date(2025, 0, 17, 8, 30),
    },
    {
      id: 2,
      name: 'Déchèterie Nord',
      address: 'Zone Industrielle Nord',
      type: 'Déchèterie',
      status: 'active',
      lastCollection: new Date(2025, 0, 17, 14, 0),
    },
    {
      id: 3,
      name: 'Point Quartier Sud',
      address: 'Avenue des Écoles',
      type: 'Bornes',
      status: 'maintenance',
      lastCollection: new Date(2025, 0, 15, 10, 15),
    },
    {
      id: 4,
      name: 'Conteneurs Marché',
      address: 'Place du Marché',
      type: 'Conteneurs',
      status: 'full',
      lastCollection: new Date(2025, 0, 16, 16, 45),
    },
  ];

  monthlyStats = {
    totalWaste: 1247,
    recyclingRate: 68,
    activePoints: 24,
    collections: 156,
  };

  collectionHistory = [
    {
      date: new Date(2025, 0, 17),
      zone: 'Centre-Ville',
      type: 'Ménagers',
      volume: 2400,
    },
    {
      date: new Date(2025, 0, 17),
      zone: 'Quartier Nord',
      type: 'Recyclables',
      volume: 1800,
    },
    {
      date: new Date(2025, 0, 16),
      zone: 'Quartier Sud',
      type: 'Ménagers',
      volume: 2100,
    },
    {
      date: new Date(2025, 0, 16),
      zone: 'Zone Commerciale',
      type: 'Encombrants',
      volume: 950,
    },
    {
      date: new Date(2025, 0, 15),
      zone: 'Résidentiel Est',
      type: 'Déchets Verts',
      volume: 1200,
    },
  ];

  reports: Report[] = [
    {
      id: 1,
      type: 'Conteneur plein',
      description: 'Le conteneur déborde depuis 2 jours',
      location: 'Rue de la Paix, 15',
      status: 'pending',
      date: new Date(2025, 0, 17, 14, 30),
      citizen: 'Jean Martin',
    },
    {
      id: 2,
      type: 'Collecte manquée',
      description: "Les déchets n'ont pas été ramassés",
      location: 'Avenue Victor Hugo, 42',
      status: 'in-progress',
      date: new Date(2025, 0, 16, 9, 15),
      citizen: 'Sophie Durand',
    },
    {
      id: 3,
      type: 'Dépôt sauvage',
      description: 'Déchets abandonnés sur la voie publique',
      location: 'Parking de la gare',
      status: 'resolved',
      date: new Date(2025, 0, 15, 16, 45),
      citizen: 'Pierre Leroy',
    },
  ];

  activeCampaigns: Campaign[] = [
    {
      id: 1,
      title: 'Semaine du Compostage',
      description:
        'Sensibilisation au compostage domestique avec distribution de composteurs gratuits.',
      startDate: new Date(2025, 0, 15),
      endDate: new Date(2025, 0, 22),
      type: 'awareness',
    },
    {
      id: 2,
      title: 'Collecte Spéciale Électronique',
      description:
        'Collecte exceptionnelle des déchets électroniques et électroménagers.',
      startDate: new Date(2025, 0, 25),
      endDate: new Date(2025, 0, 27),
      type: 'special-collection',
    },
  ];

  upcomingEvents = [
    {
      title: 'Atelier Tri Sélectif',
      description: 'Formation gratuite pour les citoyens',
      date: new Date(2025, 0, 22, 14, 0),
    },
    {
      title: 'Journée Propreté Quartier',
      description: 'Nettoyage collectif du quartier Nord',
      date: new Date(2025, 0, 28, 9, 0),
    },
  ];

  documents = [
    {
      name: 'Guide du Tri Sélectif 2025',
      size: '2.4 MB',
      lastUpdate: new Date(2025, 0, 1),
    },
    {
      name: 'Règlement Municipal Déchets',
      size: '1.8 MB',
      lastUpdate: new Date(2024, 11, 15),
    },
    {
      name: 'Calendrier de Collecte',
      size: '856 KB',
      lastUpdate: new Date(2025, 0, 10),
    },
  ];

  usefulLinks = [
    {
      name: 'Centre de Tri Régional',
      description: 'Informations sur le traitement des déchets',
      icon: 'pi-building',
    },
    {
      name: 'Éco-Organismes',
      description: 'Recyclage spécialisé (piles, ampoules, etc.)',
      icon: 'pi-globe',
    },
    {
      name: 'Association Zéro Déchet',
      description: 'Conseils pour réduire ses déchets',
      icon: 'pi-heart',
    },
  ];

  newReport = {
    type: '',
    location: '',
    description: '',
  };

  reportTypes = [
    { label: 'Conteneur plein', value: 'conteneur-plein' },
    { label: 'Collecte manquée', value: 'collecte-manquee' },
    { label: 'Dépôt sauvage', value: 'depot-sauvage' },
    { label: 'Conteneur endommagé', value: 'conteneur-endommage' },
    { label: 'Autre', value: 'autre' },
  ];

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    // Initialisation des données
  }

  getStatusLabel(status: string): string {
    const labels = {
      active: 'Actif',
      maintenance: 'Maintenance',
      full: 'Plein',
    };
    return labels[status as keyof typeof labels] || status;
  }

  getReportStatusLabel(status: string): string {
    const labels = {
      pending: 'En attente',
      'in-progress': 'En cours',
      resolved: 'Résolu',
    };
    return labels[status as keyof typeof labels] || status;
  }

  getReportStatusSeverity(
    status: string
  ): 'success' | 'warn' | 'danger' | 'info' |'contrast' {
    const severities = {
      pending: 'warn',
      'in-progress': 'info',
      resolved: 'success',
    } as const;
    return severities[status as keyof typeof severities] || 'info';
  }

  getCampaignTypeLabel(type: string): string {
    const labels = {
      awareness: 'Sensibilisation',
      'special-collection': 'Collecte Spéciale',
      project: 'Projet',
    };
    return labels[type as keyof typeof labels] || type;
  }

  getCampaignTypeClass(type: string): string {
    const classes = {
      awareness: 'campaign-awareness',
      'special-collection': 'campaign-special',
      project: 'campaign-project',
    };
    return classes[type as keyof typeof classes] || '';
  }

  submitReport() {
    if (
      this.newReport.type &&
      this.newReport.location &&
      this.newReport.description
    ) {
      // Simulation d'envoi du signalement
      this.messageService.add({
        severity: 'success',
        summary: 'Signalement envoyé',
        detail: 'Votre signalement a été transmis aux services municipaux.',
      });

      // Reset du formulaire
      this.newReport = { type: '', location: '', description: '' };
      this.showReportDialog = false;
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez remplir tous les champs obligatoires.',
      });
    }
  }
}
