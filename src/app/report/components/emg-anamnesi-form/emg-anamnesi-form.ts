import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  EMG_CHECKLIST_ITEMS,
  EmgChecklistItem,
  EmgChecklistKey,
} from '../../config/emg-checklist.config';

@Component({
  selector: 'emg-anamnesi-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './emg-anamnesi-form.html',
  styleUrl: './emg-anamnesi-form.css',
})
export class EmgAnamnesiForm {
  @Input({ required: true }) control!: (path: string) => FormControl;
  @Input() readonlyMode = false;

  readonly checklistItems = EMG_CHECKLIST_ITEMS;

  checklistOutcomeControl(key: EmgChecklistKey): FormControl {
    return this.control(`emg.checklistNeuropatie.${key}.esito`);
  }

  checklistNoteControl(key: EmgChecklistKey): FormControl {
    return this.control(`emg.checklistNeuropatie.${key}.note`);
  }

  checklistOutcomeValue(key: EmgChecklistKey): 'si' | 'no' | null {
    return this.checklistOutcomeControl(key).value ?? null;
  }

  checklistOutcomeHasRequiredError(key: EmgChecklistKey): boolean {
    const control = this.checklistOutcomeControl(key);
    return !!(control.touched && control.hasError('required'));
  }

  get checklistHasMissingAnswers(): boolean {
    return this.checklistItems.some((item: EmgChecklistItem) =>
      this.checklistOutcomeHasRequiredError(item.key),
    );
  }

  setEmgChecklistEsito(
    key: EmgChecklistKey,
    value: 'si' | 'no' | null,
  ): void {
    if (this.readonlyMode) {
      return;
    }

    const control = this.checklistOutcomeControl(key);
    control.setValue(value);
    control.markAsDirty();
    control.markAsTouched();
  }

  isChecklistOutcomeSelected(key: EmgChecklistKey, value: 'si' | 'no'): boolean {
    return this.checklistOutcomeValue(key) === value;
  }
}
