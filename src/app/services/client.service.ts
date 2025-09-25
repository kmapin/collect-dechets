import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
    return this.http.get<ClientApi[]>(`${environment.apiUrl}/clients/agency/${agencyId}`).pipe(
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
    return this.http.get(`${environment.apiUrl}/clients`).pipe(
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

  getClientWallet(clientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/users/${clientId}/wallet`).pipe(
      map((response: any) => {
        console.log('API > getClientWallet:', response);
        return response;
      })
    );
  }

  walletPayment(data: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/users/${data.clientId}/wallet/${data.amount}`, {}).pipe(
      map((response: any) => {
        console.log('API > walletPayment:', response);
        return response;
      })
    );
  }
  getClientPlanning(clientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zones/plannings/${clientId}`).pipe(
      map((response: any) => {
        console.log('API > getClientPlanning:', response);
        return response;
      })
    );
  }

  getClientPlanningHistory(clientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/zones/plannings/${clientId}/collecte`).pipe(
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
    return this.http.post(`${environment.apiUrl}/reports`, data).pipe(
      map((response: any) => {
        console.log('API > reportClientIncident:', response);
        return response;
      })
    );
  }
}
