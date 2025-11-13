import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ChatRoom } from '../models/chat-room.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private rooms: ChatRoom[] = [
    { id: '1', name: 'General', description: 'General discussion' },
    { id: '2', name: 'Random', description: 'Random topics' },
    { id: '3', name: 'Tech', description: 'Technology discussion' }
  ];

  private currentRoomSubject = new BehaviorSubject<ChatRoom | null>(null);
  public currentRoom$: Observable<ChatRoom | null> = this.currentRoomSubject.asObservable();

  getRooms(): ChatRoom[] {
    return this.rooms;
  }

  setCurrentRoom(room: ChatRoom): void {
    this.currentRoomSubject.next(room);
  }

  getCurrentRoom(): ChatRoom | null {
    return this.currentRoomSubject.value;
  }
}