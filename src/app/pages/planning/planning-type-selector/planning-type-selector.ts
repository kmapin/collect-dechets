import {
  Component, forwardRef, inject, signal, computed, ChangeDetectionStrategy,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PlanningService } from '../services/planning.service';

interface TypeCard {
  value: string;
  label: string;
  icon: string;
  color: string;
  gradient: string;
  bgLight: string;
  borderColor: string;
  description: string;
  detail: string;
  badge: string;
  badgeBg: string;
}

@Component({
  selector: 'app-planning-type-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './planning-type-selector.html',
  styleUrl: './planning-type-selector.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PlanningTypeSelectorComponent),
      multi: true,
    },
  ],
})
export class PlanningTypeSelectorComponent implements ControlValueAccessor {
  private svc = inject(PlanningService);

  selected   = signal<string>('');
  isDisabled = signal(false);
  hovering   = signal<string>('');

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  counts = computed(() => {
    const ps = this.svc.plannings();
    return {
      individuel: ps.filter(p => p.type === 'individuel').length,
      groupe:     ps.filter(p => p.type === 'groupe').length,
      zone:       ps.filter(p => p.type === 'zone').length,
      secteur:    ps.filter(p => p.type === 'secteur').length,
    };
  });

  readonly cards: TypeCard[] = [
    {
      value:       'individuel',
      label:       'Client individuel',
      icon:        'person',
      color:       '#3b82f6',
      gradient:    'linear-gradient(135deg,#3b82f6,#2563eb)',
      bgLight:     '#eff6ff',
      borderColor: '#bfdbfe',
      description: 'Planifier pour un client spécifique',
      detail:      'Idéal pour les abonnés avec des besoins particuliers',
      badge:       'Personnalisé',
      badgeBg:     '#dbeafe',
    },
    {
      value:       'groupe',
      label:       'Groupe de clients',
      icon:        'groups',
      color:       '#8b5cf6',
      gradient:    'linear-gradient(135deg,#8b5cf6,#7c3aed)',
      bgLight:     '#f5f3ff',
      borderColor: '#ddd6fe',
      description: 'Planifier pour un groupe constitué',
      detail:      'Gérez plusieurs clients dans une même tournée',
      badge:       'Groupé',
      badgeBg:     '#ede9fe',
    },
    {
      value:       'zone',
      label:       'Par zone',
      icon:        'map',
      color:       '#16a34a',
      gradient:    'linear-gradient(135deg,#16a34a,#15803d)',
      bgLight:     '#f0fdf4',
      borderColor: '#bbf7d0',
      description: 'Couvrir toute une zone géographique',
      detail:      'Quartiers résidentiels avec couverture complète',
      badge:       'Géographique',
      badgeBg:     '#dcfce7',
    },
    {
      value:       'secteur',
      label:       'Par secteur',
      icon:        'grid_view',
      color:       '#f59e0b',
      gradient:    'linear-gradient(135deg,#f59e0b,#d97706)',
      bgLight:     '#fffbeb',
      borderColor: '#fde68a',
      description: 'Planifier par secteur administratif',
      detail:      'Organisation par secteurs et arrondissements',
      badge:       'Administratif',
      badgeBg:     '#fef9c3',
    },
  ];

  select(value: string): void {
    if (this.isDisabled()) return;
    this.selected.set(value);
    this.onChange(value);
    this.onTouched();
  }

  isSelected(value: string):  boolean { return this.selected() === value; }
  isHovering(value: string):  boolean { return this.hovering() === value; }
  setHover(value: string):    void    { this.hovering.set(value); }
  clearHover():               void    { this.hovering.set(''); }

  getCount(value: string): number {
    const c = this.counts();
    return (c as Record<string, number>)[value] ?? 0;
  }

  writeValue(value: string): void        { this.selected.set(value ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void         { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void       { this.isDisabled.set(disabled); }
}
