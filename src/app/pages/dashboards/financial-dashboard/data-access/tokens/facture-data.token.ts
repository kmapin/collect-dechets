import { InjectionToken } from '@angular/core';
import { FactureDataService } from '../contracts/facture-data.service';

export const FACTURE_DATA_SERVICE = new InjectionToken<FactureDataService>('FACTURE_DATA_SERVICE');
