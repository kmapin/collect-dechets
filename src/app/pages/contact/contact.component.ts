import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="contact-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Contactez-nous</h1>
          <p class="page-subtitle">
            Notre équipe est là pour répondre à toutes vos questions et vous accompagner
          </p>
        </div>
      </div>

      <div class="container">
        <div class="contact-content">
          <div class="contact-info">
            <div class="info-card card">
              <h3>Informations de contact</h3>
              <div class="contact-item">
                <i class="material-icons">phone</i>
                <div>
                  <strong>Téléphone</strong>
                  <p>+33 1 23 45 67 89</p>
                </div>
              </div>
              <div class="contact-item">
                <i class="material-icons">email</i>
                <div>
                  <strong>Email</strong>
                  <p>contact&#64;wastemanager.fr</p>
                </div>
              </div>
              <div class="contact-item">
                <i class="material-icons">location_on</i>
                <div>
                  <strong>Adresse</strong>
                  <p>123 Avenue de l'Environnement<br>75001 Paris, France</p>
                </div>
              </div>
            </div>
          </div>

          <div class="contact-form-section">
            <form class="contact-form card" (ngSubmit)="onSubmit()">
              <h3>Envoyez-nous un message</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">Prénom *</label>
                  <input type="text" id="firstName" [(ngModel)]="formData.firstName" name="firstName" required>
                </div>
                <div class="form-group">
                  <label for="lastName">Nom *</label>
                  <input type="text" id="lastName" [(ngModel)]="formData.lastName" name="lastName" required>
                </div>
              </div>

              <div class="form-group">
                <label for="email">Email *</label>
                <input type="email" id="email" [(ngModel)]="formData.email" name="email" required>
              </div>

              <div class="form-group">
                <label for="subject">Sujet *</label>
                <select id="subject" [(ngModel)]="formData.subject" name="subject" required>
                  <option value="">Sélectionnez un sujet</option>
                  <option value="general">Question générale</option>
                  <option value="technical">Support technique</option>
                  <option value="billing">Facturation</option>
                  <option value="partnership">Partenariat</option>
                </select>
              </div>

              <div class="form-group">
                <label for="message">Message *</label>
                <textarea id="message" [(ngModel)]="formData.message" name="message" rows="5" required></textarea>
              </div>

              <button type="submit" class="btn btn-primary">
                <i class="material-icons">send</i>
                Envoyer le message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .contact-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .contact-content {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .info-card,
    .contact-form {
      padding: 32px;
    }

    .contact-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }

    .contact-item i {
      color: var(--primary-color);
      font-size: 24px;
      margin-top: 4px;
    }

    .contact-item strong {
      display: block;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .contact-item p {
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .contact-form h3 {
      margin-bottom: 24px;
      color: var(--text-primary);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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

    @media (max-width: 768px) {
      .contact-content {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ContactComponent {
  formData = {
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  };

  onSubmit(): void {
    console.log('Form submitted:', this.formData);
    // Handle form submission
  }
}