import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

// Cible temporaire de chaque route enfant tant que son écran réel n'est pas construit
// (Prompts 7, 9–14) — chaque prompt remplace ensuite juste le loadComponent() de sa
// route, sans toucher à ce fichier ni aux autres routes.
@Component({
  selector: 'app-finance-route-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fin-route-placeholder">
      <h2>{{ titre() }}</h2>
      <p>Écran à venir dans un prochain prompt.</p>
    </div>
  `,
  styles: [`
    .fin-route-placeholder {
      padding: 2rem;
      color: #64748b;
      text-align: center;
    }
  `],
})
export class FinanceRoutePlaceholder {
  private readonly route = inject(ActivatedRoute);
  readonly titre = toSignal(
    this.route.data.pipe(map(d => (d['title'] as string) ?? 'Écran financier')),
    { initialValue: 'Écran financier' },
  );
}
