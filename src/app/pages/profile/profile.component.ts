import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { OUAGA_DATA, QuartierData } from '../../data/mock-data';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page profile-flex-layout">
      <div class="profile-left">
        <div class="profile-header-modern">
          <img class="profile-avatar" [src]="user.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'" [alt]="user.firstName">
          <div class="profile-user-info">
            <h2>{{ user.firstName || user.name }} {{ user.lastName || '' }}</h2>
            <span class="role-badge">{{ getRoleLabel(user.role) }}</span>
            <p class="profile-email"><i class="material-icons">email</i> {{ user.email }}</p>
          </div>
        </div>
      </div>
      <div class="profile-right">
        <div class="profile-card-modern card">
          <!-- Formulaire CLIENT -->
          <form *ngIf="user.role === 'client'" class="profile-form-modern" (ngSubmit)="onSave()">
            <h3>Informations personnelles</h3>
            <div class="form-row-modern">
              <div class="form-group-modern">
                <label for="firstName"><i class="material-icons">person</i> Prénom</label>
                <input type="text" id="firstName" [(ngModel)]="user.firstName" name="firstName" required>
              </div>
              <div class="form-group-modern">
                <label for="lastName"><i class="material-icons">badge</i> Nom</label>
                <input type="text" id="lastName" [(ngModel)]="user.lastName" name="lastName" required>
              </div>
            </div>
            <div class="form-row-modern">
              <div class="form-group-modern">
                <label for="phone"><i class="material-icons">phone</i> Téléphone</label>
                <input type="tel" id="phone" [(ngModel)]="user.phone" name="phone" required>
              </div>
            </div>
            <h3>Adresse</h3>
            <div class="form-row-modern" *ngIf="user.address">
              <div class="form-group-modern">
                <label for="city">Ville</label>
                <input type="text" id="city" [(ngModel)]="user.address.city" name="address.city">
              </div>
              <div class="form-group-modern">
                <label for="postalCode">Code postal</label>
                <input type="text" id="postalCode" [(ngModel)]="user.address.postalCode" name="address.postalCode">
              </div>
            </div>
            <div class="form-row-modern" *ngIf="user.address">
              <div class="form-group-modern">
                <label for="arrondissement">Arrondissement</label>
                <select id="arrondissement" [(ngModel)]="user.address.arrondissement" name="address.arrondissement" (change)="onArrondissementChange(user.address.arrondissement)">
                  <option value="">Sélectionner</option>
                  <option *ngFor="let arr of arrondissements" [value]="arr.arrondissement">{{ arr.arrondissement }}</option>
                </select>
              </div>
              <div class="form-group-modern">
                <label for="sector">Secteur</label>
                <select id="sector" [(ngModel)]="user.address.sector" name="address.sector" (change)="onSecteurChange(user.address.sector)" [disabled]="!secteurs.length">
                  <option value="">Sélectionner</option>
                  <option *ngFor="let s of secteurs" [value]="s.secteur">{{ s.secteur }}</option>
                </select>
              </div>
              <div class="form-group-modern">
                <label for="neighborhood">Quartier</label>
                <select id="neighborhood" [(ngModel)]="user.address.neighborhood" name="address.neighborhood" [disabled]="!quartiers.length">
                  <option value="">Sélectionner</option>
                  <option *ngFor="let q of quartiers" [value]="q">{{ q }}</option>
                </select>
              </div>
            </div>
            <div class="form-row-modern" *ngIf="user.address">
              <div class="form-group-modern">
                <label for="street">Rue</label>
                <input type="text" id="street" [(ngModel)]="user.address.street" name="address.street">
              </div>
              <div class="form-group-modern">
                <label for="doorNumber">Porte</label>
                <input type="text" id="doorNumber" [(ngModel)]="user.address.doorNumber" name="address.doorNumber">
              </div>
              <div class="form-group-modern">
                <label for="doorColor">Couleur de la porte</label>
                <select id="doorColor" [(ngModel)]="user.address.doorColor" name="address.doorColor">
                  <option value="">Sélectionner</option>
                  <option value="blanc">Blanc</option>
                  <option value="noir">Noir</option>
                  <option value="marron">Marron</option>
                  <option value="bleu">Bleu</option>
                  <option value="rouge">Rouge</option>
                  <option value="vert">Vert</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            <div class="form-row-modern">
              <div class="form-group-modern">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="user.termsAccepted" name="termsAccepted" required>
                  J'accepte les conditions générales d'utilisation
                </label>
              </div>
              <div class="form-group-modern">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="user.receiveOffers" name="receiveOffers">
                  Je souhaite recevoir des offres et actualités
                </label>
              </div>
            </div>
            <div class="form-actions-modern">
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">save</i>
                Sauvegarder
              </button>
            </div>
          </form>

          <!-- Formulaire AGENCY -->
          <form *ngIf="user.role === 'agency'" class="profile-form-modern" (ngSubmit)="onSave()">
            <h3>Informations de l'agence</h3>
            <div class="form-row-modern">
              <div class="form-group-modern">
                <label for="agencyName"><i class="material-icons">business</i> Nom de l'agence</label>
                <input type="text" id="agencyName" [(ngModel)]="user.name" name="name" required>
              </div>
              <div class="form-group-modern">
                <label for="agencyDescription"><i class="material-icons">description</i> Description</label>
                <textarea id="agencyDescription" [(ngModel)]="user.description" name="description" rows="2"></textarea>
              </div>
            </div>
            <div class="form-row-modern">
              <div class="form-group-modern">
                <label for="agencyPhone"><i class="material-icons">phone</i> Téléphone</label>
                <input type="tel" id="agencyPhone" [(ngModel)]="user.phone" name="phone" required>
              </div>
              <div class="form-group-modern">
                <label for="agencyEmail"><i class="material-icons">email</i> Email</label>
                <input type="email" id="agencyEmail" [(ngModel)]="user.email" name="email" required>
              </div>
            </div>
            <div class="form-row-modern">
              <div class="form-group-modern">
                <label for="serviceZones">Zones de service (secteurs)</label>
                <select id="serviceZones" [(ngModel)]="user.serviceZones" name="serviceZones" multiple>
                  <option *ngFor="let s of allSecteurs" [value]="s.secteur">Secteur {{ s.secteur }}</option>
                </select>
              </div>
              <div class="form-group-modern">
                <label for="services">Services proposés</label>
                <select id="services" [(ngModel)]="user.services" name="services" multiple>
                  <option *ngFor="let s of allServices" [value]="s">{{ s }}</option>
                </select>
              </div>
            </div>
            <div class="form-row-modern">
              <div class="form-group-modern">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="user.termsAccepted" name="termsAccepted" required>
                  J'accepte les conditions générales d'utilisation
                </label>
              </div>
              <div class="form-group-modern">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="user.receiveOffers" name="receiveOffers">
                  Je souhaite recevoir des offres et actualités
                </label>
              </div>
            </div>
            <div class="form-actions-modern">
              <button type="submit" class="btn btn-primary">
                <i class="material-icons">save</i>
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      min-height: 100vh;
      background: var(--light-gray);
      display: flex;
      flex-direction: column;
      /* align-items: center; */
      justify-content: center;
      padding: 32px 8px;
      width: 100vw;
      box-sizing: border-box;
    }
    .profile-flex-layout {
      display: flex;
      flex-direction: row;
      justify-content: center;
      /* align-items: center; */
      gap: 48px;
      width: 100%;
      max-width: 1000px;
      min-height: 70vh;
      margin: 0 auto;
    }
    .profile-left {
      flex: 1 1 320px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      min-width: 260px;
      max-width: 340px;
    }
    .profile-right {
      flex: 2 1 480px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      min-width: 320px;
      max-width: 520px;
    }
    .profile-header-modern {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
      gap: 16px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 18px;
      box-shadow: var(--shadow-light);
      padding: 32px 16px 24px 16px;
      width: 100%;
    }
    .profile-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid var(--accent-color);
      box-shadow: 0 4px 16px rgba(0, 188, 212, 0.12);
      margin-bottom: 8px;
      background: var(--white);
    }
    .profile-user-info {
      text-align: center;
    }
    .profile-user-info h2 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: var(--white);
      text-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    .role-badge {
      display: inline-block;
      background: var(--accent-color);
      color: var(--white);
      border-radius: 12px;
      padding: 4px 16px;
      font-size: 0.95rem;
      font-weight: 500;
      margin-bottom: 8px;
      box-shadow: 0 2px 8px rgba(255,112,67,0.10);
    }
    .profile-email {
      color: var(--white);
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: center;
      opacity: 0.95;
    }
    .profile-card-modern {
      background: var(--white);
      border-radius: 18px;
      box-shadow: var(--shadow-medium);
      padding: 32px 24px;
      width: 100%;
      margin-top: 0;
    }
    .profile-form-modern h3 {
      font-size: 1.3rem;
      font-weight: 600;
      margin-bottom: 24px;
      color: var(--primary-color);
      text-align: center;
    }
    .form-row-modern {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      margin-bottom: 16px;
    }
    .form-group-modern {
      flex: 1 1 180px;
      display: flex;
      flex-direction: column;
    }
    .form-group-modern label {
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .form-group-modern input, .form-group-modern select, .form-group-modern textarea {
      padding: 12px 14px;
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      font-size: 1rem;
      background: var(--light-gray);
      transition: border-color 0.2s;
    }
    .form-group-modern input:focus, .form-group-modern select:focus, .form-group-modern textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      background: var(--white);
    }
    .form-actions-modern {
      text-align: right;
      margin-top: 24px;
    }
    .btn.btn-primary {
      background: var(--primary-color);
      color: var(--white);
      border: none;
      border-radius: 8px;
      padding: 12px 32px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 188, 212, 0.10);
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s, box-shadow 0.2s;
    }
    .btn.btn-primary:hover {
      background: var(--secondary-color);
      color: var(--white);
      box-shadow: 0 4px 16px rgba(76,175,80,0.15);
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      font-size: 0.95rem;
      color: var(--text-primary);
    }
    .checkbox-label input {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-color);
    }
    @media (max-width: 900px) {
      .profile-flex-layout {
        flex-direction: column;
        gap: 24px;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 100vw;
        margin: 0 auto;
      }
      .profile-left, .profile-right {
        min-width: 0;
        max-width: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .profile-header-modern {
        padding: 24px 8px 16px 8px;
      }
    }
    @media (max-width: 600px) {
      .profile-card-modern {
        padding: 12px 2px;
      }
      .form-row-modern {
        flex-direction: column;
        gap: 10px;
      }
      .form-group-modern {
      flex: 1 1 100px;
      display: flex;
      flex-direction: column;
    }
      .profile-header-modern {
        gap: 8px;
        padding: 16px 2px 12px 2px;
      }
      .profile-flex-layout {
        flex-direction: column;
        gap: 16px;
        align-items: center;
        justify-content: flex-start;
        width: 100vw;
        min-width: 0;
        max-width: 100vw;
        margin: 0;
      }
      .profile-left, .profile-right {
        width: 100vw;
        max-width: 100vw;
        min-width: 0;
        padding: 0 2vw;
        box-sizing: border-box;
        align-items: center;
        justify-content: center;
      }
      .profile-header-modern, .profile-card-modern {
        width: 100%;
        min-width: 0;
        max-width: 100vw;
        border-radius: 0;
        box-shadow: none;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: any;
  // Pour le select en cascade
  arrondissements: QuartierData[] = OUAGA_DATA;
  secteurs: { secteur: string; quartiers: string[] }[] = [];
  quartiers: string[] = [];

  // Pour agency
  allServices: string[] = [
    'Collecte ménagère',
    'Recyclage',
    'Collecte industrielle',
    'Collecte spéciale',
    'Traitement déchets dangereux'
  ];
  allSecteurs: { secteur: string; quartiers: string[] }[] = [];

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    // Sécurise l'accès à address
    if (!this.user.address) {
      this.user.address = {};
    }
    // Pré-remplir les secteurs si adresse présente
    if (this.user?.address?.arrondissement) {
      this.onArrondissementChange(this.user.address.arrondissement);
    }
    if (this.user?.address?.sector) {
      this.onSecteurChange(this.user.address.sector);
    }
    // Pour agency, charger tous les secteurs
    this.allSecteurs = this.arrondissements.flatMap(a => a.secteurs);
  }

  onArrondissementChange(arrondissement: string) {
    const arr = this.arrondissements.find(a => a.arrondissement === arrondissement);
    this.secteurs = arr ? arr.secteurs : [];
    this.quartiers = [];
    if (this.user?.address) {
      this.user.address.sector = '';
      this.user.address.neighborhood = '';
    }
  }

  onSecteurChange(secteur: string) {
    const secteurObj = this.secteurs.find(s => s.secteur === secteur);
    this.quartiers = secteurObj ? secteurObj.quartiers : [];
    if (this.user?.address) {
      this.user.address.neighborhood = '';
    }
  }

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'client': 'Client',
      'agency': 'Agence',
      'collector': 'Collecteur',
      'municipality': 'Mairie'
    };
    return roleLabels[role] || role;
  }

  onSave(): void {
    if (this.user.role === 'client') {
      const userEdit = {
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        phone: this.user.phone,
        address: {
          street: this.user.address?.street || '',
          doorNumber: this.user.address?.doorNumber || '',
          doorColor: this.user.address?.doorColor || '',
          arrondissement: this.user.address?.arrondissement || '',
          sector: this.user.address?.sector || '',
          neighborhood: this.user.address?.neighborhood || '',
          city: this.user.address?.city || '',
          postalCode: this.user.address?.postalCode || ''
        },
        termsAccepted: !!this.user.termsAccepted,
        receiveOffers: !!this.user.receiveOffers
      };
      console.log('Profile saved (client):', userEdit);
      this.authService.updateClient(this.user?.id, userEdit).subscribe(
        response => {
          console.log('Profile updated successfully:', response);
        },
        error => {
          console.error('Error updating profile:', error);
        }
      );
    } else if (this.user.role === 'agency') {
      const agencyEdit = {
        name: this.user.name,
        description: this.user.description,
        phone: this.user.phone,
        email: this.user.email,
        serviceZones: this.user.serviceZones || [],
        services: this.user.services || [],
        termsAccepted: !!this.user.termsAccepted,
        receiveOffers: !!this.user.receiveOffers
      };
      console.log('Profile saved (agency):', agencyEdit);
      this.authService.updateClient(this.user?.id, agencyEdit).subscribe(
        response => {
          console.log('Agency profile updated successfully:', response);
        },
        error => {
          console.error('Error updating agency profile:', error);
        }
      );
    }
  }
}