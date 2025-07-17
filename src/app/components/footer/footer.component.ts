import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <footer class="footer">
      <!-- Particules d'arrière-plan -->
      <div class="footer-particles">
        <div class="particle" *ngFor="let particle of particles" 
             [style.left.%]="particle.x" 
             [style.top.%]="particle.y"
             [style.animation-delay.s]="particle.delay"></div>
      </div>

      <div class="container">
        <!-- Section principale du footer -->
        <div class="footer-main">
          <div class="footer-content">
            <!-- Section Brand -->
            <div class="footer-section brand-section">
              <div class="footer-brand">
                <div class="brand-icon">
                  <i class="material-icons">eco</i>
                </div>
                <div class="brand-text">
                  <span class="brand-name">WasteManager</span>
                  <span class="brand-tagline">Gestion Intelligente</span>
                </div>
              </div>
              <p class="footer-description">
                Révolutionnez votre gestion des déchets avec notre plateforme intelligente. 
                Connectant citoyens, entreprises et collecteurs pour un avenir plus propre et durable.
              </p>
              
              <!-- Réseaux sociaux -->
              <div class="social-section">
                <h4>Suivez-nous</h4>
                <div class="social-links">
                  <a href="#" class="social-link facebook" aria-label="Facebook">
                    <i class="material-icons">facebook</i>
                  </a>
                  <a href="#" class="social-link twitter" aria-label="Twitter">
                    <i class="material-icons">alternate_email</i>
                  </a>
                  <a href="#" class="social-link linkedin" aria-label="LinkedIn">
                    <i class="material-icons">business</i>
                  </a>
                  <a href="#" class="social-link instagram" aria-label="Instagram">
                    <i class="material-icons">photo_camera</i>
                  </a>
                  <a href="#" class="social-link youtube" aria-label="YouTube">
                    <i class="material-icons">play_circle_filled</i>
                  </a>
                </div>
              </div>
            </div>

            <!-- Services -->
            <div class="footer-section">
              <h4 class="footer-section-title">
                <i class="material-icons">build</i>
                Services
              </h4>
              <ul class="footer-links">
                <li><a routerLink="/agencies" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Trouver une agence
                </a></li>
                <li><a routerLink="/waste-types" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Guide du tri
                </a></li>
                <li><a routerLink="/schedule" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Calendrier collecte
                </a></li>
                <li><a routerLink="/subscription" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Abonnements
                </a></li>
                <li><a href="#" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Collecte express
                </a></li>
              </ul>
            </div>

            <!-- Support -->
            <div class="footer-section">
              <h4 class="footer-section-title">
                <i class="material-icons">support_agent</i>
                Support
              </h4>
              <ul class="footer-links">
                <li><a routerLink="/faq" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Questions fréquentes
                </a></li>
                <li><a routerLink="/help" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Centre d'aide
                </a></li>
                <li><a routerLink="/contact" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Nous contacter
                </a></li>
                <li><a routerLink="/report" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Signaler un problème
                </a></li>
                <li><a href="#" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Chat en direct
                </a></li>
              </ul>
            </div>

            <!-- Entreprise -->
            <div class="footer-section">
              <h4 class="footer-section-title">
                <i class="material-icons">business</i>
                Entreprise
              </h4>
              <ul class="footer-links">
                <li><a routerLink="/about" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  À propos de nous
                </a></li>
                <li><a href="#" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Notre équipe
                </a></li>
                <li><a href="#" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Carrières
                </a></li>
                <li><a href="#" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Partenaires
                </a></li>
                <li><a href="#" class="footer-link">
                  <i class="material-icons">chevron_right</i>
                  Investisseurs
                </a></li>
              </ul>
            </div>

            <!-- Newsletter -->
            <div class="footer-section newsletter-section">
              <h4 class="footer-section-title">
                <i class="material-icons">mail</i>
                Newsletter
              </h4>
              <p class="newsletter-description">
                Restez informé des dernières actualités, conseils écologiques et nouvelles fonctionnalités.
              </p>
              
              <form class="newsletter-form" (ngSubmit)="onNewsletterSubmit($event)">
                <div class="newsletter-input-group">
                  <input 
                    type="email" 
                    [(ngModel)]="newsletterEmail"
                    name="email"
                    placeholder="Votre adresse email" 
                    class="newsletter-input"
                    required>
                  <button type="submit" class="newsletter-btn" [disabled]="isSubmitting">
                    <i class="material-icons" *ngIf="!isSubmitting">send</i>
                    <i class="material-icons rotating" *ngIf="isSubmitting">hourglass_empty</i>
                  </button>
                </div>
                <div class="newsletter-benefits">
                  <div class="benefit-item">
                    <i class="material-icons">check_circle</i>
                    <span>Conseils écologiques hebdomadaires</span>
                  </div>
                  <div class="benefit-item">
                    <i class="material-icons">check_circle</i>
                    <span>Alertes nouvelles fonctionnalités</span>
                  </div>
                  <div class="benefit-item">
                    <i class="material-icons">check_circle</i>
                    <span>Pas de spam, désabonnement facile</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Section contact rapide -->
        <div class="footer-contact">
          <div class="contact-cards">
            <div class="contact-card">
              <div class="contact-icon">
                <i class="material-icons">phone</i>
              </div>
              <div class="contact-info">
                <span class="contact-label">Support 24/7</span>
                <a href="tel:+33123456789" class="contact-value">01 23 45 67 89</a>
              </div>
            </div>
            
            <div class="contact-card">
              <div class="contact-icon">
                <i class="material-icons">email</i>
              </div>
              <div class="contact-info">
                <span class="contact-label">Email</span>
                <a href="mailto:contact&#64;wastemanager.bf" class="contact-value">contact&#64;wastemanager.bf</a>
              </div>
            </div>
            
            <div class="contact-card">
              <div class="contact-icon">
                <i class="material-icons">location_on</i>
              </div>
              <div class="contact-info">
                <span class="contact-label">Siège social</span>
                <span class="contact-value">Ouagadougou, Burkina Faso</span>
              </div>
            </div>
            
            <div class="contact-card">
              <div class="contact-icon">
                <i class="material-icons">schedule</i>
              </div>
              <div class="contact-info">
                <span class="contact-label">Horaires</span>
                <span class="contact-value">Lun-Ven 8h-20h</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section certifications -->
        <div class="footer-certifications">
          <div class="certifications-content">
            <h4>Certifications & Partenaires</h4>
            <div class="certifications-grid">
              <div class="certification-item">
                <div class="cert-icon">
                  <i class="material-icons">verified</i>
                </div>
                <span>ISO 14001</span>
              </div>
              <div class="certification-item">
                <div class="cert-icon">
                  <i class="material-icons">eco</i>
                </div>
                <span>Label Vert</span>
              </div>
              <div class="certification-item">
                <div class="cert-icon">
                  <i class="material-icons">security</i>
                </div>
                <span>RGPD Conforme</span>
              </div>
              <div class="certification-item">
                <div class="cert-icon">
                  <i class="material-icons">star</i>
                </div>
                <span>Élu Service Client</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer bottom -->
        <div class="footer-bottom">
          <div class="footer-bottom-content">
            <div class="copyright">
              <p>© 2024 WasteManager. Tous droits réservés.</p>
              <p class="made-with">Fait avec <i class="material-icons heart">favorite</i> pour un monde plus propre</p>
            </div>
            
            <div class="footer-bottom-links">
              <a routerLink="/privacy" class="footer-bottom-link">Confidentialité</a>
              <a routerLink="/terms" class="footer-bottom-link">Conditions</a>
              <a href="#" class="footer-bottom-link">Cookies</a>
              <a href="#" class="footer-bottom-link">Plan du site</a>
            </div>
            
            <div class="footer-stats">
              <div class="stat-item">
                <span class="stat-number">50K+</span>
                <span class="stat-label">Utilisateurs</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">200+</span>
                <span class="stat-label">Agences</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">1M+</span>
                <span class="stat-label">Collectes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: var(--white);
      position: relative;
      overflow: hidden;
      margin-top: 80px;
    }

    /* Particules d'arrière-plan */
    .footer-particles {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1;
    }

    .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: rgba(0, 188, 212, 0.3);
      border-radius: 50%;
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
      50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
    }

    .container {
      position: relative;
      z-index: 2;
      max-width: 100%;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Section principale */
    .footer-main {
      padding: 80px 0 60px;
    }

    .footer-content {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1.5fr;
      gap: 48px;
    }

    .footer-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* Section Brand */
    .brand-section {
      gap: 24px;
    }

    .footer-brand {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .brand-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      box-shadow: 0 8px 32px rgba(0, 188, 212, 0.3);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
    }

    .brand-tagline {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .footer-description {
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.7;
      font-size: 1rem;
    }

    /* Réseaux sociaux */
    .social-section h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--white);
    }

    .social-links {
      display: flex;
      gap: 12px;
    }

    .social-link {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .social-link::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.1));
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .social-link:hover::before {
      opacity: 1;
    }

    .social-link.facebook { background: #1877f2; }
    .social-link.twitter { background: #1da1f2; }
    .social-link.linkedin { background: #0077b5; }
    .social-link.instagram { background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
    .social-link.youtube { background: #ff0000; }

    .social-link:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }

    /* Titres de sections */
    .footer-section-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--white);
      margin-bottom: 20px;
      position: relative;
    }

    .footer-section-title::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 0;
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
      border-radius: 1px;
    }

    .footer-section-title i {
      color: var(--primary-color);
      font-size: 20px;
    }

    /* Liens du footer */
    .footer-links {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .footer-link {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      padding: 8px 0;
      position: relative;
    }

    .footer-link i {
      font-size: 16px;
      color: var(--primary-color);
      transition: transform 0.3s ease;
    }

    .footer-link:hover {
      color: var(--primary-color);
      transform: translateX(8px);
    }

    .footer-link:hover i {
      transform: translateX(4px);
    }

    /* Newsletter */
    .newsletter-section {
      background: rgba(255, 255, 255, 0.05);
      padding: 24px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }

    .newsletter-description {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .newsletter-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .newsletter-input-group {
      display: flex;
      gap: 8px;
    }

    .newsletter-input {
      flex: 1;
      padding: 14px 16px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--white);
      font-family: 'Inter', sans-serif;
      font-size: 0.95rem;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .newsletter-input::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }

    .newsletter-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(0, 188, 212, 0.2);
      background: rgba(255, 255, 255, 0.15);
    }

    .newsletter-btn {
      padding: 14px 20px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border: none;
      border-radius: 12px;
      color: var(--white);
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0, 188, 212, 0.3);
    }

    .newsletter-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 188, 212, 0.4);
    }

    .newsletter-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .rotating {
      animation: rotate 1s linear infinite;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .newsletter-benefits {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .benefit-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.85rem;
    }

    .benefit-item i {
      color: var(--success-color);
      font-size: 16px;
    }

    /* Section contact */
    .footer-contact {
      padding: 40px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .contact-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }

    .contact-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .contact-card:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .contact-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .contact-label {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      font-weight: 500;
      letter-spacing: 0.5px;
    }

    .contact-value {
      color: var(--white);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.3s ease;
    }

    .contact-value:hover {
      color: var(--primary-color);
    }

    /* Certifications */
    .footer-certifications {
      padding: 40px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .certifications-content h4 {
      text-align: center;
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 24px;
      color: var(--white);
    }

    .certifications-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
    }

    .certification-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      text-align: center;
    }

    .certification-item:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-2px);
    }

    .cert-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .certification-item span {
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
    }

    /* Footer bottom */
    .footer-bottom {
      padding: 32px 0;
    }

    .footer-bottom-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .copyright {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .copyright p {
      margin: 0;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9rem;
    }

    .made-with {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.85rem !important;
    }

    .heart {
      color: #ff4757;
      font-size: 14px !important;
      animation: heartbeat 1.5s ease-in-out infinite;
    }

    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .footer-bottom-links {
      display: flex;
      gap: 24px;
    }

    .footer-bottom-link {
      color: rgba(255, 255, 255, 0.7);
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.3s ease;
      position: relative;
    }

    .footer-bottom-link::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: var(--primary-color);
      transition: width 0.3s ease;
    }

    .footer-bottom-link:hover {
      color: var(--primary-color);
    }

    .footer-bottom-link:hover::after {
      width: 100%;
    }

    .footer-stats {
      display: flex;
      gap: 24px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .stat-number {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--primary-color);
      line-height: 1;
    }

    .stat-label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .footer-content {
        grid-template-columns: 2fr 1fr 1fr 1.5fr;
        gap: 32px;
      }
    }

    @media (max-width: 1024px) {
      .footer-content {
        grid-template-columns: 1fr 1fr;
        gap: 32px;
      }

      .brand-section {
        grid-column: 1 / -1;
      }

      .newsletter-section {
        grid-column: 1 / -1;
      }

      .footer-bottom-content {
        flex-direction: column;
        text-align: center;
        gap: 20px;
      }

      .footer-stats {
        justify-content: center;
      }
    }

    @media (max-width: 768px) {
      .footer-main {
        padding: 60px 0 40px;
      }

      .footer-content {
        grid-template-columns: 1fr;
        gap: 32px;
      }

      .contact-cards {
        grid-template-columns: 1fr;
      }

      .certifications-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .footer-bottom-links {
        flex-wrap: wrap;
        justify-content: center;
        gap: 16px;
      }

      .footer-stats {
        flex-wrap: wrap;
        justify-content: center;
        gap: 16px;
      }

      .newsletter-input-group {
        flex-direction: column;
      }

      .social-links {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .container {
        padding: 0 16px;
      }

      .footer-main {
        padding: 40px 0 32px;
      }

      .footer-contact,
      .footer-certifications {
        padding: 32px 0;
      }

      .footer-bottom {
        padding: 24px 0;
      }

      .brand-name {
        font-size: 1.5rem;
      }

      .brand-tagline {
        font-size: 0.8rem;
      }

      .certifications-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class FooterComponent {
  newsletterEmail = '';
  isSubmitting = false;
  
  particles = Array.from({ length: 20 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 6
  }));

  onNewsletterSubmit(event: Event): void {
    event.preventDefault();
    
    if (!this.newsletterEmail) return;
    
    this.isSubmitting = true;
    
    // Simuler l'envoi
    setTimeout(() => {
      this.isSubmitting = false;
      this.newsletterEmail = '';
      // Ici vous pourriez ajouter une notification de succès
      console.log('Newsletter subscription successful');
    }, 2000);
  }
}