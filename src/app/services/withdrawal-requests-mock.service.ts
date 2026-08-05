import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { PaymentMethod } from '../models/finance.model';
import {
  AdminWithdrawalRequest,
  ApproveWithdrawalPayload,
  PaginatedWithdrawalRequests,
  RecentWithdrawalSummary,
  RejectWithdrawalPayload,
  WithdrawalRequestFilter,
  WithdrawalStatus,
} from '../models/withdrawal-request.model';

/**
 * Simule le futur backend de validation admin des retraits d'agence.
 *
 * Phase mock explicite (pas d'intégration backend pour l'instant, voir demande) :
 * chaque méthode publique renvoie un Observable avec un délai simulé, exactement la
 * forme qu'aurait un vrai HttpClient — remplacer cette classe par un
 * `WithdrawalRequestsHttpService` implémentant la même API publique (mêmes noms de
 * méthodes, mêmes types de retour) est le seul changement nécessaire pour brancher un
 * vrai backend ; aucun composant consommateur n'aurait à changer.
 *
 * Le futur backend réel devra exposer un statut PENDING par défaut (aujourd'hui
 * `Withdraw.js` exécute le retrait immédiatement, sans étape d'approbation — voir
 * EditRecap.md) : cette classe modélise donc le comportement CIBLE, pas l'existant.
 */
@Injectable({ providedIn: 'root' })
export class WithdrawalRequestsMockService {
  private static readonly SIMULATED_LATENCY_MS = 350;

  private requests: AdminWithdrawalRequest[] = buildMockWithdrawalRequests();

  // ── Lecture ───────────────────────────────────────────────────

  getWithdrawalRequests(filter: WithdrawalRequestFilter = {}): Observable<PaginatedWithdrawalRequests> {
    return of(null).pipe(
      delay(WithdrawalRequestsMockService.SIMULATED_LATENCY_MS),
      map(() => this.applyFilterAndPaginate(filter)),
    );
  }

  getWithdrawalById(id: string): Observable<AdminWithdrawalRequest> {
    const found = this.requests.find(r => r.id === id);
    if (!found) {
      return throwError(() => new Error(`Demande de retrait introuvable (id: ${id})`)).pipe(
        delay(WithdrawalRequestsMockService.SIMULATED_LATENCY_MS),
      );
    }
    return of({ ...found }).pipe(delay(WithdrawalRequestsMockService.SIMULATED_LATENCY_MS));
  }

  searchWithdrawals(query: string): Observable<AdminWithdrawalRequest[]> {
    return of(null).pipe(
      delay(WithdrawalRequestsMockService.SIMULATED_LATENCY_MS),
      map(() => this.matchSearch(this.requests, query)),
    );
  }

  filterWithdrawals(filter: WithdrawalRequestFilter): Observable<AdminWithdrawalRequest[]> {
    return of(null).pipe(
      delay(WithdrawalRequestsMockService.SIMULATED_LATENCY_MS),
      map(() => this.matchFilters(this.requests, filter)),
    );
  }

