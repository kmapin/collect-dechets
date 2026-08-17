import {
  mapDashboardKpiDto,
  mapPaiementListeDto,
  mapRepartitionModePaiementDto,
  mapRetraitDto,
} from './finance.mapper';

describe('finance.mapper', () => {
  describe('mapDashboardKpiDto', () => {
    it('mappe un payload réel GET /finance/dashboard/kpi', () => {
      const dto = {
        soldeDisponible: 125000,
        totalCollecte: 84000,
        revenusNets: 84000,
        enAttente: 15000,
        montantFacture: 99000,
        tauxRecouvrement: 84.8,
        devise: 'XOF',
        misAJourLe: '2026-07-29T10:00:00.000Z',
      };
      expect(mapDashboardKpiDto(dto)).toEqual({
        soldeDisponible: 125000,
        totalCollecte: 84000,
        revenusNets: 84000,
        enAttente: 15000,
        montantFacture: 99000,
        tauxRecouvrement: 84.8,
        devise: 'XOF',
        misAJourLe: '2026-07-29T10:00:00.000Z',
      });
    });
  });

  describe('mapPaiementListeDto', () => {
    it('traduit le code opérateur exact (Transaction.operator) en libellé lisible, idFacture absent (jamais renvoyé par le backend)', () => {
      const dto = {
        idPaiement: '64f1a2b3c4d5e6f7a8b9c0d1',
        idClient: '64f1a2b3c4d5e6f7a8b9c0d2',
        montant: 5000,
        datePaiement: '2026-07-15T08:30:00.000Z',
        modePaiement: 'ORANGE_MONEY',
        clientNom: 'Ouédraogo Awa',
      };
      expect(mapPaiementListeDto(dto)).toEqual({
        idPaiement: '64f1a2b3c4d5e6f7a8b9c0d1',
        idFacture: undefined,
        idClient: '64f1a2b3c4d5e6f7a8b9c0d2',
        montant: 5000,
        datePaiement: '2026-07-15T08:30:00.000Z',
        modePaiement: 'Orange Money',
        clientNom: 'Ouédraogo Awa',
      });
    });
  });

  describe('mapRetraitDto', () => {
    it('mappe un item réel GET /finance/retraits avec motif', () => {
      const dto = {
        idRetrait: '64f1a2b3c4d5e6f7a8b9c0d3',
        montant: 20000,
        dateRetrait: '2026-07-20T12:00:00.000Z',
        motif: 'Réapprovisionnement caisse',
      };
      expect(mapRetraitDto(dto)).toEqual({
        idRetrait: '64f1a2b3c4d5e6f7a8b9c0d3',
        montant: 20000,
        dateRetrait: '2026-07-20T12:00:00.000Z',
        motif: 'Réapprovisionnement caisse',
      });
    });

    it("mappe un item sans motif (champ optionnel, absent en base)", () => {
      const dto = { idRetrait: 'x', montant: 1000, dateRetrait: '2026-07-01T00:00:00.000Z', motif: null };
      expect(mapRetraitDto(dto).motif).toBeUndefined();
    });
  });

  describe('mapRepartitionModePaiementDto', () => {
    it('distingue chaque opérateur exact plutôt que de les regrouper sous un bucket générique', () => {
      const dto = [
        { mode: 'ORANGE_MONEY', montant: 30000 },
        { mode: 'MOOV_MONEY', montant: 45000 },
        { mode: 'TELECEL_MONEY', montant: 5000 },
      ];
      expect(mapRepartitionModePaiementDto(dto)).toEqual([
        { mode: 'Orange Money', montant: 30000 },
        { mode: 'Moov Money', montant: 45000 },
        { mode: 'Telecel Money', montant: 5000 },
      ]);
    });

    it('cumule les montants quand le même opérateur apparaît plusieurs fois', () => {
      const dto = [
        { mode: 'ORANGE_MONEY', montant: 30000 },
        { mode: 'ORANGE_MONEY', montant: 12000 },
      ];
      expect(mapRepartitionModePaiementDto(dto)).toEqual([
        { mode: 'Orange Money', montant: 42000 },
      ]);
    });

    it('renvoie un tableau vide si le backend ne renvoie aucune ligne (agence sans encaissement)', () => {
      expect(mapRepartitionModePaiementDto([])).toEqual([]);
    });
  });
});
