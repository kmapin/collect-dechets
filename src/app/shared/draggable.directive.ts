import { Directive, ElementRef, HostListener, OnDestroy } from '@angular/core';

/**
 * Rend un élément `position: fixed` déplaçable à la souris ou au toucher.
 * L'élément doit déjà être en `position: fixed` (via CSS).
 * Usage : <div appDraggable> … </div>
 */
@Directive({
  selector: '[appDraggable]',
  standalone: true,
})
export class DraggableDirective implements OnDestroy {
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private originLeft = 0;
  private originTop = 0;

  private readonly onMouseMove = (e: MouseEvent) => this.move(e.clientX, e.clientY);
  private readonly onMouseUp   = () => this.stop();
  private readonly onTouchMove = (e: TouchEvent) => { e.preventDefault(); this.move(e.touches[0].clientX, e.touches[0].clientY); };
  private readonly onTouchEnd  = () => this.stop();

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    // Ignorer les clics sur les boutons enfants
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    this.start(e.clientX, e.clientY);
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent): void {
    if ((e.target as HTMLElement).closest('button')) return;
    this.start(e.touches[0].clientX, e.touches[0].clientY);
  }

  private start(clientX: number, clientY: number): void {
    const rect = this.el.nativeElement.getBoundingClientRect();

    // Fixer la position courante en left/top absolus (retire le transform centré)
    const el = this.el.nativeElement;
    el.style.left      = `${rect.left}px`;
    el.style.top       = `${rect.top}px`;
    el.style.bottom    = 'auto';
    el.style.transform = 'none';

    this.originLeft = rect.left;
    this.originTop  = rect.top;
    this.startX     = clientX;
    this.startY     = clientY;
    this.dragging   = true;

    el.style.cursor = 'grabbing';
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup',   this.onMouseUp);
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend',  this.onTouchEnd);
  }

  private move(clientX: number, clientY: number): void {
    if (!this.dragging) return;
    const el    = this.el.nativeElement;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    const w     = el.offsetWidth;
    const h     = el.offsetHeight;
    const margin = 8;

    const rawLeft = this.originLeft + (clientX - this.startX);
    const rawTop  = this.originTop  + (clientY - this.startY);

    const left = Math.max(margin, Math.min(rawLeft, vw - w - margin));
    const top  = Math.max(margin, Math.min(rawTop,  vh - h - margin));

    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
  }

  private stop(): void {
    this.dragging = false;
    this.el.nativeElement.style.cursor = 'grab';
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup',   this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend',  this.onTouchEnd);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
