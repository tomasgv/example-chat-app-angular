import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
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
export class ChatWindowComponent implements OnInit, OnDestroy {
  // Signals for modern, type-safe reactive state
  messages = signal<Message[]>([]);
  currentUser = signal<User | null>(null);
  newMessage = signal('');
  currentRoom = signal<ChatRoom | null>(null);
  isSending = signal(false);

  // Subject for cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private chatService: ChatService,
    private messageService: MessageService,
    private authService: AuthService,
    private router: Router
  ) {
    // Auto-scroll effect when messages change
    effect(() => {
      const msgs = this.messages();
      if (msgs.length > 0) {
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);
    
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Subscribe to room changes and automatically get messages for the current room
    this.chatService.currentRoom$.pipe(
      takeUntil(this.destroy$),
      filter((r): r is ChatRoom => !!r),
      switchMap(room => {
        this.currentRoom.set(room);
        // Subscribe to Firebase real-time updates for this room
        return this.messageService.messagesForRoom$(room.id);
      })
    ).subscribe(msgs => {
      this.messages.set(msgs);
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Optionally clean up Firebase listeners
    // this.messageService.unsubscribeFromAllRooms();
  }

  async sendMessage(): Promise<void> {
    const room = this.currentRoom();
    const messageText = this.newMessage().trim();
    const user = this.currentUser();
    
    if (!messageText || !room || !user || this.isSending()) {
      return;
    }

    this.isSending.set(true);
    
    try {
      await this.messageService.sendMessage(
        messageText,
        user.id,
        user.username,
        room.id
      );
      this.newMessage.set('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      this.isSending.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.messageService.unsubscribeFromAllRooms();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  // Handle Enter key press
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
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