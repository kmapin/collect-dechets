import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';
import { ContratService } from '../../../../../../services/contrat.service';
import { Contrat } from '../../../../../../models/contrat.model';
import { formatMontantXof } from '../../../utils/money.util';
import { formatFrDate } from '../../../../../../shared/format.util';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
import { badgeContrat } from '../../../shared/status-badge/status-badge.util';
import { ErrorStateComponent } from '../../../shared/states/error-state.component';

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

  @Input({ required: true }) idClient!: string;

  readonly contrats = signal<Contrat[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

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
      error: () => {},
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
