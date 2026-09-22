import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AgencyImportType, ImportConfirmResponse, ImportPreviewResponse, ImportRow } from '../models/agency-import.model';

@Injectable({ providedIn: 'root' })
export class AgencyImportService {
  constructor(private http: HttpClient) {}

  downloadTemplate$(type: AgencyImportType): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/agency-import/${type}/template`, { responseType: 'blob' });
  }

  preview$(type: AgencyImportType, fichier: File): Observable<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('fichier', fichier);
    return this.http.post<ImportPreviewResponse>(`${environment.apiUrl}/agency-import/${type}/preview`, formData);
  }

  confirm$(type: AgencyImportType, lignes: ImportRow[]): Observable<ImportConfirmResponse> {
    return this.http.post<ImportConfirmResponse>(`${environment.apiUrl}/agency-import/${type}/confirm`, { lignes });
  }

  downloadErrorReport$(lignes: ImportRow[]): Observable<Blob> {
    return this.http.post(`${environment.apiUrl}/agency-import/error-report`, { lignes }, { responseType: 'blob' });
  }
}
