import { Utilisateur } from '../../../models';
import { Role } from '../../../models/enums';
import { SessionUtilisateur } from '../../contracts/session.service';

// DTO réel : GET /finance/session/moi (controllers/financeUsers.js::getMoi). `role` peut
// valoir `null` côté serveur si financialRole n'a pas encore été assigné à l'utilisateur —
// le type Role n'a pas de variante "aucun", mais c'est sans danger : financeAccessGuard se
// base sur droitsFinance (false par défaut, fermé par défaut) et financeAdminGuard fait une
// égalité stricte à Role.ADMINISTRATEUR (null ne matche jamais, refusé par défaut aussi).
// Voir EditRecap.md backend Prompt 10 pour la revue de sécurité complète sur ce point.
export function mapSessionUtilisateurDto(dto: unknown): SessionUtilisateur {
  const d = dto as Record<string, unknown>;
  return {
    idUtilisateur: String(d['idUtilisateur']),
    nomAffiche: String(d['nomAffiche']),
    role: d['role'] as Role,
    droitsFinance: Boolean(d['droitsFinance']),
  };
}

// DTO réel : GET /finance/session/utilisateurs (F11 admin, controllers/financeUsers.js::
// getUtilisateurs) — même remarque que ci-dessus sur `role` potentiellement `null`.
export function mapUtilisateurDto(dto: unknown): Utilisateur {
  const d = dto as Record<string, unknown>;
  return {
    idUtilisateur: String(d['idUtilisateur']),
    identifiants: String(d['identifiants']),
    role: d['role'] as Role,
    droitsFinance: Boolean(d['droitsFinance']),
  };
}
