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

  reportClientIncident(data: any) {
    return this.http.patch(`${environment.apiUrl}/collectes/${data.collecteId}/report/${data.clientId}`, data).pipe(
      map((response: any) => {
        console.log('API > reportClientIncident:', response);
        return response;
      })
    );
  }

  getClientReports(clientId: string){
    return this.http.get(`${environment.apiUrl}/collectes/user/${clientId}/collecte-reporting`).pipe(
      map((response: any) => {
        console.log('API > clientService > getClientReports:', response);
        return response;
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
