import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat';
import { ChatRoom } from '../models/chat-room.model';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get current room and return rooms list', () => {
    const rooms = service.getRooms();
    expect(Array.isArray(rooms)).toBeTrue();
    expect(rooms.length).toBeGreaterThan(0);

    const room: ChatRoom = rooms[0];
    let observedRoom: any = null;
    const sub = service.currentRoom$.subscribe(r => observedRoom = r);

    service.setCurrentRoom(room);
    expect(service.getCurrentRoom()).toEqual(room);
    expect(observedRoom).not.toBeNull();
    expect(observedRoom).toEqual(room);

    sub.unsubscribe();
  });
});
