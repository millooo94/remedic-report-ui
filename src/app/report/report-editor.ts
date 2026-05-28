import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  AbstractControl,
  FormControl,
  FormGroup,
  Validators,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { WizardHeader } from './components/wizard-header/wizard-header';
import { StepAnagrafica } from './steps/step-anagrafica/step-anagrafica';
import { StepSezioni } from './steps/step-sezioni/step-sezioni';
import { StepVisita } from './steps/step-visita/step-visita';
import { ResetModal } from './components/reset-modal/reset-modal';
import { DoctorInfo } from './models/doctor-info';
import {
  EMG_REPORT_STEPS,
  PSG_REPORT_STEPS,
  REPORT_MANDATORY_SECTIONS,
  REPORT_SECTION_KEYS,
  REPORT_STEPS,
  SECTION_DESCRIPTIONS,
  SECTION_LABELS,
} from './config/report-ui.config';
import {
  EMG_CHECKLIST_ITEMS,
  EMG_DEFAULTS,
  EmgChecklistItem,
} from './config/emg-checklist.config';
import {
  PSG_COMORBIDITA_OPTIONS,
  PSG_DEFAULTS,
  PSG_ESS_ITEMS,
  PSG_FARMACI_OPTIONS,
  PSG_SLEEP_HISTORY_ITEMS,
  getPsgEssInterpretation,
} from './config/psg-report.config';
import {
  createReportForm,
  createReportSectionsForm,
} from './form/report-form.factory';
import { REPORT_DOCTORS } from './config/report-doctors.mock';
import { ReportPayloadBuilderService } from './services/report-payload-builder.service';
import { ReportApiService } from './services/report-api.service';
import { StepContenuti } from './steps/step-contenuti/step-contenuti';
import { ReportType } from './types/report-type';

type SectionKey = (typeof REPORT_SECTION_KEYS)[number];

@Component({
  selector: 'report-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    WizardHeader,
    StepAnagrafica,
    StepVisita,
    StepSezioni,
    ResetModal,
    StepContenuti,
  ],
  templateUrl: './report-editor.html',
  styleUrl: './report-editor.css',
})
export class ReportEditor {
  step = 0;

  readonly standardSteps = REPORT_STEPS;
  readonly emgSteps = EMG_REPORT_STEPS;
  readonly psgSteps = PSG_REPORT_STEPS;
  readonly sectionKeys = REPORT_SECTION_KEYS;
  readonly mandatorySections = REPORT_MANDATORY_SECTIONS;
  readonly doctors: DoctorInfo[] = REPORT_DOCTORS;

  doctorResults: DoctorInfo[] = [];
  technicalResults: DoctorInfo[] = [];
  doctorSearch!: FormControl<string>;
  technicalSearch!: FormControl<string>;
  sections!: ReturnType<typeof createReportSectionsForm>;
  form!: ReturnType<typeof createReportForm>;

  showResetModal = false;

  constructor(
    private fb: FormBuilder,
    private payloadBuilder: ReportPayloadBuilderService,
    private api: ReportApiService,
  ) {
    this.doctorSearch = this.fb.nonNullable.control('');
    this.technicalSearch = this.fb.nonNullable.control('');
    this.sections = createReportSectionsForm(this.fb);
    this.form = createReportForm(this.fb);

    this.doctorSearch.valueChanges.subscribe((term) => {
      this.searchDoctor(term);
      this.form.get('medico.id')?.setValue('', { emitEvent: false });
    });

    this.technicalSearch.valueChanges.subscribe((term) => {
      this.searchTechnician(term);
      this.form.get('emg.tecnicoEsecutoreId')?.setValue('', { emitEvent: false });
      this.form.get('emg.tecnicoEsecutore')?.setValue('', { emitEvent: false });
      this.form.get('emg.tecnicoRuolo')?.setValue('', { emitEvent: false });
    });

    this.control('modalitaReferto').valueChanges.subscribe(() => {
      this.updateModeValidators();
    });

    this.control('tipoReferto').valueChanges.subscribe((type) => {
      this.applyReportTypeDefaults(type);
      this.updateModeValidators();
    });

    this.control('dataVisita').valueChanges.subscribe((value) => {
      this.syncTechnicalAcquisitionDate(value);
    });

    this.control('psg.dataRegistrazioneInizio').valueChanges.subscribe((value) => {
      this.syncPsgVisitDate(value);
    });

    this.control('psg.staturaCm').valueChanges.subscribe(() => {
      this.updatePsgBmi();
    });

    this.control('psg.pesoKg').valueChanges.subscribe(() => {
      this.updatePsgBmi();
    });

    this.form.get('psg.ess')?.valueChanges.subscribe(() => {
      this.updatePsgEssSummary();
    });

    this.sections.valueChanges.subscribe(() => {
      this.updateModeValidators();
    });

    this.applyReportTypeDefaults(this.reportType);
    this.updatePsgBmi();
    this.updatePsgEssSummary();
    this.updateModeValidators();
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (this.showResetModal) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tagName = target.tagName.toLowerCase();
    const isTextarea = tagName === 'textarea';
    const isButton = tagName === 'button';
    const isNativeSelect = tagName === 'select';
    const isContentEditable =
      target.getAttribute('contenteditable') === 'true' ||
      !!target.closest('[contenteditable="true"]');

    if (isTextarea || isButton || isNativeSelect || isContentEditable) {
      return;
    }

    event.preventDefault();
    this.primaryAction();
  }

  control(path: string): FormControl {
    const ctrl = this.form.get(path);
    if (!ctrl) {
      throw new Error(`Controllo non trovato: ${path}`);
    }
    return ctrl as FormControl;
  }

  section(key: SectionKey): FormControl {
    const ctrl = this.sections.get(key);
    if (!ctrl) {
      throw new Error(`Sezione non trovata: ${key}`);
    }
    return ctrl as FormControl;
  }

  hasError(path: string, error: string): boolean {
    const c = this.form.get(path);
    if (!c) return false;
    return !!(c.touched && c.hasError(error));
  }

  sectionLabel(key: SectionKey): string {
    return SECTION_LABELS[key];
  }

  sectionDescription(key: SectionKey): string {
    return SECTION_DESCRIPTIONS[key];
  }

  get reportType(): ReportType {
    return this.control('tipoReferto').value;
  }

  get steps() {
    if (this.reportType === 'emg') {
      return this.emgSteps;
    }

    if (this.reportType === 'psg') {
      return this.psgSteps;
    }

    return this.standardSteps;
  }

  stepHint(): string {
    if (this.reportType === 'psg') {
      switch (this.step) {
        case 1:
          return "Configura i dati della registrazione, il sistema utilizzato e il medico refertatore.";
        case 2:
          return 'Compila il quesito clinico e la refertazione medica che accompagneranno il report strumentale.';
        case 3:
          return "Raccogli anamnesi del sonno, scala ESS e carica il report strumentale da unire al PDF finale.";
        default:
          return "Compila l'anagrafica una sola volta: verra riutilizzata sia nel referto PSG sia nella scheda anamnestica.";
      }
    }

    if (this.reportType !== 'emg') {
      return 'Compila i campi essenziali. Il referto mantiene solo le sezioni attivate.';
    }

    switch (this.step) {
      case 1:
        return "Configura i dati dell'esame, il medico refertatore e il tecnico esecutore.";
      case 2:
        return 'Raccogli il quesito clinico e la checklist anamnestica mirata.';
      case 3:
        return 'Completa il contenuto clinico e l\'allegato tecnico del referto EMG.';
      default:
        return 'Compila l\'anagrafica del paziente una sola volta per tutto il documento.';
    }
  }

