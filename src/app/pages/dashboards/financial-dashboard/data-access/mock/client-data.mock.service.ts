import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Client, Page, PageParams } from '../../models';
import { ClientDataService, ClientFilter } from '../contracts/client-data.service';
import { CLIENTS } from './data/clients.data';
import { MockConfigService } from './mock-config.service';
import { paginateMock, simulateResponse } from './simulate.util';

const FEATURE = 'clients';

@Injectable()
export class ClientDataMockService implements ClientDataService {
  constructor(private readonly mockConfig: MockConfigService) {}

  getClients(params?: PageParams<ClientFilter>): Observable<Page<Client>> {
    const filtered = this._filter(CLIENTS, params?.filter);
    const paged = paginateMock(filtered, params);
    return simulateResponse(FEATURE, this.mockConfig, paged, { ...paged, items: [] });
  }

  getClient(idClient: string): Observable<Client> {
    const found = CLIENTS.find(c => c.idClient === idClient) ?? CLIENTS[0];
    return simulateResponse(`${FEATURE}:detail`, this.mockConfig, found);
  }

  private _filter(clients: Client[], filter?: ClientFilter): Client[] {
    if (!filter) return clients;
    return clients.filter(c => {
      if (filter.statut && filter.statut !== 'Tous' && c.statut !== filter.statut) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const haystack = `${c.nom} ${c.prenom} ${c.quartier ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }
}
