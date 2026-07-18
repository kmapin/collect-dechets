import { DashboardKpi, Retrait } from '../../../models';
import { PaiementListe } from '../../contracts/finance-data.service';

// Passes-plat identité — DTO backend réel inconnu (voir INTEGRATION.md).
export function mapDashboardKpiDto(dto: unknown): DashboardKpi {
  return dto as DashboardKpi;
}

export function mapPaiementListeDto(dto: unknown): PaiementListe {
  return dto as PaiementListe;
}

export function mapRetraitDto(dto: unknown): Retrait {
  return dto as Retrait;
}
