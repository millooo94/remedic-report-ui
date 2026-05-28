import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  EMG_CHECKLIST_ITEMS,
  EmgChecklistItem,
  EmgChecklistKey,
} from '../../config/emg-checklist.config';
import { ReportType } from '../../types/report-type';

type SectionKey =
  | 'anamnesiRemota'
  | 'anamnesiProssima'
  | 'portaInVisione'
  | 'esamiInLoco'
  | 'esameObiettivo'
  | 'diagnosi'
  | 'prescrizione';

@Component({
  selector: 'step-sezioni',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-sezioni.html',
  styleUrl: './step-sezioni.css',
})
export class StepSezioni {
  @Input({ required: true }) sectionKeys!: readonly SectionKey[];
  @Input({ required: true }) mandatorySections!: readonly SectionKey[];
  @Input({ required: true }) section!: (key: SectionKey) => FormControl;
  @Input({ required: true }) sectionLabel!: (key: SectionKey) => string;
  @Input({ required: true }) sectionDescription!: (key: SectionKey) => string;
  @Input({ required: true }) modeControl!: FormControl<'sezioni' | 'libero'>;
  @Input({ required: true }) control!: (path: string) => FormControl;
  @Input({ required: true }) hasError!: (
    path: string,
    error: string,
  ) => boolean;
  @Input({ required: true }) reportType!: ReportType;

  readonly checklistItems = EMG_CHECKLIST_ITEMS;

  get isPsg(): boolean {
    return this.reportType === 'psg';
  }

  mandatorySectionKeys(): SectionKey[] {
    return this.sectionKeys.filter((key) =>
      this.mandatorySections.includes(key),
    ) as SectionKey[];
  }

  optionalSectionKeys(): SectionKey[] {
    return this.sectionKeys.filter(
      (key) => !this.mandatorySections.includes(key),
    ) as SectionKey[];
  }

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
    const control = this.checklistOutcomeControl(key);
    control.setValue(value);
    control.markAsDirty();
    control.markAsTouched();
  }

  isChecklistOutcomeSelected(
    key: EmgChecklistKey,
    value: 'si' | 'no',
  ): boolean {
    return this.checklistOutcomeValue(key) === value;
  }

  clearChecklistOutcome(key: EmgChecklistKey): void {
    this.checklistOutcomeControl(key).markAsTouched();
  }
}
