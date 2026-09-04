import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

// Shell du module Planning : plus de sidebar (remplacée par des onglets horizontaux,
// même pattern que le dashboard financier — voir finance-layout.ts). `<app-planning-
// teams-tabs>` n'est plus rendue ici (elle s'affichait alors sur TOUTES les pages du
// module, y compris create/detail où elle n'a pas sa place) — chaque page qui doit
// l'afficher (dashboard, calendar) l'inclut désormais elle-même, comme
// PlanningDashboard le fait déjà.
@Component({
  selector: 'app-planning-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './planning-layout.html',
  styleUrl: './planning-layout.scss',
})
export class PlanningLayout {}
