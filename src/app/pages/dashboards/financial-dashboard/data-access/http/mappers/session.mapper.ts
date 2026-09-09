import { Utilisateur } from '../../../models';
import { Role } from '../../../models/enums';
import { FinancePermission } from '../../../models/finance-permission';
import { SessionUtilisateur } from '../../contracts/session.service';

function _mapPermissions(valeur: unknown): FinancePermission[] {
  return Array.isArray(valeur) ? (valeur as unknown[]).map(String) as FinancePermission[] : [];
}

export function mapSessionUtilisateurDto(dto: unknown): SessionUtilisateur {
  const d = dto as Record<string, unknown>;
  const a = d['agence'] as Record<string, unknown> | null | undefined;
  return {
    idUtilisateur: String(d['idUtilisateur']),
    nomAffiche: String(d['nomAffiche']),
    role: d['role'] as Role,
    droitsFinance: Boolean(d['droitsFinance']),
    permissions: _mapPermissions(d['permissions']),
    agence: a
      ? { nom: String(a['nom']), ville: a['ville'] ? String(a['ville']) : undefined, quartier: a['quartier'] ? String(a['quartier']) : undefined }
      : undefined,
  };
}

export function mapUtilisateurDto(dto: unknown): Utilisateur {
  const d = dto as Record<string, unknown>;
  return {
    idUtilisateur: String(d['idUtilisateur']),
    identifiants: String(d['identifiants']),
    role: d['role'] as Role,
    droitsFinance: Boolean(d['droitsFinance']),
    permissions: _mapPermissions(d['permissions']),
  };
}
