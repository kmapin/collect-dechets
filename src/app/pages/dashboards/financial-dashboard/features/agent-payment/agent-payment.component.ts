import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Agent, PaiementAgent } from '../../models';
import { AGENT_DATA_SERVICE } from '../../data-access/tokens/agent-data.token';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDateTime } from '../../../../../shared/format.util';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';

type Etape = 'formulaire' | 'confirmation';

// F5 — Paiement des agents (collecteurs). Branché sur le backend réel : POST
// /finance/agents/paiements débite réellement le wallet de l'agence (services/
// paiementAgent.js::payerAgent, avec rollback compensatoire en cas d'échec d'écriture).
// Le montant à payer reste saisi manuellement (aucun calcul automatique de rémunération
// suggérée) — seul point encore ouvert de RG10, pas l'impact sur le solde lui-même, qui
// est réel et vérifié. Le serveur rejette (400 "Solde insuffisant") toute tentative
// dépassant le solde disponible ; le formulaire bloque donc aussi la soumission dans ce cas.
@Component({
  selector: 'app-agent-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchFilterComponent],
  templateUrl: './agent-payment.component.html',
  styleUrl: './agent-payment.component.scss',
})
export class AgentPaymentComponent {
  private readonly agentData = inject(AGENT_DATA_SERVICE);
  private readonly financeData = inject(FINANCE_DATA_SERVICE);

  readonly agents = signal<Agent[]>([]);
  readonly chargementAgents = signal(true);

  readonly historique = signal<PaiementAgent[]>([]);
  readonly chargementHistorique = signal(true);

  // Filtres de l'historique — purement client-side (liste déjà chargée en mémoire).
  readonly rechercheAgent = signal('');
  readonly montantMin = signal<number | null>(null);

  readonly soldeDisponible = signal<number | null>(null);

  readonly idAgentSelectionne = signal<string | null>(null);
  readonly montant = signal<number | null>(null);
  readonly etape = signal<Etape>('formulaire');

  readonly enregistrement = signal(false);
  readonly messageSucces = signal<string | null>(null);
  readonly erreurEnregistrement = signal<string | null>(null);

  readonly formatMontant = formatMontantXof;
  readonly formatDate = formatFrDateTime;

  readonly soldeInsuffisant = computed(() => {
    const solde = this.soldeDisponible();
    const m = this.montant();
    return solde !== null && m !== null && m > solde;
  });
  // Le serveur rejette (400 "Solde insuffisant") tout montant dépassant le solde
  // disponible — bloqué ici aussi pour éviter un aller-retour réseau voué à l'échec.
  readonly formulaireValide = computed(() => !!this.idAgentSelectionne() && (this.montant() ?? 0) > 0 && !this.soldeInsuffisant());
  readonly agentSelectionne = computed(() => this.agents().find(a => a.idAgent === this.idAgentSelectionne()) ?? null);

  readonly historiqueFiltre = computed(() => {
    const recherche = this.rechercheAgent().trim().toLowerCase();
    const seuil = this.montantMin();
    return this.historique().filter(paiement => {
      if (recherche && !this.nomAgent(paiement.idAgent).toLowerCase().includes(recherche)) return false;
      if (seuil !== null && paiement.montant < seuil) return false;
      return true;
    });
  });

  constructor() {
    this.chargerAgents();
    this.chargerSolde();
    this.chargerHistorique();
  }

  passerAConfirmation(): void {
    if (!this.formulaireValide()) return;
    this.messageSucces.set(null);
    this.etape.set('confirmation');
  }

  retourFormulaire(): void {
    this.etape.set('formulaire');
  }

  confirmer(): void {
    const idAgent = this.idAgentSelectionne();
    const montant = this.montant();
    if (!idAgent || !montant) return;

    this.enregistrement.set(true);
    this.erreurEnregistrement.set(null);

    this.agentData.payerAgent({ idAgent, montant }).subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.messageSucces.set('Paiement enregistré — le solde de l\'agence a été débité.');
        this.etape.set('formulaire');
        this.idAgentSelectionne.set(null);
        this.montant.set(null);
        this.chargerHistorique();
        this.chargerSolde();
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrement.set(false);
        this.erreurEnregistrement.set(err.error?.message ?? "Impossible d'enregistrer le paiement pour le moment.");
      },
    });
  }

  nomAgent(idAgent: string): string {
    const agent = this.agents().find(a => a.idAgent === idAgent);
    return agent ? `${agent.nom} ${agent.prenom ?? ''}`.trim() : idAgent;
  }

  private chargerAgents(): void {
    this.chargementAgents.set(true);
    this.agentData.getAgents({ pageSize: 100 }).subscribe({
      next: page => {
        this.agents.set(page.items);
        this.chargementAgents.set(false);
      },
      error: () => this.chargementAgents.set(false),
    });
  }

  private chargerSolde(): void {
    this.financeData.getDashboardKpi().subscribe(kpi => this.soldeDisponible.set(kpi.soldeDisponible));
  }

  private chargerHistorique(): void {
    this.chargementHistorique.set(true);
    this.agentData.getPaiementsAgent({ pageSize: 50 }).subscribe({
      next: page => {
        this.historique.set([...page.items].sort((a, b) => (a.datePaiement < b.datePaiement ? 1 : -1)));
        this.chargementHistorique.set(false);
      },
      error: () => this.chargementHistorique.set(false),
    });
  }
}
