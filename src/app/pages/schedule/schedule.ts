import { Component } from '@angular/core';

// Phase 10 (audit multi-lieux) — page non fonctionnelle : scheduleItems est une liste
// fictive codée en dur, identique pour tout visiteur (aucun appel API, aucun endpoint
// public de calendrier de collecte n'existe côté backend). Le lien "Calendrier collecte" a
// été retiré du footer public (footer.html) pour ne plus exposer ce contenu fictif ; la
// route /schedule reste techniquement accessible par URL directe.
@Component({
  selector: 'app-schedule',
  imports: [],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css'
})
export class Schedule {
  scheduleItems = [
    {
      day: '15',
      month: 'Jan',
      type: 'Déchets ménagers',
      time: '8h00 - 12h00',
      status: 'scheduled',
      statusText: 'Programmé'
    },
    {
      day: '12',
      month: 'Jan',
      type: 'Recyclables',
      time: '8h00 - 12h00',
      status: 'completed',
      statusText: 'Collecté'
    }
  ];
}