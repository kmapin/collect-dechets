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

export interface FinanceChartTableRow {
  label: string;
  value: string; // déjà formaté par l'appelant (money.util, etc.)
}

@Component({
  selector: 'app-finance-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finance-chart.component.html',
  styleUrl: './finance-chart.component.scss',
})
export class FinanceChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) titre = '';
  @Input() config: ChartConfiguration | null = null;
  @Input() tableRows: FinanceChartTableRow[] = [];
  @Input() loading = false;

  @ViewChild('canvasRef') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private vueInitialisee = false;

  get estVide(): boolean {
    return !this.config || this.tableRows.length === 0;
  }

  ngAfterViewInit(): void {
    this.vueInitialisee = true;
    this._construire();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config'] && this.vueInitialisee) this._construire();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private _construire(): void {
    this.chart?.destroy();
    this.chart = null;

    const el = this.canvasRef?.nativeElement;
    if (!el || !this.config || this.estVide) return;

    const animationsReduites = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.chart = new Chart(el, {
      ...this.config,
      options: {
        ...this.config.options,
        responsive: true,
        maintainAspectRatio: false,
        animation: animationsReduites ? false : this.config.options?.animation,
      },
    });
  }
}
