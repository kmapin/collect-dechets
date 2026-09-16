/**
 * Interface d'adresse commune (Phase 10, harmonisation) — reprend le jeu de champs le plus
 * complet parmi les interfaces jusqu'ici dupliquées (UserAddress, ServiceLocationAddress),
 * pour que UserAddress/ServiceLocationAddress en deviennent des alias plutôt que des copies.
 *
 * Volontairement laissés en dehors de cette harmonisation (voir plan multi-lieux, section 14) :
 * - `Address` d'agency.model.ts (Agency/Municipality/AgencyClient) — domaine hors périmètre.
 * - `Address` de collection.model.ts, renommée `CollectionAddress` — forme réellement plus
 *   simple (pas d'arrondissement/secteur), un besoin différent, pas une duplication à fusionner.
 */
export interface Address {
  street?: string;
  city: string;
  arrondissement: string;
  sector: string;
  neighborhood: string;
  doorNumber?: string;
  doorColor?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}