  private applyReportTypeDefaults(type: ReportType): void {
    if (type === 'emg') {
      this.ensureTechnicalAcquisitionDefault();

      const defaultNeurologist = this.findDefaultNeurologist();
      const medicoId = this.control('medico.id').value;
      const medicoNome = this.control('medico.nome').value;
      const medicoCognome = this.control('medico.cognome').value;
      const medicoSpecialita = this.control('medico.specialita').value;
      const doctorStillValid =
        !medicoId || medicoSpecialita.trim() === EMG_DEFAULTS.specializzazione;
      const selectedDoctor = doctorStillValid
        ? {
            id: medicoId || defaultNeurologist?.id || '',
            nome: medicoNome || defaultNeurologist?.nome || '',
            cognome: medicoCognome || defaultNeurologist?.cognome || '',
            specialita: EMG_DEFAULTS.specializzazione,
          }
        : {
            id: defaultNeurologist?.id || '',
            nome: defaultNeurologist?.nome || '',
            cognome: defaultNeurologist?.cognome || '',
            specialita: EMG_DEFAULTS.specializzazione,
          };

      this.form.patchValue({
        titoloVisita: EMG_DEFAULTS.titoloVisita,
        prestazione: this.control('prestazione').value || EMG_DEFAULTS.prestazione,
        medico: {
          ...selectedDoctor,
        },
        emg: {
          esameEseguito:
            this.control('emg.esameEseguito').value || EMG_DEFAULTS.esameEseguito,
          consensoInformatoTesto:
            this.control('emg.consensoInformatoTesto').value ||
            EMG_DEFAULTS.consensoInformatoTesto,
          materialeProdotto:
            this.control('emg.materialeProdotto').value ||
            EMG_DEFAULTS.materialeProdotto,
          attestazioneTecnico:
            this.control('emg.attestazioneTecnico').value ||
            EMG_DEFAULTS.attestazioneTecnico,
        },
      });

      if (selectedDoctor.id) {
        this.doctorSearch.setValue(
          `${selectedDoctor.cognome} ${selectedDoctor.nome}`.trim(),
          { emitEvent: false },
        );
      } else if (!doctorStillValid) {
        this.doctorSearch.setValue('', { emitEvent: false });
      }

      this.doctorResults = [];

      return;
    }

    if (type === 'psg') {
      const defaultNeurologist = this.findDefaultNeurologist();
      const medicoId = this.control('medico.id').value;
      const medicoNome = this.control('medico.nome').value;
      const medicoCognome = this.control('medico.cognome').value;
      const medicoSpecialita = this.control('medico.specialita').value;
      const doctorStillValid =
        !medicoId || medicoSpecialita.trim() === PSG_DEFAULTS.specializzazione;
      const selectedDoctor = doctorStillValid
        ? {
            id: medicoId || defaultNeurologist?.id || '',
            nome: medicoNome || defaultNeurologist?.nome || '',
            cognome: medicoCognome || defaultNeurologist?.cognome || '',
            specialita: PSG_DEFAULTS.specializzazione,
          }
        : {
            id: defaultNeurologist?.id || '',
            nome: defaultNeurologist?.nome || '',
            cognome: defaultNeurologist?.cognome || '',
            specialita: PSG_DEFAULTS.specializzazione,
          };

      const registrationStart = this.control('psg.dataRegistrazioneInizio').value;
      const registrationEnd = this.control('psg.dataRegistrazioneFine').value;
      const reportingDate =
        this.control('psg.dataRefertazione').value ||
        new Date().toISOString().slice(0, 10);

      this.form.patchValue({
        titoloVisita: PSG_DEFAULTS.titoloVisita,
        prestazione: this.control('prestazione').value || PSG_DEFAULTS.prestazione,
        medico: {
          ...selectedDoctor,
        },
        psg: {
          dataRegistrazioneInizio: registrationStart,
          dataRegistrazioneFine: registrationEnd,
          sistemaRegistrazione:
            this.control('psg.sistemaRegistrazione').value ||
            PSG_DEFAULTS.sistemaRegistrazione,
          consensoInformato:
            this.control('psg.consensoInformato').value ||
            PSG_DEFAULTS.consensoInformato,
          dataRefertazione: reportingDate,
          anamnesiRaccolta:
            this.control('psg.anamnesiRaccolta').value ||
            PSG_DEFAULTS.anamnesiRaccolta,
          reportTecnico:
            this.control('psg.reportTecnico').value ||
            PSG_DEFAULTS.reportTecnico,
          modalitaRaccolta:
            this.control('psg.modalitaRaccolta').value ||
            PSG_DEFAULTS.modalitaRaccolta,
          operatore:
            this.control('psg.operatore').value || PSG_DEFAULTS.operatore,
        },
      });

      this.syncPsgVisitDate(registrationStart);
      this.updatePsgBmi();
      this.updatePsgEssSummary();

      if (selectedDoctor.id) {
        this.doctorSearch.setValue(
          `${selectedDoctor.cognome} ${selectedDoctor.nome}`.trim(),
          { emitEvent: false },
        );
      } else if (!doctorStillValid) {
        this.doctorSearch.setValue('', { emitEvent: false });
      }

      this.doctorResults = [];
      return;
    }

    if (this.control('titoloVisita').value === EMG_DEFAULTS.titoloVisita) {
      this.control('titoloVisita').setValue('');
    }

    if (this.control('prestazione').value === EMG_DEFAULTS.prestazione) {
      this.control('prestazione').setValue('');
    }

    if (this.control('titoloVisita').value === PSG_DEFAULTS.titoloVisita) {
      this.control('titoloVisita').setValue('');
    }

    if (this.control('prestazione').value === PSG_DEFAULTS.prestazione) {
      this.control('prestazione').setValue('');
    }

    if (
      !this.control('medico.id').value &&
      (this.control('medico.specialita').value === EMG_DEFAULTS.specializzazione ||
        this.control('medico.specialita').value === PSG_DEFAULTS.specializzazione)
    ) {
      this.control('medico.specialita').setValue('');
    }
  }

  next(): void {
    if (!this.canGoNext()) {
      this.markStepTouched();
      return;
    }

    this.step = Math.min(this.step + 1, this.steps.length - 1);
  }

  prev(): void {
    this.step = Math.max(this.step - 1, 0);
  }

  goTo(target: number): void {
    if (target <= this.step) {
      this.step = target;
      return;
    }

    if (!this.canGoNext()) {
      this.markStepTouched();
      return;
    }

    this.step = target;
  }

