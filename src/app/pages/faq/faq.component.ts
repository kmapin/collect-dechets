import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  isExpanded?: boolean;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="faq-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Questions Fréquentes</h1>
          <p class="page-subtitle">
            Trouvez rapidement les réponses à vos questions sur la collecte de déchets, 
            le tri, les abonnements et bien plus encore. Notre FAQ complète vous guide 
            pas à pas dans l'utilisation de nos services.
          </p>
        </div>
      </div>

      <div class="container">
        <!-- Barre de recherche -->
        <div class="search-section">
          <div class="search-box">
            <i class="material-icons search-icon">search</i>
            <input 
              type="text" 
              [(ngModel)]="searchQuery"
              (input)="filterFAQ()"
              placeholder="Rechercher dans la FAQ..."
              class="search-input">
          </div>
          <p class="search-help">
            Tapez des mots-clés comme "collecte", "tri", "paiement", "horaires"...
          </p>
        </div>

        <!-- Catégories -->
        <div class="categories-section">
          <h2 class="section-title">Parcourir par catégorie</h2>
          <div class="categories-grid">
            <button 
              *ngFor="let category of categories" 
              class="category-card"
              [class.active]="selectedCategory === category.id"
              (click)="selectCategory(category.id)">
              <div class="category-icon">
                <i class="material-icons">{{ category.icon }}</i>
              </div>
              <h3 class="category-name">{{ category.name }}</h3>
              <p class="category-description">{{ category.description }}</p>
              <span class="category-count">{{ getCategoryCount(category.id) }} questions</span>
            </button>
          </div>
        </div>

        <!-- Questions populaires -->
        <div class="popular-section" *ngIf="!searchQuery && selectedCategory === 'all'">
          <h2 class="section-title">Questions les plus populaires</h2>
          <div class="popular-questions">
            <div *ngFor="let faq of getPopularQuestions()" class="popular-question-card card">
              <div class="popular-question-content" (click)="toggleFAQ(faq)">
                <h4 class="popular-question-title">{{ faq.question }}</h4>
                <i class="material-icons expand-icon" 
                   [class.expanded]="faq.isExpanded">expand_more</i>
              </div>
              <div class="popular-answer" [class.expanded]="faq.isExpanded">
                <p>{{ faq.answer }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Liste des FAQ -->
        <div class="faq-section">
          <div class="faq-header">
            <h2 class="section-title">
              {{ getFilteredFAQ().length }} question(s) 
              <span *ngIf="selectedCategory !== 'all'">
                dans {{ getCategoryName(selectedCategory) }}
              </span>
              <span *ngIf="searchQuery">
                pour "{{ searchQuery }}"
              </span>
            </h2>
            <button class="clear-filters-btn" 
                    *ngIf="selectedCategory !== 'all' || searchQuery"
                    (click)="clearFilters()">
              <i class="material-icons">clear</i>
              Effacer les filtres
            </button>
          </div>

          <div class="faq-list">
            <div *ngFor="let faq of getFilteredFAQ()" class="faq-item card">
              <div class="faq-question" (click)="toggleFAQ(faq)">
                <h3 class="question-text">{{ faq.question }}</h3>
                <div class="question-meta">
                  <span class="category-badge">{{ getCategoryName(faq.category) }}</span>
                  <i class="material-icons expand-icon" 
                     [class.expanded]="faq.isExpanded">expand_more</i>
                </div>
              </div>
              <div class="faq-answer" [class.expanded]="faq.isExpanded">
                <div class="answer-content">
                  <p>{{ faq.answer }}</p>
                  <div class="answer-tags" *ngIf="faq.tags.length > 0">
                    <span class="tag" *ngFor="let tag of faq.tags">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Message si aucun résultat -->
          <div *ngIf="getFilteredFAQ().length === 0" class="no-results">
            <div class="no-results-content">
              <i class="material-icons">help_outline</i>
              <h3>Aucune question trouvée</h3>
              <p>Essayez avec d'autres mots-clés ou parcourez les catégories.</p>
              <button class="btn btn-primary" (click)="clearFilters()">
                Voir toutes les questions
              </button>
            </div>
          </div>
        </div>

        <!-- Section contact -->
        <div class="contact-section">
          <div class="contact-card card">
            <div class="contact-content">
              <div class="contact-icon">
                <i class="material-icons">support_agent</i>
              </div>
              <div class="contact-text">
                <h3>Vous ne trouvez pas votre réponse ?</h3>
                <p>Notre équipe support est là pour vous aider. Contactez-nous pour obtenir une assistance personnalisée.</p>
              </div>
              <div class="contact-actions">
                <button class="btn btn-primary">
                  <i class="material-icons">chat</i>
                  Chat en direct
                </button>
                <button class="btn btn-secondary">
                  <i class="material-icons">email</i>
                  Envoyer un email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .faq-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .search-section {
      text-align: center;
      margin-bottom: 48px;
    }

    .search-box {
      position: relative;
      max-width: 600px;
      margin: 0 auto 12px;
    }

    .search-icon {
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      font-size: 24px;
    }

    .search-input {
      width: 100%;
      padding: 20px 20px 20px 60px;
      border: 2px solid var(--medium-gray);
      border-radius: 50px;
      font-size: 1.1rem;
      font-family: 'Inter', sans-serif;
      transition: all 0.3s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 4px rgba(0, 188, 212, 0.1);
    }

    .search-help {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .categories-section {
      margin-bottom: 48px;
    }

    .section-title {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 24px;
      color: var(--text-primary);
      text-align: center;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .category-card {
      background: var(--white);
      border: 2px solid var(--medium-gray);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .category-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-4px);
      box-shadow: var(--shadow-medium);
    }

    .category-card.active {
      border-color: var(--primary-color);
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: var(--white);
    }

    .category-icon {
      width: 60px;
      height: 60px;
      background: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      color: var(--white);
      font-size: 28px;
    }

    .category-card.active .category-icon {
      background: rgba(255, 255, 255, 0.2);
    }

    .category-name {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .category-description {
      font-size: 0.9rem;
      margin-bottom: 12px;
      opacity: 0.8;
    }

    .category-count {
      font-size: 0.8rem;
      font-weight: 500;
      opacity: 0.7;
    }

    .popular-section {
      margin-bottom: 48px;
    }

    .popular-questions {
      display: grid;
      gap: 16px;
    }

    .popular-question-card {
      padding: 0;
      overflow: hidden;
    }

    .popular-question-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .popular-question-content:hover {
      background: var(--light-gray);
    }

    .popular-question-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .expand-icon {
      color: var(--text-secondary);
      transition: transform 0.3s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .popular-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      background: var(--light-gray);
    }

    .popular-answer.expanded {
      max-height: 200px;
    }

    .popular-answer p {
      padding: 20px 24px;
      margin: 0;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .faq-section {
      margin-bottom: 48px;
    }

    .faq-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .clear-filters-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--white);
      border: 2px solid var(--medium-gray);
      border-radius: 8px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .clear-filters-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .faq-item {
      padding: 0;
      overflow: hidden;
    }

    .faq-question {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .faq-question:hover {
      background: var(--light-gray);
    }

    .question-text {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
      flex: 1;
      margin-right: 16px;
    }

    .question-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .category-badge {
      padding: 4px 12px;
      background: var(--primary-color);
      color: var(--white);
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      background: var(--light-gray);
    }

    .faq-answer.expanded {
      max-height: 300px;
    }

    .answer-content {
      padding: 24px;
    }

    .answer-content p {
      margin: 0 0 16px 0;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .answer-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag {
      padding: 4px 8px;
      background: var(--white);
      border: 1px solid var(--medium-gray);
      border-radius: 12px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .no-results {
      text-align: center;
      padding: 60px 20px;
    }

    .no-results-content {
      max-width: 400px;
      margin: 0 auto;
    }

    .no-results i {
      font-size: 64px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    .no-results h3 {
      font-size: 1.5rem;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .no-results p {
      color: var(--text-secondary);
      margin-bottom: 24px;
      line-height: 1.6;
    }

    .contact-section {
      margin-top: 48px;
    }

    .contact-card {
      padding: 32px;
      text-align: center;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      color: var(--white);
    }

    .contact-content {
      display: flex;
      align-items: center;
      gap: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .contact-icon {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      flex-shrink: 0;
    }

    .contact-text {
      flex: 1;
      text-align: left;
    }

    .contact-text h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .contact-text p {
      opacity: 0.9;
      line-height: 1.6;
    }

    .contact-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .contact-actions .btn {
      background: var(--white);
      color: var(--primary-color);
      border: 2px solid var(--white);
    }

    .contact-actions .btn-secondary {
      background: transparent;
      color: var(--white);
      border-color: var(--white);
    }

    .contact-actions .btn:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .categories-grid {
        grid-template-columns: 1fr;
      }

      .faq-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }

      .contact-content {
        flex-direction: column;
        text-align: center;
      }

      .contact-text {
        text-align: center;
      }

      .contact-actions {
        flex-direction: row;
        justify-content: center;
      }

      .question-text {
        font-size: 1rem;
      }

      .faq-question {
        padding: 20px;
      }

      .answer-content {
        padding: 20px;
      }
    }
  `]
})
export class FaqComponent implements OnInit {
  searchQuery = '';
  selectedCategory = 'all';

  categories: FAQCategory[] = [
    {
      id: 'all',
      name: 'Toutes',
      icon: 'help',
      description: 'Toutes les questions fréquentes'
    },
    {
      id: 'subscription',
      name: 'Abonnement',
      icon: 'card_membership',
      description: 'Questions sur les abonnements et tarifs'
    },
    {
      id: 'collection',
      name: 'Collecte',
      icon: 'local_shipping',
      description: 'Horaires, fréquence et modalités'
    },
    {
      id: 'sorting',
      name: 'Tri',
      icon: 'sort',
      description: 'Consignes de tri et types de déchets'
    },
    {
      id: 'payment',
      name: 'Paiement',
      icon: 'payment',
      description: 'Facturation et modes de paiement'
    },
    {
      id: 'technical',
      name: 'Technique',
      icon: 'settings',
      description: 'Problèmes techniques et support'
    }
  ];

  faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'Comment m\'abonner à un service de collecte ?',
      answer: 'Pour vous abonner, recherchez d\'abord une agence qui dessert votre zone géographique via notre moteur de recherche. Sélectionnez l\'agence qui vous convient, choisissez le service adapté à vos besoins, puis suivez le processus d\'inscription en ligne. Vous devrez fournir vos informations personnelles, votre adresse précise de collecte et choisir un mode de paiement.',
      category: 'subscription',
      tags: ['abonnement', 'inscription', 'agence']
    },
    {
      id: '2',
      question: 'Quels sont les horaires de collecte ?',
      answer: 'Les horaires varient selon votre agence et votre zone. Généralement, vous devez sortir vos bacs la veille au soir après 19h ou le matin avant 7h le jour de collecte. Consultez votre planning personnalisé dans votre espace client ou contactez votre agence pour connaître les horaires précis de votre secteur.',
      category: 'collection',
      tags: ['horaires', 'collecte', 'bacs']
    },
    {
      id: '3',
      question: 'Que faire si ma collecte n\'a pas eu lieu ?',
      answer: 'Si votre collecte n\'a pas eu lieu à la date prévue, vérifiez d\'abord qu\'il ne s\'agit pas d\'un jour férié. Ensuite, connectez-vous à votre espace client pour signaler le problème dans les 48h. Votre agence sera automatiquement notifiée et organisera une collecte de rattrapage. En cas de récidive, un avoir pourra être appliqué sur votre facture.',
      category: 'collection',
      tags: ['collecte manquée', 'signalement', 'rattrapage']
    },
    {
      id: '4',
      question: 'Comment bien trier mes déchets ?',
      answer: 'Le tri dépend du type de déchets. Utilisez le bac vert pour les déchets ménagers non recyclables, le bac jaune pour les recyclables (plastiques, papiers, métaux), et les conteneurs spéciaux pour le verre. Consultez notre guide détaillé des types de déchets pour connaître les consignes précises. En cas de doute, privilégiez le bac des déchets ménagers.',
      category: 'sorting',
      tags: ['tri', 'déchets', 'recyclage', 'bacs']
    },
    {
      id: '5',
      question: 'Quels sont les modes de paiement acceptés ?',
      answer: 'Nous acceptons les cartes bancaires (Visa, Mastercard), les virements SEPA, et selon votre région, les paiements par mobile money. Le prélèvement automatique est recommandé pour éviter les oublis. Vous pouvez modifier votre mode de paiement à tout moment dans votre espace client.',
      category: 'payment',
      tags: ['paiement', 'carte bancaire', 'virement', 'prélèvement']
    },
    {
      id: '6',
      question: 'Puis-je modifier mon abonnement ?',
      answer: 'Oui, vous pouvez modifier votre abonnement à tout moment. Connectez-vous à votre espace client pour changer de formule, ajuster la fréquence de collecte, ou modifier vos services. Les modifications prennent effet au cycle de facturation suivant. Pour les changements urgents, contactez directement votre agence.',
      category: 'subscription',
      tags: ['modification', 'abonnement', 'formule']
    },
    {
      id: '7',
      question: 'Comment résilier mon abonnement ?',
      answer: 'La résiliation peut être effectuée depuis votre espace client avec un préavis de 30 jours. Vous devez être à jour de vos paiements. La résiliation prend effet à la fin de votre période de facturation en cours. Vous recevrez une confirmation par email et devrez retourner les bacs fournis par l\'agence.',
      category: 'subscription',
      tags: ['résiliation', 'préavis', 'annulation']
    },
    {
      id: '8',
      question: 'Que faire en cas de bac endommagé ?',
      answer: 'Signalez immédiatement tout dommage via votre espace client ou en contactant votre agence. Joignez des photos si possible. L\'agence évaluera si le dommage est dû à l\'usure normale (remplacement gratuit) ou à une mauvaise utilisation (facturation possible). Un nouveau bac vous sera livré dans les 48h ouvrées.',
      category: 'technical',
      tags: ['bac', 'dommage', 'remplacement']
    },
    {
      id: '9',
      question: 'Comment suivre mes collectes en temps réel ?',
      answer: 'Téléchargez notre application mobile ou connectez-vous à votre espace client. Vous y trouverez le suivi en temps réel de vos collectes, avec notifications push quand le collecteur est dans votre secteur. Vous pouvez également voir l\'historique complet de vos collectes et noter la qualité du service.',
      category: 'technical',
      tags: ['suivi', 'temps réel', 'application', 'notifications']
    },
    {
      id: '10',
      question: 'Quels déchets ne sont pas acceptés ?',
      answer: 'Les déchets dangereux (peintures, solvants, batteries), les déchets médicaux, l\'amiante, les déchets électroniques volumineux, et les déchets de construction ne sont pas acceptés dans la collecte standard. Utilisez les déchetteries municipales ou les collectes spécialisées pour ces déchets. Consultez notre guide des déchets interdits pour plus de détails.',
      category: 'sorting',
      tags: ['déchets interdits', 'dangereux', 'déchetterie']
    },
    {
      id: '11',
      question: 'Comment contacter mon agence de collecte ?',
      answer: 'Vous trouverez les coordonnées de votre agence dans votre espace client, section "Mon agence". Vous pouvez les contacter par téléphone, email, ou via le chat intégré à la plateforme. Pour les urgences (collecte manquée, problème grave), utilisez le numéro d\'urgence disponible 24h/24.',
      category: 'technical',
      tags: ['contact', 'agence', 'support', 'urgence']
    },
    {
      id: '12',
      question: 'Puis-je programmer une collecte ponctuelle ?',
      answer: 'Oui, la plupart des agences proposent des collectes ponctuelles pour les déchets volumineux ou en cas de besoin exceptionnel. Connectez-vous à votre espace client, section "Services additionnels", ou contactez directement votre agence. Des frais supplémentaires s\'appliquent selon le type et le volume de déchets.',
      category: 'collection',
      tags: ['collecte ponctuelle', 'volumineux', 'exceptionnel']
    }
  ];

  ngOnInit(): void {}

  filterFAQ(): void {
    // La filtration est gérée par getFilteredFAQ()
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'all';
  }

  toggleFAQ(faq: FAQItem): void {
    faq.isExpanded = !faq.isExpanded;
  }

  getFilteredFAQ(): FAQItem[] {
    let filtered = this.faqItems;

    // Filtrer par catégorie
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === this.selectedCategory);
    }

    // Filtrer par recherche
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  getPopularQuestions(): FAQItem[] {
    // Retourne les 5 questions les plus populaires
    return this.faqItems.slice(0, 5);
  }

  getCategoryCount(categoryId: string): number {
    if (categoryId === 'all') {
      return this.faqItems.length;
    }
    return this.faqItems.filter(item => item.category === categoryId).length;
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : '';
  }
}