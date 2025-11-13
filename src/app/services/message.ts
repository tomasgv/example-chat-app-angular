import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Message } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  // Keep the full list for simple in-memory storage (could be replaced by a backend)
  private messages: Message[] = [];

  // Room-scoped subjects so multiple subscribers can listen to a room's messages
  private roomSubjects = new Map<string, BehaviorSubject<Message[]>>();
  
  // Key for localStorage to broadcast messages across browser sessions
  private readonly MESSAGES_STORAGE_KEY = 'chat_app_messages';

  constructor(private ngZone: NgZone) {
    // Listen for messages from other browser tabs/windows via localStorage events
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === this.MESSAGES_STORAGE_KEY && event.newValue) {
          this.ngZone.run(() => {
            this.handleRemoteMessages(JSON.parse(event.newValue || ""));
          });
        }
      });
    });
  }

  /**
   * Returns an observable of messages for the given room. The subject is created
   * lazily and seeded with any existing messages for that room.
   */
  messagesForRoom$(roomId: string): Observable<Message[]> {
    if (!this.roomSubjects.has(roomId)) {
      const roomMessages = this.messages.filter(m => m.roomId === roomId);
      this.roomSubjects.set(roomId, new BehaviorSubject<Message[]>(roomMessages));
    }
    return this.roomSubjects.get(roomId)!.asObservable();
  }

  sendMessage(text: string, userId: string, username: string, roomId: string): void {
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2, 11);

    const message: Message = {
      id,
      text,
      userId,
      username,
      timestamp: new Date(),
      roomId
    };

    this.messages.push(message);

    // Push update to the corresponding room subject so subscribers see it live
    if (!this.roomSubjects.has(roomId)) {
      this.roomSubjects.set(roomId, new BehaviorSubject<Message[]>([message]));
    } else {
      const subj = this.roomSubjects.get(roomId)!;
      subj.next([...subj.value, message]);
    }

    // Broadcast to other browser sessions via localStorage
    this.broadcastMessageToOtherSessions(message);
  }

  /**
   * Broadcast message to other browser sessions using localStorage events.
   * This simulates a real-time server push for development/testing.
   */
  private broadcastMessageToOtherSessions(message: Message): void {
    try {
      localStorage.setItem(
        this.MESSAGES_STORAGE_KEY,
        JSON.stringify([...this.messages])
      );
    } catch (e) {
      console.warn('Failed to broadcast message via localStorage:', e);
    }
  }

  /**
   * Handle incoming messages from other browser sessions.
   * Merges remote messages and updates the corresponding room subjects.
   */
  private handleRemoteMessages(remoteMessages: Message[]): void {
    // Find new messages not yet in our local list
    const newMessages = remoteMessages.filter(
      rm => !this.messages.find(m => m.id === rm.id)
    );

    if (newMessages.length === 0) return;

    // Add new messages to our local storage
    this.messages.push(...newMessages);

    // Update room subjects with the new messages
    newMessages.forEach(msg => {
      if (this.roomSubjects.has(msg.roomId)) {
        const subj = this.roomSubjects.get(msg.roomId)!;
        subj.next([...subj.value, msg]);
      }
    });
  }
}