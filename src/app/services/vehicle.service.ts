import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VehicleApiBody {
  agencyId?: string;
  plate: string;
  model: string;
  type: 'camion' | 'pickup' | 'moto' | 'tricycle';
  capacityTons?: number;
  status?: 'disponible' | 'en_service' | 'maintenance' | 'hors_service';
  fuelLevel?: number;
  mileage?: number;
  lastMaintenance?: string;
}

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private http = inject(HttpClient);
  private api  = environment.apiUrl;

  getByAgency(agencyId: string): Observable<any[]> {
    return this.http.get<any>(`${this.api}/v2/vehicles/agency/${agencyId}`).pipe(
      map(res => res?.data ?? (Array.isArray(res) ? res : []))
    );
  }

  create(body: VehicleApiBody): Observable<any> {
    return this.http.post<any>(`${this.api}/v2/vehicles`, body).pipe(
      map(res => res?.data ?? res)
    );
  }

  update(vehicleId: string, body: Partial<VehicleApiBody>): Observable<any> {
    return this.http.put<any>(`${this.api}/v2/vehicles/${vehicleId}`, body).pipe(
      map(res => res?.data ?? res)
    );
  }

  remove(vehicleId: string): Observable<any> {
    return this.http.delete<any>(`${this.api}/v2/vehicles/${vehicleId}`).pipe(
      map(res => res?.data ?? res)
    );
  }
}
