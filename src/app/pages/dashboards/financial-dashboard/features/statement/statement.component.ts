import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Client, LigneReleve, Periode } from '../../models';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { FACTURE_DATA_SERVICE } from '../../data-access/tokens/facture-data.token';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDate } from '../../../../../shared/format.util';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { MonthFilterComponent } from '../../shared/filters/month-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';
import { EmptyStateComponent } from '../../shared/states/empty-state.component';

// F10 — Relevé de paiement à la demande. RG9 : facturé le / payé le / montant.
// Lancé depuis l'onglet Facturation (F8, via ?idClient=) ou par recherche directe
// (Scénario 3).
@Component({
  selector: 'app-statement',
  standalone: true,
  imports: [CommonModule, SearchFilterComponent, MonthFilterComponent, ErrorStateComponent, EmptyStateComponent],
  templateUrl: './statement.component.html',
  styleUrls: ['./statement.component.scss', './statement-print.scss'],
})
export class StatementComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly clientData = inject(CLIENT_DATA_SERVICE);
  private readonly factureData = inject(FACTURE_DATA_SERVICE);
  private readonly exportService = inject(EXPORT_SERVICE);

  readonly recherche = signal('');
  readonly resultatsRecherche = signal<Client[]>([]);
  readonly clientSelectionne = signal<Client | null>(null);

  // Plage optionnelle — scope configurable (historique complet par défaut si non
  // renseignée), spec §1.12 : scope du relevé (complet vs plage) reste TBC.
  readonly debut = signal<Periode | null>(null);
  readonly fin = signal<Periode | null>(null);

  readonly lignes = signal<LigneReleve[]>([]);
  readonly rechercheEffectuee = signal(false);
  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly formatMontant = formatMontantXof;
  readonly formatDate = formatFrDate;

  readonly totalMontant = computed(() => this.lignes().reduce((somme, ligne) => somme + ligne.montant, 0));

  constructor() {
    const idClientParam = this.route.snapshot.queryParamMap.get('idClient');
    if (idClientParam) this.chargerClientParId(idClientParam);
  }

  onRechercheChange(valeur: string): void {
    this.recherche.set(valeur);
    if (!valeur.trim()) {
      this.resultatsRecherche.set([]);
      return;
    }
    this.clientData.getClients({ pageSize: 8, filter: { search: valeur } }).subscribe(page => {
      this.resultatsRecherche.set(page.items);
    });
  }

  selectionnerClient(client: Client): void {
    this.clientSelectionne.set(client);
    this.resultatsRecherche.set([]);
    this.recherche.set(`${client.nom} ${client.prenom}`);
    this.chargerReleve();
  }

  onDebutChange(periode: Periode | null): void {
    this.debut.set(periode);
    if (this.clientSelectionne()) this.chargerReleve();
  }

  onFinChange(periode: Periode | null): void {
    this.fin.set(periode);
    if (this.clientSelectionne()) this.chargerReleve();
  }

  reessayer(): void {
    this.chargerReleve();
  }

  imprimer(): void {
    this.exportService.print();
  }

  private chargerClientParId(idClient: string): void {
    this.clientData.getClient(idClient).subscribe(client => {
      this.clientSelectionne.set(client);
      this.recherche.set(`${client.nom} ${client.prenom}`);
      this.chargerReleve();
    });
  }

  private chargerReleve(): void {
    const client = this.clientSelectionne();
    if (!client) return;

    this.chargement.set(true);
    this.erreur.set(null);
    const plage = this.debut() || this.fin() ? { debut: this.debut() ?? undefined, fin: this.fin() ?? undefined } : undefined;

    this.factureData.getReleve(client.idClient, plage).subscribe({
      next: lignes => {
        this.lignes.set(lignes);
        this.rechercheEffectuee.set(true);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger le relevé de ce client pour le moment.');
        this.chargement.set(false);
      },
    });
  }
}
