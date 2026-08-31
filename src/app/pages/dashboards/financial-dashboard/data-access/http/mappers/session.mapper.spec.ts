import { Role } from '../../../models/enums';
import { mapSessionUtilisateurDto, mapUtilisateurDto } from './session.mapper';

describe('session.mapper', () => {
  describe('mapSessionUtilisateurDto', () => {
    it('mappe la session réelle GET /finance/session/moi, administrateur', () => {
      const dto = {
        idUtilisateur: '64f1a2b3c4d5e6f7a8b9c1a1',
        nomAffiche: 'Ky Fatimata',
        role: 'Administrateur',
        droitsFinance: true,
        permissions: ['dashboard.view', 'roles.manage'],
      };
      expect(mapSessionUtilisateurDto(dto)).toEqual({
        idUtilisateur: '64f1a2b3c4d5e6f7a8b9c1a1',
        nomAffiche: 'Ky Fatimata',
        role: Role.ADMINISTRATEUR,
        droitsFinance: true,
        permissions: ['dashboard.view', 'roles.manage'],
      });
    });

    it("gère role=null (financialRole jamais assigné) sans planter — fermé par défaut côté guards", () => {
      const dto = { idUtilisateur: 'u1', nomAffiche: 'Sans Role', role: null, droitsFinance: false };
      const result = mapSessionUtilisateurDto(dto);
      expect(result.role).toBeNull();
      expect(result.droitsFinance).toBe(false);
      expect(result.permissions).toEqual([]);
    });

    it('permissions absent du DTO (backend pas encore migré) -> tableau vide, fail-closed', () => {
      const dto = { idUtilisateur: 'u1', nomAffiche: 'Ancien Backend', role: 'Comptable', droitsFinance: true };
      expect(mapSessionUtilisateurDto(dto).permissions).toEqual([]);
    });
  });

  describe('mapUtilisateurDto', () => {
    it('mappe un utilisateur réel GET /finance/session/utilisateurs (F11 admin)', () => {
      const dto = {
        idUtilisateur: 'u2',
        identifiants: 'Ouédraogo Rasmané',
        role: 'Comptable',
        droitsFinance: true,
        permissions: ['payments.view'],
      };
      expect(mapUtilisateurDto(dto)).toEqual({
        idUtilisateur: 'u2',
        identifiants: 'Ouédraogo Rasmané',
        role: Role.COMPTABLE,
        droitsFinance: true,
        permissions: ['payments.view'],
      });
    });

    it('permissions absent du DTO -> tableau vide, fail-closed', () => {
      const dto = { idUtilisateur: 'u3', identifiants: 'Sans Permissions', role: 'ManagerTerrain', droitsFinance: true };
      expect(mapUtilisateurDto(dto).permissions).toEqual([]);
    });
  });
});
