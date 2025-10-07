import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-report',
  imports: [CommonModule, FormsModule],
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