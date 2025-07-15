import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="report-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Signaler un Problème</h1>
          <p class="page-subtitle">
            Signalez un problème de collecte ou un incident
          </p>
        </div>
      </div>

      <div class="container">
        <div class="report-content">
          <form class="report-form card" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label for="type">Type de problème</label>
              <select id="type" [(ngModel)]="reportData.type" name="type" required>
                <option value="">Sélectionnez un type</option>
                <option value="missed">Collecte manquée</option>
                <option value="incomplete">Collecte incomplète</option>
                <option value="damage">Dommage</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea 
                id="description" 
                [(ngModel)]="reportData.description" 
                name="description" 
                rows="4" 
                placeholder="Décrivez le problème en détail..."
                required></textarea>
            </div>

            <div class="form-group">
              <label for="date">Date du problème</label>
              <input type="date" id="date" [(ngModel)]="reportData.date" name="date" required>
            </div>

            <button type="submit" class="btn btn-primary">
              <i class="material-icons">send</i>
              Envoyer le signalement
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .report-content {
      max-width: 600px;
      margin: 0 auto;
    }

    .report-form {
      padding: 32px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
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

    .form-group textarea {
      resize: vertical;
    }
  `]
})
export class ReportComponent {
  reportData = {
    type: '',
    description: '',
    date: ''
  };

  onSubmit(): void {
    console.log('Report submitted:', this.reportData);
    // Handle report submission
  }
}