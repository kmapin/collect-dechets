import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Redevance } from '../models/redevance.model';

/**
 * Un appel par endpoint `routes/redevanceRoute.js`, même patron que
 * `contrat.service.ts`.
 */
@Injectable({
  providedIn: 'root',
})
export class RedevanceService {
  constructor(private http: HttpClient) {}

  getRedevancesByContrat$(contratId: string): Observable<Redevance[]> {
    return this.http.get<Redevance[]>(`${environment.apiUrl}/redevances/contrat/${contratId}`).pipe(
      map((response) => response ?? []),
      catchError((error) => {
        console.error('Erreur lors de la récupération des redevances du contrat :', error);
        return of([]);
      }),
    );
  }

  // `plage` (chantier "historique paiements — vraie plage de dates") : optionnelle,
  // filtre sur dateEcheance côté backend (services/redevance.js::getRedevancesByClient)
  // — jamais un filtrage a posteriori côté client.
  getRedevancesByClient$(clientId: string, plage?: { debut?: Date; fin?: Date }): Observable<Redevance[]> {
    let params = new HttpParams();
    if (plage?.debut) params = params.set('dateDebut', plage.debut.toISOString());
    if (plage?.fin) params = params.set('dateFin', plage.fin.toISOString());

    return this.http.get<Redevance[]>(`${environment.apiUrl}/redevances/client/${clientId}`, { params }).pipe(
      map((response) => response ?? []),
      catchError((error) => {
        console.error('Erreur lors de la récupération des redevances du client :', error);
        return of([]);
      }),
    );
  }

  getRedevancesByAgence$(agencyId: string): Observable<Redevance[]> {
    return this.http.get<Redevance[]>(`${environment.apiUrl}/redevances/agence/${agencyId}`).pipe(
      map((response) => response ?? []),
      catchError((error) => {
        console.error("Erreur lors de la récupération des redevances de l'agence :", error);
        return of([]);
      }),
    );
  }

  getRetardsByClient$(clientId: string): Observable<Redevance[]> {
    return this.http.get<Redevance[]>(`${environment.apiUrl}/redevances/retards/client/${clientId}`).pipe(
      map((response) => response ?? []),
      catchError(() => of([])),
    );
  }

  getRetardsByAgence$(agencyId: string): Observable<Redevance[]> {
    return this.http.get<Redevance[]>(`${environment.apiUrl}/redevances/retards/agence/${agencyId}`).pipe(
      map((response) => response ?? []),
      catchError(() => of([])),
    );
  }

  getResumeClientContrat$(clientId: string, contratId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/redevances/resume/${clientId}/${contratId}`).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération du résumé de paiement :', error);
        return of(null);
      }),
    );
  }

  getRedevanceById$(redevanceId: string): Observable<Redevance | null> {
    return this.http.get<Redevance>(`${environment.apiUrl}/redevances/${redevanceId}`).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération de la redevance :', error);
        return of(null);
      }),
    );
  }

  /** `transactionId` omis pour un paiement manuel (espèces, etc.) constaté par l'agence, sans Transaction associée. */
  payerRedevance$(redevanceId: string, transactionId?: string): Observable<{ message: string; redevance: Redevance }> {
    return this.http.patch<any>(`${environment.apiUrl}/redevances/${redevanceId}/payer`, transactionId ? { transactionId } : {}).pipe(
      map((response) => {
        console.log('API > payerRedevance$:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors du paiement de la redevance :', error);
        return throwError(() => error);
      }),
    );
  }
}
