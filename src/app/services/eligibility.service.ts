import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Fusion Subscription -> Contrat : 'SUBSCRIPTION' retiré, Contrat est désormais la
// seule source d'éligibilité (voir services/eligibility.service.js côté backend).
export type EligibilitySource = 'CONTRACT' | 'NONE';

export interface EligibilityResult {
  eligible: boolean;
  source: EligibilitySource;
  reason: string;
}

// Fusion Subscription -> Contrat : remplace l'ex `isSubscriptionCurrentlyActive`
// (isActive booléen) — un Contrat est actif via son `status` (enum), pas un booléen.
export function isContratCurrentlyActive(
  contrat: { status?: string } | null | undefined,
): boolean {
  return contrat?.status === 'actif';
}

@Injectable({
  providedIn: 'root',
})
export class EligibilityService {
  constructor(private http: HttpClient) {}

  checkEligibility$(clientId: string): Observable<EligibilityResult | null> {
    return this.http.get<{ success: boolean; data: EligibilityResult }>(`${environment.apiUrl}/eligibility/${clientId}`).pipe(
      map((response) => response?.data ?? null),
      catchError((error) => {
        console.error("Erreur lors de la vérification de l'éligibilité :", error);
        return of(null);
      }),
    );
  }
}
