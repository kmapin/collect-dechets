import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PlanningTeamsTabs } from '../../../shared/planning-teams-tabs/planning-teams-tabs';

// Shell du module Équipes : plus de sidebar (voir planning-layout.ts pour le même
// changement côté Planning) — les deux layouts partagent <app-planning-teams-tabs>.
@Component({
  selector: 'app-teams-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, PlanningTeamsTabs],
  templateUrl: './teams-layout.html',
  styleUrl: './teams-layout.scss',
})
export class TeamsLayout {}
