import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DoctorInfo } from '../../models/doctor-info';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'doctor-autocomplete',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './doctor-autocomplete.html',
  styleUrl: './doctor-autocomplete.css',
})
export class DoctorAutocomplete {
  @Input({ required: true }) doctorSearch!: FormControl;
  @Input({ required: true }) doctorResults!: DoctorInfo[];
  @Input({ required: true }) selectedDoctorInvalid!: boolean;
  @Input() label = 'Cerca medico *';
  @Input() placeholder = 'Digita nome, cognome o specialita';
  @Input() invalidMessage = 'Seleziona un professionista dalla lista';

  @Output() selectDoctor = new EventEmitter<DoctorInfo>();

  optionTitle(item: DoctorInfo): string {
    if (
      item.specialita === 'Tecniche di Neurofisiopatologia' ||
      item.specialita === 'Tecnico di Neurofisiopatologia'
    ) {
      return item.displayName || `${item.nome} ${item.cognome}`.trim();
    }

    return `${item.cognome} ${item.nome}`.trim();
  }

  optionSubtitle(item: DoctorInfo): string {
    return item.specialita || item.ruolo || '-';
  }
}
