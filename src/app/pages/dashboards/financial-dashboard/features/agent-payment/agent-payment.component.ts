import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, concatMap, from, map, of, toArray } from 'rxjs';
import { Agent, PaiementAgent, Role } from '../../models';
import { AGENT_DATA_SERVICE } from '../../data-access/tokens/agent-data.token';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDateTime } from '../../../../../shared/format.util';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgePaiementAgent } from '../../shared/status-badge/status-badge.util';
// Rôle validateur : manager avec financialRole='administrateur' DE L'AGENCE CONCERNÉE
// (résolu via SESSION_SERVICE, le rôle FINANCIER de ce module), OU super_admin sans
// restriction d'agence (résolu via le service d'authentification GLOBAL de l'app) — même
// double condition que controllers/paiementAgent.js::_resoudreAutorisationValidateur.
// PAS super_admin seul (correction produit : la première implémentation avait calqué le
// rôle exact d'accepterRetrait, module Retraits, mais la décision réelle pour ce domaine
// est différente).
import { AuthService } from '../../../../../services/auth.service';
import { UserRole } from '../../../../../models/user.model';

type Etape = 'formulaire' | 'confirmation';

interface ResultatAction {
  nom: string;
  ok: boolean;
  message: string;
}

// F5 — Paiement des agents (collecteurs). Chantier M2 : un paiement pour un agent avec
// un numéro Moov Money fiable (Agent.moovEligible) déclenche désormais un virement RÉEL,
// mais en 2 temps — la demande (n'importe quel rôle droitsFinance) crée seulement une
// demande EN_ATTENTE_VALIDATION, aucun débit ni appel Moov avant qu'un rôle distinct
// (super_admin) ne la valide. Un agent sans numéro Moov fiable reste payé en interne,
// immédiatement, comme avant ce chantier — jamais silencieux sur laquelle des deux voies
// s'applique (services/paiementAgent.js::payerAgent renvoie un `libelle` explicite).
// Le montant à payer reste saisi manuellement (RG10, toujours ouvert — voir
// docs/PAIEMENT-AGENTS.md).
//
// Sélection multiple (demande produit) : un même montant est appliqué à tous les agents
// sélectionnés (décision confirmée — pas un montant par agent). Chaque paiement/validation
// reste un appel individuel au backend (aucun endpoint "bulk" — le backend ne traite qu'un
// paiement à la fois, cf. services/paiementAgent.js), mais exécuté en SÉQUENCE (concatMap,
// jamais en parallèle) : pour les paiements internes, plusieurs débits parallèles sur le
// MÊME wallet agence ne seraient pas sûrs (services/wallet.js::removeBalanceService n'est
// pas atomique, lecture-puis-écriture) ; pour les validations Moov, ça évite aussi de
// bombarder l'API Moov de plusieurs appels concurrents. Chaque élément réussit ou échoue
// indépendamment — un échec sur un agent n'annule pas les autres, un résumé par agent est
// affiché à la fin plutôt qu'un unique message de succès/échec global.
@Component({
  selector: 'app-agent-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchFilterComponent, StatusBadgeComponent],
  templateUrl: './agent-payment.component.html',
  styleUrl: './agent-payment.component.scss',
})
export class AgentPaymentComponent {
  private readonly agentData = inject(AGENT_DATA_SERVICE);
  private readonly financeData = inject(FINANCE_DATA_SERVICE);
  private readonly authService = inject(AuthService);
  private readonly session = inject(SESSION_SERVICE);

  // currentUser$ plutôt que getCurrentUser() seul en initialValue : cette route est
  // accessible dès que droitsFinance est vrai (financeAccessGuard, pas financeAdminGuard —
  // voir financial-dashboard.routes.ts "Comptable ET Administrateur"), donc la session
  // financière a déjà été chargée par le guard avant que ce composant ne se construise,
  // même convention que client-list/client-sheet/finance-layout de ce module.
  private readonly utilisateurFinance = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly estValidateur = computed(
    () => this.utilisateurFinance().role === Role.ADMINISTRATEUR || this.authService.hasRole(UserRole.SUPER_ADMIN),
  );

  readonly agents = signal<Agent[]>([]);
  readonly chargementAgents = signal(true);

  readonly historique = signal<PaiementAgent[]>([]);
  readonly chargementHistorique = signal(true);

  // Filtres de l'historique — purement client-side (liste déjà chargée en mémoire).
  readonly rechercheAgent = signal('');
  readonly montantMin = signal<number | null>(null);

  readonly soldeDisponible = signal<number | null>(null);

