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
      };
      expect(mapSessionUtilisateurDto(dto)).toEqual({
        idUtilisateur: '64f1a2b3c4d5e6f7a8b9c1a1',
        nomAffiche: 'Ky Fatimata',
        role: Role.ADMINISTRATEUR,
        droitsFinance: true,
      });
    });

    it("gère role=null (financialRole jamais assigné) sans planter — fermé par défaut côté guards", () => {
      const dto = { idUtilisateur: 'u1', nomAffiche: 'Sans Role', role: null, droitsFinance: false };
      const result = mapSessionUtilisateurDto(dto);
      expect(result.role).toBeNull();
      expect(result.droitsFinance).toBe(false);
    });
  });

  describe('mapUtilisateurDto', () => {
    it('mappe un utilisateur réel GET /finance/session/utilisateurs (F11 admin)', () => {
      const dto = { idUtilisateur: 'u2', identifiants: 'Ouédraogo Rasmané', role: 'Comptable', droitsFinance: true };
      expect(mapUtilisateurDto(dto)).toEqual({
        idUtilisateur: 'u2',
        identifiants: 'Ouédraogo Rasmané',
        role: Role.COMPTABLE,
        droitsFinance: true,
      });
    });
  });
});