  paginateWithdrawals(rows: AdminWithdrawalRequest[], page: number, pageSize: number): PaginatedWithdrawalRequests {
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return {
      data: rows.slice(start, start + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  // ── Actions administrateur ────────────────────────────────────

  approveWithdrawal(id: string, payload: ApproveWithdrawalPayload): Observable<AdminWithdrawalRequest> {
    return of(null).pipe(
      delay(WithdrawalRequestsMockService.SIMULATED_LATENCY_MS),
      map(() => {
        const request = this.requireRequest(id);
        if (request.status !== WithdrawalStatus.PENDING) {
          throw new Error('Seule une demande en attente peut être approuvée.');
        }
        const now = new Date().toISOString();
        request.status = WithdrawalStatus.APPROVED;
        request.processedBy = payload.adminName;
        request.processingDate = now;
        request.updatedAt = now;
        return { ...request };
      }),
    );
  }

  rejectWithdrawal(id: string, payload: RejectWithdrawalPayload): Observable<AdminWithdrawalRequest> {
    return of(null).pipe(
      delay(WithdrawalRequestsMockService.SIMULATED_LATENCY_MS),
      map(() => {
        if (!payload.reason || !payload.reason.trim()) {
          throw new Error('Le motif de rejet est obligatoire.');
        }
        const request = this.requireRequest(id);
        if (request.status !== WithdrawalStatus.PENDING) {
          throw new Error('Seule une demande en attente peut être rejetée.');
        }
        const now = new Date().toISOString();
        request.status = WithdrawalStatus.REJECTED;
        request.processedBy = payload.adminName;
        request.processingDate = now;
        request.rejectionReason = payload.reason.trim();
        request.updatedAt = now;
        return { ...request };
      }),
    );
  }

  // ── Internes ──────────────────────────────────────────────────

  private requireRequest(id: string): AdminWithdrawalRequest {
    const request = this.requests.find(r => r.id === id);
    if (!request) throw new Error(`Demande de retrait introuvable (id: ${id})`);
    return request;
  }

  private applyFilterAndPaginate(filter: WithdrawalRequestFilter): PaginatedWithdrawalRequests {
    let rows = [...this.requests];
    if (filter.search) rows = this.matchSearch(rows, filter.search);
    rows = this.matchFilters(rows, filter);

    const sortBy = filter.sortBy ?? 'requestDate';
    const sortDir = filter.sortDir ?? 'desc';
    rows.sort((a, b) => {
      const av = a[sortBy] as unknown;
      const bv = b[sortBy] as unknown;
      if (av === bv) return 0;
      const cmp = (av ?? '') > (bv ?? '') ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return this.paginateWithdrawals(rows, filter.page ?? 1, filter.pageSize ?? 10);
  }

  private matchSearch(rows: AdminWithdrawalRequest[], query: string): AdminWithdrawalRequest[] {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.agencyName.toLowerCase().includes(q) ||
      r.agencyManagerName.toLowerCase().includes(q) ||
      r.agencyManagerEmail.toLowerCase().includes(q) ||
      r.walletNumber.toLowerCase().includes(q),
    );
  }

  private matchFilters(rows: AdminWithdrawalRequest[], filter: WithdrawalRequestFilter): AdminWithdrawalRequest[] {
    let out = rows;
    if (filter.status && filter.status !== 'all') {
      out = out.filter(r => r.status === filter.status);
    }
    if (filter.agencyId && filter.agencyId !== 'all') {
      out = out.filter(r => r.agencyId === filter.agencyId);
    }
    if (filter.dateFrom) {
      const from = new Date(filter.dateFrom).getTime();
      out = out.filter(r => new Date(r.requestDate).getTime() >= from);
    }
    if (filter.dateTo) {
      const to = new Date(filter.dateTo).getTime();
      out = out.filter(r => new Date(r.requestDate).getTime() <= to);
    }
    return out;
  }
}

// ================================================================
// Jeu de données mock — 15 agences réalistes (mêmes villes que les autres
// jeux de données mock déjà utilisés dans l'app : coverage-map, municipality-mock)
// réparties sur 6 pays d'Afrique de l'Ouest, 32 demandes de retrait couvrant
// les 5 statuts, les 3 opérateurs mobile money, et des dates étalées sur ~2 mois.
// ================================================================

interface MockAgencySeed {
  id: string;
  name: string;
  managerFirstName: string;
  managerLastName: string;
  country: string;
  balance: number;
}

const MOCK_AGENCIES: MockAgencySeed[] = [
  { id: 'ag-01', name: 'EcoCollecte Ouaga Centre',   managerFirstName: 'Abdoulaye', managerLastName: 'Compaoré',  country: 'Burkina Faso', balance: 1850000 },
  { id: 'ag-02', name: 'ZéroDéchet Bobo-Dioulasso',  managerFirstName: 'Fatimata',  managerLastName: 'Sawadogo',  country: 'Burkina Faso', balance: 940000 },
  { id: 'ag-03', name: 'Propreté Plus Koudougou',    managerFirstName: 'Issa',      managerLastName: 'Ouédraogo', country: 'Burkina Faso', balance: 620000 },
  { id: 'ag-04', name: 'Salubrité Kaya',             managerFirstName: 'Awa',       managerLastName: 'Zongo',     country: 'Burkina Faso', balance: 410000 },
  { id: 'ag-05', name: 'GreenCity Bamako',           managerFirstName: 'Moussa',    managerLastName: 'Diarra',    country: 'Mali',         balance: 1320000 },
  { id: 'ag-06', name: 'CleanMali Ségou',            managerFirstName: 'Aminata',   managerLastName: 'Traoré',    country: 'Mali',         balance: 505000 },
  { id: 'ag-07', name: 'Niamey Environnement',       managerFirstName: 'Boubacar',  managerLastName: 'Amadou',    country: 'Niger',        balance: 870000 },
  { id: 'ag-08', name: 'Zinder Recyclage',           managerFirstName: 'Halima',    managerLastName: 'Moussa',    country: 'Niger',        balance: 295000 },
  { id: 'ag-09', name: 'Accra Waste Solutions',      managerFirstName: 'Kwame',     managerLastName: 'Mensah',    country: 'Ghana',        balance: 2100000 },
  { id: 'ag-10', name: 'Kumasi Green Services',      managerFirstName: 'Ama',       managerLastName: 'Owusu',     country: 'Ghana',        balance: 780000 },
  { id: 'ag-11', name: 'Abidjan Net Propre',         managerFirstName: 'Kouassi',   managerLastName: 'Yao',       country: "Côte d'Ivoire", balance: 1640000 },
  { id: 'ag-12', name: 'Yamoussoukro Écologie',      managerFirstName: 'Adjoua',    managerLastName: 'Konan',     country: "Côte d'Ivoire", balance: 530000 },
  { id: 'ag-13', name: 'Dakar Salubrité',            managerFirstName: 'Cheikh',    managerLastName: "Ndiaye",    country: 'Sénégal',      balance: 990000 },
  { id: 'ag-14', name: 'Thiès Collecte',             managerFirstName: 'Mariama',   managerLastName: 'Fall',      country: 'Sénégal',      balance: 360000 },
  { id: 'ag-15', name: 'Ouahigouya Assainissement',  managerFirstName: 'Seydou',    managerLastName: 'Kaboré',    country: 'Burkina Faso', balance: 215000 },
];

const PAYMENT_METHODS: PaymentMethod[] = [PaymentMethod.ORANGE_MONEY, PaymentMethod.MOOV_MONEY, PaymentMethod.TELECEL_MONEY];

// Distribution volontaire (pas uniforme) : reflète un flux réaliste où la majorité des
// demandes sont déjà traitées et une poignée reste en attente à un instant donné.
const STATUS_CYCLE: WithdrawalStatus[] = [
  WithdrawalStatus.PENDING, WithdrawalStatus.PAID, WithdrawalStatus.APPROVED, WithdrawalStatus.PROCESSED,
  WithdrawalStatus.REJECTED, WithdrawalStatus.PAID, WithdrawalStatus.PENDING, WithdrawalStatus.PAID,
  WithdrawalStatus.APPROVED, WithdrawalStatus.PENDING, WithdrawalStatus.PAID, WithdrawalStatus.REJECTED,
];

const REJECTION_REASONS = [
  "Numéro de portefeuille mobile money invalide ou introuvable auprès de l'opérateur.",
  "Solde disponible insuffisant au moment du traitement (litiges clients en cours).",
  "Informations du gestionnaire d'agence non conformes au KYC enregistré.",
  "Demande en doublon avec une demande déjà traitée le même jour.",
];

const ADMIN_NAMES = ['Fatou Kaboré', 'Jean-Baptiste Sanou', 'Rachelle Ilboudo'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function daysAgoIso(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function buildMockWithdrawalRequests(): AdminWithdrawalRequest[] {
  const requests: AdminWithdrawalRequest[] = [];
  const totalRequests = 32;

  for (let i = 0; i < totalRequests; i++) {
    const agency = MOCK_AGENCIES[i % MOCK_AGENCIES.length];
    const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
    const method = PAYMENT_METHODS[i % PAYMENT_METHODS.length];
    const daysAgo = 2 + i * 2; // étale les demandes sur ~2 mois
    const requestDate = daysAgoIso(daysAgo);
    const amount = 25000 + ((i * 37) % 20) * 15000; // entre 25 000 et ~325 000 XOF
    const fees = Math.round(amount * 0.015);
    const netAmount = amount - fees;

    const recentWithdrawals: RecentWithdrawalSummary[] = Array.from({ length: (i % 3) + 1 }, (_, j) => ({
      id: `RET-${agency.id}-${pad(j + 1)}`,
      amount: 30000 + ((i + j) * 5000) % 100000,
      date: daysAgoIso(daysAgo + (j + 1) * 12),
      status: j === 0 ? WithdrawalStatus.PAID : WithdrawalStatus.PROCESSED,
    }));
    const totalWithdrawn = recentWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    const isProcessed = status === WithdrawalStatus.APPROVED || status === WithdrawalStatus.REJECTED
      || status === WithdrawalStatus.PROCESSED || status === WithdrawalStatus.PAID;

    const request: AdminWithdrawalRequest = {
      id: `WD-${new Date(requestDate).getFullYear()}-${pad(i + 1)}`,
      agencyId: agency.id,
      agencyName: agency.name,
      agencyManagerName: `${agency.managerFirstName} ${agency.managerLastName}`,
      agencyManagerEmail: `${agency.managerFirstName.toLowerCase()}.${agency.managerLastName.toLowerCase()}@${agency.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
      agencyManagerPhone: `+226 70 ${pad(10 + (i % 89))} ${pad(20 + (i % 79))} ${pad(30 + (i % 69))}`,
      country: agency.country,
      amount,
      currency: 'XOF',
      fees,
      netAmount,
      paymentMethod: method,
      walletNumber: `+226 7${(i % 9) + 1} ${pad(10 + (i % 89))} ${pad(20 + (i % 79))} ${pad(30 + (i % 69))}`,
      requestDate,
      status,
      availableBalance: agency.balance - (i % 4) * 15000,
      pendingWithdrawalsCount: status === WithdrawalStatus.PENDING ? 1 + (i % 2) : (i % 2),
      pendingWithdrawalsAmount: status === WithdrawalStatus.PENDING ? amount + (i % 2) * 40000 : (i % 2) * 40000,
      totalWithdrawn,
      recentWithdrawals,
      createdAt: requestDate,
      updatedAt: isProcessed ? daysAgoIso(Math.max(0, daysAgo - 1)) : requestDate,
      processedBy: isProcessed ? ADMIN_NAMES[i % ADMIN_NAMES.length] : undefined,
      processingDate: isProcessed ? daysAgoIso(Math.max(0, daysAgo - 1)) : undefined,
      rejectionReason: status === WithdrawalStatus.REJECTED ? REJECTION_REASONS[i % REJECTION_REASONS.length] : undefined,
    };

    requests.push(request);
  }

  return requests;
}
