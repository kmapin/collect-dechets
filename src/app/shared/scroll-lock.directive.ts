import { Directive, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { ScrollLockService } from './scroll-lock.service';

/**
 * Bloque le scroll de la page tant que l'élément porteur est affiché.
 *
 * Deux usages :
 * - Attribut nu (`<div class="drawer-overlay" appScrollLock>`) posé directement sur le
 *   div `@if`/`*ngIf`-gated d'un drawer/modale (l'overlay plein écran lui-même) : son
 *   ngOnInit/ngOnDestroy coïncide exactement avec l'ouverture/fermeture du drawer, quel
 *   que soit le nombre d'endroits du composant qui togglent le flag contrôlant ce `@if`.
 * - Liaison booléenne (`[appScrollLock]="isOpen"`) quand l'élément overlay reste dans le
 *   DOM en permanence et est juste montré/masqué via une classe CSS (ex: le menu mobile
 *   de header.html) — dans ce cas ngOnInit/ngOnDestroy ne suffiraient pas, c'est
 *   ngOnChanges qui (dé)verrouille à chaque bascule de la valeur liée.
 */
@Directive({
  selector: '[appScrollLock]',
  standalone: true,
})
export class ScrollLockDirective implements OnInit, OnChanges, OnDestroy {
  @Input() appScrollLock: boolean | '' = true;

  private readonly scrollLock = inject(ScrollLockService);
  private locked = false;

  ngOnInit(): void {
    this.sync();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appScrollLock'] && !changes['appScrollLock'].firstChange) {
      this.sync();
    }
  }

  ngOnDestroy(): void {
    if (this.locked) {
      this.scrollLock.unlock();
      this.locked = false;
    }
  }

  private sync(): void {
    // Attribut nu (pas de binding) -> Angular assigne '' -> on verrouille quand même ;
    // seule une liaison explicite à `false` désactive le verrou.
    const shouldLock = this.appScrollLock !== false;
    if (shouldLock === this.locked) return;
    shouldLock ? this.scrollLock.lock() : this.scrollLock.unlock();
    this.locked = shouldLock;
  }
}
