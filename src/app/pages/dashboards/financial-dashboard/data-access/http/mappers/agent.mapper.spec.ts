import { mapAgentDto, mapPaiementAgentDto } from './agent.mapper';

describe('agent.mapper', () => {
  describe('mapAgentDto', () => {
    it('mappe un agent réel GET /finance/agents (numéro Moov fiable)', () => {
      const dto = { idAgent: '64f1a2b3c4d5e6f7a8b9c0e1', nom: 'Kaboré', prenom: 'Boukari', telephone: '70123456', moovEligible: true, orangeEligible: false };
      expect(mapAgentDto(dto)).toEqual({
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        nom: 'Kaboré',
        prenom: 'Boukari',
        telephone: '70123456',
        moovEligible: true,
        orangeEligible: false,
      });
    });

    it('mappe un agent avec un numéro Orange Money fiable (activation Orange Money, essayé avant Moov)', () => {
      const dto = { idAgent: '64f1a2b3c4d5e6f7a8b9c0e2', nom: 'Ouédraogo', prenom: 'Awa', telephone: '04123456', moovEligible: false, orangeEligible: true };
      expect(mapAgentDto(dto)).toEqual({
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e2',
        nom: 'Ouédraogo',
        prenom: 'Awa',
        telephone: '04123456',
        moovEligible: false,
        orangeEligible: true,
      });
    });

    it('tolère prenom/telephone absents (optionnels), moovEligible/orangeEligible absents → false (jamais un virement réel supposé par défaut)', () => {
      const dto = { idAgent: 'a1', nom: 'Traoré', prenom: null, telephone: undefined };
      const result = mapAgentDto(dto);
      expect(result.prenom).toBeUndefined();
      expect(result.telephone).toBeUndefined();
      expect(result.moovEligible).toBe(false);
      expect(result.orangeEligible).toBe(false);
    });
  });

  describe('mapPaiementAgentDto', () => {
    it('mappe un paiement agent MOOV réel (POST /finance/agents/paiements, chantier M2)', () => {
      const dto = {
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f1',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        montant: 15000,
        datePaiement: '2026-07-20T09:00:00.000Z',
        status: 'EN_ATTENTE_VALIDATION',
        provider: 'MOOV',
        libelle: 'En attente de validation — virement Moov Money réel après validation',
      };
      expect(mapPaiementAgentDto(dto)).toEqual({
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f1',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        montant: 15000,
        datePaiement: '2026-07-20T09:00:00.000Z',
        status: 'EN_ATTENTE_VALIDATION',
        provider: 'MOOV',
        failureReason: undefined,
        libelle: 'En attente de validation — virement Moov Money réel après validation',
      });
    });

    it('mappe un paiement agent ORANGE_MONEY réel (activation Orange Money, essayé avant Moov)', () => {
      const dto = {
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f4',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e2',
        montant: 12000,
        datePaiement: '2026-08-28T09:00:00.000Z',
        status: 'EN_ATTENTE_VALIDATION',
        provider: 'ORANGE_MONEY',
        libelle: 'En attente de validation — virement Orange Money réel après validation',
      };
      const result = mapPaiementAgentDto(dto);
      expect(result.provider).toBe('ORANGE_MONEY');
      expect(result.status).toBe('EN_ATTENTE_VALIDATION');
    });

    it('mappe un paiement agent REJETE (chantier rejet) : rejectionReason transmis tel quel', () => {
      const dto = {
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f3',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        montant: 8000,
        datePaiement: '2026-07-20T09:00:00.000Z',
        status: 'REJETE',
        provider: 'MOOV',
        rejectionReason: 'Montant incorrect',
      };
      const result = mapPaiementAgentDto(dto);
      expect(result.status).toBe('REJETE');
      expect(result.rejectionReason).toBe('Montant incorrect');
    });

    it('mappe un paiement interne (comportement historique) : status/provider retombent sur COMPLETED/INTERNE si absents du DTO', () => {
      const dto = {
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f2',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        montant: 5000,
        datePaiement: '2026-07-20T09:00:00.000Z',
      };
      const result = mapPaiementAgentDto(dto);
      expect(result.status).toBe('COMPLETED');
      expect(result.provider).toBe('INTERNE');
      expect(result.failureReason).toBeUndefined();
    });
  });
});
