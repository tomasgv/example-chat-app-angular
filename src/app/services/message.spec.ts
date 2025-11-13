import { TestBed } from '@angular/core/testing';
import { MessageService } from './message';
import { Message } from '../models/message.model';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return messages for a room and update when sendMessage is called', () => {
    const roomId = 'room-1';

    // Initially empty
    let last: Message[] | undefined;
    const sub = service.messagesForRoom$(roomId).subscribe(m => last = m);
    expect(last).toBeDefined();
    expect(last!.length).toBe(0);

    // Send a message and expect the room observable to update
    service.sendMessage('hello', 'u1', 'Alice', roomId);
    expect(last!.length).toBe(1);
    expect(last![0].text).toBe('hello');

    // Send another message to same room
    service.sendMessage('hi again', 'u2', 'Bob', roomId);
    expect(last!.length).toBe(2);
    expect(last![1].username).toBe('Bob');

    sub.unsubscribe();
  });
});
