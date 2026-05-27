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

  @Output() selectDoctor = new EventEmitter<DoctorInfo>();
}
