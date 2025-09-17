import { Injectable } from '@angular/core';
import { Message } from '../models/message.model';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  

 
  constructor(
    private http: HttpClient
  ) { }

  sendMessage(message: Message): Observable<Message> {
    return this.http.post<Message>(`${environment.apiUrl}/messages`, message);
  }

  getMessagesForUser(userId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/messages/user/${userId}`);
  }

  getUserUnreadMessagesCount(userId: string): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/messages/unread-count/${userId}`);
  }

  markMessagesAsRead(messageId: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/messages/${messageId}/mark-read`, {});
  }


  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/messages/${messageId}/delete`);
  }
}
