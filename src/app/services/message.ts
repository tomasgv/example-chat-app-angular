import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Message } from '../models/message.model';
import { FirebaseService } from './firebase';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  // Room-scoped subjects so multiple subscribers can listen to a room's messages
  private roomSubjects = new Map<string, BehaviorSubject<Message[]>>();
  
  // Track active subscriptions to Firebase for each room
  private roomUnsubscribers = new Map<string, () => void>();

  constructor(
    private firebaseService: FirebaseService,
    private ngZone: NgZone
  ) {}

  /**
   * Returns an observable of messages for the given room.
   * Automatically subscribes to Firebase real-time updates for that room.
   */
  messagesForRoom$(roomId: string): Observable<Message[]> {
    if (!this.roomSubjects.has(roomId)) {
      // Create a new subject for this room
      this.roomSubjects.set(roomId, new BehaviorSubject<Message[]>([]));
      
      // Subscribe to Firebase real-time updates for this room
      this.subscribeToRoom(roomId);
    }
    return this.roomSubjects.get(roomId)!.asObservable();
  }

  /**
   * Subscribe to Firebase real-time updates for a specific room.
   */
  private subscribeToRoom(roomId: string): void {
    // Don't subscribe twice to the same room
    if (this.roomUnsubscribers.has(roomId)) {
      return;
    }

    const unsubscribe = this.firebaseService.subscribeToMessages(
      roomId,
      (messages) => {
        // Run inside Angular zone to trigger change detection
        this.ngZone.run(() => {
          const typedMessages: Message[] = messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            userId: msg.userId,
            username: msg.username,
            roomId: msg.roomId,
            timestamp: msg.timestamp || new Date()
          }));

          // Update the subject for this room
          const subject = this.roomSubjects.get(roomId);
          if (subject) {
            subject.next(typedMessages);
          }
        });
      }
    );

    // Store the unsubscribe function
    this.roomUnsubscribers.set(roomId, unsubscribe);
  }

  /**
   * Send a message to Firebase.
   */
  async sendMessage(text: string, userId: string, username: string, roomId: string): Promise<void> {
    try {
      await this.firebaseService.addMessage({
        text,
        userId,
        username,
        roomId
      });
      // Firebase real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a specific room's Firebase updates.
   * Useful for cleanup when switching rooms or component destruction.
   */
  unsubscribeFromRoom(roomId: string): void {
    const unsubscribe = this.roomUnsubscribers.get(roomId);
    if (unsubscribe) {
      unsubscribe();
      this.roomUnsubscribers.delete(roomId);
    }

    // Optionally clear the subject
    const subject = this.roomSubjects.get(roomId);
    if (subject) {
      subject.complete();
      this.roomSubjects.delete(roomId);
    }
  }

  /**
   * Unsubscribe from all rooms.
   * Call this when the user logs out or the app is destroyed.
   */
  unsubscribeFromAllRooms(): void {
    this.roomUnsubscribers.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.roomUnsubscribers.clear();

    this.roomSubjects.forEach((subject) => {
      subject.complete();
    });
    this.roomSubjects.clear();
  }
}