import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DemandeCollecte {
  _id: string;
  clientId: any;
  agencyId: string;
  wasteTypes: string[];
  notes: string;
  requestedDate: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  // Peuplé (executedByTeamId/code) une fois la demande acceptée — source unique
  // de vérité côté backend, jamais dupliquée sur DemandeCollecte elle-même.
  collecteId: {
    _id: string;
    date: string;
    executedByTeamId: { _id: string; name: string } | null;
    code: string | null;
  } | null;
  scheduledDate: string | null;
  rejectionReason: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DemandeCollecteService {
  private readonly base = `${environment.apiUrl}/demandes-collecte`;

  constructor(private http: HttpClient) {}

  /** Client — crée une demande de passage spontané. L'éligibilité est vérifiée côté serveur (EligibilityService). */
  create(payload: { agencyId: string; wasteTypes: string[]; notes?: string; requestedDate?: string }): Observable<{ success: boolean; data: DemandeCollecte }> {
    return this.http.post<{ success: boolean; data: DemandeCollecte }>(this.base, payload);
  }

  listForClient(): Observable<{ success: boolean; data: DemandeCollecte[] }> {
    return this.http.get<{ success: boolean; data: DemandeCollecte[] }>(`${this.base}/me`);
  }

  cancel(id: string): Observable<{ success: boolean; data: DemandeCollecte }> {
    return this.http.patch<{ success: boolean; data: DemandeCollecte }>(`${this.base}/${id}/cancel`, {});
  }

  listForAgency(agencyId: string, status?: string): Observable<{ success: boolean; data: DemandeCollecte[] }> {
    const params: any = status ? { status } : {};
    return this.http.get<{ success: boolean; data: DemandeCollecte[] }>(`${this.base}/agency/${agencyId}`, { params });
  }

  accept(id: string, scheduledDate?: string): Observable<{ success: boolean; data: DemandeCollecte }> {
    return this.http.patch<{ success: boolean; data: DemandeCollecte }>(`${this.base}/${id}/accept`, { scheduledDate });
  }

  /** Assigne une équipe à la Collecte déjà créée à l'acceptation. */
  assignTeam(id: string, teamId: string): Observable<{ success: boolean; data: DemandeCollecte }> {
    return this.http.patch<{ success: boolean; data: DemandeCollecte }>(`${this.base}/${id}/assign-team`, { teamId });
  }

  /** Crée le planning de suivi (nécessite une équipe déjà assignée). */
  createPlanning(id: string): Observable<{ success: boolean; data: { demande: DemandeCollecte; planning: any } }> {
    return this.http.post<{ success: boolean; data: { demande: DemandeCollecte; planning: any } }>(`${this.base}/${id}/planning`, {});
  }

  reject(id: string, rejectionReason?: string): Observable<{ success: boolean; data: DemandeCollecte }> {
    return this.http.patch<{ success: boolean; data: DemandeCollecte }>(`${this.base}/${id}/reject`, { rejectionReason });
  }
}
