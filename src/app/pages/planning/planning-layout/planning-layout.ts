import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PlanningTeamsTabs } from '../../../shared/planning-teams-tabs/planning-teams-tabs';

// Shell du module Planning : plus de sidebar (remplacée par des onglets horizontaux,
// même pattern que le dashboard financier — voir finance-layout.ts) — navigation
// pilotée par le Router (routerLink/routerLinkActive) via <app-planning-teams-tabs>,
// partagée avec teams-layout.ts (même 6 liens qu'avant dans <app-sidebar>).
@Component({
  selector: 'app-planning-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, PlanningTeamsTabs],
  templateUrl: './planning-layout.html',
  styleUrl: './planning-layout.scss',
})
export class PlanningLayout {}
