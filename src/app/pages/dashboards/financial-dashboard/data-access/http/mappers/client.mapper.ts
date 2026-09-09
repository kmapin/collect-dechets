import { Client } from '../../../models';
import { ClientStatut } from '../../../models/enums';

export function mapClientDto(dto: unknown): Client {
  const d = dto as Record<string, unknown>;
  return {
    idClient: String(d['idClient']),
    nom: String(d['nom']),
    prenom: String(d['prenom']),
    quartier: d['quartier'] !== undefined && d['quartier'] !== null ? String(d['quartier']) : undefined,
    telephone: d['telephone'] !== undefined && d['telephone'] !== null ? String(d['telephone']) : undefined,
    statut: d['statut'] as ClientStatut,
    dateCreation: d['dateCreation'] !== undefined && d['dateCreation'] !== null ? String(d['dateCreation']) : undefined,
  };
}
