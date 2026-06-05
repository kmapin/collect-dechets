import { Component, OnInit } from '@angular/core';

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
  imports: [FormsModule],
  templateUrl: './faq.html',
  styleUrl: './faq.css'
})
export class Faq  implements OnInit {
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

  sendMail() {
    const email = 'contact@zerodechet.bf';
    const subject = encodeURIComponent('Demande d’information');
    const body = encodeURIComponent('Bonjour,\n\nJe souhaite avoir plus d’informations.');
  
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }
  
}