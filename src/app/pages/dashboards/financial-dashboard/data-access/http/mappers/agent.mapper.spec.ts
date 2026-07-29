import { mapAgentDto, mapPaiementAgentDto } from './agent.mapper';

describe('agent.mapper', () => {
  describe('mapAgentDto', () => {
    it('mappe un agent réel GET /finance/agents', () => {
      const dto = { idAgent: '64f1a2b3c4d5e6f7a8b9c0e1', nom: 'Kaboré', prenom: 'Boukari', telephone: '70123456' };
      expect(mapAgentDto(dto)).toEqual({
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        nom: 'Kaboré',
        prenom: 'Boukari',
        telephone: '70123456',
      });
    });

    it('tolère prenom/telephone absents (optionnels)', () => {
      const dto = { idAgent: 'a1', nom: 'Traoré', prenom: null, telephone: undefined };
      const result = mapAgentDto(dto);
      expect(result.prenom).toBeUndefined();
      expect(result.telephone).toBeUndefined();
    });
  });

  describe('mapPaiementAgentDto', () => {
    it('mappe un paiement agent réel GET/POST /finance/agents/paiements', () => {
      const dto = {
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f1',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        montant: 15000,
        datePaiement: '2026-07-20T09:00:00.000Z',
      };
      expect(mapPaiementAgentDto(dto)).toEqual({
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f1',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        montant: 15000,
        datePaiement: '2026-07-20T09:00:00.000Z',
      });
    });
  });
});
