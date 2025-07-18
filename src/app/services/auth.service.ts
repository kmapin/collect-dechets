import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { User, UserRole } from '../models/user.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check for stored user on service initialization
    // const storedUser = localStorage.getItem('currentUser');
    // if (storedUser) {
    //   this.currentUserSubject.next(JSON.parse(storedUser));
    //   this.isAuthenticatedSubject.next(true);
    // }
  }

  login(email: string, password: string): Observable<{ success: boolean; user?: User; error?: string }> {
    // Simulate API call
    return of({ success: true, user: this.mockUser(email) }).pipe(
      delay(1000),
      map(response => {
        if (response.success && response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        }
        return response;
      })
    );
  }
  //Login add
  loginUser(email: string, password: string): Observable<any> {
    return this.http.post(`https://projectwise.onrender.com/api/auth/login`, { email, password }).pipe(
      map((response: any) => {
        if (response.userId) {
          localStorage.setItem('currentUser', JSON.stringify(response));
          // this.currentUserSubject.next(response);
          // this.isAuthenticatedSubject.next(true);
        }
        return response;
      })
    );
  }

  register(userData: any): Observable<{ success: boolean; user?: User; error?: string }> {
    if (userData.role === 'client') {
      return this.http.post<any>(`${environment.apiUrl}/auth/register/client`, userData).pipe(
        map(response => {
          if (response && response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);
            return { success: true, user: response.user };
          } else {
            return { success: false, error: response?.error || 'Erreur lors de la création du compte' };
          }
        })
      );
    } else {
      // Simulate API call for other roles
      return of({ success: true, user: this.mockUser(userData.email) }).pipe(
        delay(1000),
        map(response => {
          if (response.success && response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);
          }
          return response;
        })
      );
    }
  }

  /**
   * Inscription d'un client via l'API réelle
   */
  registerClient(userData: any): Observable<{ success: boolean; user?: User; error?: string }> {
    return this.http.post<any>(`${environment.apiUrl}/auth/register/client`, userData).pipe(
      map(response => {
        console.log("API > ClientRegister :", response)
        if (response && response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
          return { success: true, user: response.user };
        } else {
          return { success: false, error: response?.error || 'Erreur lors de la création du compte' };
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: UserRole): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  private mockUser(email: string): User {
    // Mock user data for demonstration
    let role = UserRole.CLIENT;
    if (email.includes('agency')) role = UserRole.AGENCY;
    if (email.includes('collector')) role = UserRole.COLLECTOR;
    if (email.includes('municipality')) role = UserRole.MUNICIPALITY;

    return {
      id: Math.random().toString(36).substr(2, 9),
      email: email,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };
  }
}