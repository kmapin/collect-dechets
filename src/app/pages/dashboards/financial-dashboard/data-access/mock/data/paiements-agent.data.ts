import { PaiementAgent } from '../../../models';
import { AGENTS } from './agents.data';
import { PERIODES } from './factures.data';
import { isoDatePremierJour } from './seed.util';

// Historique minimal (F5 étant un prototype, RG10 reste TBC — voir DISCOVERY.md §7) :
// un paiement par agent sur chacun des 3 derniers mois de la fenêtre d'historique.
const TROIS_DERNIERES_PERIODES = PERIODES.slice(-3);

export const PAIEMENTS_AGENT: PaiementAgent[] = AGENTS.flatMap((agent, agentIndex) =>
  TROIS_DERNIERES_PERIODES.map((periode, periodeIndex) => ({
    idPaiementAgent: `pag-${agent.idAgent}-${periodeIndex}`,
    idAgent: agent.idAgent,
    montant: 25_000 + ((agentIndex + periodeIndex) % 3) * 5000,
    datePaiement: isoDatePremierJour(periode).replace(/-01$/, '-28'),
  })),
);
