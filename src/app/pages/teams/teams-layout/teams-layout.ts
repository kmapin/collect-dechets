import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-teams-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './teams-layout.html',
  styleUrl: './teams-layout.scss',
})
export class TeamsLayout {}
