import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="schedule-page">
      <div class="page-header">
        <div class="container">
          <h1 class="page-title">Calendrier de Collecte</h1>
          <p class="page-subtitle">
            Consultez les prochaines collectes programmées
          </p>
        </div>
      </div>

      <div class="container">
        <div class="schedule-content">
          <div class="schedule-card card">
            <h2>Prochaines Collectes</h2>
            <div class="schedule-list">
              <div class="schedule-item" *ngFor="let item of scheduleItems">
                <div class="schedule-date">
                  <div class="day">{{ item.day }}</div>
                  <div class="month">{{ item.month }}</div>
                </div>
                <div class="schedule-info">
                  <h4>{{ item.type }}</h4>
                  <p>{{ item.time }}</p>
                </div>
                <div class="schedule-status">
                  <span [class]="'status-' + item.status">{{ item.statusText }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .schedule-page {
      min-height: 100vh;
      background: var(--light-gray);
    }

    .schedule-content {
      max-width: 800px;
      margin: 0 auto;
    }

    .schedule-card {
      padding: 32px;
    }

    .schedule-list {
      margin-top: 24px;
    }

    .schedule-item {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 16px 0;
      border-bottom: 1px solid var(--medium-gray);
    }

    .schedule-item:last-child {
      border-bottom: none;
    }

    .schedule-date {
      text-align: center;
      min-width: 60px;
    }

    .day {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-color);
    }

    .month {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
    }

    .schedule-info {
      flex: 1;
    }

    .schedule-info h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .schedule-info p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .status-scheduled {
      color: var(--primary-color);
      font-weight: 500;
    }

    .status-completed {
      color: var(--success-color);
      font-weight: 500;
    }
  `]
})
export class ScheduleComponent {
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