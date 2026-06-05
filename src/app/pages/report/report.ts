import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report',
  imports: [FormsModule],
  templateUrl: './report.html',
  styleUrl: './report.css'
})
export class Report {
  reportData = {
    type: '',
    description: '',
    date: ''
  };

  onSubmit(): void {
    console.log('Report submitted:', this.reportData);
    // Handle report submission
  }
}