  // ── Formulaire de demande (sélection multiple, montant partagé) ─────────────────
  readonly idsAgentsSelectionnes = signal<string[]>([]);
  readonly montant = signal<number | null>(null);
  readonly etape = signal<Etape>('formulaire');
  // Recherche dans la liste de sélection des agents — distincte de rechercheAgent
  // (filtre de l'historique ci-dessous), portée purement locale à cette liste.
  readonly rechercheAgentFormulaire = signal('');

  readonly enregistrement = signal(false);
  readonly progressionEnvoi = signal<{ fait: number; total: number } | null>(null);
  // Détail par agent (succès/échec + message réel du backend) — remplace l'ancien
  // message de succès unique, désormais trompeur dès que plusieurs agents sont
  // sélectionnés et qu'une partie seulement réussit.
  readonly resultatsEnvoi = signal<ResultatAction[]>([]);
  readonly erreurEnregistrement = signal<string | null>(null);

  readonly formatMontant = formatMontantXof;
  readonly formatDate = formatFrDateTime;
  readonly badgeStatut = badgePaiementAgent;

  readonly agentsFiltres = computed(() => {
    const recherche = this.rechercheAgentFormulaire().trim().toLowerCase();
    if (!recherche) return this.agents();
    return this.agents().filter(a => `${a.nom} ${a.prenom ?? ''}`.toLowerCase().includes(recherche));
  });

  readonly agentsSelectionnes = computed(() => this.agents().filter(a => this.idsAgentsSelectionnes().includes(a.idAgent)));
  // Orange Money essayé EN PREMIER par le backend (services/paiementAgent.js::
  // _resolveProviderPourAgent) — un agent orangeEligible n'est donc jamais compté comme
  // Moov, même si moovEligible était aussi vrai (aucun chevauchement de préfixes
  // aujourd'hui, mais l'ordre de résolution est celui qui fait foi).
  readonly nombreOrange = computed(() => this.agentsSelectionnes().filter(a => a.orangeEligible).length);
  readonly nombreMoov = computed(() => this.agentsSelectionnes().filter(a => !a.orangeEligible && a.moovEligible).length);
  readonly nombreInterne = computed(() => this.agentsSelectionnes().filter(a => !a.orangeEligible && !a.moovEligible).length);
  // Seuls les paiements INTERNES débitent immédiatement — un paiement Moov ou Orange
  // Money reste EN_ATTENTE_VALIDATION, aucun débit avant la validation Super Admin.
  readonly coutImmediatEstime = computed(() => (this.montant() ?? 0) * this.nombreInterne());

  readonly soldeInsuffisant = computed(() => {
    const solde = this.soldeDisponible();
    return solde !== null && this.coutImmediatEstime() > solde;
  });
  // Le serveur rejette (400 "Solde insuffisant") tout paiement interne dépassant le
  // solde disponible — bloqué ici aussi pour éviter des allers-retours réseau voués à
  // l'échec (le coût immédiat estimé ne compte que les agents en paiement interne).
  readonly formulaireValide = computed(
    () => this.idsAgentsSelectionnes().length > 0 && (this.montant() ?? 0) > 0 && !this.soldeInsuffisant(),
  );

  toggleAgent(idAgent: string): void {
    const courant = this.idsAgentsSelectionnes();
    this.idsAgentsSelectionnes.set(
      courant.includes(idAgent) ? courant.filter(id => id !== idAgent) : [...courant, idAgent],
    );
  }

  // Sélectionne les agents actuellement VISIBLES (respecte la recherche en cours),
  // en conservant toute sélection déjà faite sur des agents désormais filtrés hors
  // de vue — comportement attendu d'un "tout sélectionner" à côté d'une recherche.
  toutSelectionner(): void {
    const visibles = this.agentsFiltres().map(a => a.idAgent);
    const courant = this.idsAgentsSelectionnes();
    this.idsAgentsSelectionnes.set([...new Set([...courant, ...visibles])]);
  }

  toutDeselectionner(): void {
    this.idsAgentsSelectionnes.set([]);
  }

