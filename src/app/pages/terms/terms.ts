import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms',
  imports: [CommonModule],
  templateUrl: './terms.html',
  styleUrl: './terms.css'
})
export class Terms {
  lastUpdated = new Date();
}