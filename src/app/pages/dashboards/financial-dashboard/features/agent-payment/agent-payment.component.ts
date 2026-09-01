import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, concatMap, forkJoin, from, map, of, toArray } from 'rxjs';
import { aLaPermission, Agent, Page, PaiementAgent, PaiementAgentActionable, PaiementAgentDetail, Role } from '../../models';
import { AGENT_DATA_SERVICE } from '../../data-access/tokens/agent-data.token';
import { SESSION_SERVICE } from '../../data-access/tokens/session.token';
import { EXPORT_SERVICE } from '../../data-access/tokens/export.token';
import { ExportColumn } from '../../data-access/contracts/export.service';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDateTime } from '../../../../../shared/format.util';
import { SearchFilterComponent } from '../../shared/filters/search-filter.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { badgePaiementAgent } from '../../shared/status-badge/status-badge.util';
import {
  construireRecuPaiementAgent,
  nomFichierRecuPaiementAgent,
  ouvrirRecuDansNouvelOnglet,
  telechargerRecuPdf,
} from '../../shared/receipt/paiement-agent-recu.util';
import { NotificationService } from '../../../../../services/notification.service';
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
// jamais en parallèle) : pour les validations Moov/Orange Money, ça évite de bombarder
// l'API opérateur de plusieurs appels concurrents (un paiement interne n'a plus cette
// contrainte depuis qu'il ne débite plus le wallet agence). Chaque élément réussit ou échoue
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
  private readonly authService = inject(AuthService);
  private readonly session = inject(SESSION_SERVICE);
  private readonly notificationService = inject(NotificationService);
  private readonly exportService = inject(EXPORT_SERVICE);

  // currentUser$ plutôt que getCurrentUser() seul en initialValue : cette route est
  // accessible dès que droitsFinance est vrai et que 'agent_payments.view' est détenue
  // (financeAccessGuard + financePermissionGuard, voir financial-dashboard.routes.ts),
  // donc la session financière a déjà été chargée par le garde avant que ce composant ne
  // se construise, même convention que client-list/client-sheet/finance-layout de ce module.
  private readonly utilisateurFinance = toSignal(this.session.currentUser$, { initialValue: this.session.getCurrentUser() });
  readonly estValidateur = computed(
    () => this.utilisateurFinance().role === Role.ADMINISTRATEUR || this.authService.hasRole(UserRole.SUPER_ADMIN),
  );
  // Profondeur de défense (cosmétique) : le serveur refuse déjà POST /finance/agents/
  // paiements sans agent_payments.create (requireFinancePermission) — masquer le
  // formulaire évite juste un aller-retour inutile.
  readonly peutCreer = computed(() => aLaPermission(this.utilisateurFinance(), 'agent_payments.create'));

  readonly agents = signal<Agent[]>([]);
  readonly chargementAgents = signal(true);

  readonly historique = signal<PaiementAgent[]>([]);
  readonly chargementHistorique = signal(true);

  // Filtres de l'historique — appliqués CÔTÉ SERVEUR (chantier "filtres côté
  // backend") : chaque changement relance chargerHistorique() avec les critères
  // courants (voir onRechercheChange/onMontantMinChange/etc. et appliquerFiltres()
  // ci-dessous), jamais un filtrage en mémoire d'un lot déjà chargé.
  readonly rechercheAgent = signal('');
  readonly montantMin = signal<number | null>(null);
  readonly statutFiltre = signal<PaiementAgent['status'] | 'all'>('all');
  readonly providerFiltre = signal<PaiementAgent['provider'] | 'all'>('all');
  readonly dateDebutFiltre = signal<string | null>(null); // YYYY-MM-DD
  readonly dateFinFiltre = signal<string | null>(null); // YYYY-MM-DD

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

  // Options des filtres statut/mode (historique) — mêmes valeurs que le domaine
  // backend (models/PaiementAgent.js), jamais un sous-ensemble ou un libellé inventé.
  readonly statutsDisponibles: PaiementAgent['status'][] =
    ['EN_ATTENTE_VALIDATION', 'INITIATED', 'COMPLETED', 'FAILED', 'A_VERIFIER_MANUELLEMENT', 'REJETE'];
  readonly providersDisponibles: PaiementAgent['provider'][] = ['MOOV', 'ORANGE_MONEY', 'INTERNE'];

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
  // Un paiement interne est effectué hors plateforme (espèces...) — jamais de débit du
  // wallet agence (comme Moov/Orange Money, qui restent EN_ATTENTE_VALIDATION sans
  // débit avant la validation Super Admin), donc aucune vérification de solde ici.
  readonly nombreInterne = computed(() => this.agentsSelectionnes().filter(a => !a.orangeEligible && !a.moovEligible).length);

  readonly formulaireValide = computed(
    () => this.idsAgentsSelectionnes().length > 0 && (this.montant() ?? 0) > 0,
  );

  // ── Numéro de réception personnalisé (par agent sélectionné) ────────────────────
  // Par défaut, le paiement part vers le numéro enregistré sur la fiche agent
  // (agent.telephone) — l'agence peut le remplacer ici si l'agent souhaite recevoir
  // ce paiement précis sur un autre numéro. Reverifié côté backend à l'envoi (voir
  // services/paiementAgent.js::_resolveProviderPourAgent) : le mode de paiement réel
  // (Orange Money/Moov Money/Interne) suit le numéro effectivement utilisé, jamais
  // celui de la fiche agent si un numéro personnalisé est saisi.
  readonly numerosPersonnalises = signal<Record<string, string>>({});

  numeroPour(agent: Agent): string {
    return this.numerosPersonnalises()[agent.idAgent] ?? agent.telephone ?? '';
  }

  onNumeroChange(idAgent: string, valeur: string): void {
    this.numerosPersonnalises.update(v => ({ ...v, [idAgent]: valeur }));
  }

  numeroModifie(agent: Agent): boolean {
    return this.numeroPour(agent).trim() !== (agent.telephone ?? '').trim();
  }

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

  // Demandes nécessitant une action du rôle validateur — chargées INDÉPENDAMMENT de
  // l'historique filtré ci-dessous (chantier "filtres côté backend" : avant, dérivées
  // par un simple computed() sur le même historique() en mémoire ; si historique()
  // devenait le résultat d'un filtre serveur — ex. provider=INTERNE — ce panneau
  // perdrait de vue les demandes MOOV/ORANGE_MONEY en attente, une régression
  // silencieuse). Chargé une fois (pageSize large, jamais filtré) via
  // chargerDemandesEnAttente(), rafraîchi après toute action qui change ce statut.
  readonly demandesEnAttente = signal<PaiementAgent[]>([]);

  // Distingue "aucun paiement du tout" de "aucun paiement ne correspond aux filtres"
  // dans le message d'état vide — nécessaire depuis que le filtrage est serveur :
  // historique() ne contient plus jamais que le résultat DÉJÀ filtré, il n'y a plus
  // de lot brut côté client à comparer.
  readonly filtresActifs = computed(() =>
    !!this.rechercheAgent().trim()
    || this.montantMin() !== null
    || this.statutFiltre() !== 'all'
    || this.providerFiltre() !== 'all'
    || !!this.dateDebutFiltre()
    || !!this.dateFinFiltre(),
  );

  private appliquerFiltres(): void {
    this.chargerHistorique();
  }

  onRechercheChange(valeur: string): void {
    this.rechercheAgent.set(valeur);
    this.appliquerFiltres();
  }

  onMontantMinChange(valeur: number | null): void {
    this.montantMin.set(valeur);
    this.appliquerFiltres();
  }

  onStatutFiltreChange(valeur: PaiementAgent['status'] | 'all'): void {
    this.statutFiltre.set(valeur);
    this.appliquerFiltres();
  }

  onProviderFiltreChange(valeur: PaiementAgent['provider'] | 'all'): void {
    this.providerFiltre.set(valeur);
    this.appliquerFiltres();
  }

  onDateDebutFiltreChange(valeur: string | null): void {
    this.dateDebutFiltre.set(valeur);
    this.appliquerFiltres();
  }

  onDateFinFiltreChange(valeur: string | null): void {
    this.dateFinFiltre.set(valeur);
    this.appliquerFiltres();
  }

  reinitialiserFiltres(): void {
    this.rechercheAgent.set('');
    this.montantMin.set(null);
    this.statutFiltre.set('all');
    this.providerFiltre.set('all');
    this.dateDebutFiltre.set(null);
    this.dateFinFiltre.set(null);
    this.appliquerFiltres();
  }

  // ── Export (PDF / Excel / CSV) ───────────────────────────────────────────────────
  // Exporte historique(), qui EST déjà le résultat filtré côté serveur (chantier
  // "filtres côté backend") — l'export reflète donc ce que l'écran affiche
  // actuellement, jamais une surprise (lignes exportées différentes de ce qui est visible).
  readonly exportEnCours = signal<'pdf' | 'excel' | 'csv' | null>(null);

  private readonly EXPORT_COLUMNS: ExportColumn<Record<string, string>>[] = [
    { key: 'agent', label: 'Agent' },
    { key: 'montant', label: 'Montant' },
    { key: 'date', label: 'Date' },
    { key: 'statut', label: 'Statut' },
    { key: 'mode', label: 'Mode' },
    { key: 'reference', label: 'Référence' },
  ];

  private lignesExport(): Record<string, string>[] {
    return this.historique().map(p => ({
      agent: this.nomAgent(p.idAgent),
      montant: this.formatMontant(p.montant),
      date: this.formatDate(p.datePaiement),
      statut: this.badgeStatut(p.status).label,
      mode: this.providerLabel(p.provider),
      reference: p.reference ?? '—',
    }));
  }

  private nomFichierExport(extension: string): string {
    return `paiements-agents-${new Date().toISOString().slice(0, 10)}.${extension}`;
  }

  exporterCsv(): void {
    this.exportService.exportToCsv(this.lignesExport(), this.EXPORT_COLUMNS, this.nomFichierExport('csv'));
  }

  exporterPdf(): void {
    this.exportService.exportToPdf(this.lignesExport(), this.EXPORT_COLUMNS, this.nomFichierExport('pdf'), {
      titre: 'Historique des paiements agents',
      sousTitre: `${this.historique().length} paiement(s)`,
    });
  }

  // Pas de wrapper partagé pour Excel dans ce module (ExportService ne couvre que
  // CSV/PDF) — même import dynamique `xlsx` que client-dashboard.ts::
  // exportPaymentHistoryExcel()/admin-dashboard.ts::exportStatistics(), convention
  // déjà établie à 3 endroits plutôt qu'un nouveau wrapper pour un seul usage de plus.
  async exporterExcel(): Promise<void> {
    this.exportEnCours.set('excel');
    try {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(this.historique().map(p => ({
        Agent: this.nomAgent(p.idAgent),
        Montant: p.montant,
        Date: this.formatDate(p.datePaiement),
        Statut: this.badgeStatut(p.status).label,
        Mode: this.providerLabel(p.provider),
        Référence: p.reference ?? '—',
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Paiements');
      XLSX.writeFile(workbook, this.nomFichierExport('xlsx'));
    } catch {
      this.notificationService.showError('Erreur', "Impossible de générer le fichier Excel pour le moment.");
    } finally {
      this.exportEnCours.set(null);
    }
  }

  constructor() {
    this.chargerAgents();
    this.rafraichirListes();
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

    this.executerEnSequence(ids, (idAgent, index) => {
      const numero = this.numerosPersonnalises()[idAgent]?.trim();
      return this.agentData.payerAgent({ idAgent, montant, ...(numero ? { phoneNumber: numero } : {}) }).pipe(
        map(paiement => {
          this.progressionEnvoi.set({ fait: index + 1, total: ids.length });
          return paiement;
        }),
      );
    }).subscribe(resultats => {
      this.enregistrement.set(false);
      this.progressionEnvoi.set(null);
      this.resultatsEnvoi.set(resultats);
      this.etape.set('formulaire');
      this.idsAgentsSelectionnes.set([]);
      this.montant.set(null);
      this.numerosPersonnalises.set({});
      this.rafraichirListes();
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
        this.rafraichirListes();
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
      this.rafraichirListes();
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
    return 'Interne';
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

  // ── Détail / reçu / vérification de statut ──────────────────────────────────────
  // Le reçu (voir/télécharger) réutilise l'historique déjà chargé (aucun aller-retour
  // réseau, voir shared/receipt/paiement-agent-recu.util.ts) ; le détail et la
  // vérification de statut vont chercher l'état réel en base (GET /finance/agents/
  // paiements/:id) — nécessaire pour les champs absents de la liste (nom résolu,
  // initiateur/validateur, référence opérateur, dates d'audit).
  readonly showDetailDrawer = signal(false);
  readonly detailPaiement = signal<PaiementAgentDetail | null>(null);
  readonly chargementDetail = signal(false);
  readonly erreurDetail = signal<string | null>(null);
  readonly verificationEnCours = signal<string | null>(null);
  readonly recuEnCours = signal<string | null>(null);

  // Un reçu n'a de sens que pour un paiement effectivement PAYÉ — jamais généré pour
  // une demande encore en attente ou échouée (rien à justifier).
  recuDisponible(paiement: PaiementAgentActionable): boolean {
    return paiement.status === 'COMPLETED';
  }

  // "Vérifier le statut" n'a d'intérêt que tant que l'issue n'est pas déjà définitive
  // (voir le README applicatif / le rapport livré : aucun opérateur Mobile Money
  // n'expose de vérification automatisée exploitable pour ce flux aujourd'hui — ceci
  // re-synchronise l'état réel en base, utile si un autre administrateur a déjà agi).
  verificationPossible(paiement: PaiementAgentActionable): boolean {
    return paiement.status === 'EN_ATTENTE_VALIDATION'
      || paiement.status === 'INITIATED'
      || paiement.status === 'A_VERIFIER_MANUELLEMENT'
      || paiement.status === 'FAILED'
      || paiement.status === 'REJETE';
  }

  voirDetail(paiement: PaiementAgent): void {
    this.showDetailDrawer.set(true);
    this.detailPaiement.set(null);
    this.erreurDetail.set(null);
    this.chargementDetail.set(true);
    this.agentData.getPaiementDetail(paiement.idPaiementAgent).subscribe({
      next: detail => {
        this.detailPaiement.set(detail);
        this.chargementDetail.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.chargementDetail.set(false);
        this.erreurDetail.set(err.error?.message ?? 'Paiement introuvable ou accès refusé.');
      },
    });
  }

  closeDetailDrawer(): void {
    this.showDetailDrawer.set(false);
    this.detailPaiement.set(null);
    this.erreurDetail.set(null);
  }

  // Re-synchronise l'état réel depuis la base (voir verificationPossible ci-dessus
  // pour la limite documentée) : ne simule jamais un appel opérateur. Si le statut a
  // changé (ex. un autre administrateur vient de valider/résoudre la demande), le
  // détail ouvert (le cas échéant) et l'historique sont rafraîchis.
  verifierStatut(paiement: PaiementAgentActionable): void {
    this.verificationEnCours.set(paiement.idPaiementAgent);
    this.agentData.getPaiementDetail(paiement.idPaiementAgent).subscribe({
      next: detail => {
        this.verificationEnCours.set(null);
        if (this.detailPaiement()?.idPaiementAgent === detail.idPaiementAgent) {
          this.detailPaiement.set(detail);
        }
        if (detail.status !== paiement.status) {
          this.notificationService.showSuccess('Statut mis à jour', `Nouveau statut : ${this.badgeStatut(detail.status).label}.`);
          this.rafraichirListes();
        } else {
          this.notificationService.showInfo('Statut inchangé', `Toujours : ${this.badgeStatut(detail.status).label}.`);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.verificationEnCours.set(null);
        this.notificationService.showError('Erreur', err.error?.message ?? 'Impossible de vérifier ce paiement pour le moment.');
      },
    });
  }

  voirRecu(paiement: PaiementAgentActionable): void {
    this.genererRecu(paiement, 'voir');
  }

  telechargerRecu(paiement: PaiementAgentActionable): void {
    this.genererRecu(paiement, 'telecharger');
  }

  private genererRecu(paiement: PaiementAgentActionable, action: 'voir' | 'telecharger'): void {
    if (!this.recuDisponible(paiement)) {
      this.notificationService.showWarning('Reçu indisponible', "Aucun reçu n'est disponible tant que ce paiement n'est pas payé.");
      return;
    }
    this.recuEnCours.set(paiement.idPaiementAgent);
    try {
      const nom = this.nomAgent(paiement.idAgent);
      const agenceNom = this.utilisateurFinance().agence?.nom;
      const doc = construireRecuPaiementAgent(paiement, nom, agenceNom);
      if (action === 'voir') {
        ouvrirRecuDansNouvelOnglet(doc);
      } else {
        telechargerRecuPdf(doc, nomFichierRecuPaiementAgent(paiement, nom));
      }
    } catch {
      this.notificationService.showError('Erreur', action === 'voir'
        ? "Impossible d'afficher le reçu pour le moment."
        : 'Impossible de générer le reçu pour le moment.');
    } finally {
      this.recuEnCours.set(null);
    }
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


  // Filtres appliqués côté serveur (chantier "filtres côté backend") — voir
  // onRechercheChange/onMontantMinChange/etc., qui appellent appliquerFiltres() ->
  // chargerHistorique() à chaque changement.
  private chargerHistorique(): void {
    this.chargementHistorique.set(true);
    const statut = this.statutFiltre();
    const provider = this.providerFiltre();
    this.agentData.getPaiementsAgent({
      pageSize: 50,
      filter: {
        search: this.rechercheAgent() || undefined,
        montantMin: this.montantMin() ?? undefined,
        statut: statut !== 'all' ? statut : undefined,
        provider: provider !== 'all' ? provider : undefined,
        dateDebut: this.dateDebutFiltre() ?? undefined,
        dateFin: this.dateFinFiltre() ?? undefined,
      },
    }).subscribe({
      next: page => {
        this.historique.set([...page.items].sort((a, b) => (a.datePaiement < b.datePaiement ? 1 : -1)));
        this.chargementHistorique.set(false);
      },
      error: () => this.chargementHistorique.set(false),
    });
  }

  // Panneau de validation (demandesEnAttente) — TOUJOURS non filtré, indépendant des
  // filtres de l'historique ci-dessus (voir le commentaire sur demandesEnAttente) :
  // deux appels ciblés plutôt qu'un large lot re-filtré en mémoire, chaque statut
  // pertinent étant déjà un filtre serveur supporté.
  private chargerDemandesEnAttente(): void {
    forkJoin([
      this.agentData.getPaiementsAgent({ pageSize: 100, filter: { statut: 'EN_ATTENTE_VALIDATION' } }),
      this.agentData.getPaiementsAgent({ pageSize: 100, filter: { statut: 'A_VERIFIER_MANUELLEMENT' } }),
    ]).subscribe({
      next: ([enAttente, aVerifier]: [Page<PaiementAgent>, Page<PaiementAgent>]) =>
        this.demandesEnAttente.set([...enAttente.items, ...aVerifier.items]),
      error: () => {},
    });
  }

  private rafraichirListes(): void {
    this.chargerHistorique();
    this.chargerDemandesEnAttente();
  }
}
