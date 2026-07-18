import { ClientStatut } from '../../models';

export type ClientListStatutFiltre = ClientStatut | 'Tous';

export interface ClientListFilters {
  statut: ClientListStatutFiltre;
  search: string;
}

// RG6 : la liste met en avant les actifs par défaut.
export const CLIENT_LIST_FILTERS_INITIAL: ClientListFilters = {
  statut: ClientStatut.ACTIF,
  search: '',
};
