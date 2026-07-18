import { Periode } from './periode.model';

// Enveloppe de pagination générique — miroir de la forme qu'une future réponse HttpClient
// devra respecter (voir ARCHITECTURE.md §4). Toutes les méthodes de liste des contrats
// data-access retournent Observable<Page<T>>.
export interface Page<T> {
  readonly items: T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

// Paramètres optionnels communs à toutes les méthodes de liste (pagination/filtre/période).
export interface PageParams<F = unknown> {
  page?: number;
  pageSize?: number;
  filter?: F;
  periode?: Periode;
}
