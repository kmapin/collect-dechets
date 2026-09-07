import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { PlanningService } from '../../pages/planning/services/planning.service';
import { Planning } from '../../pages/planning/models/planning.model';
import { formatFrDate } from '../../shared/format.util';

// Typées `Partial` (et non `Record<string, string>`) bien que les clés couvrent tous les
// cas de `PlanningStatus`/`PlanningType` actuels : le repli `?? p.status`/`?? p.type`
// dans le template reste une vraie protection si un enregistrement porte une valeur
// legacy/inattendue (déjà vu ailleurs dans ce module — voir Signalement.status), pas du
// code mort. `Record<string, string>` masquait ce cas et déclenchait un faux positif
// NG8102 ("?? toujours superflu").
const STATUS_LABELS: Partial<Record<string, string>> = {
  brouillon: 'Brouillon', planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé',
};

const TYPE_LABELS: Partial<Record<string, string>> = {
  individuel: 'Client individuel', groupe: 'Groupe de clients', zone: 'Par zone', secteur: 'Par secteur',
};

/**
 * Vue résumée, lecture seule, d'un Planning — pour les rôles qui ne doivent PAS
 * accéder à la page complète /planning/detail/:id (super_admin, municipality, client :
 * voir notification-route.util.ts). N'affiche que des informations informatives
 * (dates, statut, équipe, zone, nombre de clients concernés) — jamais la liste
 * nominative des clients ni leur position exacte (carte), jamais les actions de
 * gestion (démarrer/annuler/réaffecter), réservées à la page complète manager/collecteur.
 */
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

  /**
   * Ce composant est monté depuis 3 endroits différents (header, /notifications,
   * signalement) sans contrôle sur leurs ancêtres — un `backdrop-filter`/`transform`/
   * `filter` QUELCONQUE plus haut dans l'arbre (ex. `.navbar` : backdrop-filter
   * permanent dans header.css) crée un nouveau "containing block" pour tout
   * `position:fixed` imbriqué, confinant l'overlay à la boîte de cet ancêtre au lieu
   * de couvrir le viewport (bug déjà rencontré une fois pour le drawer de Signalement,
   * alors corrigé au cas par cas en neutralisant l'ancêtre coupable). Plutôt que de
   * traquer chaque ancêtre potentiellement fautif dans chacun des 3 contextes
   * d'utilisation, on déplace directement l'hôte du composant dans <body> : son seul
   * ancêtre devient alors <html>, qui n'a jamais ce genre de propriété.
   */
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

  // Getter indispensable : le template lit `planningId` (*ngIf="planningId") pour
  // afficher l'overlay — un @Input() en set seul (sans get) renvoie toujours
  // `undefined` à la lecture, l'overlay ne s'affichait donc jamais malgré un
  // chargement interne réussi (bug réel corrigé ici, pas juste théorique).
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
    // Retire le nœud déplacé dans <body> (ngAfterViewInit) — sinon il resterait
    // orphelin dans le DOM après la destruction du composant (ex. changement de page).
    this.elRef.nativeElement.remove();
  }
}
