import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { PageParams } from '../../models';
import { MockConfigService } from './mock-config.service';

/**
 * Point de passage unique entre un mock service et l'observable qu'il retourne :
 * applique le scénario configuré (success|empty|error|slow) pour la feature donnée.
 * `emptyValue` est optionnel — pour un appel "détail" (getClient(id)…), il n'y a pas
 * d'équivalent vide naturel, donc il retombe sur `successValue`.
 */
export function simulateResponse<T>(
  feature: string,
  mockConfig: MockConfigService,
  successValue: T,
  emptyValue: T = successValue,
): Observable<T> {
  const { scenario, delayMs } = mockConfig.getConfig(feature);

  if (scenario === 'error') {
    return throwError(() => new Error(`[mock:${feature}] Erreur simulée`)).pipe(delay(delayMs));
  }

  const value = scenario === 'empty' ? emptyValue : successValue;
  return of(value).pipe(delay(delayMs));
}

/** Pagine une liste en mémoire selon les params serveur-style (page/pageSize). */
export function paginateMock<T>(
  all: T[],
  params?: PageParams<unknown>,
): { items: T[]; total: number; page: number; pageSize: number } {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? (all.length || 1);
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize };
}
