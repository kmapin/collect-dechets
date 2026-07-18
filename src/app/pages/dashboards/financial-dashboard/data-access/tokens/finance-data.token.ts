import { InjectionToken } from '@angular/core';
import { FinanceDataService } from '../contracts/finance-data.service';

export const FINANCE_DATA_SERVICE = new InjectionToken<FinanceDataService>('FINANCE_DATA_SERVICE');
