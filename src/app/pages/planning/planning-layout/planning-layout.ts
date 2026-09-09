import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-planning-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './planning-layout.html',
  styleUrl: './planning-layout.scss',
})
export class PlanningLayout {}
