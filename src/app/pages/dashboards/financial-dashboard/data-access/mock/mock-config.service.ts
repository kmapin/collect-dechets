import { Injectable, signal } from '@angular/core';

export type MockScenario = 'success' | 'empty' | 'error' | 'slow';

export interface MockFeatureConfig {
  scenario: MockScenario;
  delayMs: number;
}

const DEFAULT_DELAY_MS = 400;
const SLOW_DELAY_MS = 2500;
const DEFAULT_CONFIG: MockFeatureConfig = { scenario: 'success', delayMs: DEFAULT_DELAY_MS };

// Fournie au niveau de la route racine du module (voir financial-dashboard.routes.ts) —
// une seule instance partagée par tous les écrans finance, pas providedIn: 'root'.
// Permet à la démo de faire basculer chaque écran indépendamment entre
// succès / vide / erreur / lent (spec §5 — scenario switches).
@Injectable()
export class MockConfigService {
  private readonly _configs = signal<Record<string, MockFeatureConfig>>({});

  getConfig(feature: string): MockFeatureConfig {
    return this._configs()[feature] ?? DEFAULT_CONFIG;
  }

  setScenario(feature: string, scenario: MockScenario): void {
    const delayMs = scenario === 'slow' ? SLOW_DELAY_MS : DEFAULT_DELAY_MS;
    this._configs.update(configs => ({ ...configs, [feature]: { scenario, delayMs } }));
  }

  reset(feature?: string): void {
    if (!feature) {
      this._configs.set({});
      return;
    }
    this._configs.update(({ [feature]: _removed, ...rest }) => rest);
  }
}
