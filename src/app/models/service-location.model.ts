import { Address } from './address.model';

export type ServiceLocationType =
  | 'maison' | 'boutique' | 'bureau' | 'restaurant' | 'entreprise'
  | 'entrepot' | 'chantier' | 'evenement' | 'autre';

export type CoverageStatus = 'covered' | 'pending' | 'not_covered';
export type ServiceLocationStatus = 'active' | 'inactive' | 'deleted';

// Phase 10 (harmonisation) — alias de l'interface Address commune (voir address.model.ts),
// dont la forme reprend exactement celle-ci (ServiceLocationAddress en était la base).
export type ServiceLocationAddress = Address;

export interface ServiceLocation {
  _id: string;
  userId: string;
  name: string;
  type: ServiceLocationType;
  address: ServiceLocationAddress;
  onSiteContactName?: string;
  onSiteContactPhone?: string;
  accessInstructions?: string;
  coverageStatus: CoverageStatus;
  status: ServiceLocationStatus;
  /** Jamais réglable via CreateServiceLocationPayload/UpdateServiceLocationPayload —
   * positionné uniquement par la migration Phase 3 pour le lieu issu de l'ancienne
   * adresse de compte (User.address). */
  isPrimary?: boolean;
  /** Présent uniquement quand `listByClient$` est appelé avec un `agencyId` — abonnement/
   * contrat actif pour cette agence et ce lieu précis (voir sélecteur de lieu du planning
   * individuel, planning-create.ts). `undefined` sinon (agencyId non fourni). */
  eligible?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceLocationPayload {
  name: string;
  type: ServiceLocationType;
  address: ServiceLocationAddress;
  onSiteContactName?: string;
  onSiteContactPhone?: string;
  accessInstructions?: string;
}

export type UpdateServiceLocationPayload = Partial<CreateServiceLocationPayload>;
