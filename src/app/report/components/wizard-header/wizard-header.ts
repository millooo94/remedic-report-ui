import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'wizard-header',
  imports: [CommonModule],
  templateUrl: './wizard-header.html',
  styleUrl: './wizard-header.css',
})
export class WizardHeader {
  @Input({ required: true }) steps!: readonly { key: string; title: string }[];
  @Input({ required: true }) step!: number;
  @Input({ required: true }) pct!: number;
  @Input() showResumeButton = false;

  @Output() goTo = new EventEmitter<number>();
  @Output() resumeDraft = new EventEmitter<void>();
}
