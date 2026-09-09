import { DashboardKpi, Retrait } from '../../../models';
import { PaiementListe, RepartitionModePaiement } from '../../contracts/finance-data.service';

const OPERATOR_LABELS: Record<string, string> = {
  ORANGE_MONEY: 'Orange Money',
  MOOV_MONEY: 'Moov Money',
  TELECEL_MONEY: 'Telecel Money',
  QRPAY: 'QR Pay',
  ESPECES_AUTRE: 'Espèces / autre',
};

function operatorLabel(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const operateur = String(raw);
  return OPERATOR_LABELS[operateur] ?? operateur;
}

export function mapDashboardKpiDto(dto: unknown): DashboardKpi {
  const d = dto as Record<string, unknown>;
  return {
    soldeDisponible: Number(d['soldeDisponible']),
    totalCollecte: Number(d['totalCollecte']),
    revenusNets: Number(d['revenusNets']),
    enAttente: Number(d['enAttente']),
    montantFacture: Number(d['montantFacture'] ?? 0),
    tauxRecouvrement: Number(d['tauxRecouvrement'] ?? 0),
    devise: String(d['devise']),
    misAJourLe: String(d['misAJourLe']),
  };
}

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
    grossAmount: d['grossAmount'] !== undefined && d['grossAmount'] !== null ? Number(d['grossAmount']) : undefined,
    feeType: (d['feeType'] as PaiementListe['feeType']) ?? undefined,
    feeValue: d['feeValue'] !== undefined && d['feeValue'] !== null ? Number(d['feeValue']) : undefined,
    feeAmount: d['feeAmount'] !== undefined && d['feeAmount'] !== null ? Number(d['feeAmount']) : undefined,
    feePayer: (d['feePayer'] as PaiementListe['feePayer']) ?? undefined,
    netAmount: d['netAmount'] !== undefined && d['netAmount'] !== null ? Number(d['netAmount']) : undefined,
    dateDebut: d['dateDebut'] !== undefined && d['dateDebut'] !== null ? String(d['dateDebut']) : undefined,
    dateFin: d['dateFin'] !== undefined && d['dateFin'] !== null ? String(d['dateFin']) : undefined,
  };
}

// DTO réel : GET /finance/retraits (services/transaction.js::getWithdrawByAgencyPaginated).
function optionalString(value: unknown): string | undefined {
  return value !== undefined && value !== null ? String(value) : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return value !== undefined && value !== null ? Number(value) : undefined;
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
    grossAmount: optionalNumber(d['grossAmount']),
    feeType: optionalString(d['feeType']) as Retrait['feeType'],
    feeValue: optionalNumber(d['feeValue']),
    feeAmount: optionalNumber(d['feeAmount']),
    feeOption: optionalString(d['feeOption']) as Retrait['feeOption'],
    netAmountReceived: optionalNumber(d['netAmountReceived']),
    walletDebitAmount: optionalNumber(d['walletDebitAmount']),
    // platformAmount volontairement non mappé — voir retrait.model.ts.
  };
}

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
