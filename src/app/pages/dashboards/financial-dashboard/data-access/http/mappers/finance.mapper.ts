import { DashboardKpi, Retrait } from '../../../models';
import { PaiementListe, RepartitionModePaiement } from '../../contracts/finance-data.service';

// Libellés FR des opérateurs exacts renvoyés par le backend (Transaction.operator,
// models/transaction.js) — même convention que client-dashboard.ts::OPERATOR_LABEL_MAP /
// admin-dashboard.ts / agency-finance.ts, dupliquée ici faute de module partagé existant
// pour ce mapping trivial. Réutilisée par mapPaiementListeDto ET
// mapRepartitionModePaiementDto ci-dessous — les deux affichaient auparavant un bucket
// générique ("MobileMoney") au lieu de l'opérateur réellement utilisé.
const OPERATOR_LABELS: Record<string, string> = {
  ORANGE_MONEY: 'Orange Money',
  MOOV_MONEY: 'Moov Money',
  TELECEL_MONEY: 'Telecel Money',
  QRPAY: 'QR Pay',
};

function operatorLabel(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const operateur = String(raw);
  return OPERATOR_LABELS[operateur] ?? operateur;
}

// DTO réel capturé sur le backend collecte-dechets (services/financeStats.js::getDashboardKpi) —
// noms de champs déjà alignés 1:1 côté serveur, conversion = construction explicite typée
// plutôt qu'un simple cast, pour détecter au runtime un champ manquant/mal typé.
export function mapDashboardKpiDto(dto: unknown): DashboardKpi {
  const d = dto as Record<string, unknown>;
  return {
    soldeDisponible: Number(d['soldeDisponible']),
    totalCollecte: Number(d['totalCollecte']),
    revenusNets: Number(d['revenusNets']),
    enAttente: Number(d['enAttente']),
    // Item 8 — absents avant ce correctif côté backend, `?? 0` seulement pour un DTO
    // capturé avant le déploiement du correctif (jamais une valeur inventée sinon).
    montantFacture: Number(d['montantFacture'] ?? 0),
    tauxRecouvrement: Number(d['tauxRecouvrement'] ?? 0),
    devise: String(d['devise']),
    misAJourLe: String(d['misAJourLe']),
  };
}

// DTO réel : GET /finance/paiements (controllers/financeStats.js::getPaiements). idFacture
// n'est jamais renvoyé par le backend (pas de lien fiable Transaction↔Facture pour l'instant,
// voir EditRecap.md backend Prompt 5) — absence honnête plutôt qu'une valeur inventée.
export function mapPaiementListeDto(dto: unknown): PaiementListe {
  const d = dto as Record<string, unknown>;
  return {
    idPaiement: String(d['idPaiement']),
    idFacture: d['idFacture'] !== undefined && d['idFacture'] !== null ? String(d['idFacture']) : undefined,
    idClient: String(d['idClient']),
    montant: Number(d['montant']),
    datePaiement: String(d['datePaiement']),
    modePaiement: operatorLabel(d['modePaiement']),
    clientNom: String(d['clientNom']),
  };
}

// DTO réel : GET /finance/retraits (services/transaction.js::getWithdrawByAgencyPaginated).
function optionalString(value: unknown): string | undefined {
  return value !== undefined && value !== null ? String(value) : undefined;
}

export function mapRetraitDto(dto: unknown): Retrait {
  const d = dto as Record<string, unknown>;
  return {
    idRetrait: String(d['idRetrait']),
    montant: Number(d['montant']),
    dateRetrait: String(d['dateRetrait']),
    motif: optionalString(d['motif']),
    statut: optionalString(d['statut']),
    initiateurNom: optionalString(d['initiateurNom']),
    traitePar: optionalString(d['traitePar']),
    dateTraitement: optionalString(d['dateTraitement']),
    motifRejet: optionalString(d['motifRejet']),
  };
}

// DTO réel : GET /finance/dashboard/repartition-mode (services/financeStats.js::
// getRepartitionModePaiement) — groupe par OPÉRATEUR EXACT ('ORANGE_MONEY'/'MOOV_MONEY'/
// 'TELECEL_MONEY'/'QRPAY'). Demande produit explicite : afficher le moyen de paiement exact
// plutôt que le bucket générique ModePaiement.MOBILE_MONEY (utilisé ailleurs pour un paiement
// individuel, Paiement.modePaiement) — un opérateur inconnu retombe sur sa valeur brute plutôt
// que d'être masqué, pour rester visible côté produit si un nouvel opérateur apparaît.
// Fonction absente jusqu'ici (le http service castait directement la réponse HTTP, cf.
// finance-data.http.service.ts) : ajoutée ici plutôt que dans un composant feature/*, comme
// demandé par le Prompt F1 pour toute différence de forme de données. Câblée au Prompt F4.
export function mapRepartitionModePaiementDto(dto: unknown[]): RepartitionModePaiement[] {
  const totalParOperateur = new Map<string, number>();
  for (const raw of dto) {
    const row = raw as Record<string, unknown>;
    const montant = Number(row['montant']);
    const label = operatorLabel(row['mode']) ?? '';
    totalParOperateur.set(label, (totalParOperateur.get(label) ?? 0) + montant);
  }
  return [...totalParOperateur.entries()].map(([mode, montant]) => ({ mode, montant }));
}
