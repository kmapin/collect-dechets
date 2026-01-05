import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MessageBubble } from '../message-bubble/message-bubble';
import { Conversation, Message, User, TypingIndicator } from './../../../models/chat.models';
@Component({
  selector: 'app-chat-window',
  imports: [FormsModule, MessageBubble],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.css'
})
export class ChatWindow  implements OnChanges, AfterViewChecked {
  @Input() conversation: Conversation | null = null;
  @Input() messages: Message[] = [];
  @Input() currentUser!: User;
  @Input() typingIndicators: TypingIndicator[] = [];
  @Output() sendMessage = new EventEmitter<string>();
  @Output() typing = new EventEmitter<void>();

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  messageText = '';
  otherParticipant: User | undefined;
  groupedMessages: { date: string; messages: Message[] }[] = [];
  typingIndicator: TypingIndicator | null = null;
  private shouldScrollToBottom = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation'] && this.conversation) {
      this.otherParticipant = this.conversation.participants.find(
        p => p.id !== this.currentUser?.id
      );
      this.shouldScrollToBottom = true;
    }

    if (changes['messages']) {
      this.groupedMessages = this.groupMessagesByDate(this.messages);
      this.shouldScrollToBottom = true;
    }

    if (changes['typingIndicators']) {
      this.typingIndicator = this.typingIndicators.find(
        t => t.conversation_id === this.conversation?.id && t.user_id !== this.currentUser?.id
      ) || null;
      if (this.typingIndicator) {
        this.shouldScrollToBottom = true;
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  private groupMessagesByDate(messages: Message[]): { date: string; messages: Message[] }[] {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach(message => {
      const dateKey = this.getDateKey(message.created_at);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return Object.keys(groups).map(dateKey => ({
      date: this.formatDateDivider(dateKey),
      messages: groups[dateKey]
    }));
  }

  private getDateKey(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private formatDateDivider(dateKey: string): string {
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month, day);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return 'Today';
    } else if (this.isSameDay(date, yesterday)) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  onSendMessage(): void {
    if (this.messageText.trim()) {
      this.sendMessage.emit(this.messageText.trim());
      this.messageText = '';
    }
  }

  onTyping(): void {
    this.typing.emit();
  }
}
