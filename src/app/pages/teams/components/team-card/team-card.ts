import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { Team } from '../../models/team.model';
import { teamStatusLabel, teamStatusColor } from '../../models/team-labels';

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
    return teamStatusLabel(s);
  }
  statusColor(s: string): string {
    return teamStatusColor(s);
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
  hiddenZonesTooltip(team: Team, from: number): string {
    return team.zones.slice(from).map(z => `${z.name} — ${z.ville}`).join(', ');
  }
}
