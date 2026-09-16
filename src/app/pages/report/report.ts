import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';

// Phase 10 (audit multi-lieux) — page non fonctionnelle : onSubmit() n'appelle aucune API
// (jamais branchée sur POST /api/signalement, qui exige de toute façon une authentification
// que cette page publique ne vérifie pas). Le lien "Signaler un problème" a été retiré du
// footer public (footer.html) pour ne plus exposer cette fausse fonctionnalité ; la route
// /report reste techniquement accessible par URL directe.
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