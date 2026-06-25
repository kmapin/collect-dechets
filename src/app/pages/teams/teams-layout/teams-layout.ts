import { Component, signal, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AppSidebarComponent } from '../../../shared/app-sidebar/app-sidebar';

@Component({
  selector: 'app-teams-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, AppSidebarComponent],
  templateUrl: './teams-layout.html',
  styleUrl: './teams-layout.scss',
})
export class TeamsLayout {
  sidebarCollapsed = signal(false);
  isMobile = signal(window.innerWidth < 1024);

  @HostListener('window:resize')
  onResize(): void { this.isMobile.set(window.innerWidth < 1024); }
}
