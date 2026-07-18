import { Agent, PaiementAgent } from '../../../models';

// Passes-plat identité — DTO backend réel inconnu (voir INTEGRATION.md).
export function mapAgentDto(dto: unknown): Agent {
  return dto as Agent;
}

export function mapPaiementAgentDto(dto: unknown): PaiementAgent {
  return dto as PaiementAgent;
}
