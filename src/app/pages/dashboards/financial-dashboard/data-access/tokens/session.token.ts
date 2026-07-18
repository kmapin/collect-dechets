import { InjectionToken } from '@angular/core';
import { SessionService } from '../contracts/session.service';

export const SESSION_SERVICE = new InjectionToken<SessionService>('SESSION_SERVICE');
