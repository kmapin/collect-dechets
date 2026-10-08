import { Injectable } from '@angular/core';

/**
 * Compteur partagé plutôt qu'un simple toggle — deux drawers peuvent être ouverts en
 * même temps (ex: une modale de confirmation au-dessus d'un drawer déjà ouvert) ; sans
 * compteur, fermer le second déverrouillerait le scroll alors que le premier est encore
 * affiché. Le scroll ne se déverrouille que quand le dernier verrou est levé.
 */
@Injectable({ providedIn: 'root' })
export class ScrollLockService {
  private count = 0;

  lock(): void {
    this.count++;
    if (this.count === 1) {
      document.body.classList.add('body-scroll-lock');
    }
  }

  unlock(): void {
    if (this.count === 0) return;
    this.count--;
    if (this.count === 0) {
      document.body.classList.remove('body-scroll-lock');
    }
  }
}
