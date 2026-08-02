import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

/**
 * Generic Chart.js canvas wrapper — one component for any chart type
 * (doughnut, line, bar, ...). Callers build a `ChartConfiguration` with a
 * small pure "config builder" function (see
 * `municipality-dashboard/charts/*.chart.ts`) and pass it in; this component
 * only owns the canvas lifecycle, loading/empty overlays and responsive
 * sizing. Mirrors `financial-dashboard/shared/chart/finance-chart.component.ts`
 * (same split: generic wrapper + per-chart config builders), minus the
 * accessible data-table fallback that component adds — not needed here.
 *
 * The `<canvas>` stays permanently in the DOM (never behind `@if`): toggling
 * it in/out on the same change-detection cycle as `config` arriving would
 * make `ngOnChanges` fire before `@ViewChild` finds a freshly re-inserted
 * canvas, and the chart would never build. Loading/empty states are
 * overlaid on top instead — see the finance-chart.component.html comment
 * documenting this exact bug.
 */
@Component({
  selector: 'app-mini-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-chart.html',
  styleUrl: './mini-chart.scss',
})
export class MiniChart implements AfterViewInit, OnChanges, OnDestroy {
  @Input() config: ChartConfiguration | null = null;
  @Input() loading = false;
  /** Caller decides emptiness — it already has the raw array before building `config`. */
  @Input() empty = false;
  @Input() emptyIcon = 'insert_chart_outline';
  @Input() emptyMessage = 'Aucune donnée disponible.';

  @ViewChild('canvasRef') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.build();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['config'] || changes['loading'] || changes['empty']) && this.viewReady) {
      this.build();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private build(): void {
    this.chart?.destroy();
    this.chart = null;

    const el = this.canvasRef?.nativeElement;
    if (!el || !this.config || this.loading || this.empty) {
      return;
    }

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.chart = new Chart(el, {
      ...this.config,
      options: {
        ...this.config.options,
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : this.config.options?.animation,
      },
    });
  }
}
