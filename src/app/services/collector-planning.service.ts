import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CollectorCollecte {
  collecteId: string;
  client: { _id: string; firstName: string; lastName: string; phone?: string; address?: any } | null;
  serviceLocation: { _id: string; name: string; type: string; address: any; onSiteContactName?: string; onSiteContactPhone?: string; accessInstructions?: string } | null;
  nbCollecte?: number;
  wasteType?: string;
  status: string;
}

export interface CollectorPlanning {
  _id: string;
  reference: string;
  libelle?: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  equipes: { _id: string; name: string }[];
  myClientsCount: number;
  collectes: CollectorCollecte[];
}

export interface CollectorTodayCollectes {
  plannings: CollectorPlanning[];
  collectes: number;
  totalClients: number;
}

export interface ScanByLocationPayload {
  serviceLocationId: string;
  qrToken: string;
}

export interface ScanByAccountPayload {
  code: string;
  id: string;
  name: string;
}

export interface CreateSignalementPayload {
  collecteId?: string;
  type: 'missed_collection' | 'compliance_issue' | 'complaint' | 'technical_issue' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'other';
  description: string;
  comment?: string;
  photos?: string[];
}

/**
 * Branchement réel du dashboard collecteur (TEMPS-REEL-WEBSOCKET.md §4,
 * Collecteur) — remplace les 3 endroits qui simulaient localement des données
 * (collectes du jour, scan QR, signalement) par les vraies routes déjà
 * existantes côté backend mais jamais consommées par aucun frontend
 * (voir le commentaire de controllers/qrValidation.js::updateStatus :
 * "aucun consommateur réel de /scan trouvé — dashboard collecteur mocké").
 */
@Injectable({ providedIn: 'root' })
export class CollectorPlanningService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getTodayCollectes(collectorId: string): Observable<CollectorTodayCollectes> {
    return this.http
      .get<{ success: boolean; data: CollectorTodayCollectes }>(`${this.api}/planning/collector/${collectorId}/collectes`)
      .pipe(map((r) => r.data));
  }

  scanCollecte(payload: ScanByLocationPayload | ScanByAccountPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/collecte/scan`, payload);
  }

  createSignalement(payload: CreateSignalementPayload): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.api}/signalements`, payload);
  }
}
