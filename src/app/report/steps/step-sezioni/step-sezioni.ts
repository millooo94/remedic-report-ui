import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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
  @Input() readonlyMode = false;

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
}
