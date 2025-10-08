import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AgencyService } from '../../services/agency.service';
import { Agency, Tariff } from '../../models/agency.model';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/user.model';
import { MessagesService } from '../../services/messages.service';
import { Message } from '../../models/message.model';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CountriesOrgMockService } from '../../services/countries-org-mock.service';


@Component({
  selector: 'app-agency-details',
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './agency-details.html',
  styleUrl: './agency-details.css'
})
export class AgencyDetails implements OnInit {
  agency: Agency | null = null;
  agencyId: string | null = null;
  agencyIdd: string | null = null;
  currentUser: User | null = null;
  messageData: Message = {
    sender: '',
    receiver: '',
    content: ''
  };

  showSubscriptionModal = false;

  showReportModal = false;
  unreadMessageCount: any;
  quartierInfos: any; 
  constructor(
    private route: ActivatedRoute,
    private countriesOrgMockService: CountriesOrgMockService,
    private agencyService: AgencyService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private messageService: MessagesService
  ) { }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.agencyId = this.route.snapshot.paramMap.get('id');
    if (this.agencyId) {
      this.loadAgencyFromApi(this.agencyId);
    }
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.countUnreadMessages();

    // this.loadTariffs();
  }

  getQuartierInfos(qrt: string){
    const data = this.countriesOrgMockService.getQuartierInfo(qrt);
    this.quartierInfos = data;
    console.log("Quartier Infos==>", this.quartierInfos);
    return data;
  }

  // recuperations des tarifs liee a une agences
  tariffs: Tariff[] = [];
  loadTariffs(): void {
    this.isLoading = true;
    const agency_id = this.agency?._id;
    console.log("AgenceId==>", agency_id);
    if (!agency_id) {
      console.error("[DEBUG] Aucun tarif trouvé pour cette agence");
      this.isLoading = false;
      return;
    }

    this.agencyService.getAgencyAllTarifs$(agency_id).subscribe({
      next: (data: Tariff[]) => {
        this.tariffs = data;
        console.log("Tarifs récupérés :", this.tariffs);
        this.isLoading = false;
      },
      error: (error) => {
        // console.error("[DEBUG] Erreur lors du chargement des tarifs :", error);
        this.isLoading = false;
      },
    });
  }


  // Client subscription 
  subscription = {
  userId: '',
  agencyId: '',
  plan: '',
  amount: 0,
  startDate: '',
  endDate: '',
  numberMonth: 1
};

planPrices: any = {
  basic: 19.99,
  standard: 29.99,
  premium: 49.99
};

// submitSubscription() {
//   this.subscription.userId = this.currentUser?.id || '';
//   this.subscription.agencyId = this.agency?._id || '';
//   // Appel API
//   this.agencyService.subscribeToAgencyPlan(this.subscription).subscribe({
//     next: (res) => {
//       this.notificationService.showSuccess('Abonnement réussi', 'Votre abonnement a bien été enregistré.');
//       this.showSubscriptionModal = false;
//     },
//     error: (err) => {
//       this.notificationService.showError('Erreur', 'Impossible d\'enregistrer l\'abonnement.');
//     }
//   });
// }

tariffSelectedMonths: number = 1;

submitSubscription(currentUserId: string | undefined, tariffId: string | undefined, numberMonth: number) {
  const tariff_id : string | undefined = tariffId;
  const numberm_month = numberMonth || 1;
  // const payload = {
  //   tariffId,
  //   numberMonth: numberMonth || 1,
  //   userId: this.currentUser?._id || this.currentUser?.id || '',
  //   agencyId: this.agency?._id || '',
  // };
  this.agencyService.subscribeToAgencyPlan(currentUserId, tariff_id, numberm_month).subscribe({
    next: (res) => {
      this.notificationService.showSuccess('Abonnement réussi', 'Votre abonnement a bien été enregistré.');
    },
    error: (err) => {
      this.notificationService.showError('Erreur', err?.error?.error || 'Impossible d\'enregistrer l\'abonnement.');
    }
  });
}
updateAmount() {
  this.subscription.amount = this.planPrices[this.subscription.plan] || 0;
  this.updateEndDate();
}

