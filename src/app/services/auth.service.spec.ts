import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { Webstockets } from '../core/services/webstockets';
import { RegisterUserData, UserRole } from '../models/user.model';

describe('AuthService registration address validation', () => {
  let service: AuthService;
  let http: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    localStorage.removeItem('currentUser');
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);
    http.post.and.returnValue(of({ success: true, user: {} }));
    const websocket = jasmine.createSpyObj<Webstockets>('Webstockets', ['onNewNotification']);
    websocket.onNewNotification.and.returnValue(of());
    service = new AuthService(http, websocket);
  });

  afterEach(() => localStorage.removeItem('currentUser'));

  it('accepte une adresse qui ne possède que la ville quand elle n’a pas de subdivisions', () => {
    const registration: RegisterUserData = {
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'personne@example.com',
      password: 'motdepasse123',
      role: UserRole.CLIENT,
      phone: '70000000',
      address: {
        city: 'Ville sans subdivision',
        arrondissement: '',
        sector: '',
        neighborhood: '',
      },
      acceptTerms: true,
      receiveOffers: false,
    };

    service.register(registration).subscribe((response) => {
      expect(response.success).toBe(true);
    });

    expect(http.post).toHaveBeenCalled();
  });
});
