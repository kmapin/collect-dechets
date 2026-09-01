import { mapAgentDto, mapPaiementAgentDetailDto, mapPaiementAgentDto } from './agent.mapper';

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

  describe('mapPaiementAgentDetailDto', () => {
    it('mappe le détail réel GET /finance/agents/paiements/:id (chantier actions historique)', () => {
      const dto = {
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f1',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        agentNom: 'Kaboré Boukari',
        montant: 15000,
        datePaiement: '2026-07-20T09:00:00.000Z',
        status: 'COMPLETED',
        provider: 'MOOV',
        phoneNumber: '+22670123456',
        operator: 'MOOV_MONEY',
        reference: 'AGT-1753000000-abcdef',
        providerTransactionId: 'TX-REAL-1',
        failureReason: null,
        rejectionReason: null,
        initiatedByNom: 'Awa Ouédraogo',
        validatedByNom: 'Karim Traoré',
        initiatedAt: '2026-07-20T09:00:00.000Z',
        completedAt: '2026-07-20T09:05:00.000Z',
        createdAt: '2026-07-20T09:00:00.000Z',
        updatedAt: '2026-07-20T09:05:00.000Z',
      };
      expect(mapPaiementAgentDetailDto(dto)).toEqual({
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f1',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e1',
        agentNom: 'Kaboré Boukari',
        montant: 15000,
        datePaiement: '2026-07-20T09:00:00.000Z',
        status: 'COMPLETED',
        provider: 'MOOV',
        phoneNumber: '+22670123456',
        operator: 'MOOV_MONEY',
        reference: 'AGT-1753000000-abcdef',
        providerTransactionId: 'TX-REAL-1',
        failureReason: null,
        rejectionReason: null,
        initiatedByNom: 'Awa Ouédraogo',
        validatedByNom: 'Karim Traoré',
        initiatedAt: '2026-07-20T09:00:00.000Z',
        completedAt: '2026-07-20T09:05:00.000Z',
        createdAt: '2026-07-20T09:00:00.000Z',
        updatedAt: '2026-07-20T09:05:00.000Z',
      });
    });

    it("agent supprimé depuis (agentNom null côté backend) : jamais un plantage, jamais un nom inventé", () => {
      const dto = {
        idPaiementAgent: '64f1a2b3c4d5e6f7a8b9c0f2',
        idAgent: '64f1a2b3c4d5e6f7a8b9c0e9',
        agentNom: null,
        montant: 5000,
        datePaiement: '2026-07-20T09:00:00.000Z',
        status: 'COMPLETED',
        provider: 'INTERNE',
        phoneNumber: null,
        operator: null,
        reference: null,
        providerTransactionId: null,
        failureReason: null,
        rejectionReason: null,
        initiatedByNom: null,
        validatedByNom: null,
        initiatedAt: null,
        completedAt: null,
        createdAt: '2026-07-20T09:00:00.000Z',
        updatedAt: '2026-07-20T09:00:00.000Z',
      };
      const result = mapPaiementAgentDetailDto(dto);
      expect(result.agentNom).toBeNull();
      expect(result.montant).toBe(5000);
    });
  });
});
