import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  AbstractControl,
  FormControl,
  Validators,
} from '@angular/forms';
import { WizardHeader } from './components/wizard-header/wizard-header';
import { StepAnagrafica } from './steps/step-anagrafica/step-anagrafica';
import { StepSezioni } from './steps/step-sezioni/step-sezioni';
import { StepVisita } from './steps/step-visita/step-visita';
import { ResetModal } from './components/reset-modal/reset-modal';
import { DoctorInfo } from './models/doctor-info';
import {
  REPORT_MANDATORY_SECTIONS,
  REPORT_SECTION_KEYS,
  REPORT_STEPS,
  SECTION_DESCRIPTIONS,
  SECTION_LABELS,
} from './config/report-ui.config';
import {
  createReportForm,
  createReportSectionsForm,
} from './form/report-form.factory';
import { REPORT_DOCTORS } from './config/report-doctors.mock';
import { ReportPayloadBuilderService } from './services/report-payload-builder.service';
import { ReportApiService } from './services/report-api.service';
import { StepContenuti } from './steps/step-contenuti/step-contenuti';

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

  readonly steps = REPORT_STEPS;
  readonly sectionKeys = REPORT_SECTION_KEYS;
  readonly mandatorySections = REPORT_MANDATORY_SECTIONS;
  readonly doctors: DoctorInfo[] = REPORT_DOCTORS;

  doctorResults: DoctorInfo[] = [];
  doctorSearch!: FormControl<string>;
  sections!: ReturnType<typeof createReportSectionsForm>;
  form!: ReturnType<typeof createReportForm>;

  showResetModal = false;

  constructor(
    private fb: FormBuilder,
    private payloadBuilder: ReportPayloadBuilderService,
    private api: ReportApiService,
  ) {
    this.doctorSearch = this.fb.nonNullable.control('');
    this.sections = createReportSectionsForm(this.fb);
    this.form = createReportForm(this.fb);

    this.doctorSearch.valueChanges.subscribe((term) => {
      this.searchDoctor(term);
      this.form.get('medico.id')?.setValue('', { emitEvent: false });
    });

    this.control('modalitaReferto').valueChanges.subscribe(() => {
      this.updateModeValidators();
    });

    this.sections.valueChanges.subscribe(() => {
      this.updateModeValidators();
    });

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
        return (
          this.control('dataVisitaDisplay').valid &&
          this.control('dataVisita').valid &&
          this.control('titoloVisita').valid &&
          this.control('medico.id').valid
        );

      case 3:
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
        mark(this.control('dataVisitaDisplay'));
        mark(this.control('dataVisita'));
        mark(this.control('titoloVisita'));
        mark(this.form.get('medico'));
        this.doctorSearch.markAsTouched();
        break;

      case 3:
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
    const mode = this.control('modalitaReferto').value;

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

    const anamnesiRemotaChecked = !!this.section('anamnesiRemota').value;
    const portaInVisioneChecked = !!this.section('portaInVisione').value;
    const esamiInLocoChecked = !!this.section('esamiInLoco').value;
    const anamnesiProssimaChecked = !!this.section('anamnesiProssima').value;
    const esameObiettivoChecked = !!this.section('esameObiettivo').value;
    const diagnosiChecked = !!this.section('diagnosi').value;
    const prescrizioneChecked = !!this.section('prescrizione').value;

    if (mode === 'libero') {
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

    testoLibero.updateValueAndValidity({ emitEvent: false });
    anamnesiPatologicaRemota.updateValueAndValidity({ emitEvent: false });
    anamnesiPatologicaProssima.updateValueAndValidity({ emitEvent: false });
    portaInVisione.updateValueAndValidity({ emitEvent: false });
    esamiEseguitiInLoco.updateValueAndValidity({ emitEvent: false });
    esameObiettivo.updateValueAndValidity({ emitEvent: false });
    diagnosi.updateValueAndValidity({ emitEvent: false });
    prescrizione.updateValueAndValidity({ emitEvent: false });
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
    this.doctorResults = [];

    const now = new Date();
    const isoToday = now.toISOString().slice(0, 10);
    const displayToday = this.formatDateDisplay(now);

    this.form.reset({
      dataVisitaDisplay: displayToday,
      dataVisita: isoToday,
      titoloVisita: '',
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

    this.doctorResults = this.doctors.filter(
      (d) =>
        d.nome.toLowerCase().startsWith(q) ||
        d.cognome.toLowerCase().startsWith(q) ||
        (d.specialita ?? '').toLowerCase().startsWith(q),
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

  clearDoctor(): void {
    this.doctorSearch.setValue('', { emitEvent: false });
    this.doctorResults = [];
    this.form.patchValue({
      medico: {
        id: '',
        nome: '',
        cognome: '',
        specialita: '',
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
}
