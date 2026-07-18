import { InjectionToken } from '@angular/core';
import { AgentDataService } from '../contracts/agent-data.service';

export const AGENT_DATA_SERVICE = new InjectionToken<AgentDataService>('AGENT_DATA_SERVICE');
