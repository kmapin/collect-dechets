import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type FeeType = 'FIXED' | 'PERCENTAGE';

export interface FeeBlock {
  enabled: boolean;
  type: FeeType;
  value: number;
}

export interface FeeConfigData {
  agencyId?: string | null;
  clientPaymentFee: FeeBlock;
  agencyWithdrawalFee: FeeBlock;
}

export interface PlatformFeesSummary {
  debut: string;
  fin: string;
  payments: { platformAmount: number; count: number };
  withdrawals: { platformAmount: number; count: number };
  totalPlatformAmount: number;
}

/**
 * GET/PUT /finance/fee-config (Prompt F2) — lecture ouverte à manager+super_admin
 * côté backend, mais l'écran qui consomme `updateGlobal$` (Prompt F8) est réservé
 * au Super Admin (voir fee-config-admin.guard.ts) : jamais une agence ne modifie
 * elle-même le taux/montant des frais plateforme.
 */
@Injectable({ providedIn: 'root' })
export class FeeConfigService {
  private readonly base = `${environment.apiUrl}/finance`;

  constructor(private http: HttpClient) {}

  getGlobal$(): Observable<{ success: boolean; data: FeeConfigData }> {
    return this.http.get<{ success: boolean; data: FeeConfigData }>(`${this.base}/fee-config`);
  }

  updateGlobal$(data: Partial<FeeConfigData>): Observable<{ success: boolean; data: FeeConfigData }> {
    return this.http.put<{ success: boolean; data: FeeConfigData }>(`${this.base}/fee-config`, data);
  }

  /** GET /finance/platform-fees?agencyId=... (Prompt F6 exposé au F8) — traçabilité des frais perçus. */
  getPlatformFees$(agencyId?: string): Observable<PlatformFeesSummary> {
    const params: Record<string, string> = {};
    if (agencyId) params['agencyId'] = agencyId;
    return this.http.get<PlatformFeesSummary>(`${this.base}/platform-fees`, { params });
  }
}
