import { FactureStatut } from '../../../models/enums';
import { mapLigneReleveDto, mapSuiviAbonneMensuelDto } from './facture.mapper';

describe('facture.mapper', () => {
  describe('mapSuiviAbonneMensuelDto', () => {
    it('mappe une ligne réelle GET /finance/factures/suivi-mensuel avec facture payée', () => {
      const dto = {
        client: { idClient: '64f1a2b3c4d5e6f7a8b9c0d1', nom: 'Ouédraogo', prenom: 'Awa', quartier: 'Zone 1' },
        facture: {
          idFacture: '64f1a2b3c4d5e6f7a8b9c0d9',
          idClient: '64f1a2b3c4d5e6f7a8b9c0d1',
          periode: { mois: 7, annee: 2026 },
          montant: 5000,
          statut: 'Payée',
          dateGeneration: '2026-07-01T00:00:00.000Z',
          datePaiement: '2026-07-05T00:00:00.000Z',
        },
        statut: 'Payée',
        moisRetard: 0,
      };
      expect(mapSuiviAbonneMensuelDto(dto)).toEqual({
        client: { idClient: '64f1a2b3c4d5e6f7a8b9c0d1', nom: 'Ouédraogo', prenom: 'Awa', quartier: 'Zone 1' },
        facture: {
          idFacture: '64f1a2b3c4d5e6f7a8b9c0d9',
          idClient: '64f1a2b3c4d5e6f7a8b9c0d1',
          periode: { mois: 7, annee: 2026 },
          montant: 5000,
          statut: FactureStatut.PAYEE,
          dateGeneration: '2026-07-01T00:00:00.000Z',
          datePaiement: '2026-07-05T00:00:00.000Z',
        },
        statut: FactureStatut.PAYEE,
        moisRetard: 0,
      });
    });

    it("mappe l'état vide 'NonGeneree' (client sous contrat actif, aucune redevance ce mois-là)", () => {
      const dto = {
        client: { idClient: 'c1', nom: 'Sawadogo', prenom: 'Issa', quartier: undefined },
        facture: null,
        statut: 'NonGeneree',
        moisRetard: 2,
      };
      const result = mapSuiviAbonneMensuelDto(dto);
      expect(result.facture).toBeNull();
      expect(result.statut).toBe('NonGeneree');
      expect(result.moisRetard).toBe(2);
      expect(result.client.quartier).toBeUndefined();
    });
  });

  describe('mapLigneReleveDto', () => {
    it('mappe une ligne réelle GET /finance/factures/releve/:idClient, payée', () => {
      const dto = { factureLe: '2026-06-01T00:00:00.000Z', payeLe: '2026-06-03T00:00:00.000Z', montant: 5000 };
      expect(mapLigneReleveDto(dto)).toEqual({
        factureLe: '2026-06-01T00:00:00.000Z',
        payeLe: '2026-06-03T00:00:00.000Z',
        montant: 5000,
      });
    });

    it('mappe une ligne impayée (payeLe absent en base, jamais une valeur inventée)', () => {
      const dto = { factureLe: '2026-06-01T00:00:00.000Z', payeLe: null, montant: 5000 };
      expect(mapLigneReleveDto(dto).payeLe).toBeUndefined();
    });
  });
});
