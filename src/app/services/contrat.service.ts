import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Contrat, CreerContratPayload, CreerContratsMultiLieuxPayload, CreerContratsMultiLieuxResponse } from '../models/contrat.model';
import { Page } from '../pages/dashboards/financial-dashboard/models';

export interface ContratsAgenceFiltre {
  page?: number;
  pageSize?: number;
  statut?: string;
  search?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContratService {
  constructor(private http: HttpClient) {}

  creerContrat$(payload: CreerContratPayload): Observable<{ message: string; contrat: Contrat; premiereRedevance: any }> {
    return this.http.post<any>(`${environment.apiUrl}/contrats`, payload).pipe(
      map((response) => {
        console.log('API > creerContrat$:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la création du contrat :', error);
        return throwError(() => error);
      }),
    );
  }

  /** Un client peut demander qu'un contrat couvre plusieurs de ses lieux en une seule
   * signature — l'agence sélectionne les lieux, le montant total (tarif × nombre de lieux)
   * est renvoyé. Crée un Contrat distinct par lieu côté backend (Modèle C préservé). */
  creerContratsMultiLieux$(payload: CreerContratsMultiLieuxPayload): Observable<CreerContratsMultiLieuxResponse> {
    return this.http.post<CreerContratsMultiLieuxResponse>(`${environment.apiUrl}/contrats/multi-lieux`, payload).pipe(
      catchError((error) => {
        console.error('Erreur lors de la création des contrats multi-lieux :', error);
        return throwError(() => error);
      }),
    );
  }

  getAllContrats$(): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${environment.apiUrl}/contrats/all`).pipe(
      map((response) => response ?? []),
      catchError((error) => {
        console.error('Erreur lors de la récupération de tous les contrats :', error);
        return of([]);
      }),
    );
  }

  getContratsByClient$(clientId: string): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${environment.apiUrl}/contrats/client/${clientId}`).pipe(
      map((response) => response ?? []),
      catchError((error) => {
        console.error('Erreur lors de la récupération des contrats du client :', error);
        return of([]);
      }),
    );
  }

  /**
   * Contrats d'un client, scopés à l'agence de l'appelant (`resolveAgency`,
   * JWT — jamais un `agencyId` transmis par le frontend). Un client peut
   * avoir des contrats avec plusieurs agences ; `getContratsByClient$`
   * renvoie TOUT l'historique du client (légitime pour "Mes contrats" côté
   * client), ce qui ferait fuiter des contrats d'agences tierces si consommé
   * tel quel par le dashboard financier — utiliser ce endpoint-ci pour ce cas.
   */
  getContratsByClientPourMonAgence$(clientId: string): Observable<Contrat[]> {
    return this.http.get<Contrat[]>(`${environment.apiUrl}/finance/contrats/client/${clientId}`).pipe(
      map((response) => response ?? []),
      catchError((error) => {
        console.error("Erreur lors de la récupération des contrats du client pour l'agence courante :", error);
        return of([]);
      }),
    );
  }

  /** Pagination + filtres (statut, recherche client) — même convention `{items, total,
   * page, pageSize}` que CLIENT_DATA_SERVICE.getClients (voir services/contrat.js pour le
   * pendant backend). */
  getContratsByAgence$(agencyId: string, filtre?: ContratsAgenceFiltre): Observable<Page<Contrat>> {
    const pageSize = filtre?.pageSize ?? 10;
    const vide: Page<Contrat> = { items: [], total: 0, page: filtre?.page ?? 1, pageSize };

    let params = new HttpParams();
    if (filtre?.page) params = params.set('page', filtre.page);
    if (filtre?.pageSize) params = params.set('pageSize', filtre.pageSize);
    if (filtre?.statut) params = params.set('statut', filtre.statut);
    if (filtre?.search) params = params.set('search', filtre.search);

    return this.http.get<Page<Contrat>>(`${environment.apiUrl}/contrats/agence/${agencyId}`, { params }).pipe(
      map((response) => response ?? vide),
      catchError((error) => {
        console.error("Erreur lors de la récupération des contrats de l'agence :", error);
        return of(vide);
      }),
    );
  }

  getContratById$(contratId: string): Observable<Contrat | null> {
    return this.http.get<Contrat>(`${environment.apiUrl}/contrats/${contratId}`).pipe(
      map((response) => response),
      catchError((error) => {
        console.error('Erreur lors de la récupération du contrat :', error);
        return of(null);
      }),
    );
  }

  resilierContrat$(contratId: string, raisonResiliation?: string): Observable<{ message: string; contrat: Contrat }> {
    return this.http.patch<any>(`${environment.apiUrl}/contrats/${contratId}/resilier`, { raisonResiliation }).pipe(
      map((response) => {
        console.log('API > resilierContrat$:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la résiliation du contrat :', error);
        return throwError(() => error);
      }),
    );
  }

  suspendreContrat$(contratId: string): Observable<{ message: string; contrat: Contrat }> {
    return this.http.patch<any>(`${environment.apiUrl}/contrats/${contratId}/suspendre`, {}).pipe(
      map((response) => {
        console.log('API > suspendreContrat$:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la suspension du contrat :', error);
        return throwError(() => error);
      }),
    );
  }

  reactiverContrat$(contratId: string): Observable<{ message: string; contrat: Contrat }> {
    return this.http.patch<any>(`${environment.apiUrl}/contrats/${contratId}/reactiver`, {}).pipe(
      map((response) => {
        console.log('API > reactiverContrat$:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la réactivation du contrat :', error);
        return throwError(() => error);
      }),
    );
  }

  /** `telecharger=true` renvoie directement le buffer PDF (pas du JSON) — voir controllers/contrat.js::genererDocument. */
  genererDocument$(contratId: string, telecharger = false): Observable<{ message: string; documentUrl: string } | Blob> {
    const url = `${environment.apiUrl}/contrats/${contratId}/document${telecharger ? '?telecharger=true' : ''}`;
    if (telecharger) {
      return this.http.post(url, {}, { responseType: 'blob' }).pipe(
        catchError((error) => {
          console.error('Erreur lors du téléchargement du document du contrat :', error);
          return throwError(() => error);
        }),
      );
    }
    return this.http.post<any>(url, {}).pipe(
      map((response) => {
        console.log('API > genererDocument$:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la génération du document du contrat :', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Le PDF du contrat est stocké sur Cloudinary en type 'private' (voir
   * services/pdfContrat.js côté backend) — plus d'URL publique permanente, une URL
   * signée expirant après 5 min doit être régénérée à chaque consultation. `contrat.documentUrl`
   * (stocké en base) n'est donc plus directement ouvrable, seul cet appel l'est.
   */
  getDocumentUrl$(contratId: string): Observable<{ documentUrl: string; expiresIn: number }> {
    return this.http.get<any>(`${environment.apiUrl}/contrats/${contratId}/document-url`).pipe(
      map((response) => {
        console.log('API > getDocumentUrl$:', response);
        return response;
      }),
      catchError((error) => {
        console.error('Erreur lors de la récupération de l\'URL du document du contrat :', error);
        return throwError(() => error);
      }),
    );
  }
}
