import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

// Type structurel identique à LucideIconData (non exporté à la racine du paquet)
type IconNode = readonly [string, Record<string, string | number>];
export type IconInput = readonly IconNode[];

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [LucideAngularModule],
  template: `<lucide-icon [img]="icon" [size]="size" [strokeWidth]="1.75"></lucide-icon>`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        line-height: 1;
        flex-shrink: 0;
      }
    `,
  ],
})
export class IconComponent {
  @Input() icon!: IconInput;
  @Input() size = 16;
}