  canGoNext(): boolean {
    switch (this.step) {
      case 0:
        return this.form.get('anagrafica')?.valid ?? false;

      case 1:
        if (this.reportType === 'emg') {
          return (
            this.control('dataVisitaDisplay').valid &&
            this.control('dataVisita').valid &&
            this.control('prestazione').valid &&
            this.control('emg.tecnicoEsecutoreId').valid &&
            this.control('medico.id').valid &&
            this.control('medico.specialita').valid
          );
        }

        if (this.reportType === 'psg') {
          return (
            this.control('psg.dataRegistrazioneInizio').valid &&
            this.control('psg.dataRegistrazioneFine').valid &&
            this.control('psg.sistemaRegistrazione').valid &&
            this.control('psg.staturaCm').valid &&
            this.control('psg.pesoKg').valid &&
            this.control('psg.bmi').valid &&
            this.control('psg.consensoInformato').valid &&
            this.control('psg.dataRefertazione').valid &&
            this.control('prestazione').valid &&
            this.control('medico.id').valid &&
            this.control('medico.specialita').valid
          );
        }

        return (
          this.control('dataVisitaDisplay').valid &&
          this.control('dataVisita').valid &&
          this.control('titoloVisita').valid &&
          this.control('medico.id').valid
        );

      case 2:
        if (this.reportType === 'emg') {
          return (
            this.control('emg.quesitoDiagnostico').valid &&
            this.control('emg.distrettoEsaminato').valid &&
            this.isEmgChecklistComplete()
          );
        }

        if (this.reportType === 'psg') {
          return (
            this.control('psg.quesitoClinico').valid &&
            this.control('psg.interpretazioneMedico').valid &&
            this.control('psg.conclusioneDiagnostica').valid &&
            this.control('psg.indicazioniCliniche').valid
          );
        }

        return true;

      case 3:
        if (this.reportType === 'emg') {
          return (
            this.control('emg.esameEseguito').valid &&
            this.control('emg.firmaTecnico').valid
          );
        }

        if (this.reportType === 'psg') {
          return (
            this.isPsgSleepHistoryComplete() &&
            this.isPsgEssComplete() &&
            !!this.form.get('psg.anamnesiSonno.farmaciRilevanti')?.valid &&
            !!this.form.get('psg.anamnesiSonno.comorbiditaRilevanti')?.valid &&
            this.control('psg.reportStrumentalePdf').valid
          );
        }

        if (this.control('modalitaReferto').value === 'libero') {
          return this.control('testoLibero').valid;
        }

        return (
          (!this.section('anamnesiProssima').value ||
            this.control('anamnesiPatologicaProssima').valid) &&
          (!this.section('esameObiettivo').value ||
            this.control('esameObiettivo').valid) &&
          (!this.section('diagnosi').value || this.control('diagnosi').valid) &&
          (!this.section('prescrizione').value ||
            this.control('prescrizione').valid)
        );

      default:
        return true;
    }
  }

  private markStepTouched(): void {
    const mark = (c?: AbstractControl | null) => c?.markAllAsTouched();

    switch (this.step) {
      case 0:
        mark(this.form.get('anagrafica'));
        break;

      case 1:
        if (this.reportType === 'emg') {
          mark(this.control('dataVisitaDisplay'));
          mark(this.control('dataVisita'));
          mark(this.control('prestazione'));
          mark(this.control('emg.tecnicoEsecutoreId'));
          mark(this.control('medico.specialita'));
        } else if (this.reportType === 'psg') {
          mark(this.control('psg.dataRegistrazioneInizio'));
          mark(this.control('psg.dataRegistrazioneFine'));
          mark(this.control('psg.sistemaRegistrazione'));
          mark(this.control('psg.staturaCm'));
          mark(this.control('psg.pesoKg'));
          mark(this.control('psg.bmi'));
          mark(this.control('psg.consensoInformato'));
          mark(this.control('psg.dataRefertazione'));
          mark(this.control('prestazione'));
          mark(this.control('medico.specialita'));
        } else {
          mark(this.control('dataVisitaDisplay'));
          mark(this.control('dataVisita'));
          mark(this.control('titoloVisita'));
        }
        mark(this.form.get('medico'));
        this.doctorSearch.markAsTouched();
        break;

      case 2:
        if (this.reportType === 'emg') {
          mark(this.control('emg.quesitoDiagnostico'));
          mark(this.control('emg.distrettoEsaminato'));
          this.markEmgChecklistTouched();
          break;
        }

        if (this.reportType === 'psg') {
          mark(this.control('psg.quesitoClinico'));
          mark(this.control('psg.interpretazioneMedico'));
          mark(this.control('psg.conclusioneDiagnostica'));
          mark(this.control('psg.indicazioniCliniche'));
          mark(this.control('psg.notaDocumentale'));
          break;
        }

        break;

      case 3:
        if (this.reportType === 'emg') {
          mark(this.control('emg.esameEseguito'));
          mark(this.control('emg.firmaTecnico'));
          break;
        }

        if (this.reportType === 'psg') {
          this.markPsgSleepHistoryTouched();
          this.markPsgEssTouched();
          mark(this.form.get('psg.anamnesiSonno.farmaciRilevanti'));
          mark(this.form.get('psg.anamnesiSonno.comorbiditaRilevanti'));
          mark(this.control('psg.reportStrumentalePdf'));
          mark(this.control('psg.anamnesiSonno.noteAnamnesticheUlteriori'));
          break;
        }

        if (this.control('modalitaReferto').value === 'libero') {
          mark(this.control('testoLibero'));
          break;
        }

        if (this.section('anamnesiProssima').value) {
          mark(this.control('anamnesiPatologicaProssima'));
        }

        if (this.section('esameObiettivo').value) {
          mark(this.control('esameObiettivo'));
        }

        if (this.section('diagnosi').value) {
          mark(this.control('diagnosi'));
        }

        if (this.section('prescrizione').value) {
          mark(this.control('prescrizione'));
        }
        break;

      default:
        this.form.markAllAsTouched();
    }
  }

