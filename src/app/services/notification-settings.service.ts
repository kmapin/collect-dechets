import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationSettingsChannels {
  email: boolean;
  sms: boolean;
  app: boolean;
}

export interface NotificationSettingsData {
  agencyId?: string | null;
  channels: NotificationSettingsChannels;
  eventsEnabled: { [eventType: string]: boolean };
  smtp?: { host?: string; port?: number; secure?: boolean; user?: string; pass?: string };
  smsGatewayApiKey?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationSettingsService {
  private readonly base = `${environment.apiUrl}/notification-settings`;

  constructor(private http: HttpClient) {}

  getGlobal$(): Observable<{ success: boolean; data: NotificationSettingsData }> {
    return this.http.get<{ success: boolean; data: NotificationSettingsData }>(`${this.base}/global`);
  }

  updateGlobal$(data: Partial<NotificationSettingsData>): Observable<{ success: boolean; data: NotificationSettingsData }> {
    return this.http.put<{ success: boolean; data: NotificationSettingsData }>(`${this.base}/global`, data);
  }

  getForAgency$(agencyId: string): Observable<{ success: boolean; data: NotificationSettingsData | null }> {
    return this.http.get<{ success: boolean; data: NotificationSettingsData | null }>(`${this.base}/agency/${agencyId}`);
  }

  updateForAgency$(agencyId: string, data: Partial<NotificationSettingsData>): Observable<{ success: boolean; data: NotificationSettingsData }> {
    return this.http.put<{ success: boolean; data: NotificationSettingsData }>(`${this.base}/agency/${agencyId}`, data);
  }

  sendTestEmail$(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/test`, { email });
  }
}
