import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { Team } from '../../models/team.model';

@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, TooltipModule],
  templateUrl: './team-card.html',
  styleUrl: './team-card.scss',
})
export class TeamCard {
  @Input({ required: true }) team!: Team;
  @Output() edit   = new EventEmitter<Team>();
  @Output() delete = new EventEmitter<Team>();
  @Output() toggle = new EventEmitter<Team>();
  @Output() detail = new EventEmitter<Team>();

  statusLabel(s: string): string {
    return ({ active: 'Active', inactive: 'Inactive', on_mission: 'En mission', maintenance: 'Maintenance' } as Record<string,string>)[s] ?? s;
  }
  statusColor(s: string): string {
    return ({ active: '#16a34a', inactive: '#94a3b8', on_mission: '#f59e0b', maintenance: '#ef4444' } as Record<string,string>)[s] ?? '#64748b';
  }
  workloadColor(w: number): string {
    if (w >= 80) return '#ef4444';
    if (w >= 50) return '#f59e0b';
    return '#16a34a';
  }
  vehicleIcon(t: string): string {
    return ({ camion: 'local_shipping', pickup: 'directions_car', moto: 'two_wheeler', tricycle: 'electric_rickshaw' } as Record<string,string>)[t] ?? 'local_shipping';
  }
  availableMembers(): number {
    return this.team.members.filter(m => m.availability === 'disponible').length;
  }
}
