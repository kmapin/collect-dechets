import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.css'
})
export class LoadingSpinnerComponent {
  @Input() message: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() fullscreen: boolean = false;
}