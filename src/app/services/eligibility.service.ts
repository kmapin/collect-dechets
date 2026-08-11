import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Miroir de `services/eligibility.service.js` (backend) — source unique de
 * vérité pour "ce client peut-il bénéficier du service de collecte ?". Le
 * frontend ne recalcule jamais cette règle lui-même (Prompt 0 : "Le Planning
 * et tout autre appelant ne doit jamais implémenter lui-même ces règles").
 */
export type EligibilitySource = 'CONTRACT' | 'SUBSCRIPTION' | 'NONE';

export interface EligibilityResult {
  eligible: boolean;
  source: EligibilitySource;
  reason: string;
}

/**
 * Fonction pure — même comparaison que `services/eligibility.service.js`
 * (backend) pour déterminer si un Abonnement est actif "maintenant" :
 * `isActive === true` ET `endDate` dans le futur. Comparer `endDate`
 * directement (plutôt que de faire confiance à `isActive` seul) évite
 * d'afficher "Actif" pendant la fenêtre de latence du cron d'expiration
 * (jusqu'à 24h, `services/subscriptionScheduler.js` tourne à minuit).
 * Extraite ici pour être réutilisée par tout affichage qui lisait jusqu'ici
 * `Subscription.isActive` brut (chantier EligibilityService).
 */
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
