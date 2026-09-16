import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ServiceLocation,
  CreateServiceLocationPayload,
  UpdateServiceLocationPayload,
} from '../models/service-location.model';

@Injectable({ providedIn: 'root' })
export class ServiceLocationService {
  private readonly base = `${environment.apiUrl}/service-locations`;

  constructor(private http: HttpClient) {}

  create$(payload: CreateServiceLocationPayload): Observable<{ success: boolean; data: ServiceLocation }> {
    return this.http.post<{ success: boolean; data: ServiceLocation }>(this.base, payload);
  }

  listMine$(): Observable<{ success: boolean; data: ServiceLocation[] }> {
    return this.http.get<{ success: boolean; data: ServiceLocation[] }>(this.base);
  }

  /** Phase 7 — manager/super_admin uniquement : lieux actifs d'un client précis
   * (sélecteur de lieu pour un planning individuel). */
  listByClient$(clientId: string): Observable<{ success: boolean; data: ServiceLocation[] }> {
    return this.http.get<{ success: boolean; data: ServiceLocation[] }>(`${this.base}/by-client/${clientId}`);
  }

  getById$(id: string): Observable<{ success: boolean; data: ServiceLocation }> {
    return this.http.get<{ success: boolean; data: ServiceLocation }>(`${this.base}/${id}`);
  }

  update$(id: string, payload: UpdateServiceLocationPayload): Observable<{ success: boolean; data: ServiceLocation }> {
    return this.http.patch<{ success: boolean; data: ServiceLocation }>(`${this.base}/${id}`, payload);
  }

  delete$(id: string): Observable<{ success: boolean; data: ServiceLocation }> {
    return this.http.delete<{ success: boolean; data: ServiceLocation }>(`${this.base}/${id}`);
  }

  /** Phase 9 — QR code de ce lieu précis (coexiste avec le QR compte de profile.ts).
   * Le token est généré côté serveur au premier appel puis réutilisé tel quel. */
  getQrCode$(id: string): Observable<{ success: boolean; data: { qrCode: string; qrToken: string } }> {
    return this.http.get<{ success: boolean; data: { qrCode: string; qrToken: string } }>(`${this.base}/${id}/qr-code`);
  }
}
