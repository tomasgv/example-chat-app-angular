import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  login(username: string): void {
    // Use crypto.randomUUID() when available (modern browsers). Fallback to
    // a non-deprecated string method using slice on the base36 random value.
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2, 11);

    const user: User = {
      id,
      username
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}