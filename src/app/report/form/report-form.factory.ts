import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { EmgChecklistKey } from '../config/emg-checklist.config';
import {
  PsgEssKey,
  PsgSleepHistoryKey,
} from '../config/psg-report.config';
import { EmgUploadedAsset } from '../models/emg-uploaded-asset';
import { ReportType } from '../types/report-type';

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
    tipoReferto: fb.nonNullable.control<ReportType>('standard'),
    dataVisitaDisplay: fb.nonNullable.control(
      formatDateDisplay(new Date()),
      Validators.required,
    ),
    dataVisita: fb.nonNullable.control(new Date().toISOString().slice(0, 10)),

    titoloVisita: fb.nonNullable.control('', Validators.required),
    prestazione: fb.nonNullable.control(''),

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

    emg: fb.group({
      tecnicoEsecutoreId: fb.nonNullable.control(''),
      tecnicoEsecutore: fb.nonNullable.control(''),
      tecnicoEsecutoreSpecialita: fb.nonNullable.control(''),
      tecnicoRuolo: fb.nonNullable.control(''),
      medicoInviante: fb.nonNullable.control(''),
      quesitoDiagnostico: fb.nonNullable.control(''),
      sintomatologiaRiferita: fb.nonNullable.control(''),
      distrettoEsaminato: fb.nonNullable.control(''),
      esameEseguito: fb.nonNullable.control('', [plainTextMaxLength(3000)]),
      repertiElettrofisiologici: fb.nonNullable.control('', [
        plainTextMaxLength(4000),
      ]),
      conclusioni: fb.nonNullable.control('', [plainTextMaxLength(2000)]),
      consensoInformatoTesto: fb.nonNullable.control('', [
        plainTextMaxLength(2500),
      ]),
      dataOraAcquisizioneTecnica: fb.nonNullable.control(''),
      materialeProdotto: fb.nonNullable.control('', [
        plainTextMaxLength(1500),
      ]),
      noteTecnicheEsecutore: fb.nonNullable.control('', [
        plainTextMaxLength(2000),
      ]),
      attestazioneTecnico: fb.nonNullable.control('', [
        plainTextMaxLength(2500),
      ]),
      tracciati: fb.nonNullable.control<EmgUploadedAsset[]>([]),
      firmaTecnico: fb.control<EmgUploadedAsset | null>(null),
      checklistNeuropatie: createEmgChecklistForm(fb),
    }),

    psg: fb.group({
      dataRegistrazioneInizio: fb.nonNullable.control(''),
      dataRegistrazioneFine: fb.nonNullable.control(''),
      sistemaRegistrazione: fb.nonNullable.control(''),
      staturaCm: fb.nonNullable.control(''),
      pesoKg: fb.nonNullable.control(''),
      bmi: fb.nonNullable.control(''),
      consensoInformato: fb.nonNullable.control(''),
      dataRefertazione: fb.nonNullable.control(''),
      anamnesiRaccolta: fb.nonNullable.control(''),
      reportTecnico: fb.nonNullable.control(''),
      modalitaRaccolta: fb.nonNullable.control(''),
      operatore: fb.nonNullable.control(''),
      quesitoClinico: fb.nonNullable.control('', [plainTextMaxLength(3500)]),
      interpretazioneMedico: fb.nonNullable.control('', [
        plainTextMaxLength(4500),
      ]),
      conclusioneDiagnostica: fb.nonNullable.control('', [
        plainTextMaxLength(2500),
      ]),
      indicazioniCliniche: fb.nonNullable.control('', [
        plainTextMaxLength(2500),
      ]),
      notaDocumentale: fb.nonNullable.control('', [
        plainTextMaxLength(2500),
      ]),
      reportStrumentalePdf: fb.control<EmgUploadedAsset | null>(null),
      anamnesiSonno: createPsgSleepHistoryForm(fb),
      ess: createPsgEssForm(fb),
      essTotale: fb.nonNullable.control(0),
      interpretazioneEss: fb.nonNullable.control(''),
    }),
  });
}

function createEmgChecklistForm(fb: FormBuilder) {
  const keys: EmgChecklistKey[] = [
    'diabete',
    'insufficienza_renale',
    'ipotiroidismo',
    'abuso_alcol',
    'carenze_vitaminiche_note',
    'pregresse_chemioterapie',
    'malattie_autoimmuni',
    'traumi_recenti_distretto',
    'terapia_anticoagulante_antiaggregante',
    'pacemaker_icd',
  ];

  return fb.group(
    Object.fromEntries(
      keys.map((key) => [
        key,
        fb.group({
          esito: fb.control<'si' | 'no' | null>(null),
          note: fb.nonNullable.control(''),
        }),
      ]),
    ),
  );
}

function createPsgSleepHistoryForm(fb: FormBuilder) {
  const keys: PsgSleepHistoryKey[] = [
    'russamentoAbituale',
    'pauseRespiratorieOsservate',
    'risvegliSoffocamento',
    'sonnolenzaDiurna',
    'sonnoNonRistoratore',
    'cefaleaMattutina',
    'nicturia',
  ];

  return fb.group({
    ...Object.fromEntries(
      keys.map((key) => [
        key,
        fb.group({
          esito: fb.control<'no' | 'si' | 'non_noto' | null>(null),
          note: fb.nonNullable.control(''),
        }),
      ]),
    ),
    farmaciRilevanti: fb.group({
      nessuno: fb.nonNullable.control(false),
      sedativi_ipnotici: fb.nonNullable.control(false),
      oppioidi: fb.nonNullable.control(false),
      altro: fb.nonNullable.control(false),
      note: fb.nonNullable.control(''),
    }),
    comorbiditaRilevanti: fb.group({
      ipertensione: fb.nonNullable.control(false),
      cardiopatia: fb.nonNullable.control(false),
      bpco: fb.nonNullable.control(false),
      diabete: fb.nonNullable.control(false),
      aritmie: fb.nonNullable.control(false),
      altro: fb.nonNullable.control(false),
      note: fb.nonNullable.control(''),
    }),
    noteAnamnesticheUlteriori: fb.nonNullable.control(''),
  });
}

function createPsgEssForm(fb: FormBuilder) {
  const keys: PsgEssKey[] = [
    'sedutoLeggere',
    'guardandoTv',
    'sedutoInattivoLuogoPubblico',
    'passeggeroAutoUnOra',
    'sdraiatoPomeriggio',
    'sedutoParlare',
    'sedutoDopoPranzo',
    'autoFermoTraffico',
  ];

  return fb.group(
    Object.fromEntries(
      keys.map((key) => [key, fb.control<number | null>(null)]),
    ),
  );
}

function formatDateDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}
