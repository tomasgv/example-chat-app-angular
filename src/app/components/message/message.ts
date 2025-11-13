import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../models/message.model';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message.html',
  styleUrl: './message.css'
})
export class MessageComponent {
  @Input() message!: Message;
  
  constructor(private authService: AuthService) {}

  get isOwnMessage(): boolean {
    const currentUser = this.authService.getCurrentUser();
    // Guard against message being undefined in tests or early render
    return currentUser?.id === this.message?.userId;
  }

  get formattedTime(): string {
    if (!this.message?.timestamp) return '';
    return new Date(this.message.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}