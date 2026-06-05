import {
  Component, Input, Output, EventEmitter, OnInit, OnChanges, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TooltipModule } from 'primeng/tooltip';
import { Team, TeamFormData, AvailableVehicle, AvailableZone, MemberRole } from '../../models/team.model';

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
      name: this.team.name, color: this.team.color, status: this.team.status,
      description: this.team.description ?? '', supervisor: this.team.supervisor ?? '',
      phone: this.team.phone ?? '', vehicleId: this.team.vehicle?.id ?? '',
      zoneIds: this.team.zones.map(z => z.id),
    });
    this.membersArray.clear();
    this.team.members.forEach(m =>
      this.membersArray.push(this._memberGroup(m.name, m.phone, m.role))
    );
  }

  private _memberGroup(name = '', phone = '', role: MemberRole = 'agent') {
    return this.fb.group({
      name:  [name,  Validators.required],
      phone: [phone, Validators.required],
      role:  [role,  Validators.required],
    });
  }

  addMember(): void {
    this.membersArray.push(this._memberGroup());
  }
  removeMember(i: number): void {
    this.membersArray.removeAt(i);
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
    this.save.emit(this.form.getRawValue() as unknown as TeamFormData);
  }

  hasError(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
}
