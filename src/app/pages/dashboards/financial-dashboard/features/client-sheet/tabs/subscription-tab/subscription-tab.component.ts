import { Component, computed, inject, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, finalize, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ContratService } from '../../../../../../../services/contrat.service';
import { Contrat } from '../../../../../../../models/contrat.model';
import { formatMontantXof } from '../../../../utils/money.util';
import { formatFrDate } from '../../../../../../../shared/format.util';
import { StatusBadgeComponent } from '../../../../shared/status-badge/status-badge.component';
import { badgeContrat } from '../../../../shared/status-badge/status-badge.util';
import { ErrorStateComponent } from '../../../../shared/states/error-state/error-state.component';
import { NotificationService } from '../../../../../../../services/notification.service';
import { SESSION_SERVICE } from '../../../../data-access/tokens/session.token';
import { aLaPermission } from '../../../../models';

// Fusion Subscription -> Contrat : "Abonnements" et "Contrats" étaient deux sections
// séparées (deux appels API distincts vers deux entités) ; Contrat est désormais la
// seule source de vérité, une seule table.
@Component({
  selector: 'app-client-subscription-tab',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, ErrorStateComponent],
  templateUrl: './subscription-tab.component.html',
  styleUrl: './subscription-tab.component.scss',
})
export class SubscriptionTabComponent implements OnChanges {
  private readonly contratService = inject(ContratService);
  private readonly notificationService = inject(NotificationService);
  private readonly session = inject(SESSION_SERVICE);

  @Input({ required: true }) idClient!: string;

  readonly contrats = signal<Contrat[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly contratMutationEnCours = signal<string | null>(null);

  private readonly currentUser = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly peutGerer = computed(() => aLaPermission(this.currentUser(), 'contracts.manage'));

  readonly badgeContrat = badgeContrat;
  readonly formatMontant = formatMontantXof;
  readonly formatDate = formatFrDate;

  ngOnChanges(): void {
    this.charger();
  }

  reessayer(): void {
    this.charger();
  }

  agenceNom(contrat: Contrat): string {
    const agence = contrat.agencyId as any;
    return typeof agence === 'object' ? agence?.name ?? '—' : '—';
  }

  /** "Tous les lieux" = contrat "compte entier" (serviceLocationId absent — voir
   * services/eligibility.service.js pour sa portée réelle, limitée au lieu principal). */
  lieuLabel(item: { serviceLocationId?: any }): string {
    const lieu = item?.serviceLocationId;
    return typeof lieu === 'object' && lieu ? lieu.name : 'Tous les lieux';
  }

  voirDocument(contrat: Contrat): void {
    this.contratService.getDocumentUrl$(contrat._id).subscribe({
      next: (res) => window.open(res.documentUrl, '_blank'),
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? "Impossible d'ouvrir le document."),
    });
  }

  onGenererDocument(contrat: Contrat): void {
    if (this.contratMutationEnCours()) return;
    this.contratMutationEnCours.set(contrat._id);
    this.contratService.genererDocument$(contrat._id)
      .pipe(finalize(() => this.contratMutationEnCours.set(null)))
      .subscribe({
        next: (reponse: any) => {
          this.notificationService.showSuccess('Succès', 'Document généré avec succès.');
          if (reponse?.documentUrl) window.open(reponse.documentUrl, '_blank');
          this.charger();
        },
        error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de générer le document.'),
      });
  }

  private charger(): void {
    if (!this.idClient) return;
    this.chargement.set(true);
    this.erreur.set(null);

    this.contratService.getContratsByClientPourMonAgence$(this.idClient).pipe(
      catchError(() => of([])),
    ).subscribe({
      next: (contrats) => {
        this.contrats.set(contrats ?? []);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les abonnements et contrats de ce client.');
        this.chargement.set(false);
      },
    });
  }
}
