import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy',
  imports: [CommonModule],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css'
})
export class Privacy {
  lastUpdated = new Date();
}