import { Utilisateur } from '../../../models';
import { SessionUtilisateur } from '../../contracts/session.service';

// Passes-plat identité — DTO backend réel inconnu (voir INTEGRATION.md).
export function mapSessionUtilisateurDto(dto: unknown): SessionUtilisateur {
  return dto as SessionUtilisateur;
}

export function mapUtilisateurDto(dto: unknown): Utilisateur {
  return dto as Utilisateur;
}
