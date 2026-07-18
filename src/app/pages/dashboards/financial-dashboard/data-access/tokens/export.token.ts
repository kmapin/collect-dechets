import { InjectionToken } from '@angular/core';
import { ExportService } from '../contracts/export.service';

export const EXPORT_SERVICE = new InjectionToken<ExportService>('EXPORT_SERVICE');
