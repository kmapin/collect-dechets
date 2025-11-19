import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation, User } from '../../../models/chat.models';
@Component({
  selector: 'app-conversation-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-list.html',
  styleUrl: './conversation-list.css'
})
export class ConversationList {
  @Input() conversations: Conversation[] = [];
  @Input() selectedConversation: Conversation | null = null;
  @Input() currentUser!: User;
  @Output() conversationSelected = new EventEmitter<Conversation>();
  @Output() search = new EventEmitter<string>();

  searchQuery = '';

  onConversationSelect(conversation: Conversation): void {
    this.conversationSelected.emit(conversation);
  }

  onSearch(): void {
    this.search.emit(this.searchQuery);
  }

  getOtherParticipant(conversation: Conversation): User | undefined {
    return conversation.participants.find(p => p.id !== this.currentUser?.id);
  }

  getRoleBadgeClass(role?: string): string {
    return role || '';
  }

  formatTime(date?: Date): string {
    if (!date) return '';

    const now = new Date();
    const messageDate = new Date(date);
    const diffInMs = now.getTime() - messageDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return messageDate.toLocaleDateString();
  }
}
