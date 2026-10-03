import { Component } from '@angular/core';
import { EmployeesList } from './employees-list/employees-list';

/**
 * Page routée (voir administration.routes.ts) — simple hôte de app-employees-list,
 * qui porte toute la logique réelle. N'affecte en rien l'ancien onglet "Employés" de
 * agency-dashboard.ts (toujours intact, fonctionne en parallèle pendant cette phase).
 */
@Component({
  selector: 'app-administration-employees',
  standalone: true,
  imports: [EmployeesList],
  templateUrl: './employees.html',
  styleUrl: './employees.scss',
})
export class Employees {}
