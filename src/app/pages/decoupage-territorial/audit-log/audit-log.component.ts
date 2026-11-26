import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/decoupage-territorial/page-header.component';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss',
})
export class AuditLogComponent {
}
