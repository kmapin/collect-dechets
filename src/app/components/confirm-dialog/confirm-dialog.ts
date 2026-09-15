import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConfirmDialogService, ConfirmRequest } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [FormsModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog implements OnInit, OnDestroy {
  request: ConfirmRequest | null = null;
  inputValue = '';
  private subscription?: Subscription;

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    this.subscription = this.confirmDialogService.request$.subscribe((request) => {
      this.request = request;
      this.inputValue = request?.inputField?.initialValue ?? '';
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get canConfirm(): boolean {
    if (!this.request?.inputField?.required) return true;
    return this.inputValue.trim().length > 0;
  }

  onConfirmClick(): void {
    if (!this.canConfirm) return;
    if (this.request?.inputField) {
      this.confirmDialogService.resolveInput(this.inputValue.trim());
    } else {
      this.confirmDialogService.resolve(true);
    }
  }

  onCancelClick(): void {
    if (this.request?.inputField) {
      this.confirmDialogService.resolveInput(null);
    } else {
      this.confirmDialogService.resolve(false);
    }
  }
}
