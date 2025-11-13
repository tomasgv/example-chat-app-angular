import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat';
import { MessageService } from '../../services/message';
import { ChatRoom } from '../../models/chat-room.model';

@Component({
  selector: 'app-chat-room-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-room-list.html',
  styleUrl: './chat-room-list.css'
})
export class ChatRoomListComponent implements OnInit {
  rooms: ChatRoom[] = [];
  currentRoom: ChatRoom | null = null;

  constructor(
    private chatService: ChatService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.rooms = this.chatService.getRooms();
    this.chatService.currentRoom$.subscribe(room => {
      this.currentRoom = room;
    });
    
    // Set default room
    if (this.rooms.length > 0 && !this.currentRoom) {
      this.selectRoom(this.rooms[0]);
    }
  }

  selectRoom(room: ChatRoom): void {
    this.chatService.setCurrentRoom(room);
    this.messageService.messagesForRoom$(room.id);
  }
}