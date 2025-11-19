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
    return this.http.post<Message>(`${environment.apiUrl}/messages/send`, message);
  }

  getMessagesForUser(userId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/messages/groups/${userId}`);
  }
  getMessagesForAgencyOrUser(userId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiUrl}/messages/${userId}/all`);
  }
  getUserUnreadMessagesCount(userId: string): Observable<number> {
    return this.http.get<number>(`${environment.apiUrl}/messages/unread-count/${userId}`);
  }

  markMessagesAsRead(messageId: string): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/messages/markAsRead/${messageId}`, {});
  }


  deleteMessage(messageId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/messages/${messageId}/delete`);
  }
}
