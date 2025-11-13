import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    // ensure localStorage is clean for tests
    localStorage.removeItem('currentUser');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and logout correctly', () => {
    service.login('testuser');
    const current = service.getCurrentUser();
    expect(current).not.toBeNull();
    expect(current!.username).toBe('testuser');

    service.logout();
    expect(service.getCurrentUser()).toBeNull();
  });
});
