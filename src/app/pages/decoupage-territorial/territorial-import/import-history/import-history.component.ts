import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../../shared/decoupage-territorial/page-header.component';

@Component({
  selector: 'app-import-history',
  standalone: true,
  imports: [PageHeaderComponent],
  templateUrl: './import-history.component.html',
  styleUrl: './import-history.component.scss',
})
export class ImportHistoryComponent {}
