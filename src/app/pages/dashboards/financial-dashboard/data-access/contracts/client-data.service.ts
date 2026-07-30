import { Observable } from 'rxjs';
import { Client, ClientStatut, Page, PageParams } from '../../models';

export interface ClientFilter {
  statut?: ClientStatut | 'Tous';
  search?: string; // recherche libre : nom / prénom / quartier
}

// Seam de dépendance-inversion (ARCHITECTURE.md §3) : les composants injectent
// CLIENT_DATA_SERVICE (le token), jamais ClientDataHttpService directement.
export abstract class ClientDataService {
  abstract getClients(params?: PageParams<ClientFilter>): Observable<Page<Client>>;
  abstract getClient(idClient: string): Observable<Client>;
}