  private stripHtml(value: string | null | undefined): string {
    if (!value) return '';

    return String(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private plainTextMaxLength(max: number) {
    return (control: AbstractControl) => {
      const text = this.stripHtml(control.value);

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

  private updateModeValidators(): void {
    const reportType = this.control('tipoReferto').value;
    const mode = this.control('modalitaReferto').value;

    const prestazione = this.control('prestazione');
    const testoLibero = this.control('testoLibero');
    const anamnesiPatologicaRemota = this.control('anamnesiPatologicaRemota');
    const anamnesiPatologicaProssima = this.control(
      'anamnesiPatologicaProssima',
    );
    const portaInVisione = this.control('portaInVisione');
    const esamiEseguitiInLoco = this.control('esamiEseguitiInLoco');
    const esameObiettivo = this.control('esameObiettivo');
    const diagnosi = this.control('diagnosi');
    const prescrizione = this.control('prescrizione');
    const medicoSpecialita = this.control('medico.specialita');
    const tecnicoEsecutoreId = this.control('emg.tecnicoEsecutoreId');
    const tecnicoEsecutore = this.control('emg.tecnicoEsecutore');
    const tecnicoRuolo = this.control('emg.tecnicoRuolo');
    const quesitoDiagnostico = this.control('emg.quesitoDiagnostico');
    const distrettoEsaminato = this.control('emg.distrettoEsaminato');
    const esameEseguito = this.control('emg.esameEseguito');
    const repertiElettrofisiologici = this.control(
      'emg.repertiElettrofisiologici',
    );
    const conclusioni = this.control('emg.conclusioni');
    const consensoInformatoTesto = this.control('emg.consensoInformatoTesto');
    const materialeProdotto = this.control('emg.materialeProdotto');
    const noteTecnicheEsecutore = this.control('emg.noteTecnicheEsecutore');
    const attestazioneTecnico = this.control('emg.attestazioneTecnico');
    const firmaTecnico = this.control('emg.firmaTecnico');
    const checklistControls = EMG_CHECKLIST_ITEMS.map((item: EmgChecklistItem) =>
      this.control(`emg.checklistNeuropatie.${item.key}.esito`),
    );
    const psgDataRegistrazioneInizio = this.control('psg.dataRegistrazioneInizio');
    const psgDataRegistrazioneFine = this.control('psg.dataRegistrazioneFine');
    const psgSistemaRegistrazione = this.control('psg.sistemaRegistrazione');
    const psgStaturaCm = this.control('psg.staturaCm');
    const psgPesoKg = this.control('psg.pesoKg');
    const psgBmi = this.control('psg.bmi');
    const psgConsensoInformato = this.control('psg.consensoInformato');
    const psgDataRefertazione = this.control('psg.dataRefertazione');
    const psgQuesitoClinico = this.control('psg.quesitoClinico');
    const psgInterpretazioneMedico = this.control('psg.interpretazioneMedico');
    const psgConclusioneDiagnostica = this.control(
      'psg.conclusioneDiagnostica',
    );
    const psgIndicazioniCliniche = this.control('psg.indicazioniCliniche');
    const psgNotaDocumentale = this.control('psg.notaDocumentale');
    const psgReportStrumentalePdf = this.control('psg.reportStrumentalePdf');
    const psgSleepHistoryControls = PSG_SLEEP_HISTORY_ITEMS.map((item) =>
      this.control(`psg.anamnesiSonno.${item.key}.esito`),
    );
    const psgEssControls = PSG_ESS_ITEMS.map((item) =>
      this.control(`psg.ess.${item.key}`),
    );
    const psgFarmaciGroup = this.form.get(
      'psg.anamnesiSonno.farmaciRilevanti',
    ) as FormGroup;
    const psgComorbiditaGroup = this.form.get(
      'psg.anamnesiSonno.comorbiditaRilevanti',
    ) as FormGroup;

    const anamnesiRemotaChecked = !!this.section('anamnesiRemota').value;
    const portaInVisioneChecked = !!this.section('portaInVisione').value;
    const esamiInLocoChecked = !!this.section('esamiInLoco').value;
    const anamnesiProssimaChecked = !!this.section('anamnesiProssima').value;
    const esameObiettivoChecked = !!this.section('esameObiettivo').value;
    const diagnosiChecked = !!this.section('diagnosi').value;
    const prescrizioneChecked = !!this.section('prescrizione').value;

    if (reportType === 'emg') {
      prestazione.setValidators([Validators.required]);
      medicoSpecialita.setValidators([Validators.required]);
      tecnicoEsecutoreId.setValidators([Validators.required]);
      tecnicoEsecutore.setValidators([Validators.maxLength(120)]);
      tecnicoRuolo.setValidators([Validators.maxLength(80)]);
      quesitoDiagnostico.setValidators([
        Validators.required,
        Validators.maxLength(1200),
      ]);
      distrettoEsaminato.setValidators([
        Validators.required,
        Validators.maxLength(500),
      ]);
      esameEseguito.setValidators([
        Validators.required,
        this.plainTextMaxLength(3000),
      ]);
      repertiElettrofisiologici.clearValidators();
      conclusioni.clearValidators();
      consensoInformatoTesto.setValidators([this.plainTextMaxLength(2500)]);
      materialeProdotto.setValidators([Validators.maxLength(1500)]);
      noteTecnicheEsecutore.setValidators([this.plainTextMaxLength(2000)]);
      attestazioneTecnico.setValidators([this.plainTextMaxLength(2500)]);
      firmaTecnico.setValidators([Validators.required]);
      checklistControls.forEach((control: FormControl) =>
        control.setValidators([Validators.required]),
      );

      repertiElettrofisiologici.disable({ emitEvent: false });
      conclusioni.disable({ emitEvent: false });

      testoLibero.clearValidators();
      anamnesiPatologicaRemota.clearValidators();
      anamnesiPatologicaProssima.clearValidators();
      portaInVisione.clearValidators();
      esamiEseguitiInLoco.clearValidators();
      esameObiettivo.clearValidators();
      diagnosi.clearValidators();
      prescrizione.clearValidators();

      psgDataRegistrazioneInizio.clearValidators();
      psgDataRegistrazioneFine.clearValidators();
      psgSistemaRegistrazione.clearValidators();
      psgStaturaCm.clearValidators();
      psgPesoKg.clearValidators();
      psgBmi.clearValidators();
      psgConsensoInformato.clearValidators();
      psgDataRefertazione.clearValidators();
      psgQuesitoClinico.clearValidators();
      psgInterpretazioneMedico.clearValidators();
      psgConclusioneDiagnostica.clearValidators();
      psgIndicazioniCliniche.clearValidators();
      psgNotaDocumentale.setValidators([this.plainTextMaxLength(2500)]);
      psgReportStrumentalePdf.clearValidators();
      psgSleepHistoryControls.forEach((control) => control.clearValidators());
      psgEssControls.forEach((control) => control.clearValidators());
      psgFarmaciGroup.clearValidators();
      psgComorbiditaGroup.clearValidators();
    } else if (reportType === 'psg') {
      prestazione.setValidators([Validators.required]);
      medicoSpecialita.setValidators([Validators.required]);
      tecnicoEsecutoreId.clearValidators();
      tecnicoEsecutore.clearValidators();
      tecnicoRuolo.clearValidators();
      quesitoDiagnostico.clearValidators();
      distrettoEsaminato.clearValidators();
      esameEseguito.clearValidators();
      repertiElettrofisiologici.clearValidators();
      conclusioni.clearValidators();
      consensoInformatoTesto.clearValidators();
      materialeProdotto.clearValidators();
      noteTecnicheEsecutore.clearValidators();
      attestazioneTecnico.clearValidators();
      firmaTecnico.clearValidators();
      checklistControls.forEach((control: FormControl) =>
        control.clearValidators(),
      );

      repertiElettrofisiologici.enable({ emitEvent: false });
      conclusioni.enable({ emitEvent: false });

      psgDataRegistrazioneInizio.setValidators([Validators.required]);
      psgDataRegistrazioneFine.setValidators([Validators.required]);
      psgSistemaRegistrazione.setValidators([
        Validators.required,
        Validators.maxLength(120),
      ]);
      psgStaturaCm.setValidators([Validators.required]);
      psgPesoKg.setValidators([Validators.required]);
      psgBmi.setValidators([Validators.required]);
      psgConsensoInformato.setValidators([
        Validators.required,
        Validators.maxLength(300),
      ]);
      psgDataRefertazione.setValidators([Validators.required]);
      psgQuesitoClinico.setValidators([
        Validators.required,
        this.plainTextMaxLength(3500),
      ]);
      psgInterpretazioneMedico.setValidators([
        Validators.required,
        this.plainTextMaxLength(4500),
      ]);
      psgConclusioneDiagnostica.setValidators([
        Validators.required,
        this.plainTextMaxLength(2500),
      ]);
      psgIndicazioniCliniche.setValidators([
        Validators.required,
        this.plainTextMaxLength(2500),
      ]);
      psgNotaDocumentale.setValidators([this.plainTextMaxLength(2500)]);
      psgReportStrumentalePdf.setValidators([Validators.required]);
      psgSleepHistoryControls.forEach((control) =>
        control.setValidators([Validators.required]),
      );
      psgEssControls.forEach((control) =>
        control.setValidators([Validators.required]),
      );
      psgFarmaciGroup.setValidators([
        this.selectionRequiredValidator(
          PSG_FARMACI_OPTIONS.map((option) => option.key),
        ),
      ]);
      psgComorbiditaGroup.setValidators([
        this.selectionRequiredValidator(
          PSG_COMORBIDITA_OPTIONS.map((option) => option.key),
        ),
      ]);

      testoLibero.clearValidators();
      anamnesiPatologicaRemota.clearValidators();
      anamnesiPatologicaProssima.clearValidators();
      portaInVisione.clearValidators();
      esamiEseguitiInLoco.clearValidators();
      esameObiettivo.clearValidators();
      diagnosi.clearValidators();
      prescrizione.clearValidators();
    } else if (mode === 'libero') {
      prestazione.clearValidators();
      medicoSpecialita.clearValidators();
      tecnicoEsecutoreId.clearValidators();
      tecnicoEsecutore.clearValidators();
      tecnicoRuolo.clearValidators();
      quesitoDiagnostico.clearValidators();
      distrettoEsaminato.clearValidators();
      esameEseguito.clearValidators();
      repertiElettrofisiologici.clearValidators();
      conclusioni.clearValidators();
      consensoInformatoTesto.clearValidators();
      materialeProdotto.clearValidators();
      noteTecnicheEsecutore.clearValidators();
      attestazioneTecnico.clearValidators();
      firmaTecnico.clearValidators();
      checklistControls.forEach((control: FormControl) =>
        control.clearValidators(),
      );
      psgDataRegistrazioneInizio.clearValidators();
      psgDataRegistrazioneFine.clearValidators();
      psgSistemaRegistrazione.clearValidators();
      psgStaturaCm.clearValidators();
      psgPesoKg.clearValidators();
      psgBmi.clearValidators();
      psgConsensoInformato.clearValidators();
      psgDataRefertazione.clearValidators();
      psgQuesitoClinico.clearValidators();
      psgInterpretazioneMedico.clearValidators();
      psgConclusioneDiagnostica.clearValidators();
      psgIndicazioniCliniche.clearValidators();
      psgNotaDocumentale.setValidators([this.plainTextMaxLength(2500)]);
      psgReportStrumentalePdf.clearValidators();
      psgSleepHistoryControls.forEach((control) => control.clearValidators());
      psgEssControls.forEach((control) => control.clearValidators());
      psgFarmaciGroup.clearValidators();
      psgComorbiditaGroup.clearValidators();

      repertiElettrofisiologici.enable({ emitEvent: false });
      conclusioni.enable({ emitEvent: false });

      testoLibero.setValidators([
        Validators.required,
        this.plainTextMaxLength(7000),
      ]);

      anamnesiPatologicaRemota.clearValidators();
      anamnesiPatologicaProssima.clearValidators();
      portaInVisione.clearValidators();
      esamiEseguitiInLoco.clearValidators();
      esameObiettivo.clearValidators();
      diagnosi.clearValidators();
      prescrizione.clearValidators();
    } else {
      prestazione.clearValidators();
      medicoSpecialita.clearValidators();
      tecnicoEsecutoreId.clearValidators();
      tecnicoEsecutore.clearValidators();
      tecnicoRuolo.clearValidators();
      quesitoDiagnostico.clearValidators();
      distrettoEsaminato.clearValidators();
      esameEseguito.clearValidators();
      repertiElettrofisiologici.clearValidators();
      conclusioni.clearValidators();
      consensoInformatoTesto.clearValidators();
      materialeProdotto.clearValidators();
      noteTecnicheEsecutore.clearValidators();
      attestazioneTecnico.clearValidators();
      firmaTecnico.clearValidators();
      checklistControls.forEach((control: FormControl) =>
        control.clearValidators(),
      );
      psgDataRegistrazioneInizio.clearValidators();
      psgDataRegistrazioneFine.clearValidators();
      psgSistemaRegistrazione.clearValidators();
      psgStaturaCm.clearValidators();
      psgPesoKg.clearValidators();
      psgBmi.clearValidators();
      psgConsensoInformato.clearValidators();
      psgDataRefertazione.clearValidators();
      psgQuesitoClinico.clearValidators();
      psgInterpretazioneMedico.clearValidators();
      psgConclusioneDiagnostica.clearValidators();
      psgIndicazioniCliniche.clearValidators();
      psgNotaDocumentale.setValidators([this.plainTextMaxLength(2500)]);
      psgReportStrumentalePdf.clearValidators();
      psgSleepHistoryControls.forEach((control) => control.clearValidators());
      psgEssControls.forEach((control) => control.clearValidators());
      psgFarmaciGroup.clearValidators();
      psgComorbiditaGroup.clearValidators();

      repertiElettrofisiologici.enable({ emitEvent: false });
      conclusioni.enable({ emitEvent: false });

      testoLibero.clearValidators();

      anamnesiPatologicaRemota.setValidators(
        anamnesiRemotaChecked ? [this.plainTextMaxLength(1000)] : [],
      );

      portaInVisione.setValidators(
        portaInVisioneChecked ? [this.plainTextMaxLength(1000)] : [],
      );

      esamiEseguitiInLoco.setValidators(
        esamiInLocoChecked ? [this.plainTextMaxLength(1000)] : [],
      );

      anamnesiPatologicaProssima.setValidators(
        anamnesiProssimaChecked
          ? [Validators.required, this.plainTextMaxLength(1000)]
          : [],
      );

      esameObiettivo.setValidators(
        esameObiettivoChecked
          ? [Validators.required, this.plainTextMaxLength(1000)]
          : [],
      );

      diagnosi.setValidators(
        diagnosiChecked
          ? [Validators.required, this.plainTextMaxLength(1000)]
          : [],
      );

      prescrizione.setValidators(
        prescrizioneChecked
          ? [Validators.required, this.plainTextMaxLength(1000)]
          : [],
      );
    }

    prestazione.updateValueAndValidity({ emitEvent: false });
    testoLibero.updateValueAndValidity({ emitEvent: false });
    anamnesiPatologicaRemota.updateValueAndValidity({ emitEvent: false });
    anamnesiPatologicaProssima.updateValueAndValidity({ emitEvent: false });
    portaInVisione.updateValueAndValidity({ emitEvent: false });
    esamiEseguitiInLoco.updateValueAndValidity({ emitEvent: false });
    esameObiettivo.updateValueAndValidity({ emitEvent: false });
    diagnosi.updateValueAndValidity({ emitEvent: false });
    prescrizione.updateValueAndValidity({ emitEvent: false });
    medicoSpecialita.updateValueAndValidity({ emitEvent: false });
    tecnicoEsecutoreId.updateValueAndValidity({ emitEvent: false });
    tecnicoEsecutore.updateValueAndValidity({ emitEvent: false });
    tecnicoRuolo.updateValueAndValidity({ emitEvent: false });
    quesitoDiagnostico.updateValueAndValidity({ emitEvent: false });
    distrettoEsaminato.updateValueAndValidity({ emitEvent: false });
    esameEseguito.updateValueAndValidity({ emitEvent: false });
    repertiElettrofisiologici.updateValueAndValidity({ emitEvent: false });
    conclusioni.updateValueAndValidity({ emitEvent: false });
    consensoInformatoTesto.updateValueAndValidity({ emitEvent: false });
    materialeProdotto.updateValueAndValidity({ emitEvent: false });
    noteTecnicheEsecutore.updateValueAndValidity({ emitEvent: false });
    attestazioneTecnico.updateValueAndValidity({ emitEvent: false });
    firmaTecnico.updateValueAndValidity({ emitEvent: false });
    checklistControls.forEach((control: FormControl) =>
      control.updateValueAndValidity({ emitEvent: false }),
    );
    psgDataRegistrazioneInizio.updateValueAndValidity({ emitEvent: false });
    psgDataRegistrazioneFine.updateValueAndValidity({ emitEvent: false });
    psgSistemaRegistrazione.updateValueAndValidity({ emitEvent: false });
    psgStaturaCm.updateValueAndValidity({ emitEvent: false });
    psgPesoKg.updateValueAndValidity({ emitEvent: false });
    psgBmi.updateValueAndValidity({ emitEvent: false });
    psgConsensoInformato.updateValueAndValidity({ emitEvent: false });
    psgDataRefertazione.updateValueAndValidity({ emitEvent: false });
    psgQuesitoClinico.updateValueAndValidity({ emitEvent: false });
    psgInterpretazioneMedico.updateValueAndValidity({ emitEvent: false });
    psgConclusioneDiagnostica.updateValueAndValidity({ emitEvent: false });
    psgIndicazioniCliniche.updateValueAndValidity({ emitEvent: false });
    psgNotaDocumentale.updateValueAndValidity({ emitEvent: false });
    psgReportStrumentalePdf.updateValueAndValidity({ emitEvent: false });
    psgSleepHistoryControls.forEach((control) =>
      control.updateValueAndValidity({ emitEvent: false }),
    );
    psgEssControls.forEach((control) =>
      control.updateValueAndValidity({ emitEvent: false }),
    );
    psgFarmaciGroup.updateValueAndValidity({ emitEvent: false });
    psgComorbiditaGroup.updateValueAndValidity({ emitEvent: false });
  }

  openResetModal(): void {
    this.showResetModal = true;
  }

  closeResetModal(): void {
    this.showResetModal = false;
  }

  confirmReset(): void {
    this.step = 0;
    this.doctorSearch.reset('');
    this.technicalSearch.reset('');
    this.doctorResults = [];
    this.technicalResults = [];

    const now = new Date();
    const isoToday = now.toISOString().slice(0, 10);
    const displayToday = this.formatDateDisplay(now);

    this.form.reset({
      tipoReferto: 'standard',
      dataVisitaDisplay: displayToday,
      dataVisita: isoToday,
      titoloVisita: '',
      prestazione: '',
      modalitaReferto: 'sezioni',
      testoLibero: '',

      anagrafica: {
        nome: '',
        cognome: '',
        sesso: null,
        dataNascitaDisplay: '',
        dataNascita: '',
        codiceFiscale: '',
        telefono: '',
        email: '',
        indirizzo: '',
      },

      anamnesiPatologicaRemota: '',
      anamnesiPatologicaProssima: '',
      portaInVisione: '',
      esamiEseguitiInLoco: '',
      esameObiettivo: '',
      diagnosi: '',
      prescrizione: '',

      medico: {
        id: '',
        nome: '',
        cognome: '',
        specialita: '',
      },

      emg: {
        tecnicoEsecutoreId: '',
        tecnicoEsecutore: '',
        tecnicoRuolo: '',
        medicoInviante: '',
        quesitoDiagnostico: '',
        sintomatologiaRiferita: '',
        distrettoEsaminato: '',
        esameEseguito: '',
        repertiElettrofisiologici: '',
        conclusioni: '',
        consensoInformatoTesto: '',
        dataOraAcquisizioneTecnica: '',
        materialeProdotto: '',
        noteTecnicheEsecutore: '',
        attestazioneTecnico: '',
        tracciati: [],
        firmaTecnico: null,
        checklistNeuropatie: {
          diabete: { esito: null, note: '' },
          insufficienza_renale: { esito: null, note: '' },
          ipotiroidismo: { esito: null, note: '' },
          abuso_alcol: { esito: null, note: '' },
          carenze_vitaminiche_note: { esito: null, note: '' },
          pregresse_chemioterapie: { esito: null, note: '' },
          malattie_autoimmuni: { esito: null, note: '' },
          traumi_recenti_distretto: { esito: null, note: '' },
          terapia_anticoagulante_antiaggregante: { esito: null, note: '' },
          pacemaker_icd: { esito: null, note: '' },
        },
      },

      psg: {
        dataRegistrazioneInizio: '',
        dataRegistrazioneFine: '',
        sistemaRegistrazione: '',
        staturaCm: '',
        pesoKg: '',
        bmi: '',
        consensoInformato: '',
        dataRefertazione: '',
        anamnesiRaccolta: '',
        reportTecnico: '',
        modalitaRaccolta: '',
        operatore: '',
        quesitoClinico: '',
        interpretazioneMedico: '',
        conclusioneDiagnostica: '',
        indicazioniCliniche: '',
        notaDocumentale: '',
        reportStrumentalePdf: null,
        anamnesiSonno: {
          russamentoAbituale: { esito: null, note: '' },
          pauseRespiratorieOsservate: { esito: null, note: '' },
          risvegliSoffocamento: { esito: null, note: '' },
          sonnolenzaDiurna: { esito: null, note: '' },
          sonnoNonRistoratore: { esito: null, note: '' },
          cefaleaMattutina: { esito: null, note: '' },
          nicturia: { esito: null, note: '' },
          farmaciRilevanti: {
            nessuno: false,
            sedativi_ipnotici: false,
            oppioidi: false,
            altro: false,
            note: '',
          },
          comorbiditaRilevanti: {
            ipertensione: false,
            cardiopatia: false,
            bpco: false,
            diabete: false,
            aritmie: false,
            altro: false,
            note: '',
          },
          noteAnamnesticheUlteriori: '',
        } as any,
        ess: {
          sedutoLeggere: null,
          guardandoTv: null,
          sedutoInattivoLuogoPubblico: null,
          passeggeroAutoUnOra: null,
          sdraiatoPomeriggio: null,
          sedutoParlare: null,
          sedutoDopoPranzo: null,
          autoFermoTraffico: null,
        },
        essTotale: 0,
        interpretazioneEss: '',
      },
    });

    this.sections.reset({
      anamnesiRemota: false,
      portaInVisione: false,
      esamiInLoco: false,
      anamnesiProssima: true,
      esameObiettivo: true,
      diagnosi: true,
      prescrizione: true,
    });

    for (const k of this.sectionKeys) {
      this.section(k).enable({ emitEvent: false });
    }

    this.updateModeValidators();
    this.showResetModal = false;
  }

  searchDoctor(term: string): void {
    const q = term.trim().toLowerCase();

    if (q.length < 2) {
      this.doctorResults = [];
      return;
    }

    this.doctorResults = this.filteredDoctors().filter(
      (d) =>
        d.nome.toLowerCase().startsWith(q) ||
        d.cognome.toLowerCase().startsWith(q) ||
        (d.specialita ?? '').toLowerCase().startsWith(q),
    );
  }

  searchTechnician(term: string): void {
    const q = term.trim().toLowerCase();

    if (q.length < 2) {
      this.technicalResults = [];
      return;
    }

    this.technicalResults = this.filteredTechnicians().filter(
      (d) =>
        d.nome.toLowerCase().startsWith(q) ||
        d.cognome.toLowerCase().startsWith(q) ||
        (d.ruolo ?? '').toLowerCase().startsWith(q) ||
        (d.displayName ?? '').toLowerCase().startsWith(q),
    );
  }

  selectDoctor(d: DoctorInfo): void {
    this.form.patchValue({
      medico: {
        id: d.id,
        nome: d.nome,
        cognome: d.cognome,
        specialita: d.specialita ?? '',
      },
    });

    this.doctorSearch.setValue(`${d.cognome} ${d.nome}`, { emitEvent: false });
    this.doctorResults = [];
  }

  selectTechnician(d: DoctorInfo): void {
    const technicianName = d.displayName || `${d.nome} ${d.cognome}`.trim();

    this.form.patchValue({
      emg: {
        tecnicoEsecutoreId: d.id,
        tecnicoEsecutore: technicianName,
        tecnicoRuolo: d.ruolo ?? '',
      },
    });

    this.technicalSearch.setValue(technicianName, { emitEvent: false });
    this.technicalResults = [];
  }

  clearDoctor(): void {
    this.doctorSearch.setValue('', { emitEvent: false });
    this.doctorResults = [];
    this.form.patchValue({
      medico: {
        id: '',
        nome: '',
        cognome: '',
        specialita:
          this.usesNeurologiaDoctors()
            ? this.getNeurologiaSpecialization()
            : '',
      },
    });

  }

  clearTechnician(): void {
    this.technicalSearch.setValue('', { emitEvent: false });
    this.technicalResults = [];
    this.form.patchValue({
      emg: {
        tecnicoEsecutoreId: '',
        tecnicoEsecutore: '',
        tecnicoRuolo: '',
      },
    });
  }

  pct(): number {
    const total = this.steps.length - 1;
    return Math.round((this.step / total) * 100);
  }

  canProceedLabel(): string {
    return this.step === this.steps.length - 1 ? 'Genera Referto' : 'Avanti';
  }

  primaryAction(): void {
    if (this.step === this.steps.length - 1) {
      void this.generatePdf();
      return;
    }

    this.next();
  }

  async generatePdf(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const formValue = this.form.getRawValue();
    const sectionsValue = this.sections.getRawValue();
    const payload = this.payloadBuilder.build(formValue, sectionsValue);

    console.log(payload);

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert(
        'Impossibile aprire la finestra di stampa. Controlla il blocco popup del browser.',
      );
      return;
    }

    printWindow?.document.open();
    printWindow?.document.write(`
  <!DOCTYPE html>
  <html lang="it">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Preparazione referto</title>
      <style>
        :root {
          --brand: #1C9EBD;
          --brand-dark: #157E97;
          --accent: #AECB20;
          --bg: linear-gradient(135deg, #f5fbfd 0%, #eef7fb 100%);
          --text: #16313a;
          --muted: #6b7b83;
          --card: rgba(255, 255, 255, 0.92);
          --border: rgba(28, 158, 189, 0.14);
          --shadow: 0 20px 60px rgba(28, 158, 189, 0.12);
        }

        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          font-family: Inter, Arial, Helvetica, sans-serif;
          background: var(--bg);
          color: var(--text);
        }

        body {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .bg-blur {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .blob {
          position: absolute;
          border-radius: 999px;
          filter: blur(40px);
          opacity: 0.22;
        }

        .blob.one {
          width: 260px;
          height: 260px;
          background: #1C9EBD;
          top: -60px;
          left: -40px;
        }

        .blob.two {
          width: 300px;
          height: 300px;
          background: #AECB20;
          bottom: -90px;
          right: -60px;
        }

        .card {
          position: relative;
          z-index: 1;
          width: min(92vw, 560px);
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 28px;
          box-shadow: var(--shadow);
          padding: 36px 30px;
          text-align: center;
          backdrop-filter: blur(8px);
        }

        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(28, 158, 189, 0.10);
          color: var(--brand-dark);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 18px;
        }

        .badge-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          box-shadow: 0 0 0 6px rgba(174, 203, 32, 0.12);
        }

        .title {
          font-size: 30px;
          font-weight: 800;
          line-height: 1.12;
          margin: 0 0 10px;
        }

        .subtitle {
          margin: 0 auto 26px;
          max-width: 420px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--muted);
        }

        .loader-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 22px;
        }

        .spinner {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 4px solid rgba(28, 158, 189, 0.14);
          border-top-color: var(--brand);
          animation: spin 0.9s linear infinite;
          flex: 0 0 auto;
        }

        .status {
          text-align: left;
        }

        .status-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .status-text {
          font-size: 14px;
          color: var(--muted);
        }

        .progress {
          width: 100%;
          height: 10px;
          border-radius: 999px;
          background: rgba(28, 158, 189, 0.10);
          overflow: hidden;
          margin-bottom: 18px;
        }

        .progress-bar {
          width: 42%;
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--brand) 0%, #43bdd8 70%, var(--accent) 100%);
          animation: pulseMove 1.6s ease-in-out infinite;
        }

        .footer {
          font-size: 13px;
          color: var(--muted);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulseMove {
          0% {
            transform: translateX(-10%);
            width: 32%;
          }
          50% {
            transform: translateX(80%);
            width: 46%;
          }
          100% {
            transform: translateX(-10%);
            width: 32%;
          }
        }
      </style>
    </head>
    <body>
      <div class="bg-blur">
        <div class="blob one"></div>
        <div class="blob two"></div>
      </div>

      <div class="card">
        <div class="badge">
          <span class="badge-dot"></span>
          Documento in preparazione
        </div>

        <h1 class="title">Sto preparando il tuo referto</h1>
        <p class="subtitle">
          Il PDF è in fase di generazione e verrà aperto automaticamente non appena sarà pronto per la stampa.
        </p>

        <div class="loader-row">
          <div class="spinner"></div>
          <div class="status">
            <div class="status-title">Generazione documento in corso</div>
            <div class="status-text">Attendi qualche secondo...</div>
          </div>
        </div>

        <div class="progress">
          <div class="progress-bar"></div>
        </div>

        <div class="footer">
          Attendere il caricamento dell’anteprima di stampa
        </div>
      </div>
    </body>
  </html>
`);
    printWindow?.document.close();

    this.api.generatePdf(payload).subscribe({
      next: (htmlResponse) => {
        printWindow?.document.open();
        printWindow?.document.write(htmlResponse);
        printWindow?.document.close();
      },
      error: (err) => {
        console.error('Errore generazione PDF:', err);

        printWindow?.document.open();
        printWindow?.document.write(`
          <html>
            <head>
              <title>Errore PDF</title>
              <style>
                body {
                  margin: 0;
                  font-family: Arial, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  background: #fff;
                  color: #b91c1c;
                }
                .box {
                  max-width: 520px;
                  text-align: center;
                  padding: 24px;
                }
              </style>
            </head>
            <body>
              <div class="box">
                <h2>Errore durante la generazione del PDF</h2>
                <p>Controlla console e backend.</p>
              </div>
            </body>
          </html>
        `);
        printWindow?.document.close();

        alert('Errore durante la generazione del PDF.');
      },
    });
  }

  private formatDateDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private filteredDoctors(): DoctorInfo[] {
    return this.doctors.filter((doctor) => {
      if (doctor.tipo === 'tecnico') return false;
      if (!this.usesNeurologiaDoctors()) return true;
      return doctor.specialita === this.getNeurologiaSpecialization();
    });
  }

  private findDefaultNeurologist(): DoctorInfo | undefined {
    return this.doctors.find(
      (doctor) =>
        doctor.tipo !== 'tecnico' &&
        doctor.specialita === this.getNeurologiaSpecialization() &&
        doctor.nome === 'Sebastiano' &&
        doctor.cognome === 'Arena',
    );
  }

  private filteredTechnicians(): DoctorInfo[] {
    return this.doctors.filter(
      (doctor) => doctor.tipo === 'tecnico' && doctor.ruolo === 'TNFP',
    );
  }

  private ensureTechnicalAcquisitionDefault(): void {
    const technicalDate = this.control('emg.dataOraAcquisizioneTecnica');

    if (technicalDate.value) return;

    const examDate = this.control('dataVisita').value;
    technicalDate.setValue(this.buildDateTimeLocalValue(examDate), {
      emitEvent: false,
    });
  }

  private syncTechnicalAcquisitionDate(examDate: string): void {
    if (this.reportType !== 'emg') return;

    const technicalDate = this.control('emg.dataOraAcquisizioneTecnica');
    if (technicalDate.dirty && technicalDate.value) return;

    technicalDate.setValue(this.buildDateTimeLocalValue(examDate), {
      emitEvent: false,
    });
  }

  private syncPsgVisitDate(registrationStart: string): void {
    if (!registrationStart) return;

    const datePart = this.extractDatePart(registrationStart);
    if (!datePart) return;

    this.control('dataVisita').setValue(datePart, { emitEvent: false });
    this.control('dataVisitaDisplay').setValue(
      this.formatDateDisplay(new Date(`${datePart}T00:00:00`)),
      { emitEvent: false },
    );
  }

  private extractDatePart(value?: string | null): string {
    if (!value) return '';
    return value.includes('T') ? value.split('T')[0] : value.slice(0, 10);
  }

  private updatePsgBmi(): void {
    const staturaValue = Number(this.control('psg.staturaCm').value);
    const pesoValue = Number(this.control('psg.pesoKg').value);
    const bmiControl = this.control('psg.bmi');

    if (!staturaValue || !pesoValue || staturaValue <= 0 || pesoValue <= 0) {
      bmiControl.setValue('', { emitEvent: false });
      return;
    }

    const altezzaMetri = staturaValue / 100;
    const bmi = pesoValue / (altezzaMetri * altezzaMetri);
    bmiControl.setValue(bmi.toFixed(1), { emitEvent: false });
  }

  private updatePsgEssSummary(): void {
    const values = PSG_ESS_ITEMS.map((item) => {
      const value = this.control(`psg.ess.${item.key}`).value;
      return value === null || value === '' ? null : Number(value);
    });
    const hasIncompleteValues = values.some(
      (value) => value === null || Number.isNaN(value),
    );
    const total = values.reduce<number>(
      (sum, value) => sum + Number(value ?? 0),
      0,
    );

    this.control('psg.essTotale').setValue(total, { emitEvent: false });
    this.control('psg.interpretazioneEss').setValue(
      hasIncompleteValues ? '' : getPsgEssInterpretation(total),
      { emitEvent: false },
    );
  }

  private buildDateTimeLocalValue(dateIso?: string): string {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    const datePart = dateIso || today;
    const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    return `${datePart}T${timePart}`;
  }

  private isEmgChecklistComplete(): boolean {
    return EMG_CHECKLIST_ITEMS.every((item: EmgChecklistItem) =>
      this.control(`emg.checklistNeuropatie.${item.key}.esito`).valid,
    );
  }

  private isPsgSleepHistoryComplete(): boolean {
    return PSG_SLEEP_HISTORY_ITEMS.every((item) =>
      this.control(`psg.anamnesiSonno.${item.key}.esito`).valid,
    );
  }

  private isPsgEssComplete(): boolean {
    return PSG_ESS_ITEMS.every((item) =>
      this.control(`psg.ess.${item.key}`).valid,
    );
  }

  private markEmgChecklistTouched(): void {
    EMG_CHECKLIST_ITEMS.forEach((item: EmgChecklistItem) => {
      this.control(`emg.checklistNeuropatie.${item.key}.esito`).markAsTouched();
    });
  }

  private markPsgSleepHistoryTouched(): void {
    PSG_SLEEP_HISTORY_ITEMS.forEach((item) => {
      this.control(`psg.anamnesiSonno.${item.key}.esito`).markAsTouched();
      this.control(`psg.anamnesiSonno.${item.key}.note`).markAsTouched();
    });
  }

  private markPsgEssTouched(): void {
    PSG_ESS_ITEMS.forEach((item) => {
      this.control(`psg.ess.${item.key}`).markAsTouched();
    });
  }

  private selectionRequiredValidator(keys: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as Record<string, unknown> | null;
      const hasSelection = keys.some((key) => value?.[key] === true);

      return hasSelection ? null : { selectionRequired: true };
    };
  }

  private usesNeurologiaDoctors(): boolean {
    return this.reportType === 'emg' || this.reportType === 'psg';
  }

  private getNeurologiaSpecialization(): string {
    return this.reportType === 'psg'
      ? PSG_DEFAULTS.specializzazione
      : EMG_DEFAULTS.specializzazione;
  }
}
