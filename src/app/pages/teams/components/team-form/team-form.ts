import {
  Component, Input, Output, EventEmitter, OnInit, OnChanges, inject, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { Team, TeamFormData, AvailableVehicle, AvailableZone, MemberRole, CollectorUser } from '../../models/team.model';
import {
  vehicleTypeIcon, vehicleStatusColor, vehicleStatusLabel, vehicleTypeLabel,
} from '../../models/team-labels';

const TEAM_COLORS = [
  '#3b82f6','#16a34a','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#ec4899','#d97706',
  '#64748b','#0f172a',
];

@Component({
  selector: 'app-team-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, TooltipModule],
  templateUrl: './team-form.html',
  styleUrl: './team-form.scss',
})
export class TeamForm implements OnInit, OnChanges {
  @Input() team: Team | null = null;
  @Input({ required: true }) availableVehicles!: AvailableVehicle[];
  @Input({ required: true }) availableZones!: AvailableZone[];
  @Input() availableCollectors: CollectorUser[] = [];
  /** Toutes les équipes de l'agence (déjà chargées par le parent) — sert
   *  uniquement à détecter si un véhicule listé est déjà pris par une autre
   *  équipe ; aucun appel API supplémentaire. */
  @Input() teams: Team[] = [];
  @Output() save   = new EventEmitter<TeamFormData>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  readonly colors  = TEAM_COLORS;
  readonly roles: Array<{ value: MemberRole; label: string }> = [
    { value: 'manager',   label: 'Manager'    },
    { value: 'collector', label: 'Collecteur' },
  ];
  readonly statuses = [
    { value: 'active',      label: 'Active'      },
    { value: 'inactive',    label: 'Inactive'    },
    { value: 'on_mission',  label: 'En mission'  },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  saving = false;
  activeTab = 0;

  vehicleTypeIcon(type: string): string {
    return vehicleTypeIcon(type);
  }
  vehicleStatusColor(s: string): string {
    return vehicleStatusColor(s);
  }
  vehicleStatusLabel(s: string): string {
    return vehicleStatusLabel(s);
  }
  vehicleTypeLabel(t: string): string {
    return vehicleTypeLabel(t);
  }

  /** Nom de l'équipe qui détient déjà ce véhicule (hors équipe en cours d'édition), sinon null. */
  assignedTeamName(vehicleId: string): string | null {
    const other = this.teams.find(t => t.vehicle?.id === vehicleId && t.id !== this.team?.id);
    return other ? other.name : null;
  }

  assignedVehicleTooltip(vehicleId: string): string {
    const name = this.assignedTeamName(vehicleId);
    return name ? `Déjà assigné à l'équipe « ${name} »` : '';
  }
  memberSearches: string[] = [];
  openDropdownIdx: number | null = null;

  @HostListener('document:click')
  closeDropdown(): void { this.openDropdownIdx = null; }

  toggleDropdown(idx: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownIdx = this.openDropdownIdx === idx ? null : idx;
  }

  filteredCollectors(idx: number): CollectorUser[] {
    const q = (this.memberSearches[idx] ?? '').toLowerCase().trim();
    if (!q) return this.availableCollectors;
    return this.availableCollectors.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  }

  selectCollector(idx: number, c: CollectorUser): void {
    this.membersArray.at(idx).patchValue({
      _id:   c._id,
      name:  `${c.firstName} ${c.lastName}`.trim(),
      phone: c.phone ?? '',
    });
    this.memberSearches[idx] = '';
    this.openDropdownIdx = null;
  }

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.minLength(3)]],
    color:       [TEAM_COLORS[0], Validators.required],
    status:      ['active', Validators.required],
    description: [''],
    supervisor:  [''],
    phone:       [''],
    vehicleId:   [''],
    zoneIds:     [[] as string[]],
    members: this.fb.array<ReturnType<typeof this._memberGroup>>([]),
  });

  get membersArray(): FormArray { return this.form.get('members') as FormArray; }
  get isEdit(): boolean { return !!this.team; }
  get title(): string   { return this.isEdit ? `Modifier – ${this.team!.name}` : 'Nouvelle équipe'; }

  ngOnInit(): void { this._fill(); }
  ngOnChanges(): void { this._fill(); }

  private _fill(): void {
    if (!this.team) return;
    this.form.patchValue({
      name:        this.team.name,
      color:       this.team.color,
      status:      this.team.status,
      description: this.team.description ?? '',
      supervisor:  this.team.supervisor ?? '',
      phone:       this.team.phone ?? '',
      vehicleId:   this.team.vehicle?.id ?? '',
      zoneIds:     this.team.zones.map(z => z.id),
    });
    this.membersArray.clear();
    this.memberSearches = [];
    this.team.members.forEach(m => {
      this.membersArray.push(this._memberGroup(m.id, m.name, m.phone, m.role));
      this.memberSearches.push('');
    });
  }

  private _memberGroup(id = '', name = '', phone = '', role: MemberRole = 'collector') {
    return this.fb.group({
      _id:   [id],
      name:  [name,  Validators.required],
      phone: [phone],
      role:  [role,  Validators.required],
    });
  }

  addMember(): void {
    this.membersArray.push(this._memberGroup());
    this.memberSearches.push('');
  }
  removeMember(i: number): void {
    this.membersArray.removeAt(i);
    this.memberSearches.splice(i, 1);
    if (this.openDropdownIdx === i) this.openDropdownIdx = null;
    else if (this.openDropdownIdx !== null && this.openDropdownIdx > i) this.openDropdownIdx--;
  }

  toggleZone(id: string): void {
    const ids: string[] = this.form.get('zoneIds')!.value ?? [];
    this.form.get('zoneIds')!.setValue(
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }
  isZoneSelected(id: string): boolean {
    return (this.form.get('zoneIds')!.value ?? []).includes(id);
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const data: TeamFormData = this.form.getRawValue() as TeamFormData;
    console.log("Team data to save=====>", data)
    this.save.emit(data);
  }

  hasError(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
