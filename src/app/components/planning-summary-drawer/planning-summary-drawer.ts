import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PlanningService } from '../../pages/planning/services/planning.service';
import { Planning } from '../../pages/planning/models/planning.model';
import { formatFrDate } from '../../shared/format.util';

const STATUS_LABELS: Partial<Record<string, string>> = {
  brouillon: 'Brouillon', planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
};

const TYPE_LABELS: Partial<Record<string, string>> = {
  individuel: 'Client individuel', groupe: 'Groupe de clients', zone: 'Par zone', secteur: 'Par secteur',
};

@Component({
  selector: 'app-planning-summary-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planning-summary-drawer.html',
  styleUrl: './planning-summary-drawer.css',
})
export class PlanningSummaryDrawer implements AfterViewInit, OnDestroy {
  private svc = inject(PlanningService);
  private elRef = inject(ElementRef<HTMLElement>);
  private renderer = inject(Renderer2);
  private sub?: Subscription;

  ngAfterViewInit(): void {
    this.renderer.appendChild(document.body, this.elRef.nativeElement);
  }

  formatFrDate = formatFrDate;
  statusLabels = STATUS_LABELS;
  typeLabels = TYPE_LABELS;

  planning: Planning | null = null;
  loading = false;
  error = false;

  @Output() closed = new EventEmitter<void>();

  private _planningId: string | null = null;
  get planningId(): string | null {
    return this._planningId;
  }
  @Input() set planningId(id: string | null) {
    this._planningId = id;
    this.sub?.unsubscribe();
    this.planning = null;
    this.error = false;
    if (!id) return;
    this.loading = true;
    this.sub = this.svc.getPlanning(id).subscribe({
      next: (p) => { this.planning = p; this.loading = false; },
      error: () => { this.error = true; this.loading = false; },
    });
  }

  close(): void {
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.elRef.nativeElement.remove();
  }
}
