import { Observable } from 'rxjs';
import { Client, ClientStatut, Page, PageParams } from '../../models';

export interface ClientFilter {
  statut?: ClientStatut | 'Tous';
  search?: string; // recherche libre : nom / prénom / quartier
}

export abstract class ClientDataService {
  abstract getClients(params?: PageParams<ClientFilter>): Observable<Page<Client>>;
  abstract getClient(idClient: string): Observable<Client>;
}
