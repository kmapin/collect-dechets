import { Facture, LigneReleve, SuiviAbonneMensuel } from '../../../models';

// Passes-plat identité — DTO backend réel inconnu (voir INTEGRATION.md).
export function mapFactureDto(dto: unknown): Facture {
  return dto as Facture;
}

export function mapSuiviAbonneMensuelDto(dto: unknown): SuiviAbonneMensuel {
  return dto as SuiviAbonneMensuel;
}

export function mapLigneReleveDto(dto: unknown): LigneReleve {
  return dto as LigneReleve;
}
