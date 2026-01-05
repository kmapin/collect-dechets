import { Component, Input } from "@angular/core";

import { Message, User } from "./../../../models/chat.models";

@Component({
  selector: "app-message-bubble",
  imports: [],
  templateUrl: "./message-bubble.html",
  styleUrl: "./message-bubble.css",
})
export class MessageBubble {
  @Input() message!: Message;
  @Input() currentUser!: User;

  get isOwnMessage(): boolean {
    return this.message.sender_id === this.currentUser?.id;
  }

  formatTime(date: Date): string {
    const messageDate = new Date(date);
    const hours = messageDate.getHours();
    const minutes = messageDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }
}
