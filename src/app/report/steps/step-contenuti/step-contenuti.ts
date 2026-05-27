import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RichTextField } from '../../components/rich-text-field/rich-text-field';

@Component({
  selector: 'step-contenuti',
  imports: [CommonModule, ReactiveFormsModule, RichTextField],
  templateUrl: './step-contenuti.html',
  styleUrl: './step-contenuti.css',
})
export class StepContenuti {
  @Input({ required: true }) sections!: any;
  @Input({ required: true }) control!: (path: string) => FormControl;
  @Input({ required: true }) hasError!: (
    path: string,
    error: string,
  ) => boolean;
  @Input({ required: true }) mode!: 'sezioni' | 'libero';

  readonly limits = {
    testoLibero: { max: 10000 },
    anamnesiPatologicaRemota: { max: 1000 },
    anamnesiPatologicaProssima: { max: 1000 },
    portaInVisione: { max: 1000 },
    esamiEseguitiInLoco: { max: 1000 },
    esameObiettivo: { max: 1000 },
    diagnosi: { max: 1000 },
    prescrizione: { max: 1000 },
  };

  plainTextLength(path: string): number {
    const value = this.control(path).value ?? '';
    return this.stripHtml(String(value)).length;
  }

  isOverLimit(path: string, max: number): boolean {
    return this.plainTextLength(path) > max;
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
