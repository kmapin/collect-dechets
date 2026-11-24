import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Map, FileSpreadsheet, History, ScrollText } from 'lucide-angular';
import { IconComponent } from '../../../shared/decoupage-territorial/icon.component';

@Component({
  selector: 'app-decoupage-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './decoupage-layout.html',
  styleUrl: './decoupage-layout.scss',
})
export class DecoupageLayout {
 icons = { Map, FileSpreadsheet, History, ScrollText };

  navItems = [
    { path: '/territorial/units', label: 'Unités territoriales', icon: this.icons.Map, exact: false },
    { path: '/territorial/import', label: 'Importer Excel / CSV', icon: this.icons.FileSpreadsheet, exact: true },
    { path: '/territorial/import/history', label: 'Historique des imports', icon: this.icons.History, exact: false },
    { path: '/territorial/audit', label: 'Journal d\'audit', icon: this.icons.ScrollText, exact: false },
  ];
}
