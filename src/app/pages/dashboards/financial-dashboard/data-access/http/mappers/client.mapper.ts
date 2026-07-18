import { Client } from '../../../models';

// DTO ↔ modèle : le contrat backend réel n'existe pas encore, donc ce mapper est une
// passe-plat identité — à remplacer par une vraie transformation une fois le DTO du
// backend connu (voir INTEGRATION.md).
export function mapClientDto(dto: unknown): Client {
  return dto as Client;
}
