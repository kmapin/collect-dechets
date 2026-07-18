import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { Client, Page, PageParams } from '../../models';
import { ClientDataService, ClientFilter } from '../contracts/client-data.service';
import { mapClientDto } from './mappers/client.mapper';

// Squelette inerte (Prompt 17) : jamais fourni par un provider tant qu'aucun `useClass`
// ne le référence dans financial-dashboard.routes.ts — voir INTEGRATION.md pour le diff
// exact à appliquer le jour du branchement. Endpoints documentés ci-dessous et dans
// INTEGRATION.md ; à ajuster une fois le contrat backend réel connu.
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
