import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { NotificationComponent } from './components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    NotificationComponent
  ],
  template: `
    <div class="app">
      <app-header></app-header>
      <main class="main-content" style="width: 100%;">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
      <app-notification></app-notification>
    </div>
  `,
  styles: [`
    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      width: 100%;
      margin: 0 auto;
    }

    .main-content {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AppComponent {
  title = 'WasteManager';
}