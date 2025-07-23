import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Admin {

  constructor(private http: HttpClient) {}

  getAllStatistics() {
    return this.http.get(`${environment.apiUrl}/auth/statistics`).pipe(
      map((response: any) =>{
        console.log('API > getAllStatistics:', response);
        return response;
      })
    );

  }
}
