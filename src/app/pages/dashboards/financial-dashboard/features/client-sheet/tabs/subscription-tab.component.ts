import { Component, inject, Input, OnChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AgencyService } from '../../../../../../services/agency.service';
import { ContratService } from '../../../../../../services/contrat.service';
import { Contrat } from '../../../../../../models/contrat.model';
import { formatMontantXof } from '../../../utils/money.util';
import { formatFrDate } from '../../../../../../shared/format.util';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';
import { badgeAbonnement, badgeContrat } from '../../../shared/status-badge/status-badge.util';
import { ErrorStateComponent } from '../../../shared/states/error-state.component';

/**
 * Onglet "Abonnements & Contrats" de la fiche client — suivi demandé côté
 * dashboard financier. Réutilise directement les services applicatifs déjà
 * existants (`AgencyService`, `ContratService`, `providedIn: 'root'`) plutôt
 * que d'ajouter un nouveau "seam" Contract/Token/HttpService comme le reste
 * du module (`CLIENT_DATA_SERVICE`, etc.) : ces deux domaines (Abonnement,
 * Contrat) sont déjà entièrement backés en dehors de `/finance/*`, la
 * duplication d'une couche de mapping n'ajouterait rien.
 * `idClient` (Table 20, module Finance) est le même `User._id` réel que
 * `clientId` côté Abonnement/Contrat — confirmé par
 * `controllers/financeClients.js::getClient` (validation `ObjectId`, résolu
 * depuis le même `User`), donc transmissible directement sans conversion.
 *
 * IMPORTANT : utilise les variantes `...PourMonAgence`/`...PourMonAgence$`,
 * pas `getUserSubscription`/`getContratsByClient$` — un client peut être
 * abonné/sous contrat auprès de PLUSIEURS agences, et l'agence courante ne
 * doit voir que ses propres abonnements/contrats avec ce client, jamais ceux
 * du même client avec une agence tierce (agencyId scopé côté backend via
 * `resolveAgency`/JWT, jamais transmis depuis ce composant).
 */
@Component({
  selector: 'app-client-subscription-tab',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, ErrorStateComponent],
  templateUrl: './subscription-tab.component.html',
  styleUrl: './subscription-tab.component.scss',
})
export class SubscriptionTabComponent implements OnChanges {
  private readonly agencyService = inject(AgencyService);
  private readonly contratService = inject(ContratService);

  @Input({ required: true }) idClient!: string;

  readonly abonnements = signal<any[]>([]);
  readonly contrats = signal<Contrat[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly badgeAbonnement = badgeAbonnement;
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

  private charger(): void {
    if (!this.idClient) return;
    this.chargement.set(true);
    this.erreur.set(null);

    forkJoin({
      abonnements: this.agencyService.getUserSubscriptionPourMonAgence(this.idClient).pipe(catchError(() => of([]))),
      contrats: this.contratService.getContratsByClientPourMonAgence$(this.idClient).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ abonnements, contrats }) => {
        this.abonnements.set(abonnements ?? []);
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
