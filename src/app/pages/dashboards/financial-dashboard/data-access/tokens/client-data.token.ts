import { InjectionToken } from '@angular/core';
import { ClientDataService } from '../contracts/client-data.service';

export const CLIENT_DATA_SERVICE = new InjectionToken<ClientDataService>('CLIENT_DATA_SERVICE');
