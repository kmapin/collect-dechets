import { Component, ElementRef, OnDestroy, OnInit, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { PlanningService } from '../services/planning.service';
import { ZoneCoverage } from '../models/planning.model';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/breadcrumb/breadcrumb';
import { AuthService } from '../../../services/auth.service';
import { dashboardRouteForRole, dashboardLabelForRole } from '../../../shared/notification-route.util';

// Même centre par défaut que service-locations.ts (Ouagadougou) — utilisé tant
// qu'aucune zone géolocalisée n'est encore chargée.
const DEFAULT_CENTER: [number, number] = [12.3714, -1.5197];

@Component({
  selector: 'app-planning-zones',
  standalone: true,
  imports: [CommonModule, Breadcrumb],
  templateUrl: './planning-zones.html',
  styleUrl: './planning-zones.scss',
})
export class PlanningZones implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private planningService = inject(PlanningService);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: dashboardLabelForRole(this.auth.getCurrentUser()?.role), route: dashboardRouteForRole(this.auth.getCurrentUser()?.role), icon: 'home' },
    { label: 'Planning', route: '/planning/dashboard' },
    { label: 'Zones couvertes' },
  ];

  zones = this.planningService.zones;
  isLoading = this.planningService.zonesLoading;

  /** Zones réellement géolocalisées (Neighbourhood.latitude/longitude) — les autres
   * restent listées mais ne peuvent pas être placées sur la carte. */
  get geolocatedZones(): ZoneCoverage[] {
    return this.zones().filter((z) => z.lat != null && z.lng != null);
  }

  get ungeolocatedCount(): number {
    return this.zones().length - this.geolocatedZones.length;
  }

  private map?: L.Map;
  private markers: L.CircleMarker[] = [];

  @ViewChild('mapEl') set mapEl(el: ElementRef<HTMLDivElement> | undefined) {
    if (el && !this.map) this.initMap(el.nativeElement);
  }

  constructor() {
    // Redessine les marqueurs à chaque (re)chargement des zones, une fois la carte prête.
    effect(() => {
      this.zones();
      if (this.map) this.renderMarkers();
    });
  }

  ngOnInit(): void {
    this.planningService.loadZones();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(container: HTMLDivElement): void {
    this.map = L.map(container, { center: DEFAULT_CENTER, zoom: 12, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 200);
    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.map) return;
    this.markers.forEach((m) => m.remove());
    this.markers = [];

    const zones = this.geolocatedZones;
    for (const zone of zones) {
      const marker = L.circleMarker([zone.lat, zone.lng], {
        radius: 10,
        color: this.statusColor(zone.status),
        fillColor: this.statusColor(zone.status),
        fillOpacity: 0.7,
        weight: 2,
      }).addTo(this.map);
      marker.bindPopup(
        `<strong>${zone.name}</strong><br>${zone.planningsCount} planning(s) · ${zone.teamsAssigned} équipe(s)<br>Taux d'exécution : ${zone.completionRate}%`,
      );
      this.markers.push(marker);
    }

    if (zones.length) {
      const bounds = L.latLngBounds(zones.map((z) => [z.lat, z.lng] as [number, number]));
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  focusZone(zone: ZoneCoverage): void {
    if (!this.map || zone.lat == null || zone.lng == null) return;
    this.map.setView([zone.lat, zone.lng], 15);
    const index = this.geolocatedZones.indexOf(zone);
    this.markers[index]?.openPopup();
  }

  statusColor(status: ZoneCoverage['status']): string {
    if (status === 'active') return '#22c55e';
    if (status === 'attention') return '#f59e0b';
    return '#94a3b8';
  }

  statusLabel(status: ZoneCoverage['status']): string {
    if (status === 'active') return 'Bonne couverture';
    if (status === 'attention') return 'À surveiller';
    return 'Inactif';
  }
}
