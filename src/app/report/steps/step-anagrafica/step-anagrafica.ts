import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ReportDraftStatus } from '../../models/report-draft';
import { ReportType } from '../../types/report-type';

@Component({
  selector: 'step-anagrafica',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-anagrafica.html',
  styleUrl: './step-anagrafica.css',
})
export class StepAnagrafica {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) control!: (path: string) => FormControl;
  @Input({ required: true }) hasError!: (
    path: string,
    error: string,
  ) => boolean;
  @Input({ required: true }) reportType!: ReportType;
  @Input() currentDraftStatus: ReportDraftStatus | null = null;
  @Input() draftSaving = false;
  @Input() readonlyMode = false;
  @Output() openPsgAnamnesis = new EventEmitter<void>();
  @Output() openEmgAnamnesis = new EventEmitter<void>();

  get showPsgCard(): boolean {
    return this.reportType === 'psg';
  }

  get showEmgCard(): boolean {
    return this.reportType === 'emg';
  }

  get psgStatusLabel(): string {
    if (this.currentDraftStatus === 'anamnesi_raccolta') {
      return 'Anamnesi salvata';
    }

    if (this.currentDraftStatus === 'in_refertazione') {
      return 'Referto in lavorazione';
    }

    if (this.currentDraftStatus === 'in_attesa_neurologo') {
      return 'In attesa refertatore';
    }

    if (this.currentDraftStatus === 'in_refertazione_neurologo') {
      return 'Refertazione in corso';
    }

    if (this.currentDraftStatus === 'completato') {
      return 'Referto completato';
    }

    return 'Anamnesi da compilare';
  }

  get emgStatusLabel(): string {
    if (this.currentDraftStatus === 'anamnesi_raccolta') {
      return 'Anamnesi EMG salvata';
    }

    if (this.currentDraftStatus === 'in_refertazione') {
      return 'Referto in lavorazione';
    }

    if (this.currentDraftStatus === 'in_attesa_neurologo') {
      return 'In attesa refertatore';
    }

    if (this.currentDraftStatus === 'in_refertazione_neurologo') {
      return 'Refertazione in corso';
    }

    if (this.currentDraftStatus === 'completato') {
      return 'Referto completato';
    }

    return 'Checklist da compilare';
  }

  onBirthDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    const displayControl = this.control('anagrafica.dataNascitaDisplay');
    const realControl = this.control('anagrafica.dataNascita');

    const digits = input.value.replace(/\D/g, '').slice(0, 8);

    let day = digits.slice(0, 2);
    let month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    if (day.length === 2) {
      let dayNum = Number(day);
      if (dayNum < 1) dayNum = 1;
      if (dayNum > 31) dayNum = 31;
      day = String(dayNum).padStart(2, '0');
    }

    if (month.length === 2) {
      let monthNum = Number(month);
      if (monthNum < 1) monthNum = 1;
      if (monthNum > 12) monthNum = 12;
      month = String(monthNum).padStart(2, '0');
    }

    let formatted = '';
    if (digits.length <= 2) {
      formatted = day;
    } else if (digits.length <= 4) {
      formatted = `${day}/${month}`;
    } else {
      formatted = `${day}/${month}/${year}`;
    }

    input.value = formatted;
    displayControl.setValue(formatted, { emitEvent: false });

    this.clearDateErrors(displayControl);
    realControl.setValue('', { emitEvent: false });

    if (formatted.length === 10) {
      const isoValue = this.validateAndConvertToIso(formatted, displayControl);
      if (isoValue) {
        realControl.setValue(isoValue, { emitEvent: false });
      }
    }
  }

  onBirthDateKeydown(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End',
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    const isNumber = /^[0-9]$/.test(event.key);
    if (!isNumber) {
      event.preventDefault();
    }
  }

  onBirthDateBlur(): void {
    const displayControl = this.control('anagrafica.dataNascitaDisplay');
    const realControl = this.control('anagrafica.dataNascita');
    const value = (displayControl.value ?? '').toString().trim();

    if (!value) {
      this.clearDateErrors(displayControl);
      realControl.setValue('', { emitEvent: false });
      displayControl.markAsTouched();
      return;
    }

    if (value.length !== 10) {
      this.setDateError(displayControl, 'invalidDate', true);
      realControl.setValue('', { emitEvent: false });
      displayControl.markAsTouched();
      return;
    }

    const isoValue = this.validateAndConvertToIso(value, displayControl);

    if (isoValue) {
      realControl.setValue(isoValue, { emitEvent: false });
    } else {
      realControl.setValue('', { emitEvent: false });
    }

    displayControl.markAsTouched();
  }

  private validateAndConvertToIso(
    value: string,
    control: FormControl,
  ): string | null {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!match) {
      this.setDateError(control, 'invalidDate', true);
      return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    if (year < 1900 || year > new Date().getFullYear()) {
      this.setDateError(control, 'invalidDate', true);
      return null;
    }

    const date = new Date(year, month - 1, day);

    const isSameDate =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    if (!isSameDate) {
      this.setDateError(control, 'invalidDate', true);
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date > today) {
      this.setDateError(control, 'futureDate', true);
      return null;
    }

    this.clearDateErrors(control);

    const isoDay = String(day).padStart(2, '0');
    const isoMonth = String(month).padStart(2, '0');

    return `${year}-${isoMonth}-${isoDay}`;
  }

  private setDateError(
    control: FormControl,
    key: 'invalidDate' | 'futureDate',
    value: true,
  ): void {
    const currentErrors = control.errors ?? {};
    const nextErrors = {
      ...currentErrors,
      invalidDate: null,
      futureDate: null,
      [key]: value,
    };

    Object.keys(nextErrors).forEach((errorKey) => {
      if (nextErrors[errorKey] === null) {
        delete nextErrors[errorKey];
      }
    });

    control.setErrors(Object.keys(nextErrors).length ? nextErrors : null);
  }

  private clearDateErrors(control: FormControl): void {
    if (!control.errors) return;

    const nextErrors = { ...control.errors };
    delete nextErrors['invalidDate'];
    delete nextErrors['futureDate'];

    control.setErrors(Object.keys(nextErrors).length ? nextErrors : null);
  }

  onCodiceFiscaleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const control = this.control('anagrafica.codiceFiscale');

    const value = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 16);

    input.value = value;
    control.setValue(value, { emitEvent: false });
  }
}
