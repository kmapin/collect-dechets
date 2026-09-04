import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

// Shell du module Équipes : plus de sidebar (voir planning-layout.ts pour le même
// changement côté Planning). `<app-planning-teams-tabs>` n'est plus rendue ici (elle
// s'affichait alors sur TOUTES les pages du module, y compris create/detail/members où
// elle n'a pas sa place) — chaque page-destination de la nav (dashboard, list,
// availability) l'inclut désormais elle-même.
@Component({
  selector: 'app-teams-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './teams-layout.html',
  styleUrl: './teams-layout.scss',
})
export class TeamsLayout {}
