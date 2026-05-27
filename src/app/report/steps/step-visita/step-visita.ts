import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DoctorInfo } from '../../models/doctor-info';
import { DoctorAutocomplete } from '../../components/doctor-autocomplete/doctor-autocomplete';

@Component({
  selector: 'step-visita',
  imports: [CommonModule, ReactiveFormsModule, DoctorAutocomplete],
  templateUrl: './step-visita.html',
  styleUrl: './step-visita.css',
})
export class StepVisita {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) doctorSearch!: FormControl;
  @Input({ required: true }) doctorResults!: DoctorInfo[];
  @Input({ required: true }) control!: (path: string) => FormControl;
  @Input({ required: true }) hasError!: (
    path: string,
    error: string,
  ) => boolean;

  @Output() selectDoctorEvent = new EventEmitter<DoctorInfo>();
  @Output() clearDoctorEvent = new EventEmitter<void>();

  get selectedDoctorInvalid(): boolean {
    const ctrl = this.control('medico.id');
    return !!(ctrl && ctrl.touched && ctrl.hasError('required'));
  }

  onVisitDateInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const displayControl = this.control('dataVisitaDisplay');
    const realControl = this.control('dataVisita');

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

  onVisitDateKeydown(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;

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

    if (allowedKeys.includes(keyboardEvent.key)) {
      return;
    }

    const isNumber = /^[0-9]$/.test(keyboardEvent.key);
    if (!isNumber) {
      keyboardEvent.preventDefault();
    }
  }

  onVisitDateBlur(): void {
    const displayControl = this.control('dataVisitaDisplay');
    const realControl = this.control('dataVisita');
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
}
