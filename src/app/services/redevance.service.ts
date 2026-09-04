import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Redevance } from '../models/redevance.model';
import { ApercuPaiementGroupe, PaiementGroupeRedevance, ReductionType } from '../models/paiement-groupe-redevance.model';

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

  // ── Paiement groupé + réduction ────────────────────────────────────────

  /** Réservé à l'agence titulaire du contrat — voir routes/redevanceRoute.js. */
  apercuPaiementGroupe$(contratId: string, genererTout: boolean): Observable<ApercuPaiementGroupe> {
    const params = new HttpParams().set('genererTout', String(genererTout));
    return this.http.get<ApercuPaiementGroupe>(`${environment.apiUrl}/redevances/contrat/${contratId}/paiement-groupe/apercu`, { params }).pipe(
      catchError((error) => {
        console.error("Erreur lors de l'aperçu du paiement groupé :", error);
        return throwError(() => error);
      }),
    );
  }

  creerPropositionPaiementGroupe$(
    contratId: string,
    payload: { genererTout: boolean; reductionType: ReductionType; reductionValeur: number },
  ): Observable<{ message: string; proposition: PaiementGroupeRedevance }> {
    return this.http.post<any>(`${environment.apiUrl}/redevances/contrat/${contratId}/paiement-groupe`, payload).pipe(
      catchError((error) => {
        console.error('Erreur lors de la création de la proposition de paiement groupé :', error);
        return throwError(() => error);
      }),
    );
  }

  /** Accessible au client propriétaire du contrat, à l'agence titulaire, ou à un super_admin. Renvoie `null` si aucune proposition n'est en attente. */
  getPropositionActivePaiementGroupe$(contratId: string): Observable<PaiementGroupeRedevance | null> {
    return this.http.get<PaiementGroupeRedevance | null>(`${environment.apiUrl}/redevances/contrat/${contratId}/paiement-groupe/actif`).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération de la proposition de paiement groupé :', error);
        return of(null);
      }),
    );
  }

  annulerPropositionPaiementGroupe$(paiementGroupeId: string): Observable<{ message: string; proposition: PaiementGroupeRedevance }> {
    return this.http.patch<any>(`${environment.apiUrl}/redevances/paiement-groupe/${paiementGroupeId}/annuler`, {}).pipe(
      catchError((error) => {
        console.error("Erreur lors de l'annulation de la proposition de paiement groupé :", error);
        return throwError(() => error);
      }),
    );
  }

  /** Paiement constaté manuellement par l'agence (espèces, etc.) — sans Transaction associée. */
  payerManuelPaiementGroupe$(paiementGroupeId: string): Observable<{ message: string; proposition: PaiementGroupeRedevance }> {
    return this.http.patch<any>(`${environment.apiUrl}/redevances/paiement-groupe/${paiementGroupeId}/payer-manuel`, {}).pipe(
      catchError((error) => {
        console.error('Erreur lors du paiement groupé manuel :', error);
        return throwError(() => error);
      }),
    );
  }
}
