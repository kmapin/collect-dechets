import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type EligibilitySource = 'CONTRACT' | 'SUBSCRIPTION' | 'NONE';

export interface EligibilityResult {
  eligible: boolean;
  source: EligibilitySource;
  reason: string;
}

export function isSubscriptionCurrentlyActive(
  subscription: { isActive?: boolean; endDate?: string | Date } | null | undefined,
): boolean {
  if (!subscription || subscription.isActive !== true) return false;
  return new Date(subscription.endDate as string | Date).getTime() > Date.now();
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
