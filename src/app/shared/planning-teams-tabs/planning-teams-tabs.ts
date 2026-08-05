import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TeamService } from '../../pages/teams/services/team.service';
import { PLANNING_NAV_ITEMS, TEAMS_NAV_ITEMS } from './planning-teams-tabs-nav.config';

// Remplace <app-sidebar> pour /planning/* et /teams/* : même 6 liens + le badge "en
// mission" + les 2 actions secondaires (Nouvelle équipe / Aide) que l'ancien sidebar,
// mais en onglets horizontaux — pattern repris de finance-layout.ts (dashboard
// financier), qui n'a jamais eu de sidebar (voir son commentaire "pas de sidebar,
// choix explicite").
@Component({
  selector: 'app-planning-teams-tabs',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './planning-teams-tabs.html',
  styleUrl: './planning-teams-tabs.scss',
})
export class PlanningTeamsTabs {
  private readonly teamSvc = inject(TeamService);

  readonly planningNav = PLANNING_NAV_ITEMS;
  readonly teamsNav = TEAMS_NAV_ITEMS;
  readonly onMissionCount = computed(() => this.teamSvc.stats().onMission);
}
