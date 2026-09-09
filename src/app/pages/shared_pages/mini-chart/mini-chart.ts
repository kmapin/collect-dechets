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
