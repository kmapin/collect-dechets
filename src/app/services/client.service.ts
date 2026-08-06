import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClientApi {
  _id: string;
  // userId: {
  //   _id: string;
  //   email: string;
  //   role: string;
  //   isActive: boolean;
  //   createdAt: string;
  // };
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: {
    street: string;
    doorNumber: string;
    doorColor: string;
    arrondissement: string;
    sector: string;
    neighborhood: string;
    city: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
  };
  email?: string;
  subscriptionStatus: string;
  acceptTerms: boolean;
  receiveOffers: boolean;
  subscriptionHistory: Array<{
    date: string;
    status: string;
    offer: string;
    _id: string;
  }>;
  paymentHistory: any[];
  nonPassageReports: any[];
  createdAt: string;
  subscribedAgencyId: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  constructor(private http: HttpClient) {}

  getClientsByAgency(agencyId: string): Observable<ClientApi[]> {
    return this.http.get<ClientApi[]>(`${environment.apiUrl}/agency_employees/${agencyId}/clients`).pipe(
      map((response: any) => {
        console.log('API > getClientsByAgency:', response);
        return response;
      })
    );
  }

  validateClientSubscription(clientId: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/agences/clients/${clientId}/validate`, {});
  }

  subscribeToAgencyPlan(data: any) {
    return this.http.post(`${environment.apiUrl}/agences/clients/subscription`, data);
  }


  getAllClients(): Observable<any> {
    let requestParams = new HttpParams().append('role', 'client');
    return this.http.get(`${environment.apiUrl}/users`, { params: requestParams }).pipe(
      map((response: any) => {
        console.log('API > getAllClients:', response);
        return response;
      })
    );
  }
  getClientById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/clients/${id}`).pipe(
      map((response: any) => {
        console.log('API > getClientById:', response);
        return response;
      })
    );
  }

  generateNewQRCode(clientId: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/collecte/regenerate/${clientId}`, {}).pipe(
      map((response: any) => {
        console.log('API > generateNewQRCode:', response);
        return response;
      })
    );
  }

  getClientWallet(clientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/wallet/${clientId}`).pipe(
      map((response: any) => {
        console.log('API > getClientWallet:', response);
        return response;
      })
    );
  }

  walletPayment(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/wallet/add/${data.clientId}/${data.amount}`, {}).pipe(
      map((response: any) => {
        console.log('API > walletPayment:', response);
        return response;
      })
    );
  }
  getClientPlanning(clientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/collectes/user/${clientId}/scheduled-collectes`).pipe(
      map((response: any) => {
        console.log('API > getClientPlanning:', response);
        return response;
      })
    );
  }

  /**
   * Second pull, complémentaire (pas un remplacement) au précédent —
   * CONCEPTION_UNIFICATION_PLANNING_SIGNALEMENT.md §4. `getClientPlanning()`
   * ci-dessus ne peut structurellement rien montrer avant le DÉMARRAGE d'un
   * planning (aucune Collecte n'existe avant `start`) — un planning publié
   * mais pas encore démarré restait donc invisible côté client malgré la
   * notification déjà reçue. Celui-ci lit directement les `Planning`
   * (`planifie`/`en_cours`), pas des `Collecte`.
   */
  getClientUpcomingPlannings(clientId: string): Observable<any[]> {
    return this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/clients/${clientId}/plannings`).pipe(
      map((response: any) => {
        console.log('API > getClientUpcomingPlannings:', response);
        return response?.data ?? [];
      })
    );
  }

  getClientPlanningHistory(clientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/collectes/user/${clientId}/collecte-history`).pipe(
      map((response: any) => {
        console.log('API > getClientPlanningHistory:', response);
        return response;
      })
    );
  }

  getClientPlanningForDate(clientId: string, date: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zones/plannings/${clientId}/date/${date}`).pipe(
      map((response: any) => {
        console.log('API > getClientPlanningForDate:', response);
        return response;
      })
    );
  }

  /**
   * Crée un signalement — remplace `reportClientIncident()` (ancienne route
   * `PATCH /collectes/:collecteId/report/:userId`, toujours vivante côté
   * backend comme alias legacy, mais qui exigeait un `collecteId`). Un seul
   * point d'entrée pour les deux parcours (Prompt 05, backend Prompt 04) :
   *  - `data.collecteId` renseigné  → signalement lié à cette collecte.
   *  - `data.collecteId` absent/vide → signalement indépendant ; le serveur
   *    dérive alors `clientId`/`agencyId` du profil authentifié, jamais du body.
   */
  createSignalement(data: { collecteId?: string; type: string; severity?: string; comment?: string; description?: string; photos?: string[] }): Observable<any> {
    const payload: any = { ...data };
    if (!payload.collecteId) delete payload.collecteId;
    return this.http.post(`${environment.apiUrl}/signalements`, payload).pipe(
      map((response: any) => {
        console.log('API > createSignalement:', response);
        return response;
      })
    );
  }

  /**
   * Historique des signalements du client authentifié — unifié (Prompt 05) :
   * remplace `GET /collectes/user/:clientId/collecte-reporting` (qui ne
   * remontait que les signalements historiquement liés à une collecte) par
   * `GET /api/signalements` (autorisé pour le rôle `client`, verrouillé
   * côté serveur sur son propre `clientId` — voir signalement.controller.js),
   * qui remonte les deux origines (liée à une collecte / indépendante) au
   * même endroit. Réponse serveur `{ success, data }` — on ne renvoie que
   * `data` pour ne rien changer côté appelants existants (un tableau brut,
   * comme l'ancienne route).
   */
  getClientReports(clientId: string): Observable<any[]> {
    return this.http.get<{ success: boolean; data: any[] }>(`${environment.apiUrl}/signalements`, { params: { clientId } }).pipe(
      map((response: any) => {
        console.log('API > clientService > getClientReports:', response);
        return response?.data ?? [];
      })
    );
  }
  // Nouvelle méthode pour filtrer les clients de l'agence via l'API
  getFilteredClients(agencyId: string, filters: any): Observable<any> {
    let params = new HttpParams();
    
    // Paramètres de filtrage selon le nouveau Swagger
    if (filters.term && filters.term.trim()) {
      params = params.set('term', filters.term.trim());
    }
    
    // Nouveau paramètre city
    if (filters.city && filters.city !== 'all') {
      params = params.set('city', filters.city);
    }
    
    if (filters.neighborhood && filters.neighborhood !== 'all') {
      params = params.set('neighborhood', filters.neighborhood);
    }
    
    // Pagination
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    console.log('API > getFilteredClients - Paramètres envoyés:', params.toString());
    console.log('API > getFilteredClients - URL:', `${environment.apiUrl}/agency_employees/${agencyId}/clients`);
    
    // Utiliser l'endpoint spécifique à l'agence
    return this.http.get<any>(`${environment.apiUrl}/agency_employees/${agencyId}/clients`, { params }).pipe(
      map((response: any) => {
        console.log('API > getFilteredClients - Réponse:', response);
        return response;
      })
    );
  }

  userAndAgencyConversation(clientId: string, agencyId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/messages/${clientId}/inbox/${agencyId}`).pipe(
      map((response: any) => {
        console.log('API > userAndAgencyConversation:', response);
        return response;
      })
    );
  }
}
