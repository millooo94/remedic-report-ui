import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'reset-modal',
  imports: [CommonModule],
  templateUrl: './reset-modal.html',
  styleUrl: './reset-modal.css',
})
export class ResetModal {
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
