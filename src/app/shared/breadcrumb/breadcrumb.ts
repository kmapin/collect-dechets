import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  route?: string | any[];
  /** Icône Material (nom de la ligature, ex. 'home') affichée avant le libellé. */
  icon?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  @Input({ required: true }) items: BreadcrumbItem[] = [];
  /** 'onColor' : à utiliser quand le fil d'Ariane est posé sur un fond coloré/dégradé
   *  (ex. le bandeau .page-header) plutôt que sur le fond blanc de la page. */
  @Input() variant: 'default' | 'onColor' = 'default';
}
