import { Component, signal, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AppSidebarComponent } from '../../../shared/app-sidebar/app-sidebar';

@Component({
  selector: 'app-planning-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MatIconModule, AppSidebarComponent],
  templateUrl: './planning-layout.html',
  styleUrl: './planning-layout.scss',
})
export class PlanningLayout {
  sidebarCollapsed = signal(false);
  isMobile = signal(window.innerWidth < 1024);

  @HostListener('window:resize')
  onResize() { this.isMobile.set(window.innerWidth < 1024); }
}
