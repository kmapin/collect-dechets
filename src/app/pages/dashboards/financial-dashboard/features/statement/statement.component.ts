import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Client, LigneReleve, Periode } from '../../models';
import { CLIENT_DATA_SERVICE } from '../../data-access/tokens/client-data.token';
import { FACTURE_DATA_SERVICE } from '../../data-access/tokens/facture-data.token';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { formatMontantXof } from '../../utils/money.util';
import { bornesPeriode } from '../../utils/periode.util';
import { formatFrDate } from '../../../../../shared/format.util';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { MonthFilterComponent } from '../../shared/filters/month-filter.component';
import { ErrorStateComponent } from '../../shared/states/error-state.component';
import { EmptyStateComponent } from '../../shared/states/empty-state.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgeFacture } from '../../shared/status-badge/status-badge.util';

// F10 — Relevé de paiement à la demande. RG9 : facturé le / payé le / montant.
// Lancé depuis l'onglet Facturation (F8, via ?idClient=) ou par recherche directe
// (Scénario 3).
@Component({
  selector: 'app-statement',
  standalone: true,
  imports: [CommonModule, SearchFilterComponent, MonthFilterComponent, ErrorStateComponent, EmptyStateComponent, StatusBadgeComponent],
  templateUrl: './statement.component.html',
  styleUrls: ['./statement.component.scss', './statement-print.scss'],
})
export class StatementComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly clientData = inject(CLIENT_DATA_SERVICE);
  private readonly factureData = inject(FACTURE_DATA_SERVICE);
  private readonly exportService = inject(EXPORT_SERVICE);
  private readonly session = inject(SESSION_SERVICE);

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
  readonly badgeStatut = badgeFacture;

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

  // Au clic dans le champ (avant toute frappe) : liste des clients de l'agence, pour
  // parcourir plutôt que de devoir taper un nom au moins partiellement.
  onRechercheFocus(): void {
    if (this.recherche().trim()) return;
    this.clientData.getClients({ pageSize: 8 }).subscribe(page => {
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

  // Génère un vrai document PDF téléchargeable (jsPDF/autoTable, via ExportService) —
  // remplace l'ancien window.print() qui imprimait toute la page (toolbar comprise, malgré
  // les règles @media print) plutôt que produire un relevé exploitable hors de l'app.
  telechargerPdf(): void {
    const client = this.clientSelectionne();
    if (!client) return;

    const rows = this.lignes().map(ligne => ({
      factureLe: this.formatDate(ligne.factureLe),
      payeLe: ligne.payeLe ? this.formatDate(ligne.payeLe) : '—',
      statut: this.badgeStatut(ligne.statut).label,
      montant: this.formatMontant(ligne.montant),
    }));

    const agence = this.session.getCurrentUser().agence;
    const ligneAgence = agence
      ? `${agence.nom}${agence.quartier ? ' — ' + agence.quartier : ''}${agence.ville ? ', ' + agence.ville : ''}`
      : undefined;
    const ligneClient = `${client.nom} ${client.prenom}${client.quartier ? ' — ' + client.quartier : ''}`;

    // Même libellé que celui affiché à l'écran (this.libellePeriode, computed) — jamais
    // un texte différent entre l'interface et le PDF exporté.
    const lignePeriode = this.libellePeriode();

    this.exportService.exportToPdf(
      rows,
      [
        { key: 'factureLe', label: 'Facturé le' },
        { key: 'payeLe', label: 'Payé le' },
        { key: 'statut', label: 'Statut' },
        { key: 'montant', label: 'Montant' },
      ],
      `releve-${client.nom}-${client.prenom}`.toLowerCase().replace(/\s+/g, '-'),
      {
        titre: 'Relevé de paiement',
        sousTitre: ligneAgence ? [ligneAgence, ligneClient, lignePeriode] : [ligneClient, lignePeriode],
        total: { label: 'Total', valeur: this.formatMontant(this.totalMontant()) },
      },
    );
  }

  // Libellé de la période effectivement demandée (mêmes bornes que la requête
  // GET /finance/factures/releve — jamais un calcul indépendant) : "Historique complet"
  // si ni debut ni fin ne sont renseignés (jamais une date fabriquée pour ce cas — la
  // plage est réellement illimitée), sinon "Période du JJ mois AAAA au JJ mois AAAA".
  // Public (computed, pas juste une méthode privée) : affiché à l'écran (statement.
  // component.html) ET réutilisé tel quel dans le PDF (telechargerPdf ci-dessus) — une
  // seule source, jamais un texte différent entre l'écran et le document exporté.
  readonly libellePeriode = computed(() => {
    const debut = this.debut();
    const fin = this.fin();
    if (!debut && !fin) return 'Historique complet';

    const optionsDate: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    const dateDebut = debut ? bornesPeriode(debut).debut : null;
    const dateFin = fin ? bornesPeriode(fin).fin : null;

    if (dateDebut && dateFin) return `Période du ${dateDebut.toLocaleDateString('fr-FR', optionsDate)} au ${dateFin.toLocaleDateString('fr-FR', optionsDate)}`;
    if (dateDebut) return `Période à partir du ${dateDebut.toLocaleDateString('fr-FR', optionsDate)}`;
    return `Période jusqu'au ${dateFin!.toLocaleDateString('fr-FR', optionsDate)}`;
  });

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
