import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs/operators';
import { ChatService } from '../../services/chat';
import { MessageService } from '../../services/message';
import { AuthService } from '../../services/auth';
import { ChatRoomListComponent } from '../chat-room-list/chat-room-list';
import { MessageComponent } from '../message/message';
import { Message } from '../../models/message.model';
import { ChatRoom } from '../../models/chat-room.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatRoomListComponent, MessageComponent],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.css'
})
export class ChatWindowComponent implements OnInit {
  // Convert observables to signals for modern, type-safe template binding
  messages = signal<Message[]>([]);
  currentUser = signal<User | null>(null);
  newMessage = signal('');
  currentRoom = signal<ChatRoom | null>(null);

  constructor(
    private chatService: ChatService,
    private messageService: MessageService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Subscribe to room changes and derive messages
    this.chatService.currentRoom$.pipe(
      filter((r): r is ChatRoom => !!r),
      switchMap(room => {
        this.currentRoom.set(room);
        return this.messageService.messagesForRoom$(room.id);
      })
    ).subscribe(msgs => {
      this.messages.set(msgs);
      setTimeout(() => this.scrollToBottom(), 0);
    });
  }

  sendMessage(): void {
    const room = this.chatService.getCurrentRoom();
    const messageText = this.newMessage().trim();
    const user = this.currentUser();
    if (messageText && room && user) {
      this.messageService.sendMessage(
        messageText,
        user.id,
        user.username,
        room.id
      );
      this.newMessage.set('');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // trackBy for ngFor to improve rendering performance
  trackById(_: number, item: Message): string {
    return item.id;
  }

  private scrollToBottom(): void {
    const element = document.getElementById('messages-container');
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }
}