  // Demandes nécessitant une action du rôle validateur — dérivées du même historique
  // déjà chargé, pas un second endpoint/état séparé.
  readonly demandesEnAttente = computed(() =>
    this.historique().filter(p => p.status === 'EN_ATTENTE_VALIDATION' || p.status === 'A_VERIFIER_MANUELLEMENT'),
  );

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
    this.resultatsEnvoi.set([]);
    this.etape.set('confirmation');
  }

  retourFormulaire(): void {
    this.etape.set('formulaire');
  }

  confirmer(): void {
    const ids = this.idsAgentsSelectionnes();
    const montant = this.montant();
    if (!ids.length || !montant) return;

    this.enregistrement.set(true);
    this.erreurEnregistrement.set(null);
    this.progressionEnvoi.set({ fait: 0, total: ids.length });

    this.executerEnSequence(ids, (idAgent, index) =>
      this.agentData.payerAgent({ idAgent, montant }).pipe(
        map(paiement => {
          this.progressionEnvoi.set({ fait: index + 1, total: ids.length });
          return paiement;
        }),
      ),
    ).subscribe(resultats => {
      this.enregistrement.set(false);
      this.progressionEnvoi.set(null);
      this.resultatsEnvoi.set(resultats);
      this.etape.set('formulaire');
      this.idsAgentsSelectionnes.set([]);
      this.montant.set(null);
      this.chargerHistorique();
      this.chargerSolde();
    });
  }

  // ── Validation / résolution manuelle (rôle super_admin uniquement) ──────────────

  // Action individuelle en cours (id du PaiementAgent concerné) — désactive
  // uniquement le bouton de LA ligne concernée, pas tout l'écran.
  readonly traitementEnCours = signal<string | null>(null);
  readonly erreurTraitement = signal<string | null>(null);

  readonly idsSelectionnesValidation = signal<Set<string>>(new Set());
  readonly traitementBulkEnCours = signal(false);
  readonly resultatsTraitement = signal<ResultatAction[]>([]);

  // Rejet individuel : champ motif affiché en ligne, sous la demande concernée
  // uniquement (jamais un prompt() natif — même convention que le reste de l'écran,
  // aucune boîte de dialogue navigateur ailleurs dans ce composant).
  readonly idDemandeEnRejet = signal<string | null>(null);
  readonly motifRejetIndividuel = signal('');

  // Rejet groupé : un seul motif partagé pour toute la sélection — même décision produit
  // que pour la création groupée ("Un seul montant pour tous"), reconduite ici pour le
  // motif de rejet plutôt que d'exiger un motif par demande.
  readonly motifRejetSelection = signal('');

  toggleSelectionValidation(idPaiementAgent: string): void {
    const s = new Set(this.idsSelectionnesValidation());
    if (s.has(idPaiementAgent)) s.delete(idPaiementAgent);
    else s.add(idPaiementAgent);
    this.idsSelectionnesValidation.set(s);
  }

  // Même convention que toutSelectionner/toutDeselectionner (formulaire de demande) :
  // sélectionne toutes les demandes actuellement listées (EN_ATTENTE_VALIDATION comme
  // A_VERIFIER_MANUELLEMENT — chaque bouton d'action groupée ne traite de toute façon
  // que le sous-ensemble pertinent de la sélection, cf. nombreSelectionneAValider/
  // nombreSelectionneAmbigu).
  toutSelectionnerValidation(): void {
    this.idsSelectionnesValidation.set(new Set(this.demandesEnAttente().map(d => d.idPaiementAgent)));
  }

  toutDeselectionnerValidation(): void {
    this.idsSelectionnesValidation.set(new Set());
  }

  readonly demandesSelectionnees = computed(() => {
    const ids = this.idsSelectionnesValidation();
    return this.demandesEnAttente().filter(d => ids.has(d.idPaiementAgent));
  });
  readonly nombreSelectionneAValider = computed(
    () => this.demandesSelectionnees().filter(d => d.status === 'EN_ATTENTE_VALIDATION').length,
  );
  readonly nombreSelectionneAmbigu = computed(
    () => this.demandesSelectionnees().filter(d => d.status === 'A_VERIFIER_MANUELLEMENT').length,
  );

  valider(paiement: PaiementAgent): void {
    this.lancerAction(paiement, () => this.agentData.validerPaiementAgent(paiement.idPaiementAgent));
  }

  ouvrirRejet(paiement: PaiementAgent): void {
    this.idDemandeEnRejet.set(paiement.idPaiementAgent);
    this.motifRejetIndividuel.set('');
  }

  annulerRejet(): void {
    this.idDemandeEnRejet.set(null);
    this.motifRejetIndividuel.set('');
  }

  confirmerRejet(paiement: PaiementAgent): void {
    const motif = this.motifRejetIndividuel().trim();
    if (!motif) return;
    this.idDemandeEnRejet.set(null);
    this.motifRejetIndividuel.set('');
    this.lancerAction(paiement, () => this.agentData.rejeterPaiementAgent(paiement.idPaiementAgent, motif));
  }

  confirmerEffectue(paiement: PaiementAgent): void {
    this.lancerAction(paiement, () => this.agentData.confirmerVirementEffectue(paiement.idPaiementAgent));
  }

  confirmerNonEffectue(paiement: PaiementAgent): void {
    this.lancerAction(paiement, () => this.agentData.confirmerVirementNonEffectue(paiement.idPaiementAgent));
  }

  validerSelection(): void {
    const items = this.demandesSelectionnees().filter(d => d.status === 'EN_ATTENTE_VALIDATION');
    this.lancerActionGroupee(items, p => this.agentData.validerPaiementAgent(p.idPaiementAgent));
  }

  rejeterSelection(): void {
    const motif = this.motifRejetSelection().trim();
    if (!motif) return;
    const items = this.demandesSelectionnees().filter(d => d.status === 'EN_ATTENTE_VALIDATION');
    this.motifRejetSelection.set('');
    this.lancerActionGroupee(items, p => this.agentData.rejeterPaiementAgent(p.idPaiementAgent, motif));
  }

  confirmerEffectueSelection(): void {
    const items = this.demandesSelectionnees().filter(d => d.status === 'A_VERIFIER_MANUELLEMENT');
    this.lancerActionGroupee(items, p => this.agentData.confirmerVirementEffectue(p.idPaiementAgent));
  }

  confirmerNonEffectueSelection(): void {
    const items = this.demandesSelectionnees().filter(d => d.status === 'A_VERIFIER_MANUELLEMENT');
    this.lancerActionGroupee(items, p => this.agentData.confirmerVirementNonEffectue(p.idPaiementAgent));
  }

  private lancerAction(paiement: PaiementAgent, appel: () => Observable<PaiementAgent>): void {
    this.traitementEnCours.set(paiement.idPaiementAgent);
    this.erreurTraitement.set(null);

    appel().subscribe({
      next: () => {
        this.traitementEnCours.set(null);
        this.chargerHistorique();
        this.chargerSolde();
      },
      error: (err: HttpErrorResponse) => {
        this.traitementEnCours.set(null);
        this.erreurTraitement.set(err.error?.message ?? "Impossible de traiter cette demande pour le moment.");
      },
    });
  }

  private lancerActionGroupee(items: PaiementAgent[], appel: (p: PaiementAgent) => Observable<PaiementAgent>): void {
    if (!items.length) return;
    this.traitementBulkEnCours.set(true);
    this.erreurTraitement.set(null);
    this.resultatsTraitement.set([]);

    this.executerEnSequence(items, item => appel(item)).subscribe(resultats => {
      this.traitementBulkEnCours.set(false);
      this.resultatsTraitement.set(resultats);
      this.idsSelectionnesValidation.set(new Set());
      this.chargerHistorique();
      this.chargerSolde();
    });
  }

  // Item d'entrée string (idAgent) ou PaiementAgent selon l'appelant — `nomAgent` sait
  // résoudre les deux (idAgent direct, ou via l'idAgent du PaiementAgent).
  private executerEnSequence<T extends string | PaiementAgent>(
    items: T[],
    appel: (item: T, index: number) => Observable<PaiementAgent>,
  ): Observable<ResultatAction[]> {
    const nomPour = (item: T): string => (typeof item === 'string' ? this.nomAgent(item) : this.nomAgent(item.idAgent));

    return from(items).pipe(
      concatMap((item, index) =>
        appel(item, index).pipe(
          map((paiement): ResultatAction => ({ nom: nomPour(item), ok: true, message: paiement.libelle ?? 'Effectué.' })),
          catchError((err: HttpErrorResponse) =>
            of<ResultatAction>({ nom: nomPour(item), ok: false, message: err.error?.message ?? 'Échec.' }),
          ),
        ),
      ),
      toArray(),
    );
  }

  nomAgent(idAgent: string): string {
    const agent = this.agents().find(a => a.idAgent === idAgent);
    return agent ? `${agent.nom} ${agent.prenom ?? ''}`.trim() : idAgent;
  }

  // Même ordre de résolution que le backend (Orange Money essayé avant Moov, voir
  // nombreOrange/nombreMoov ci-dessus) — un seul endroit pour ce libellé, réutilisé par
  // la liste de sélection, le récapitulatif de confirmation et l'historique.
  modeLabel(agent: Agent, enAttente = false): string {
    if (agent.orangeEligible) return enAttente ? 'Orange Money (en attente de validation)' : 'Orange Money';
    if (agent.moovEligible) return enAttente ? 'Moov Money (en attente de validation)' : 'Moov Money';
    return enAttente ? 'Interne (débit immédiat)' : 'Interne';
  }

  modeClass(agent: Agent): string {
    if (agent.orangeEligible) return 'fin-agent-payment__agent-mode--orange';
    if (agent.moovEligible) return 'fin-agent-payment__agent-mode--moov';
    return 'fin-agent-payment__agent-mode--interne';
  }

  providerLabel(provider: PaiementAgent['provider']): string {
    if (provider === 'ORANGE_MONEY') return 'Orange Money';
    if (provider === 'MOOV') return 'Moov Money';
    return 'Interne';
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
