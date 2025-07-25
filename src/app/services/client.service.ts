import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ClientApi {
  _id: string;
  userId: {
    _id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
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
    return this.http.get<ClientApi[]>(`${environment.apiUrl}/clients/agency/${agencyId}`);
  }

  validateClientSubscription(clientId: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/agences/clients/${clientId}/validate`, {});
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
    return this.http.get<any>(`${environment.apiUrl}/clients/${id}`);
  }
}
