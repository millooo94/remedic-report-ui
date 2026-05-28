import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  PSG_COMORBIDITA_OPTIONS,
  PSG_ESS_ITEMS,
  PSG_FARMACI_OPTIONS,
  PSG_SLEEP_HISTORY_ITEMS,
  PsgBinaryResponse,
  PsgEssKey,
  PsgSleepHistoryKey,
} from '../../config/psg-report.config';

@Component({
  selector: 'psg-anamnesi-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './psg-anamnesi-form.html',
  styleUrl: './psg-anamnesi-form.css',
})
export class PsgAnamnesiForm {
  @Input({ required: true }) control!: (path: string) => FormControl;
  @Input({ required: true }) hasError!: (
    path: string,
    error: string,
  ) => boolean;

  readonly psgSleepHistoryItems = PSG_SLEEP_HISTORY_ITEMS;
  readonly psgEssItems = PSG_ESS_ITEMS;
  readonly psgFarmaciOptions = PSG_FARMACI_OPTIONS;
  readonly psgComorbiditaOptions = PSG_COMORBIDITA_OPTIONS;

  psgSleepOutcomeControl(key: PsgSleepHistoryKey): FormControl {
    return this.control(`psg.anamnesiSonno.${key}.esito`);
  }

  psgSleepNoteControl(key: PsgSleepHistoryKey): FormControl {
    return this.control(`psg.anamnesiSonno.${key}.note`);
  }

  psgSleepOutcomeValue(key: PsgSleepHistoryKey): PsgBinaryResponse {
    return this.psgSleepOutcomeControl(key).value ?? null;
  }

  setPsgSleepOutcome(
    key: PsgSleepHistoryKey,
    value: Exclude<PsgBinaryResponse, null>,
  ): void {
    const control = this.psgSleepOutcomeControl(key);
    control.setValue(value);
    control.markAsDirty();
    control.markAsTouched();
  }

  isPsgSleepOutcomeSelected(
    key: PsgSleepHistoryKey,
    value: Exclude<PsgBinaryResponse, null>,
  ): boolean {
    return this.psgSleepOutcomeValue(key) === value;
  }

  psgSleepOutcomeHasRequiredError(key: PsgSleepHistoryKey): boolean {
    const control = this.psgSleepOutcomeControl(key);
    return !!(control.touched && control.hasError('required'));
  }

  psgEssControl(key: PsgEssKey): FormControl {
    return this.control(`psg.ess.${key}`);
  }

  setPsgEssScore(key: PsgEssKey, value: number): void {
    const control = this.psgEssControl(key);
    control.setValue(value);
    control.markAsDirty();
    control.markAsTouched();
  }

  isPsgEssSelected(key: PsgEssKey, value: number): boolean {
    return this.psgEssControl(key).value === value;
  }

  psgEssHasRequiredError(key: PsgEssKey): boolean {
    const control = this.psgEssControl(key);
    return !!(control.touched && control.hasError('required'));
  }

  psgFarmacoControl(key: string): FormControl {
    return this.control(`psg.anamnesiSonno.farmaciRilevanti.${key}`);
  }

  psgComorbiditaControl(key: string): FormControl {
    return this.control(`psg.anamnesiSonno.comorbiditaRilevanti.${key}`);
  }
}
