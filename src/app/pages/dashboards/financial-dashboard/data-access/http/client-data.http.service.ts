import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Client, Page, PageParams } from '../../models';
import { ClientDataService, ClientFilter } from '../contracts/client-data.service';
import { mapClientDto } from './mappers/client.mapper';

// Implémentation réelle, câblée en dur sur CLIENT_DATA_SERVICE dans
// financial-dashboard.routes.ts (module Client entièrement backé). Endpoints documentés
// ci-dessous et dans INTEGRATION.md.
@Injectable()
export class ClientDataHttpService implements ClientDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/finance/clients`;

  getClients(params?: PageParams<ClientFilter>): Observable<Page<Client>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.filter?.statut) httpParams = httpParams.set('statut', params.filter.statut);
    if (params?.filter?.search) httpParams = httpParams.set('search', params.filter.search);

    // GET /finance/clients?page=&pageSize=&statut=&search=
    return this.http.get<{ items: unknown[]; total: number; page: number; pageSize: number }>(this.base, { params: httpParams }).pipe(
      map(res => ({
        items: res.items.map(mapClientDto),
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
      })),
    );
  }

  getClient(idClient: string): Observable<Client> {
    // GET /finance/clients/:idClient
    return this.http.get<unknown>(`${this.base}/${idClient}`).pipe(map(mapClientDto));
  }
}
