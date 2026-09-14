import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfirmDialogService, ConfirmRequest } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog implements OnInit, OnDestroy {
  request: ConfirmRequest | null = null;
  private subscription?: Subscription;

  constructor(private confirmDialogService: ConfirmDialogService) {}

  ngOnInit(): void {
    this.subscription = this.confirmDialogService.request$.subscribe((request) => {
      this.request = request;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onConfirmClick(): void {
    this.confirmDialogService.resolve(true);
  }

  onCancelClick(): void {
    this.confirmDialogService.resolve(false);
  }
}
