import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockConfigService, MockScenario } from '../../data-access/mock/mock-config.service';

const FEATURES_DEMO: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard — KPI' },
  { key: 'dashboard:stats', label: 'Dashboard — graphiques' },
  { key: 'paiements', label: 'Paiements' },
  { key: 'retraits', label: 'Retraits' },
  { key: 'clients', label: 'Clients' },
  { key: 'factures:suivi-mensuel', label: 'Suivi mensuel' },
  { key: 'factures:releve', label: 'Relevé' },
  { key: 'agents', label: 'Paiement agents' },
];

const SCENARIOS: { value: MockScenario; label: string }[] = [
  { value: 'success', label: 'Succès' },
  { value: 'empty', label: 'Vide' },
  { value: 'error', label: 'Erreur' },
  { value: 'slow', label: 'Lent' },
];

// Panneau démo (jamais présent en production) : bascule le scénario mock par écran
// (success|empty|error|slow) pour démontrer chaque état à la demande — spec §5.
// Après bascule, l'écran affiché doit être rechargé (bouton "Réessayer" ou changement
// d'onglet) : les composants ne s'abonnent pas à MockConfigService en continu.
@Component({
  selector: 'app-mock-scenario-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mock-scenario-panel.component.html',
  styleUrl: './mock-scenario-panel.component.scss',
})
export class MockScenarioPanelComponent {
  private readonly mockConfig = inject(MockConfigService);

  readonly ouvert = signal(false);
  readonly featureChoisie = signal(FEATURES_DEMO[0].key);

  readonly features = FEATURES_DEMO;
  readonly scenarios = SCENARIOS;

  toggleOuvert(): void {
    this.ouvert.update(v => !v);
  }

  scenarioActif(feature: string): MockScenario {
    return this.mockConfig.getConfig(feature).scenario;
  }

  definirScenario(feature: string, scenario: MockScenario): void {
    this.mockConfig.setScenario(feature, scenario);
  }
}
