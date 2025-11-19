import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { from, Subject, takeUntil } from "rxjs";
import { ChatWindow } from "./chat-window/chat-window";
import { ConversationList } from "./conversation-list/conversation-list";
import { ChatService } from "../../services/chat.service";
import {
  Conversation,
  Message,
  User,
  TypingIndicator,
} from "../../models/chat.models";

@Component({
  selector: "app-chat",
  imports: [CommonModule, ConversationList, ChatWindow],
  templateUrl: "./chat.html",
  styleUrl: "./chat.css",
})
export class Chat implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  messages: Message[] = [];
  currentUser!: User;
  typingIndicators: TypingIndicator[] = [];
  isMobileView = false;

  private destroy$ = new Subject<void>();
  private typingTimeout: any;

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.currentUser = this.chatService.getCurrentUser();
    this.checkMobileView();
    window.addEventListener("resize", () => this.checkMobileView());

    this.chatService.conversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversations) => {
        this.conversations = conversations;
      });

    this.chatService.selectedConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe((conversation) => {
        this.selectedConversation = conversation;
      });

    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((messages) => {
        this.messages = messages;
      });

    this.chatService.typingIndicators$
      .pipe(takeUntil(this.destroy$))
      .subscribe((indicators) => {
        this.typingIndicators = indicators;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  private checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
  }

  onConversationSelect(conversation: Conversation): void {
    this.chatService.selectConversation(conversation);
  }

  onSendMessage(content: string): void {
    this.chatService.sendMessage(content);

    if (this.selectedConversation) {
      const otherParticipant = this.selectedConversation.participants.find(
        (p) => p.id !== this.currentUser.id
      );
      if (otherParticipant) {
        this.chatService.simulateTyping(
          this.selectedConversation.id,
          otherParticipant.id
        );
      }
    }
  }

  onTyping(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  onSearch(query: string): void {
    this.chatService.searchConversations(query);
  }

  goBack(): void {
    this.selectedConversation = null;
  }
}