updateEndDate() {
  if (this.subscription.startDate && this.subscription.numberMonth) {
    const start = new Date(this.subscription.startDate);
    start.setMonth(start.getMonth() + Number(this.subscription.numberMonth));
    this.subscription.endDate = start.toISOString().slice(0, 10);
  }
}

  countUnreadMessages() {
    this.messageService.getUserUnreadMessagesCount(this.currentUser?._id || '').subscribe({
      next: (response: any) => {
        if (response) {
          console.log('API > getUserUnreadMessagesCount:', response);
          this.unreadMessageCount = response.unreadCount || 0;
        }
      },
      error: (error: any) => {
        console.error('API > getUserUnreadMessagesCount:', error);
      }
    });
  }
  submitMessage() {
    if (!this.currentUser) {
      this.notificationService.showError('Connexion requise', 'Vous devez être connecté pour envoyer un message');
      return;
    }
    if (!this.agency) {
      this.notificationService.showError('Erreur', 'Agence non trouvée');
      return;
    }
    this.messageData.sender = this.currentUser?.userId || '';
    this.messageData.receiver = this.agencyId || '';
    this.messageData.content = this.messageData.content.trim();
    if (!this.messageData.content) {
      this.notificationService.showError('Message vide', 'Le contenu du message ne peut pas être vide');
      return;
    }

    console.log('Envoi du message:', this.messageData);
    this.messageService.sendMessage(this.messageData).subscribe({
      next: (response: any) => {
        console.log('API > sendMessage:', response);
        this.notificationService.showSuccess('Message envoyé', 'Votre message a bien été envoyé');
        this.showReportModal = false;
      },
      error: (error: any) => {
        console.error('API > sendMessage:', error);
        this.notificationService.showError('Message non envoyé', 'Une erreur s\'est produite lors de l\'envoi du message');
      }
    });
  }
  /**
   * Transforme une agence API en objet compatible avec le template
   */
  private mapApiAgency(apiAgency: any): Agency {
    return {
      _id: apiAgency._id || '',
      userId: apiAgency.userId || '',
      firstName: apiAgency.firstName || '',
      lastName: apiAgency.lastName || '',
      agencyName: apiAgency.agencyName || '',
      agencyDescription: apiAgency.agencyDescription || '',
      phone: apiAgency.phone || '',
      address: apiAgency.address || {
        street: '',
        arrondissement: '',
        sector: '',
        neighborhood: '',
        city: '',
        postalCode: ''
      },

      arrondissement: apiAgency.arrondissement || '',
      secteur: apiAgency.secteur || '',
      quartier: apiAgency.quartier || '',
      licenseNumber: apiAgency.licenseNumber || '',
      members: apiAgency.members || [],
      serviceZones: apiAgency.serviceZones || [],
      services: apiAgency.services || [],
      employees: apiAgency.employees || [],
      schedule: apiAgency.schedule || [],
      collectors: apiAgency.collectors || [],
      clients: apiAgency.clients || [],
      collections: apiAgency.collections || [],
      incidents: apiAgency.incidents || [],
      rating: apiAgency.rating || 0,
      totalClients: apiAgency.totalClients || (apiAgency.clients ? apiAgency?.clients?.length : 0),
      acceptTerms: apiAgency.acceptTerms || false,
      receiveOffers: apiAgency.receiveOffers || false,
      isActive: apiAgency.isActive !== undefined ? apiAgency.isActive : true,
      createdAt: apiAgency.createdAt || '',
      updatedAt: apiAgency.updatedAt || '',
      __v: apiAgency.__v || 0
    };
  }

  /**
   * Charge les détails d'une agence depuis l'API backend
   */
  loadAgencyFromApi(id: string | null): void {
    this.agencyService.getAgencyByIdFromApi(id).subscribe((response: any) => {
      if (response.success && response.data) {
        this.agency = this.mapApiAgency(response.data);
        this.agencyId = this.agency?.userId;
        console.log('[DEBUG] Agency details:', this.agency);
        console.log('[DEBUG] AgencyID details:', this.agencyId);
        this.loadTariffs();
      } else {
        console.error('Erreur lors du chargement de l\'agence');
        // Fallback vers les données mockées si l'API échoue
        this.agencyService.getAgencyById(id).subscribe(agency => {
          this.agency = agency || null;
        });
      }
    });
  }

  getStars(rating: number): number[] {
    return new Array(Math.floor(rating)).fill(0);
  }

  getFrequencyText(frequency: string): string {
    const frequencies: { [key: string]: string } = {
      'daily': 'quotidienne',
      'weekly': 'hebdomadaire',
      'biweekly': 'bi-hebdomadaire',
      'monthly': 'mensuelle'
    };
    return frequencies[frequency] || frequency;
  }

  getYearsInService(): number {
    if (!this.agency) return 0;
    const years = new Date().getFullYear() - new Date(this.agency.createdAt).getFullYear();
    return Math.max(1, years);
  }

  shareAgency(): void {
    if (navigator.share) {
      navigator.share({
        title: this.agency?.agencyName,
        text: this.agency?.agencyDescription,
        url: window.location.href
      });
    } else {
      // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
      navigator.clipboard.writeText(window.location.href);
      this.notificationService.showSuccess('Lien copié', 'Le lien de l\'agence a été copié dans le presse-papiers !');
    }
  }

  subscribeToAgency(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.notificationService.showError('Connexion requise', 'Vous devez être connecté pour vous abonner à une agence');
      return;
    }

    if (!this.agency) {
      this.notificationService.showError('Erreur', 'Agence non trouvée');
      return;
    }

    console.log('[DEBUG] Tentative d\'abonnement:', { userId: currentUser.id, agencyId: this.agency._id });

    this.authService.subscribeToAgency(currentUser.id, this.agency._id).subscribe({
      next: (response) => {
        console.log('[DEBUG] Réponse abonnement:', response);

        // Vérifier différentes structures de réponse possibles
        const isSuccess = response.success || response.status === 'success' || response.message?.includes('succès') || response.message?.includes('réussi');

        if (isSuccess) {
          this.notificationService.showSuccess('Abonnement réussi', 'Vous êtes maintenant abonné à cette agence !');
        } else {
          const errorMessage = response.message || response.error || 'Erreur inconnue lors de l\'abonnement';
          this.notificationService.showError('Erreur lors de l\'abonnement', errorMessage);
        }
      },
      error: (error) => {
        console.error('[DEBUG] Erreur lors de l\'abonnement:', error);
        const errorMessage = error?.error?.message || error?.message || 'Erreur lors de l\'abonnement. Veuillez réessayer.';
        this.notificationService.showError('Erreur', errorMessage);
      }
    });
  }

