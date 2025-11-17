import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';
import { FirebaseService } from './firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor(private firebaseService: FirebaseService) {
    // Listen to auth state changes
    this.firebaseService.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        const savedUsername = localStorage.getItem('username');
        if (savedUsername) {
          const user: User = {
            id: firebaseUser.uid,
            username: savedUsername
          };
          this.currentUserSubject.next(user);
        }
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  async login(username: string): Promise<void> {
    try {
      const result = await this.firebaseService.signInAnonymously();
      const user: User = {
        id: result.user.uid,
        username
      };
      localStorage.setItem('username', username);
      this.currentUserSubject.next(user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.firebaseService.signOut();
      localStorage.removeItem('username');
      this.currentUserSubject.next(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}