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
import * as L from 'leaflet';

export interface CoverageMapZone {
  id: string;
  name: string;
  coordinates: [number, number];
  agencies: number;
  clients: number;
  collections: number;
  incidents: number;
  /** 0–100. Drives marker color — see colorForCoverage(). */
  coverage: number;
}

@Component({
  selector: 'app-coverage-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coverage-map.html',
  styleUrl: './coverage-map.scss',
})
export class CoverageMap implements AfterViewInit, OnChanges, OnDestroy {
  @Input() zones: CoverageMapZone[] = [];

  @ViewChild('mapEl') private mapElRef?: ElementRef<HTMLDivElement>;

  loading = true;

  private map: L.Map | null = null;
  private markers: L.CircleMarker[] = [];
  private resizeObserver?: ResizeObserver;
  private viewReady = false;
  private pendingFit: (() => void) | null = null;

  get isEmpty(): boolean {
    return this.zones.length === 0;
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.refresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['zones'] && this.viewReady) {
      this.refresh();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.map = null;
  }

  private refresh(): void {
    if (this.isEmpty) {
      this.map?.remove();
      this.map = null;
      this.markers = [];
      return;
    }
    this.initMap();
  }

  private initMap(): void {
    const el = this.mapElRef?.nativeElement;
    if (!el) {
      return;
    }

    this.loading = true;
    this.map?.remove();
    this.markers = [];
    this.pendingFit = null;

    this.map = L.map(el, {
      center: this.zones[0].coordinates,
      zoom: 6,
      zoomControl: true,
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
      maxZoom: 19,
    });
    tiles.once('load', () => {
      this.loading = false;
    });
    tiles.addTo(this.map);

    const bounds: L.LatLngTuple[] = [];
    for (const zone of this.zones) {
      const color = this.colorForCoverage(zone.coverage);
      const marker = L.circleMarker(zone.coordinates, {
        radius: 11,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      });
      marker.bindTooltip(`${zone.name} — ${zone.coverage}%`, { direction: 'top', offset: [0, -8] });
      marker.bindPopup(this.buildPopupHtml(zone, color));
      marker.addTo(this.map);
      this.markers.push(marker);
      bounds.push(zone.coordinates);
    }

    const fitToMarkers = () => {
      if (bounds.length > 1) {
        this.map?.fitBounds(bounds, { padding: [32, 32] });
      }
    };

    /**
     * `el.clientWidth`/`clientHeight` are only trustworthy once the browser has
     * actually laid out this just-inserted/just-switched `.territory-map-container`
     * — confirmed by reproducing live that it can still report 0x0 a full
     * `requestAnimationFrame` after `L.map()` construction, so `fitBounds()` run
     * at that point computes nonsense (observed: zoom clamped to maxZoom 19,
     * centered on the centroid of all zone coordinates instead of an actual
     * "fit every marker" view). Fit immediately when the size is already real
     * (true on every re-render after the first), otherwise defer to the
     * ResizeObserver below — per spec it always delivers at least one entry
     * after `observe()`, so it's guaranteed to fire once the container transitions
     * to its real size, without guessing how many frames that takes.
     */
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      fitToMarkers();
    } else {
      this.pendingFit = fitToMarkers;
    }

    if (!this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        this.map?.invalidateSize();
        if (this.pendingFit && el.clientWidth > 0 && el.clientHeight > 0) {
          this.pendingFit();
          this.pendingFit = null;
        }
      });
      this.resizeObserver.observe(el);
    }
  }

  /** Same thresholds as getCoverageBadgeClass() in municipality-dashboard.ts,
   * so the map's marker colors and the tabular view's badge colors always agree. */
  private colorForCoverage(coverage: number): string {
    if (coverage >= 75) return '#4caf50'; // var(--success-color)
    if (coverage >= 55) return '#f57c00';
    return '#f44336'; // var(--error-color)
  }

  private buildPopupHtml(zone: CoverageMapZone, color: string): string {
    return `
      <div class="coverage-map-popup">
        <div class="coverage-map-popup__title" style="border-left:4px solid ${color}">${zone.name}</div>
        <div class="coverage-map-popup__row"><i class="material-icons">business</i>${zone.agencies} agences</div>
        <div class="coverage-map-popup__row"><i class="material-icons">people</i>${zone.clients} clients</div>
        <div class="coverage-map-popup__row"><i class="material-icons">local_shipping</i>${zone.collections} collectes</div>
        <div class="coverage-map-popup__row"><i class="material-icons">warning</i>${zone.incidents} incidents</div>
        <div class="coverage-map-popup__row coverage-map-popup__coverage" style="color:${color}">${zone.coverage}% couvert</div>
      </div>
    `;
  }
}
