import {
  Component, Input, Output, EventEmitter, OnInit, OnChanges, inject, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { Team, TeamFormData, AvailableVehicle, AvailableZone, MemberRole, CollectorUser } from '../../models/team.model';

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
  @Output() save   = new EventEmitter<TeamFormData>();
  @Output() cancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);

  readonly colors  = TEAM_COLORS;
  readonly roles: Array<{ value: MemberRole; label: string }> = [
    { value: 'chef',      label: 'Chef d\'équipe' },
    { value: 'chauffeur', label: 'Chauffeur'      },
    { value: 'agent',     label: 'Agent'          },
    { value: 'assistant', label: 'Assistant'      },
  ];
  readonly statuses = [
    { value: 'active',      label: 'Active'      },
    { value: 'inactive',    label: 'Inactive'    },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  saving = false;
  activeTab = 0;
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

  private _memberGroup(id = '', name = '', phone = '', role: MemberRole = 'agent') {
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
    const raw = this.form.getRawValue() as any;

    // Build collectorIds from member _id fields (real API IDs)
    const collectorIds: string[] = (raw.members ?? [])
      .map((m: any) => m._id as string)
      .filter((id: string) => !!id && !id.startsWith('LOCAL-'));

    // Find leader: first member with role 'chef', else existing leaderId
    const chefMember = (raw.members ?? []).find((m: any) => m.role === 'chef');
    const leaderId   = chefMember?._id || this.team?.leaderId || undefined;

    const data: TeamFormData = {
      ...raw,
      collectorIds,
      leaderId,
      maxClientsPerDay: this.team?.maxClientsPerDay,
    };
    this.save.emit(data);
  }

  hasError(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
