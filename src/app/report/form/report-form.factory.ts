import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

function stripHtml(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainTextMaxLength(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = stripHtml(control.value);

    return text.length > max
      ? {
          plainTextMaxLength: {
            requiredLength: max,
            actualLength: text.length,
          },
        }
      : null;
  };
}

export function createReportSectionsForm(fb: FormBuilder) {
  return fb.group({
    anamnesiRemota: fb.nonNullable.control(false),
    portaInVisione: fb.nonNullable.control(false),
    esamiInLoco: fb.nonNullable.control(false),

    anamnesiProssima: fb.nonNullable.control(true),
    esameObiettivo: fb.nonNullable.control(true),
    diagnosi: fb.nonNullable.control(true),
    prescrizione: fb.nonNullable.control(true),
  });
}

export function createReportForm(fb: FormBuilder) {
  return fb.group({
    dataVisitaDisplay: fb.nonNullable.control(
      formatDateDisplay(new Date()),
      Validators.required,
    ),
    dataVisita: fb.nonNullable.control(new Date().toISOString().slice(0, 10)),

    titoloVisita: fb.nonNullable.control('', Validators.required),

    modalitaReferto: fb.nonNullable.control<'sezioni' | 'libero'>('sezioni'),
    testoLibero: fb.nonNullable.control('', [plainTextMaxLength(800)]),

    anagrafica: fb.group({
      nome: fb.nonNullable.control('', Validators.required),
      cognome: fb.nonNullable.control('', Validators.required),
      sesso: fb.control<Sex | null>(null, Validators.required),
      dataNascitaDisplay: ['', Validators.required],
      dataNascita: [''],

      codiceFiscale: fb.nonNullable.control(''),
      telefono: fb.nonNullable.control(''),
      email: fb.nonNullable.control(''),
      indirizzo: fb.nonNullable.control(''),
    }),

    anamnesiPatologicaRemota: fb.nonNullable.control('', [
      plainTextMaxLength(1000),
    ]),
    anamnesiPatologicaProssima: fb.nonNullable.control('', [
      plainTextMaxLength(1000),
    ]),
    portaInVisione: fb.nonNullable.control('', [plainTextMaxLength(1000)]),
    esamiEseguitiInLoco: fb.nonNullable.control('', [plainTextMaxLength(1000)]),

    esameObiettivo: fb.nonNullable.control('', [
      Validators.required,
      plainTextMaxLength(1000),
    ]),
    diagnosi: fb.nonNullable.control('', [
      Validators.required,
      plainTextMaxLength(1000),
    ]),
    prescrizione: fb.nonNullable.control('', [
      Validators.required,
      plainTextMaxLength(1000),
    ]),

    medico: fb.group({
      id: fb.nonNullable.control('', Validators.required),
      nome: fb.nonNullable.control(''),
      cognome: fb.nonNullable.control(''),
      specialita: fb.nonNullable.control(''),
    }),
  });
}

function formatDateDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