/**Envoie un message par WhatsApp */
defaultCountryCode = '226';

private normalizePhoneForWhatsApp(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/[\s().-]/g, '');
  cleaned = cleaned.replace(/^\+/, '');
  if (cleaned.length < 8 || !/^[1-9]/.test(cleaned)) {
    cleaned = this.defaultCountryCode + cleaned;
  }
  return cleaned;
}

contactAgency(): void {
  if (!this.agency?.phone) return;
  const phoneForWA = this.normalizePhoneForWhatsApp(this.agency.phone);
  if (!phoneForWA) return;

  const message = encodeURIComponent("Bonjour, je vous contacte au sujet de ...");
  const url = `https://wa.me/${phoneForWA}?text=${message}`;

  window.open(url, '_blank');
}

  editAgency() {
    this.router.navigate(['/edit-agency', this.agencyId]);
  }
  //Activer ou desactiver une agence 
  activateAgency(id: string) {
    this.agencyService.activateAgency(id).subscribe({
      next: (response: any) => {
        console.log('agency activated  in dashboard', response);
        if (response.message) {
          this.notificationService.showSuccess('Activation', response.message);
          this.loadAgencyFromApi(this.agencyId);
        } else {
          this.notificationService.showError('Activation', 'Erreur lors de l\'activation de l\'agence');
        }
      },
      error: (error: any) => {
        console.error('Error activating agency:', error);
        const msg = error?.error?.message || 'Error activating agency';
        this.notificationService.showSuccess('Activation', msg);
      }
    });
  }
  openDirections(): void {
    if (this.agency?.address) {
      const address = `${this.agency.address.doorNumber} ${this.agency.address.street}, ${this.agency.address.city}`;
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  }
  // tariffs: Tariff[] = [];
  isLoading: boolean = false;
  // loadTariffs(): void {
  //   this.isLoading = true;
  //   const agencyId = this.agencyId || this.route.snapshot.paramMap.get('id');
  //   if (!agencyId) {
  //     console.error('[DEBUG] Aucun agencyId trouvé pour l’utilisateur courant');
  //     this.isLoading = false;
  //     return;
  //   }

  //   this.agencyService.getAgencyAllTarifs$(agencyId).subscribe({
  //     next: (data: Tariff[]) => {
  //       this.tariffs = data;
  //       console.log('Tarifs récupérés :', this.tariffs);
  //       this.isLoading = false;
  //     },
  //     error: (error) => {
  //       console.error('[DEBUG] Erreur lors du chargement des tarifs :', error);
  //       this.isLoading = false;
  //     }
  //   });
  // }
}