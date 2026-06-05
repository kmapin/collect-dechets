import { Component } from '@angular/core';


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