import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  AbstractControl,
  FormControl,
  FormGroup,
  Validators,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { EmgAnamnesiForm } from './components/emg-anamnesi-form/emg-anamnesi-form';
import { PsgAnamnesiForm } from './components/psg-anamnesi-form/psg-anamnesi-form';
import { WizardHeader } from './components/wizard-header/wizard-header';
import { StepAnagrafica } from './steps/step-anagrafica/step-anagrafica';
import { StepSezioni } from './steps/step-sezioni/step-sezioni';
import { StepVisita } from './steps/step-visita/step-visita';
import { ResetModal } from './components/reset-modal/reset-modal';
import { DoctorInfo } from './models/doctor-info';
import {
  AdminUserItem,
  AuditLogItem,
  AuthUser,
  DraftEmailDeliveryItem,
  DraftAttachmentMetadata,
  DraftAttachmentUploadPayload,
  ProfessionalItem,
  ReportDraftDetail,
  ReportDraftFilters,
  ReportDraftPayload,
  ReportDraftStatus,
  ReportDraftSummary,
} from './models/report-draft';
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
import { EmgUploadedAsset } from './models/emg-uploaded-asset';
import { ReportPdfRequest } from './models/report-pdf-request';

type SectionKey = (typeof REPORT_SECTION_KEYS)[number];
type EditorUiState =
  | 'initialTypeSelection'
  | 'typeActionSelection'
  | 'wizard'
  | 'neurologistLogin'
  | 'neurologistDashboard'
  | 'reservedLogin'
  | 'forgotPassword'
  | 'resetPassword'
  | 'adminDashboard'
  | 'refertatoreDashboard';

@Component({
  selector: 'report-editor',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    WizardHeader,
    StepAnagrafica,
    StepVisita,
    StepSezioni,
    ResetModal,
    StepContenuti,
    EmgAnamnesiForm,
    PsgAnamnesiForm,
  ],
  templateUrl: './report-editor.html',
  styleUrl: './report-editor.css',
})
export class ReportEditor {
  step = 0;
  uiState: EditorUiState = 'initialTypeSelection';
  selectedReportType: ReportType | null = null;

  readonly standardSteps = REPORT_STEPS;
  readonly emgSteps = EMG_REPORT_STEPS;
  readonly psgSteps = PSG_REPORT_STEPS;
  readonly sectionKeys = REPORT_SECTION_KEYS;
  readonly mandatorySections = REPORT_MANDATORY_SECTIONS;
  readonly fallbackDoctors: DoctorInfo[] = REPORT_DOCTORS;
  doctors: DoctorInfo[] = REPORT_DOCTORS;
  professionals: ProfessionalItem[] = [];
  refertatoriEmg: DoctorInfo[] = [];
  refertatoriPsg: DoctorInfo[] = [];
  reservedUser: AuthUser | null = null;
  reservedLoginEmail = '';
  reservedLoginPassword = '';
  reservedLoginLoading = false;
  reservedLoginError = '';
  forgotPasswordEmail = '';
  forgotPasswordLoading = false;
  forgotPasswordMessage = '';
  resetPasswordToken = '';
  resetPasswordValue = '';
  resetPasswordConfirm = '';
  resetPasswordLoading = false;
  resetPasswordMessage = '';
  refertatoreDrafts: ReportDraftSummary[] = [];
  refertatoreArchiveDrafts: ReportDraftSummary[] = [];
  refertatoreDashboardLoading = false;
  refertatoreDashboardError = '';
  adminUsers: AdminUserItem[] = [];
  adminProfessionals: ProfessionalItem[] = [];
  adminDrafts: ReportDraftSummary[] = [];
  adminArchiveDrafts: ReportDraftSummary[] = [];
  auditLogs: AuditLogItem[] = [];
  draftEmailDeliveries: DraftEmailDeliveryItem[] = [];
  adminDashboardLoading = false;
  adminDashboardError = '';
  adminTab: 'professionals' | 'users' | 'drafts' | 'archive' | 'audit' = 'professionals';
  draftActionLoadingId: string | null = null;
  adminUserForm = {
    id: '',
    role: 'refertatore' as 'admin' | 'refertatore',
    email: '',
    password: '',
    display_name: '',
    specializzazione: '',
    assignedTypes: [] as Array<'emg' | 'psg'>,
  };
  adminProfessionalForm = {
    id: '',
    first_name: '',
    last_name: '',
    display_name: '',
    title: '',
    email: '',
    phone: '',
    specializzazione: '',
    role_label: '',
    professional_type: 'medico' as 'medico' | 'tecnico',
    visible_in_standard: true,
    is_refertatore: false,
    active: true,
    sort_order: 0,
  };

  doctorResults: DoctorInfo[] = [];
  technicalResults: DoctorInfo[] = [];
  drafts: ReportDraftSummary[] = [];
  doctorSearch!: FormControl<string>;
  technicalSearch!: FormControl<string>;
  sections!: ReturnType<typeof createReportSectionsForm>;
  form!: ReturnType<typeof createReportForm>;

  showResetModal = false;
  showDraftsModal = false;
  draftBrowserMode: 'active' | 'archive' = 'active';
  showPsgAnamnesisModal = false;
  showEmgAnamnesisModal = false;
  draftSaving = false;
  draftLoaded = false;
  draftError = '';
  draftMessage = '';
  draftMessageType: 'success' | 'error' | 'warning' | 'info' = 'info';
  currentDraftId: string | null = null;
  currentDraftStatus: ReportDraftStatus | null = null;
  draftLoadingId: string | null = null;
  deletingDraftId: string | null = null;
  draftsLoading = false;
  draftsError = '';
  attachmentsReloadNotice = '';
  currentDraftAttachments: DraftAttachmentMetadata[] = [];
  completedReadonlyMode = false;
  draftSentToRefertatore = false;
  draftFilters: ReportDraftFilters = {
    tipo_referto: 'standard',
    stato: '',
    scope: 'active',
    q: '',
    limit: 20,
    offset: 0,
  };
  draftListTotal = 0;
  readonly draftStatusOptions: Array<{ value: ReportDraftStatus; label: string }> = [
    { value: 'bozza', label: 'Bozza' },
    { value: 'anamnesi_raccolta', label: 'Anamnesi raccolta' },
    { value: 'in_refertazione', label: 'In refertazione' },
    { value: 'in_attesa_neurologo', label: 'In attesa refertatore' },
    { value: 'in_refertazione_neurologo', label: 'Refertazione in corso' },
    { value: 'pronto_per_firma', label: 'Pronto per firma' },
    { value: 'firmato_caricato', label: 'Firmato caricato' },
    { value: 'completato', label: 'Completato' },
  ];
  neurologistEmail = '';
  neurologistPassword = '';
  neurologistLoginLoading = false;
  neurologistLoginError = '';
  neurologistUser: AuthUser | null = null;
  neurologistToken = '';
  neurologistDrafts: ReportDraftSummary[] = [];
  neurologistDraftsLoading = false;
  neurologistDraftsError = '';
  neurologistOpeningDraftId: string | null = null;
  emgNeurologistMode = false;
  reviewerMode = false;
  signedPdfSaving = false;
  showSendToPatientModal = false;
  sendToPatientLoading = false;
  sendToPatientError = '';
  sendToPatientDraft: ReportDraftSummary | null = null;
  sendToPatientForm = {
    to: '',
    subject: '',
    body: '',
    confirmed: false,
  };
  emgSignedPdfAsset: EmgUploadedAsset | null = null;
  psgSignedPdfAsset: EmgUploadedAsset | null = null;
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
    this.restoreReservedSession();
    this.loadOperationalOptions();
    this.captureResetPasswordToken();
    this.goToInitialTypeSelection();
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

  get hasSavedPsgAnamnesis(): boolean {
    return (
      this.reportType === 'psg' &&
      (this.currentDraftStatus === 'anamnesi_raccolta' ||
        this.currentDraftStatus === 'in_refertazione' ||
        this.currentDraftStatus === 'completato')
    );
  }

  get selectedTypeLabel(): string {
    if (this.selectedReportType === 'emg') return 'Elettromiografia / EMG';
    if (this.selectedReportType === 'psg') return 'Polisonnografia / PSG';
    return 'Referto standard';
  }

  get selectedTypeDescription(): string {
    if (this.selectedReportType === 'emg') {
      return 'Refertazione elettrofisiologica con dati tecnici, checklist anamnestica e tracciati.';
    }

    if (this.selectedReportType === 'psg') {
      return 'Refertazione polisonnografica cardio-respiratoria con anamnesi del sonno, ESS e report strumentale.';
    }

    return 'Referto medico generico con sezioni personalizzabili.';
  }

  get showNeurologistAreaCard(): boolean {
    return false;
  }

  get isReadonlyWizardMode(): boolean {
    return this.reviewerMode || this.completedReadonlyMode;
  }

  get isArchiveBrowserMode(): boolean {
    return this.draftBrowserMode === 'archive';
  }

  get showPrimaryAction(): boolean {
    return !this.completedReadonlyMode;
  }

  get showDraftWriteActions(): boolean {
    return !this.completedReadonlyMode;
  }

  get draftBrowserTitle(): string {
    return this.isArchiveBrowserMode
      ? `Archivio referti ${this.selectedTypeLabel}`
      : `Riprendi referto ${this.selectedTypeLabel}`;
  }

  get draftBrowserDescription(): string {
    return this.isArchiveBrowserMode
      ? 'Consulta i referti completati e apri il PDF firmato archiviato, se disponibile.'
      : 'Visualizza e riprendi solo le bozze operative del tipo referto selezionato.';
  }

  get currentSignedStoredAttachment(): DraftAttachmentMetadata | null {
    if (this.reportType === 'emg') {
      return (
        this.currentDraftAttachments.find(
          (item) => item.kind === 'emg_pdf_firmato',
        ) || null
      );
    }

    if (this.reportType === 'psg') {
      return (
        this.currentDraftAttachments.find(
          (item) => item.kind === 'psg_pdf_firmato',
        ) || null
      );
    }

    return null;
  }

  get showSignedArchiveCard(): boolean {
    return (
      this.completedReadonlyMode &&
      (this.reportType === 'emg' || this.reportType === 'psg')
    );
  }

  get canSendSignedReportForCurrentDraft(): boolean {
    return (
      !!this.reservedUser &&
      this.reservedUser.role === 'admin' &&
      this.completedReadonlyMode &&
      (this.reportType === 'emg' || this.reportType === 'psg') &&
      !!this.currentSignedStoredAttachment
    );
  }

  get filteredDraftStatusOptions(): Array<{
    value: ReportDraftStatus;
    label: string;
  }> {
    return this.isArchiveBrowserMode
      ? this.draftStatusOptions.filter((item) =>
          item.value === 'completato' || item.value === 'firmato_caricato',
        )
      : this.draftStatusOptions.filter(
          (item) =>
            item.value !== 'completato' && item.value !== 'firmato_caricato',
        );
  }

  get neurologistDisplayName(): string {
    return this.reservedUser?.displayName || this.neurologistUser?.displayName || 'Refertatore';
  }

  get showControlPreviewButton(): boolean {
    return (
      !this.completedReadonlyMode &&
      this.step === this.steps.length - 1 &&
      (this.reportType === 'psg' ||
        (this.reportType === 'emg' && !this.emgNeurologistMode))
    );
  }

  get currentSignedPdfAsset(): EmgUploadedAsset | null {
    if (this.reportType === 'emg') {
      return this.emgSignedPdfAsset;
    }

    if (this.reportType === 'psg') {
      return this.psgSignedPdfAsset;
    }

    return null;
  }

  get refertatoreAssignedTypes(): Array<'emg' | 'psg'> {
    return this.reservedUser?.assignedTypes ?? [];
  }

  get hasEmgAssignment(): boolean {
    return this.refertatoreAssignedTypes.includes('emg');
  }

  get hasPsgAssignment(): boolean {
    return this.refertatoreAssignedTypes.includes('psg');
  }

  stepHint(): string {
    if (this.reportType === 'psg') {
      switch (this.step) {
        case 1:
          return "Configura i dati della registrazione e seleziona il refertatore assegnato.";
        case 2:
          return this.reviewerMode
            ? 'Completa la parte clinica del referto PSG usando i dati raccolti dall’operatore.'
            : 'Compila il quesito clinico e prepara i dati che verranno inviati al refertatore.';
        case 3:
          return this.reviewerMode
            ? "Esporta il PDF PSG da firmare senza salvarlo su Drive, poi ricarica il PDF firmato per l'archiviazione definitiva."
            : "Verifica report strumentale e dati raccolti, poi invia la PSG al refertatore assegnato.";
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
        return "Raccogli il quesito clinico. La checklist anamnestica EMG e disponibile nella card dedicata in Anagrafica.";
      case 3:
        return this.emgNeurologistMode
          ? "Completa Reperti e Conclusioni, esporta il PDF temporaneo da firmare e poi carica il PDF firmato per il salvataggio definitivo su Drive."
          : "Completa il contenuto tecnico EMG e invia l'acquisizione al refertatore. La copia di controllo resta temporanea e non viene salvata su Drive.";
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
        if (this.reportType === 'emg' && this.emgNeurologistMode) {
          return true;
        }
        return this.form.get('anagrafica')?.valid ?? false;

      case 1:
        if (this.reportType === 'emg') {
          if (this.emgNeurologistMode) {
            return true;
          }

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
          if (this.emgNeurologistMode) {
            return true;
          }

          return (
            this.control('emg.quesitoDiagnostico').valid &&
            this.control('emg.distrettoEsaminato').valid
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
          return this.emgNeurologistMode
            ? (
                this.control('emg.repertiElettrofisiologici').valid &&
                this.control('emg.conclusioni').valid
              )
            : (
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
          if (this.emgNeurologistMode) {
            mark(this.control('emg.repertiElettrofisiologici'));
            mark(this.control('emg.conclusioni'));
          } else {
            mark(this.control('emg.esameEseguito'));
            mark(this.control('emg.firmaTecnico'));
          }
          break;
        }

        if (this.reportType === 'psg') {
          mark(this.control('psg.reportStrumentalePdf'));
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
      if (this.emgNeurologistMode) {
        repertiElettrofisiologici.setValidators([
          Validators.required,
          this.plainTextMaxLength(4000),
        ]);
        conclusioni.setValidators([
          Validators.required,
          this.plainTextMaxLength(2000),
        ]);
      } else {
        repertiElettrofisiologici.clearValidators();
        conclusioni.clearValidators();
      }
      consensoInformatoTesto.setValidators([this.plainTextMaxLength(2500)]);
      materialeProdotto.setValidators([Validators.maxLength(1500)]);
      noteTecnicheEsecutore.setValidators([this.plainTextMaxLength(2000)]);
      attestazioneTecnico.setValidators([this.plainTextMaxLength(2500)]);
      firmaTecnico.setValidators(
        this.emgNeurologistMode ? [] : [Validators.required],
      );
      checklistControls.forEach((control: FormControl) =>
        control.setValidators([Validators.required]),
      );

      if (this.emgNeurologistMode) {
        repertiElettrofisiologici.enable({ emitEvent: false });
        conclusioni.enable({ emitEvent: false });
      } else {
        repertiElettrofisiologici.disable({ emitEvent: false });
        conclusioni.disable({ emitEvent: false });
      }

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
      psgInterpretazioneMedico.setValidators(
        this.reviewerMode
          ? [Validators.required, this.plainTextMaxLength(4500)]
          : [this.plainTextMaxLength(4500)],
      );
      psgConclusioneDiagnostica.setValidators(
        this.reviewerMode
          ? [Validators.required, this.plainTextMaxLength(2500)]
          : [this.plainTextMaxLength(2500)],
      );
      psgIndicazioniCliniche.setValidators(
        this.reviewerMode
          ? [Validators.required, this.plainTextMaxLength(2500)]
          : [this.plainTextMaxLength(2500)],
      );
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
    this.currentDraftId = null;
    this.currentDraftStatus = null;
    this.draftLoaded = false;
    this.resetTransientUiState();
    this.form.reset(this.getFreshFormState() as any);
    this.sections.reset(this.getFreshSectionsState() as any);
    if (this.selectedReportType) {
      this.control('tipoReferto').setValue(this.selectedReportType);
    }

    for (const k of this.sectionKeys) {
      this.section(k).enable({ emitEvent: false });
    }

    if (this.selectedReportType) {
      this.applyReportTypeDefaults(this.selectedReportType);
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
    if (this.step !== this.steps.length - 1) {
      return 'Avanti';
    }

    if (
      (this.reportType === 'emg' || this.reportType === 'psg') &&
      !this.reviewerMode
    ) {
      return 'Invia al refertatore';
    }

    if (this.reviewerMode) {
      return 'Esporta PDF da firmare';
    }

    return 'Genera Referto';
  }

  selectReportType(type: ReportType): void {
    this.selectedReportType = type;
    this.draftFilters.tipo_referto = type;
    this.draftFilters.stato = '';
    this.draftFilters.q = '';
    this.draftFilters.offset = 0;
    this.uiState = 'typeActionSelection';
    this.draftMessage = '';
    this.draftError = '';
    this.attachmentsReloadNotice = '';
  }

  goToInitialTypeSelection(): void {
    this.uiState = 'initialTypeSelection';
    this.selectedReportType = null;
    this.setEmgNeurologistMode(false);
    this.closeResumeDraftModal();
    this.closePsgAnamnesisModal();
    this.closeEmgAnamnesisModal();
  }

  goToTypeActionSelection(): void {
    if (!this.selectedReportType) {
      this.uiState = 'initialTypeSelection';
      return;
    }

    this.uiState = 'typeActionSelection';
    this.setEmgNeurologistMode(false);
    this.closeResumeDraftModal();
    this.closePsgAnamnesisModal();
    this.closeEmgAnamnesisModal();
  }

  startNewReport(): void {
    if (!this.selectedReportType) {
      this.setDraftMessage('Seleziona prima il tipo di referto.', 'warning');
      this.uiState = 'initialTypeSelection';
      return;
    }

    this.currentDraftId = null;
    this.currentDraftStatus = null;
    this.draftLoaded = false;
    this.setEmgNeurologistMode(false);
    this.step = 0;
    this.doctorSearch.reset('');
    this.technicalSearch.reset('');
    this.doctorResults = [];
    this.technicalResults = [];
    this.resetTransientUiState();
    this.form.reset(this.getFreshFormState() as any);
    this.sections.reset(this.getFreshSectionsState() as any);
    this.control('tipoReferto').setValue(this.selectedReportType);
    this.applyReportTypeDefaults(this.selectedReportType);
    this.updateModeValidators();
    this.uiState = 'wizard';
    this.setDraftMessage('Nuovo referto inizializzato.', 'info');
  }

  startResumeForSelectedType(): void {
    if (!this.selectedReportType) {
      this.setDraftMessage('Seleziona prima il tipo di referto.', 'warning');
      this.uiState = 'initialTypeSelection';
      return;
    }

    this.draftFilters.tipo_referto = this.selectedReportType;
    this.draftFilters.offset = 0;
    this.openResumeDraftModal();
  }

  startArchiveForSelectedType(): void {
    if (!this.selectedReportType) {
      this.setDraftMessage('Seleziona prima il tipo di referto.', 'warning');
      this.uiState = 'initialTypeSelection';
      return;
    }

    this.draftFilters.tipo_referto = this.selectedReportType;
    this.draftFilters.offset = 0;
    this.openArchiveModal();
  }

  startNeurologistArea(): void {
    this.openReservedArea();
  }

  primaryAction(): void {
    if (this.completedReadonlyMode) {
      return;
    }

    if (this.step === this.steps.length - 1) {
      if (
        (this.reportType === 'emg' || this.reportType === 'psg') &&
        !this.reviewerMode
      ) {
        void this.sendDraftToRefertatore();
        return;
      }

      if (this.reviewerMode) {
        void this.exportPdfForSignature();
        return;
      }

      void this.generatePdf();
      return;
    }

    this.next();
  }

  async exportControlCopy(): Promise<void> {
    if (this.reportType !== 'emg' && this.reportType !== 'psg') {
      return;
    }

    if (!this.isPreviewExportValid()) {
      return;
    }

    const payload = this.payloadBuilder.build(
      this.form.getRawValue(),
      this.sections.getRawValue(),
    );

    const ok = await this.openPreviewPdfBlob(payload);

    if (ok) {
      this.setDraftMessage(
        'Copia di controllo esportata senza salvataggio su Drive.',
        'success',
      );
    }
  }

  private async exportPdfForSignature(): Promise<void> {
    if (!this.reviewerMode) {
      return;
    }

    if (!this.isPreviewExportValid(true)) {
      return;
    }

    const savedDraft = await this.saveNeurologistDraftProgress(false);
    if (!savedDraft) {
      return;
    }

    const payload = this.payloadBuilder.build(
      this.form.getRawValue(),
      this.sections.getRawValue(),
    );

    const ok = await this.openPreviewPdfBlob(payload);

    if (!ok) {
      return;
    }

    if (this.currentDraftId) {
      try {
        const updatedDraft = await firstValueFrom(
          this.api.updateDraftStatus(this.currentDraftId, 'pronto_per_firma'),
        );
        this.currentDraftStatus = updatedDraft.stato;
      } catch (error) {
        console.error('Errore aggiornamento stato pronto per firma:', error);
        this.setDraftMessage(
          'PDF esportato correttamente, ma non sono riuscito ad aggiornare lo stato della bozza a pronto per firma.',
          'warning',
        );
        return;
      }
    }

    this.setDraftMessage(
      this.reportType === 'psg'
        ? "PDF PSG esportato senza salvataggio su Drive. Firma il file esternamente e poi caricalo nella sezione 'Carica PDF firmato'."
        : "PDF EMG esportato senza salvataggio su Drive. Firma il file esternamente e poi caricalo nella sezione 'Carica PDF firmato'.",
      'success',
    );
  }

  private isPreviewExportValid(requireSignatureReady = false): boolean {
    if (this.reportType === 'psg') {
      if (!requireSignatureReady) {
        return true;
      }

      this.form.markAllAsTouched();

      if (!this.isPsgAnamnesisReadyForSave()) {
        this.setDraftMessage(
          "Completa l'anamnesi PSG e la Scala ESS prima di esportare il PDF da firmare.",
          'warning',
        );
        this.showPsgAnamnesisModal = true;
        return false;
      }

      if (!this.reviewerMode && this.form.invalid) {
        this.setDraftMessage(
          'Completa tutti i campi obbligatori PSG e carica il report strumentale prima di esportare il PDF da firmare.',
          'warning',
        );
        return false;
      }

      if (this.reviewerMode) {
        const requiredReviewerControls = [
          this.control('psg.quesitoClinico'),
          this.control('psg.interpretazioneMedico'),
          this.control('psg.conclusioneDiagnostica'),
          this.control('psg.indicazioniCliniche'),
          this.control('psg.reportStrumentalePdf'),
        ];

        if (requiredReviewerControls.some((control) => control.invalid)) {
          this.setDraftMessage(
            'Completa i campi clinici PSG e verifica il report strumentale prima di esportare il PDF da firmare.',
            'warning',
          );
          return false;
        }
      }

      return true;
    }

    if (this.reportType === 'emg' && this.emgNeurologistMode) {
      const repertiControl = this.control('emg.repertiElettrofisiologici');
      const conclusioniControl = this.control('emg.conclusioni');

      repertiControl.markAsTouched();
      conclusioniControl.markAsTouched();

      if (!requireSignatureReady) {
        return true;
      }

      const repertiFilled = !!this.stripHtml(repertiControl.value);
      const conclusioniFilled = !!this.stripHtml(conclusioniControl.value);

      if (!repertiFilled || !conclusioniFilled) {
        this.setDraftMessage(
          'Compila Reperti elettrofisiologici e Conclusioni prima di esportare il PDF da firmare.',
          'warning',
        );
        return false;
      }

      if (repertiControl.invalid || conclusioniControl.invalid) {
        this.setDraftMessage(
          'Verifica i campi del refertatore prima di esportare il PDF da firmare.',
          'warning',
        );
        return false;
      }
    }

    return true;
  }

  private async openPreviewPdfBlob(payload: ReportPdfRequest): Promise<boolean> {
    try {
      const blob = await firstValueFrom(this.api.previewPdf(payload));
      if (this.reviewerMode && this.currentDraftId) {
        void firstValueFrom(this.api.exportRefertatoreDraftPreview(this.currentDraftId));
      }
      const opened = this.openBlobInNewTab(
        blob,
        `${payload.titolo_visita || 'referto-temporaneo'}.pdf`,
      );

      if (!opened) {
        this.setDraftMessage(
          'PDF generato, ma il browser ha bloccato l’apertura automatica. Controlla i download o i popup bloccati.',
          'warning',
        );
      }

      return true;
    } catch (error) {
      console.error('Errore export PDF temporaneo:', error);
      this.setDraftMessage(
        'Impossibile esportare il PDF temporaneo senza Drive. Riprova tra qualche istante.',
        'error',
      );
      return false;
    }
  }

  private openBlobInNewTab(blob: Blob, fallbackFileName: string): boolean {
    const objectUrl = URL.createObjectURL(blob);
    const win = window.open(objectUrl, '_blank', 'noopener,noreferrer');

    if (win) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return true;
    }

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fallbackFileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
    return true;
  }

  onSignedPdfSelected(asset: EmgUploadedAsset | null): void {
    if (this.reportType === 'emg') {
      this.emgSignedPdfAsset = asset;
      return;
    }

    if (this.reportType === 'psg') {
      this.psgSignedPdfAsset = asset;
    }
  }

  async saveSignedPdfToDrive(): Promise<void> {
    if (!this.reviewerMode) {
      return;
    }

    const asset = this.currentSignedPdfAsset;

    if (!asset || asset.kind !== 'pdf' || !asset.base64) {
      this.setDraftMessage(
        'Carica prima il PDF firmato da salvare definitivamente su Drive.',
        'warning',
      );
      return;
    }

    if (!this.currentDraftId) {
      this.setDraftMessage(
        'Salva o riprendi prima una bozza valida prima di caricare il PDF firmato.',
        'warning',
      );
      return;
    }

    const confirmed = window.confirm(
      'Confermi di voler salvare questo PDF firmato come referto definitivo su Drive?',
    );

    if (!confirmed) {
      return;
    }

    this.signedPdfSaving = true;

    try {
      const response = await firstValueFrom(
        this.api.uploadSignedDraftPdf(
          this.currentDraftId,
          {
            tipo_referto: this.reportType as 'emg' | 'psg',
            fileName: asset.name,
            mimeType: 'application/pdf',
            base64: asset.base64,
          },
          this.emgNeurologistMode ? this.neurologistToken : undefined,
        ),
      );

      this.currentDraftStatus = response.draft.stato;

      if (this.reportType === 'emg') {
        this.emgSignedPdfAsset = null;
      } else if (this.reportType === 'psg') {
        this.psgSignedPdfAsset = null;
      }

      if (this.currentDraftId) {
        await this.hydratePersistedAttachments(
          this.currentDraftId,
          this.emgNeurologistMode ? this.neurologistToken : undefined,
        );
      }

      this.completedReadonlyMode = true;
      await this.refreshDraftList(false);
      if (this.emgNeurologistMode) {
        await this.openNeurologistDashboard();
      }

      this.setDraftMessage(
        'PDF firmato caricato e salvato su Drive come referto definitivo.',
        'success',
      );
    } catch (error) {
      console.error('Errore salvataggio PDF firmato su Drive:', error);
      this.setDraftMessage(
        'Impossibile salvare il PDF firmato su Drive. Riprova tra qualche istante.',
        'error',
      );
    } finally {
      this.signedPdfSaving = false;
    }
  }

  async saveDraft(status?: ReportDraftStatus): Promise<void> {
    if (this.emgNeurologistMode && this.currentDraftId) {
      await this.saveNeurologistDraftProgress();
      return;
    }

    const nextStatus = status ?? this.resolveDraftStatusForSave();
    await this.persistDraft(nextStatus, 'Bozza salvata.');
  }

  async savePsgAnamnesis(closeAfterSave = false): Promise<void> {
    if (this.reportType !== 'psg') {
      return;
    }

    this.markPsgAnamnesisTouched();

    if (!this.isPsgAnamnesisReadyForSave()) {
      this.setDraftMessage(
        'Compila completamente anamnesi del sonno, farmaci, comorbidita e Scala ESS prima di salvare.',
        'error',
      );
      return;
    }

    const savedDraft = await this.persistDraft(
      'anamnesi_raccolta',
      'Anamnesi PSG salvata.',
    );

    if (savedDraft && closeAfterSave) {
      this.showPsgAnamnesisModal = false;
      this.uiState = 'wizard';
    }
  }

  async saveEmgAnamnesis(closeAfterSave = false): Promise<void> {
    if (this.reportType !== 'emg') {
      return;
    }

    this.markEmgChecklistTouched();

    if (!this.isEmgChecklistComplete()) {
      this.setDraftMessage(
        'Completa la checklist anamnestica EMG: ogni voce richiede Si o No.',
        'error',
      );
      return;
    }

    const savedDraft = await this.persistDraft(
      'anamnesi_raccolta',
      'Anamnesi EMG salvata. Il referto puo essere ripreso successivamente.',
    );

    if (savedDraft && closeAfterSave) {
      this.showEmgAnamnesisModal = false;
      this.uiState = 'wizard';
    }
  }

  async submitNeurologistLogin(): Promise<void> {
    this.neurologistLoginError = '';

    if (!this.neurologistEmail.trim() || !this.neurologistPassword.trim()) {
      this.neurologistLoginError = 'Inserisci email e password dell’Area Riservata.';
      return;
    }

    this.neurologistLoginLoading = true;

    try {
      const response = await firstValueFrom(
        this.api.login(
          this.neurologistEmail.trim(),
          this.neurologistPassword,
        ),
      );

      this.neurologistUser = response.user;
      this.reservedUser = response.user;
      this.neurologistToken = 'session';
      this.neurologistPassword = '';
      this.persistNeurologistSession();
      await this.routeReservedUserDashboard();
    } catch (error) {
      console.error('Errore login area riservata:', error);
      this.neurologistLoginError = 'Credenziali non valide.';
    } finally {
      this.neurologistLoginLoading = false;
    }
  }

  async logoutNeurologist(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch (error) {
      console.error('Errore logout area riservata:', error);
    }

    this.neurologistPassword = '';
    this.neurologistLoginError = '';
    this.neurologistDrafts = [];
    this.refertatoreDrafts = [];
    this.refertatoreArchiveDrafts = [];
    this.clearNeurologistSession();
    this.uiState = 'initialTypeSelection';
  }

  async openNeurologistDashboard(): Promise<void> {
    if (!this.reservedUser || this.reservedUser.role !== 'refertatore') {
      this.uiState = 'reservedLogin';
      return;
    }

    this.neurologistDraftsLoading = true;
    this.neurologistDraftsError = '';

    try {
      const assignedTypes = this.reservedUser.assignedTypes || [];
      const pairs = await Promise.all(
        assignedTypes.map(async (tipo) => {
          const [activeResponse, archiveResponse] = await Promise.all([
            firstValueFrom(this.api.listRefertatoreDrafts(tipo)),
            firstValueFrom(this.api.listRefertatoreArchive(tipo)),
          ]);

          return {
            active: activeResponse.items,
            archive: archiveResponse.items,
          };
        }),
      );

      this.refertatoreDrafts = pairs.flatMap((item) => item.active);
      this.refertatoreArchiveDrafts = pairs.flatMap((item) => item.archive);
      this.neurologistDrafts = this.refertatoreDrafts.filter(
        (draft) => draft.tipo_referto === 'emg',
      );
      this.uiState = 'refertatoreDashboard';
    } catch (error) {
      console.error('Errore caricamento area refertatore:', error);
      this.neurologistDraftsError =
        'Impossibile caricare i referti assegnati al refertatore.';
      this.uiState = 'reservedLogin';
      this.clearNeurologistSession();
    } finally {
      this.neurologistDraftsLoading = false;
    }
  }

  openResumeDraftModal(): void {
    this.draftBrowserMode = 'active';
    this.draftFilters.scope = 'active';
    this.draftFilters.stato =
      this.draftFilters.stato === 'completato' ||
      this.draftFilters.stato === 'firmato_caricato'
        ? ''
        : this.draftFilters.stato;
    if (this.selectedReportType) {
      this.draftFilters.tipo_referto = this.selectedReportType;
    }
    this.showDraftsModal = true;
    void this.refreshDraftList();
  }

  openArchiveModal(): void {
    this.draftBrowserMode = 'archive';
    this.draftFilters.scope = 'archive';
    this.draftFilters.stato =
      this.draftFilters.stato &&
      this.draftFilters.stato !== 'completato' &&
      this.draftFilters.stato !== 'firmato_caricato'
        ? ''
        : this.draftFilters.stato;
    if (this.selectedReportType) {
      this.draftFilters.tipo_referto = this.selectedReportType;
    }
    this.showDraftsModal = true;
    void this.refreshDraftList();
  }

  closeResumeDraftModal(): void {
    this.showDraftsModal = false;
    this.draftsError = '';
  }

  openPsgAnamnesisModal(): void {
    this.showPsgAnamnesisModal = true;
  }

  closePsgAnamnesisModal(): void {
    this.showPsgAnamnesisModal = false;
  }

  openEmgAnamnesisModal(): void {
    this.showEmgAnamnesisModal = true;
  }

  closeEmgAnamnesisModal(): void {
    this.showEmgAnamnesisModal = false;
  }

  async applyDraftFilters(resetOffset = false): Promise<void> {
    if (resetOffset) {
      this.draftFilters.offset = 0;
    }

    await this.refreshDraftList();
  }

  async loadDraft(id: string): Promise<void> {
    this.draftLoadingId = id;
    this.draftError = '';
    this.draftsError = '';

    try {
      const draft = await firstValueFrom(this.api.getDraft(id));

      if (this.selectedReportType && draft.tipo_referto !== this.selectedReportType) {
        this.draftsError =
          'La bozza selezionata appartiene a un tipo referto diverso da quello scelto.';
        return;
      }

      await this.hydrateDraft(draft, {
        readonlyMode:
          this.isArchiveBrowserMode ||
          draft.stato === 'completato' ||
          draft.stato === 'firmato_caricato',
      });
      this.showDraftsModal = false;
      this.uiState = 'wizard';
      this.setDraftMessage(
        this.isArchiveBrowserMode
          ? 'Referto archiviato aperto in sola lettura.'
          : 'Referto ripreso.',
        'success',
      );
    } catch (error) {
      console.error('Errore caricamento bozza:', error);
      this.draftsError =
        'Impossibile caricare la bozza selezionata. Riprova tra qualche istante.';
    } finally {
      this.draftLoadingId = null;
    }
  }

  async openNeurologistDraft(id: string): Promise<void> {
    if (!this.reservedUser) {
      this.uiState = 'reservedLogin';
      return;
    }

    this.neurologistOpeningDraftId = id;
    this.neurologistDraftsError = '';

    try {
      const draft = await firstValueFrom(
        this.api.getRefertatoreDraft(id),
      );
      await this.hydrateDraft(draft, {
        neurologistMode: true,
        neurologistToken: 'session',
      });
      this.uiState = 'wizard';
      this.setDraftMessage('Referto assegnato aperto in area refertatore.', 'success');
    } catch (error) {
      console.error('Errore apertura referto refertatore:', error);
      this.neurologistDraftsError =
        'Impossibile aprire il referto assegnato selezionato.';
    } finally {
      this.neurologistOpeningDraftId = null;
    }
  }

  async deleteDraftRecord(id: string): Promise<void> {
    const draft = this.drafts.find((item) => item.id === id) || null;

    if (!draft || !this.isDraftDeletable(draft)) {
      this.draftsError =
        'I referti completati non possono essere eliminati dalla UI operativa.';
      return;
    }

    const confirmed = window.confirm(this.buildDeleteDraftConfirmationMessage(draft));

    if (!confirmed) {
      return;
    }

    this.deletingDraftId = id;
    this.draftsError = '';

    try {
      await firstValueFrom(this.api.deleteDraft(id));
      if (this.currentDraftId === id) {
        this.currentDraftId = null;
        this.currentDraftStatus = null;
        this.draftLoaded = false;
      }
      await this.refreshDraftList();
      this.setDraftMessage('Bozza eliminata.', 'success');
    } catch (error) {
      console.error('Errore eliminazione bozza:', error);
      this.draftsError =
        "Impossibile eliminare la bozza selezionata. Riprova tra qualche istante.";
    } finally {
      this.deletingDraftId = null;
    }
  }

  async hydrateDraft(
    draft: ReportDraftDetail,
    options: {
      neurologistMode?: boolean;
      neurologistToken?: string;
      readonlyMode?: boolean;
    } = {},
  ): Promise<void> {
    const formData = draft.form_data?.form ?? {};
    const sectionsData = draft.form_data?.sections ?? {};
    const meta = draft.form_data?.meta;
    const rawForm = this.getFreshFormState();
    const rawSections = this.getFreshSectionsState();
    const tipoReferto = draft.tipo_referto || formData.tipoReferto || 'standard';
    this.selectedReportType = tipoReferto;

    this.emgNeurologistMode =
      !!options.neurologistMode &&
      draft.stato !== 'completato' &&
      draft.stato !== 'firmato_caricato';
    this.resetTransientUiState();
    this.setEmgNeurologistMode(false);
    this.form.reset(rawForm as any);
    this.sections.reset(rawSections as any);
    this.step = 0;

    this.control('tipoReferto').setValue(tipoReferto);
    this.form.patchValue(formData);
    this.sections.patchValue(sectionsData);

    this.currentDraftId = draft.id;
    this.currentDraftStatus = draft.stato;
    this.draftSentToRefertatore = !!meta?.sentToRefertatore;
    this.draftLoaded = true;
    this.completedReadonlyMode =
      !!options.readonlyMode ||
      draft.stato === 'completato' ||
      draft.stato === 'firmato_caricato';
    this.step = this.clampStep(meta?.currentStep ?? 0);
    this.uiState = 'wizard';

    this.doctorSearch.setValue(
      this.buildDoctorSearchLabel(
        this.control('medico.nome').value,
        this.control('medico.cognome').value,
      ),
      { emitEvent: false },
    );
    this.technicalSearch.setValue(this.control('emg.tecnicoEsecutore').value || '', {
      emitEvent: false,
    });
    this.doctorResults = [];
    this.technicalResults = [];

    this.refreshDerivedStateAfterDraftLoad();
    await this.hydratePersistedAttachments(
      draft.id,
      options.neurologistToken,
    );
    if (this.completedReadonlyMode) {
      this.form.disable({ emitEvent: false });
      this.sections.disable({ emitEvent: false });
      this.reviewerMode = false;
      this.emgNeurologistMode = false;
    } else {
      this.setEmgNeurologistMode(this.emgNeurologistMode);
    }
    this.attachmentsReloadNotice = this.buildAttachmentsReloadNotice();
  }

  async generatePdf(): Promise<void> {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      if (this.reportType === 'psg' && !this.isPsgAnamnesisReadyForSave()) {
        this.setDraftMessage(
          "Completa l'anamnesi PSG e la Scala ESS prima di generare il referto finale.",
          'warning',
        );
        this.showPsgAnamnesisModal = true;
      }

      if (this.reportType === 'emg' && !this.isEmgChecklistComplete()) {
        this.setDraftMessage(
          'Completa prima l’anamnesi EMG dalla sezione Anagrafica prima di generare il referto.',
          'warning',
        );
        this.showEmgAnamnesisModal = true;
      }
      return;
    }

    if (this.reportType === 'emg' && this.emgNeurologistMode && this.currentDraftId) {
      const saved = await this.saveNeurologistDraftProgress(false);
      if (!saved) {
        return;
      }
    }

    const formValue = this.form.getRawValue();
    const sectionsValue = this.sections.getRawValue();
    const payload = this.payloadBuilder.build(formValue, sectionsValue);

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
        void this.markDraftCompletedAfterPdfSuccess();
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

  private async persistDraft(
    status: ReportDraftStatus,
    successMessage: string,
  ): Promise<ReportDraftDetail | null> {
    this.draftSaving = true;
    this.draftError = '';

    try {
      const payload = this.buildDraftPayload(status);
      const savedDraft = this.currentDraftId
        ? await firstValueFrom(this.api.updateDraft(this.currentDraftId, payload))
        : await firstValueFrom(this.api.createDraft(payload));

      this.currentDraftId = savedDraft.id;
      this.currentDraftStatus = savedDraft.stato;
      this.draftLoaded = true;
      this.setDraftMessage(successMessage, 'success');
      await this.refreshDraftList(false);
      return savedDraft;
    } catch (error) {
      console.error('Errore salvataggio bozza:', error);
      this.draftError = 'Errore durante il salvataggio della bozza.';
      this.setDraftMessage(this.draftError, 'error');
      return null;
    } finally {
      this.draftSaving = false;
    }
  }

  private restoreNeurologistSession(): void {
    void this.restoreReservedSession();
  }

  private persistNeurologistSession(): void {
    // Gestione sessione delegata ai cookie HttpOnly del backend.
  }

  private clearNeurologistSession(): void {
    this.api.clearAuthState();
    this.neurologistToken = '';
    this.neurologistUser = null;
    this.reservedUser = null;
  }

  private async sendDraftToRefertatore(): Promise<void> {
    if (this.reportType !== 'emg' && this.reportType !== 'psg') {
      return;
    }

    this.form.markAllAsTouched();
    if (this.reportType === 'emg') {
      this.markEmgChecklistTouched();
      this.control('emg.firmaTecnico').markAsTouched();

      if (this.form.invalid || !this.isEmgChecklistComplete()) {
        this.setDraftMessage(
          'Completa tutti i dati tecnici EMG, la checklist neuropatie e la firma TNFP prima di inviare al refertatore.',
          'error',
        );
        return;
      }
    }

    if (this.reportType === 'psg') {
      if (!this.isPsgAnamnesisReadyForSave()) {
        this.setDraftMessage(
          "Completa l'anamnesi PSG e la Scala ESS prima di inviare il referto al refertatore.",
          'error',
        );
        this.showPsgAnamnesisModal = true;
        return;
      }

      const requiredPsgControls = [
        this.control('psg.dataRegistrazioneInizio'),
        this.control('psg.dataRegistrazioneFine'),
        this.control('psg.sistemaRegistrazione'),
        this.control('psg.staturaCm'),
        this.control('psg.pesoKg'),
        this.control('psg.bmi'),
        this.control('psg.consensoInformato'),
        this.control('psg.dataRefertazione'),
        this.control('prestazione'),
        this.control('medico.id'),
        this.control('psg.quesitoClinico'),
        this.control('psg.reportStrumentalePdf'),
      ];

      if (requiredPsgControls.some((control) => control.invalid)) {
        this.setDraftMessage(
          'Completa i dati obbligatori PSG, il quesito clinico e il report strumentale prima di inviare al refertatore.',
          'error',
        );
        return;
      }
    }

    this.draftSaving = true;
    this.draftError = '';

    try {
      const draftPayload = this.buildDraftPayload('in_refertazione');
      const savedDraft = this.currentDraftId
        ? await firstValueFrom(
            this.api.updateDraft(this.currentDraftId, draftPayload),
          )
        : await firstValueFrom(this.api.createDraft(draftPayload));

      this.currentDraftId = savedDraft.id;
      if (this.reportType === 'emg') {
        await this.syncEmgDraftAttachments(savedDraft.id);
      } else {
        await this.syncPsgDraftAttachments(savedDraft.id);
      }

      const sendResult = await firstValueFrom(
        this.api.sendDraftToRefertatore(savedDraft.id),
      );

      this.currentDraftStatus = sendResult.draft.stato;
      this.draftSentToRefertatore = true;
      this.draftLoaded = true;
      await this.hydratePersistedAttachments(savedDraft.id);
      this.attachmentsReloadNotice = this.buildAttachmentsReloadNotice();
      await this.refreshDraftList(false);
      this.setDraftMessage(
        sendResult.emailSent
          ? this.reportType === 'emg'
            ? 'Acquisizione tecnica salvata e inviata al refertatore.'
            : 'Bozza PSG salvata e inviata al refertatore.'
          : this.reportType === 'emg'
            ? 'Acquisizione tecnica salvata e assegnata al refertatore. Invio email non disponibile.'
            : 'Bozza PSG salvata e assegnata al refertatore. Invio email non disponibile.',
        'success',
      );
    } catch (error) {
      console.error('Errore invio referto al refertatore:', error);
      this.draftError =
        this.reportType === 'emg'
          ? "Impossibile completare l'invio al refertatore. Controlla gli allegati EMG e riprova."
          : "Impossibile completare l'invio PSG al refertatore. Controlla il report strumentale e riprova.";
      this.setDraftMessage(this.draftError, 'error');
    } finally {
      this.draftSaving = false;
    }
  }

  private async saveNeurologistDraftProgress(
    showSuccessMessage = true,
  ): Promise<ReportDraftDetail | null> {
    if (!this.currentDraftId || !this.neurologistToken) {
      this.setDraftMessage(
        'Sessione refertatore non disponibile per il salvataggio.',
        'warning',
      );
      return null;
    }

    this.draftSaving = true;
    this.draftError = '';

    try {
      const payload = this.buildDraftPayload(
        this.reportType === 'emg'
          ? 'in_refertazione_neurologo'
          : 'in_refertazione',
      );
      const savedDraft = await firstValueFrom(
        this.api.updateNeurologistEmgDraft(
          this.neurologistToken,
          this.currentDraftId,
          payload,
        ),
      );

      this.currentDraftStatus = savedDraft.stato;
      this.draftLoaded = true;

      if (showSuccessMessage) {
        this.setDraftMessage(
          'Progressi del refertatore salvati correttamente.',
          'success',
        );
      }

      return savedDraft;
    } catch (error) {
      console.error('Errore salvataggio refertatore:', error);
      this.draftError =
        'Impossibile salvare i campi del refertatore in questo momento.';
      this.setDraftMessage(this.draftError, 'error');
      return null;
    } finally {
      this.draftSaving = false;
    }
  }

  private buildDraftPayload(status: ReportDraftStatus): ReportDraftPayload {
    const rawForm = this.form.getRawValue();
    const rawSections = this.sections.getRawValue();
    const formSnapshot = JSON.parse(JSON.stringify(rawForm));

    formSnapshot.emg = {
      ...formSnapshot.emg,
      tracciati: [],
      firmaTecnico: null,
    };

    formSnapshot.psg = {
      ...formSnapshot.psg,
      reportStrumentalePdf: null,
    };

    return {
      tipo_referto: this.reportType,
      stato: status,
      summary: this.buildDraftSummary(formSnapshot),
      form_data: {
        form: formSnapshot,
        sections: JSON.parse(JSON.stringify(rawSections)),
        meta: {
          schemaVersion: 1,
          currentStep: this.step,
          draftStatus: status,
          sentToRefertatore:
            this.draftSentToRefertatore ||
            status === 'in_attesa_neurologo' ||
            status === 'in_refertazione_neurologo' ||
            status === 'pronto_per_firma' ||
            status === 'completato' ||
            status === 'firmato_caricato',
        },
      },
    };
  }

  private buildDraftSummary(formValue: any) {
    const pazienteNome = formValue.anagrafica?.nome?.trim() || null;
    const pazienteCognome = formValue.anagrafica?.cognome?.trim() || null;
    const nomeCompleto =
      `${formValue.anagrafica?.nome ?? ''} ${formValue.anagrafica?.cognome ?? ''}`.trim() ||
      null;
    const medicoRefertatore =
      `${formValue.medico?.nome ?? ''} ${formValue.medico?.cognome ?? ''}`.trim() ||
      null;

    return {
      paziente_nome: pazienteNome,
      paziente_cognome: pazienteCognome,
      paziente_nome_completo: nomeCompleto,
      data_nascita: formValue.anagrafica?.dataNascita || null,
      codice_fiscale: formValue.anagrafica?.codiceFiscale?.trim() || null,
      telefono: formValue.anagrafica?.telefono?.trim() || null,
      email: formValue.anagrafica?.email?.trim() || null,
      medico_refertatore: medicoRefertatore,
      medico_refertatore_id: formValue.medico?.id || null,
      assigned_refertatore_id:
        this.reportType === 'emg' || this.reportType === 'psg'
          ? formValue.medico?.id || null
          : null,
      assigned_refertatore_email:
        this.reportType === 'emg' || this.reportType === 'psg'
          ? this.findDoctorEmailById(formValue.medico?.id || '')
          : null,
      assigned_refertatore_name:
        this.reportType === 'emg' || this.reportType === 'psg'
          ? medicoRefertatore
          : null,
      assigned_refertatore_specializzazione:
        this.reportType === 'emg' || this.reportType === 'psg'
          ? formValue.medico?.specialita?.trim() || null
          : null,
      specializzazione: formValue.medico?.specialita?.trim() || null,
      prestazione: formValue.prestazione?.trim() || null,
      data_esame:
        formValue.tipoReferto === 'psg'
          ? this.extractDatePart(formValue.psg?.dataRegistrazioneInizio)
          : formValue.dataVisita || null,
    };
  }

  private resolveDraftStatusForSave(): ReportDraftStatus {
    if (this.emgNeurologistMode) {
      if (this.currentDraftStatus === 'pronto_per_firma') {
        return 'pronto_per_firma';
      }

      return 'in_refertazione_neurologo';
    }

    if (this.reportType === 'psg') {
      if (this.currentDraftStatus === 'pronto_per_firma') {
        return 'pronto_per_firma';
      }

      if (this.currentDraftStatus === 'completato') {
        return 'in_refertazione';
      }

      if (this.step > 0) {
        return 'in_refertazione';
      }

      if (this.currentDraftStatus === 'anamnesi_raccolta') {
        return 'anamnesi_raccolta';
      }
    }

    if (this.reportType === 'emg') {
      if (this.currentDraftStatus === 'in_attesa_neurologo') {
        return 'in_attesa_neurologo';
      }

      if (this.currentDraftStatus === 'pronto_per_firma') {
        return 'pronto_per_firma';
      }

      if (this.currentDraftStatus === 'in_refertazione_neurologo') {
        return 'in_refertazione_neurologo';
      }
    }

    if (this.currentDraftStatus === 'completato') {
      return 'in_refertazione';
    }

    return this.currentDraftStatus ?? 'bozza';
  }

  private async refreshDraftList(showModalIfEmpty = false): Promise<void> {
    this.draftsLoading = true;
    this.draftsError = '';

    try {
      const response = await firstValueFrom(this.api.listDrafts(this.draftFilters));
      const filteredItems = response.items.filter((item) => {
        if (this.selectedReportType && item.tipo_referto !== this.selectedReportType) {
          return false;
        }

        if (this.isArchiveBrowserMode) {
          return item.stato === 'completato' || item.stato === 'firmato_caricato';
        }

        return item.stato !== 'completato' && item.stato !== 'firmato_caricato';
      });
      this.drafts = filteredItems;
      this.draftListTotal = response.total;
      if (showModalIfEmpty) {
        this.showDraftsModal = true;
      }
    } catch (error) {
      console.error('Errore caricamento elenco bozze:', error);
      this.draftsError =
        'Impossibile recuperare l’elenco delle bozze. Riprova tra qualche istante.';
    } finally {
      this.draftsLoading = false;
    }
  }

  private async markDraftCompletedAfterPdfSuccess(): Promise<void> {
    if (!this.currentDraftId) {
      return;
    }

    try {
      const updatedDraft = await firstValueFrom(
        this.api.updateDraftStatus(this.currentDraftId, 'completato'),
      );
      this.currentDraftStatus = updatedDraft.stato;
      this.setDraftMessage('Bozza aggiornata come completata.', 'success');
    } catch (error) {
      console.error('Errore aggiornamento stato bozza:', error);
      this.setDraftMessage(
        "Il PDF e stato generato, ma non sono riuscito a segnare la bozza come completata.",
        'warning',
      );
    }
  }

  private setDraftMessage(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ): void {
    this.draftMessage = message;
    this.draftMessageType = type;
  }

  private resetTransientUiState(): void {
    this.attachmentsReloadNotice = '';
    this.draftError = '';
    this.draftMessage = '';
    this.draftMessageType = 'info';
    this.currentDraftAttachments = [];
    this.completedReadonlyMode = false;
    this.draftSentToRefertatore = false;
    this.showPsgAnamnesisModal = false;
    this.showEmgAnamnesisModal = false;
    this.emgSignedPdfAsset = null;
    this.psgSignedPdfAsset = null;
    this.form.get('emg.tracciati')?.setValue([], { emitEvent: false });
    this.form.get('emg.firmaTecnico')?.setValue(null, { emitEvent: false });
    this.form.get('psg.reportStrumentalePdf')?.setValue(null, { emitEvent: false });
  }

  private buildAttachmentsReloadNotice(): string {
    if (this.completedReadonlyMode || this.currentDraftStatus === 'completato') {
      return '';
    }

    if (this.reportType === 'emg') {
      const hasPersistedEmgAttachments =
        this.emgTraceAssets().some((asset) => asset.persisted) ||
        !!this.emgSignatureAsset()?.persisted;

      if (hasPersistedEmgAttachments) {
        return '';
      }

      return 'Tracciati EMG e firma TNFP non vengono salvati nella bozza: vanno ricaricati nella sessione corrente.';
    }

    if (this.reportType === 'psg') {
      const persistedReport = this.psgReportAsset()?.persisted;
      return persistedReport
        ? ''
        : 'Il report strumentale PSG non e ancora persistito in questa bozza: verra richiesto nuovamente finche il referto non viene inviato al refertatore.';
    }

    return '';
  }

  private clampStep(step: number): number {
    const safeStep = Number.isFinite(step) ? Math.trunc(step) : 0;
    return Math.min(Math.max(safeStep, 0), this.steps.length - 1);
  }

  private buildDoctorSearchLabel(nome?: string | null, cognome?: string | null): string {
    return `${cognome ?? ''} ${nome ?? ''}`.trim();
  }

  canOpenSignedPdf(draft?: ReportDraftSummary | null): boolean {
    const type = draft?.tipo_referto ?? this.reportType;
    if (type !== 'emg' && type !== 'psg') {
      return false;
    }

    if (!draft) {
      return !!this.currentSignedStoredAttachment;
    }

    return draft.stato === 'completato' || draft.stato === 'firmato_caricato';
  }

  canSendSignedReportToPatient(draft?: ReportDraftSummary | null): boolean {
    if (!this.reservedUser || this.reservedUser.role !== 'admin') {
      return false;
    }

    if (!draft) {
      return this.canSendSignedReportForCurrentDraft;
    }

    return (
      (draft.stato === 'completato' || draft.stato === 'firmato_caricato') &&
      (draft.tipo_referto === 'emg' || draft.tipo_referto === 'psg')
    );
  }

  async openSendToPatientModal(draft?: ReportDraftSummary | null): Promise<void> {
    const targetDraft =
      draft ||
      (this.currentDraftId
        ? ({
            id: this.currentDraftId,
            tipo_referto: this.reportType,
            stato: this.currentDraftStatus || 'completato',
            paziente_nome: this.form.get('anagrafica.nome')?.value || null,
            paziente_cognome: this.form.get('anagrafica.cognome')?.value || null,
            paziente_nome_completo:
              `${this.form.get('anagrafica.nome')?.value || ''} ${this.form.get('anagrafica.cognome')?.value || ''}`.trim() ||
              null,
            data_nascita: this.form.get('anagrafica.dataNascita')?.value || null,
            codice_fiscale: this.form.get('anagrafica.codiceFiscale')?.value || null,
            telefono: this.form.get('anagrafica.telefono')?.value || null,
            email: this.form.get('anagrafica.email')?.value || null,
            medico_refertatore:
              `${this.control('medico.nome').value || ''} ${this.control('medico.cognome').value || ''}`.trim() ||
              null,
            medico_refertatore_id: this.control('medico.id').value || null,
            assigned_refertatore_id: this.control('medico.id').value || null,
            assigned_refertatore_email: this.findDoctorEmailById(this.control('medico.id').value || ''),
            assigned_refertatore_name:
              `${this.control('medico.nome').value || ''} ${this.control('medico.cognome').value || ''}`.trim() ||
              null,
            assigned_refertatore_specializzazione:
              this.control('medico.specialita').value || null,
            specializzazione: this.control('medico.specialita').value || null,
            prestazione: this.control('prestazione').value || null,
            data_esame: this.control('dataVisita').value || null,
            created_at: '',
            updated_at: '',
            completed_at: '',
          } as ReportDraftSummary)
        : null);

    if (!targetDraft || !this.canSendSignedReportToPatient(targetDraft)) {
      this.setDraftMessage(
        'Invio al paziente disponibile solo per referti completati con PDF firmato.',
        'warning',
      );
      return;
    }

    this.sendToPatientDraft = targetDraft;
    this.sendToPatientError = '';
    this.sendToPatientForm = {
      to: (targetDraft.email || '').trim(),
      subject: `Referto ${this.reportTypeLabelFor(targetDraft.tipo_referto)} - Remedic`,
      body:
        'Gentile paziente,\n\nin allegato trova il referto firmato relativo alla prestazione eseguita presso Remedic.\n\nCordiali saluti,\nRemedic - Centro Medico Polispecialistico',
      confirmed: false,
    };

    try {
      this.draftEmailDeliveries = [];
      const response = await firstValueFrom(
        this.api.listAdminDraftEmailDeliveries(targetDraft.id),
      );
      this.draftEmailDeliveries = response.items;
    } catch (error) {
      console.error('Errore caricamento storico invii al paziente:', error);
    }

    this.showSendToPatientModal = true;
  }

  closeSendToPatientModal(): void {
    this.showSendToPatientModal = false;
    this.sendToPatientLoading = false;
    this.sendToPatientError = '';
    this.sendToPatientDraft = null;
    this.sendToPatientForm = {
      to: '',
      subject: '',
      body: '',
      confirmed: false,
    };
  }

  async submitSendToPatient(): Promise<void> {
    if (!this.sendToPatientDraft) {
      return;
    }

    if (!this.sendToPatientForm.confirmed) {
      this.sendToPatientError =
        "Conferma esplicitamente l'invio del referto firmato al paziente prima di procedere.";
      return;
    }

    this.sendToPatientLoading = true;
    this.sendToPatientError = '';

    try {
      await firstValueFrom(this.api.getCsrf());
      const response = await firstValueFrom(
        this.api.sendAdminDraftToPatient(this.sendToPatientDraft.id, {
          to: this.sendToPatientForm.to.trim(),
          subject: this.sendToPatientForm.subject.trim(),
          body: this.sendToPatientForm.body.trim(),
        }),
      );

      this.setDraftMessage(response.message, 'success');
      const deliveries = await firstValueFrom(
        this.api.listAdminDraftEmailDeliveries(this.sendToPatientDraft.id),
      );
      this.draftEmailDeliveries = deliveries.items;
      this.closeSendToPatientModal();
    } catch (error: any) {
      console.error('Errore invio referto al paziente:', error);
      this.sendToPatientError =
        error?.error?.message ||
        error?.error?.error ||
        'Impossibile inviare il referto. Verifica configurazione email o disponibilita del PDF firmato.';
    } finally {
      this.sendToPatientLoading = false;
    }
  }

  async openSignedPdfForCurrentDraft(): Promise<void> {
    try {
      if (!this.currentDraftId) {
        return;
      }

      const attachment = await this.resolveSignedAttachmentForDraft(this.currentDraftId);
      if (!attachment) {
        this.setDraftMessage(
          'Referto completato, ma il PDF firmato non e disponibile nella UI. Verifica archivio Drive.',
          'warning',
        );
        return;
      }

      await this.openDraftAttachmentBlob(attachment);
    } catch (error) {
      console.error('Errore apertura PDF firmato corrente:', error);
      this.setDraftMessage(
        'Impossibile aprire il PDF firmato selezionato.',
        'error',
      );
    }
  }

  async downloadSignedPdfForCurrentDraft(): Promise<void> {
    try {
      if (!this.currentDraftId) {
        return;
      }

      const attachment = await this.resolveSignedAttachmentForDraft(this.currentDraftId);
      if (!attachment) {
        this.setDraftMessage(
          'Referto completato, ma il PDF firmato non e disponibile nella UI. Verifica archivio Drive.',
          'warning',
        );
        return;
      }

      await this.downloadDraftAttachmentBlob(attachment);
    } catch (error) {
      console.error('Errore download PDF firmato corrente:', error);
      this.setDraftMessage(
        'Impossibile scaricare il PDF firmato selezionato.',
        'error',
      );
    }
  }

  openSignedPdfOnDrive(): void {
    const link = this.currentSignedStoredAttachment?.drive_web_view_link;
    if (!link) {
      this.setDraftMessage(
        'Link Drive non disponibile per questo referto firmato.',
        'warning',
      );
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
  }

  async openSignedPdfForDraft(draft: ReportDraftSummary): Promise<void> {
    try {
      const attachment = await this.resolveSignedAttachmentForDraft(draft.id);
      if (!attachment) {
        this.setDraftMessage(
          'PDF firmato non disponibile per il referto selezionato.',
          'warning',
        );
        return;
      }

      await this.openDraftAttachmentBlob(attachment);
    } catch (error) {
      console.error('Errore apertura PDF firmato archivio:', error);
      this.setDraftMessage(
        'Impossibile aprire il PDF firmato del referto selezionato.',
        'error',
      );
    }
  }

  async openArchivedDraft(id: string): Promise<void> {
    await this.loadDraft(id);
  }

  private getFreshFormState() {
    const now = new Date();
    const isoToday = now.toISOString().slice(0, 10);
    const displayToday = this.formatDateDisplay(now);

    return {
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
    };
  }

  private getFreshSectionsState() {
    return {
      anamnesiRemota: false,
      portaInVisione: false,
      esamiInLoco: false,
      anamnesiProssima: true,
      esameObiettivo: true,
      diagnosi: true,
      prescrizione: true,
    };
  }

  private refreshDerivedStateAfterDraftLoad(): void {
    this.updateModeValidators();
    this.syncTechnicalAcquisitionDate(this.control('dataVisita').value);
    this.syncPsgVisitDate(this.control('psg.dataRegistrazioneInizio').value);
    this.updatePsgBmi();
    this.updatePsgEssSummary();
  }

  private formatDateDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private filteredDoctors(): DoctorInfo[] {
    if (this.reportType === 'emg') {
      return this.refertatoriEmg;
    }

    if (this.reportType === 'psg') {
      return this.refertatoriPsg;
    }

    return this.doctors.filter((doctor) => doctor.tipo !== 'tecnico');
  }

  private findDefaultNeurologist(): DoctorInfo | undefined {
    return this.filteredDoctors().find(
      (doctor) =>
        doctor.tipo !== 'tecnico' &&
        doctor.nome === 'Sebastiano' &&
        doctor.cognome.includes('Arena'),
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

  private async loadOperationalOptions(): Promise<void> {
    try {
      const [professionalsResponse, emgRefertatoriResponse, psgRefertatoriResponse] =
        await Promise.all([
          firstValueFrom(this.api.listProfessionals()),
          firstValueFrom(this.api.listRefertatori('emg')),
          firstValueFrom(this.api.listRefertatori('psg')),
        ]);

      this.professionals = professionalsResponse.items;
      this.doctors = professionalsResponse.items.map((item) =>
        this.mapProfessionalToDoctor(item),
      );
      this.refertatoriEmg = emgRefertatoriResponse.items.map((item) =>
        this.mapRefertatoreToDoctor(item),
      );
      this.refertatoriPsg = psgRefertatoriResponse.items.map((item) =>
        this.mapRefertatoreToDoctor(item),
      );
    } catch (error) {
      console.error('Errore caricamento professionisti/refertatori:', error);
      this.doctors = this.fallbackDoctors;
      this.refertatoriEmg = this.fallbackDoctors.filter(
        (item) => item.tipo !== 'tecnico' && item.specialita === EMG_DEFAULTS.specializzazione,
      );
      this.refertatoriPsg = this.fallbackDoctors.filter(
        (item) => item.tipo !== 'tecnico' && item.specialita === PSG_DEFAULTS.specializzazione,
      );
    }
  }

  private async restoreReservedSession(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.me());
      this.reservedUser = response.user;
      this.neurologistUser = response.user;
      this.neurologistToken = 'session';
      await firstValueFrom(this.api.getCsrf());
    } catch {
      this.clearNeurologistSession();
    }
  }

  private captureResetPasswordToken(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken') || '';
    if (!token) {
      return;
    }

    this.resetPasswordToken = token;
    this.uiState = 'resetPassword';
  }

  openReservedArea(): void {
    this.neurologistLoginError = '';
    if (this.reservedUser) {
      void this.routeReservedUserDashboard();
      return;
    }
    this.uiState = 'reservedLogin';
  }

  goToReservedLogin(): void {
    this.neurologistLoginError = '';
    this.forgotPasswordMessage = '';
    this.resetPasswordMessage = '';
    this.uiState = 'reservedLogin';
  }

  goToForgotPassword(): void {
    this.forgotPasswordMessage = '';
    this.uiState = 'forgotPassword';
  }

  async routeReservedUserDashboard(): Promise<void> {
    if (!this.reservedUser) {
      this.uiState = 'reservedLogin';
      return;
    }

    if (this.reservedUser.role === 'admin') {
      await this.openAdminDashboard();
      return;
    }

    await this.openNeurologistDashboard();
  }

  async openAdminDashboard(): Promise<void> {
    this.adminDashboardLoading = true;
    this.adminDashboardError = '';

    try {
      await firstValueFrom(this.api.getCsrf());
      const [usersResponse, professionalsResponse, draftsResponse, archiveResponse, auditResponse] =
        await Promise.all([
          firstValueFrom(this.api.listAdminUsers()),
          firstValueFrom(this.api.listAdminProfessionals()),
          firstValueFrom(this.api.listAdminDrafts()),
          firstValueFrom(this.api.listAdminArchive()),
          firstValueFrom(this.api.listAuditLogs()),
        ]);

      this.adminUsers = usersResponse.items;
      this.adminProfessionals = professionalsResponse.items;
      this.adminDrafts = draftsResponse.items;
      this.adminArchiveDrafts = archiveResponse.items;
      this.auditLogs = auditResponse.items;
      this.uiState = 'adminDashboard';
    } catch (error) {
      console.error('Errore caricamento dashboard admin:', error);
      this.adminDashboardError =
        'Impossibile caricare la dashboard admin in questo momento.';
      this.uiState = 'reservedLogin';
    } finally {
      this.adminDashboardLoading = false;
    }
  }

  async submitForgotPassword(): Promise<void> {
    if (!this.forgotPasswordEmail.trim()) {
      this.forgotPasswordMessage = 'Inserisci un indirizzo email valido.';
      return;
    }

    this.forgotPasswordLoading = true;
    try {
      const response = await firstValueFrom(
        this.api.forgotPassword(this.forgotPasswordEmail.trim()),
      );
      this.forgotPasswordMessage = response.message;
    } catch (error) {
      console.error('Errore richiesta reset password:', error);
      this.forgotPasswordMessage =
        "Impossibile completare la richiesta in questo momento. Riprova tra poco.";
    } finally {
      this.forgotPasswordLoading = false;
    }
  }

  async toggleAdminUserStatus(user: AdminUserItem): Promise<void> {
    try {
      await firstValueFrom(this.api.getCsrf());
      await firstValueFrom(this.api.updateAdminUserStatus(user.id, !user.active));
      await this.openAdminDashboard();
    } catch (error) {
      console.error('Errore aggiornamento stato utente:', error);
      this.adminDashboardError = "Impossibile aggiornare lo stato dell'utente.";
    }
  }

  async toggleAdminProfessionalStatus(professional: ProfessionalItem): Promise<void> {
    try {
      await firstValueFrom(this.api.getCsrf());
      await firstValueFrom(
        this.api.updateAdminProfessionalStatus(professional.id, !professional.active),
      );
      await this.openAdminDashboard();
      await this.loadOperationalOptions();
    } catch (error) {
      console.error('Errore aggiornamento stato professionista:', error);
      this.adminDashboardError =
        'Impossibile aggiornare lo stato del professionista.';
    }
  }

  async openAdminDraftRecord(draft: ReportDraftSummary, readonlyMode = true): Promise<void> {
    try {
      const detail = await firstValueFrom(this.api.getDraft(draft.id));
      await this.hydrateDraft(detail, {
        readonlyMode:
          readonlyMode ||
          draft.stato === 'completato' ||
          draft.stato === 'firmato_caricato',
      });
      this.setDraftMessage(
        readonlyMode
          ? 'Referto aperto in sola lettura dall’area admin.'
          : 'Bozza aperta dall’area admin.',
        'success',
      );
    } catch (error) {
      console.error('Errore apertura referto admin:', error);
      this.adminDashboardError = 'Impossibile aprire il referto selezionato.';
    }
  }

  activeRefertatoreDrafts(tipo: 'emg' | 'psg'): ReportDraftSummary[] {
    return this.refertatoreDrafts.filter((draft) => draft.tipo_referto === tipo);
  }

  archiveRefertatoreDrafts(tipo: 'emg' | 'psg'): ReportDraftSummary[] {
    return this.refertatoreArchiveDrafts.filter((draft) => draft.tipo_referto === tipo);
  }

  reportTypeLabelFor(type: ReportType): string {
    if (type === 'emg') return 'EMG';
    if (type === 'psg') return 'PSG';
    return 'Standard';
  }

  draftStatusLabel(status: ReportDraftStatus): string {
    return (
      this.draftStatusOptions.find((item) => item.value === status)?.label || status
    );
  }

  async submitResetPassword(): Promise<void> {
    this.resetPasswordMessage = '';

    if (!this.resetPasswordToken) {
      this.resetPasswordMessage = 'Token di reset non disponibile.';
      return;
    }

    if (!this.resetPasswordValue || this.resetPasswordValue !== this.resetPasswordConfirm) {
      this.resetPasswordMessage = 'Le password non coincidono.';
      return;
    }

    this.resetPasswordLoading = true;
    try {
      const response = await firstValueFrom(
        this.api.resetPassword(this.resetPasswordToken, this.resetPasswordValue),
      );
      this.resetPasswordMessage = response.message;
      this.uiState = 'reservedLogin';
      this.resetPasswordToken = '';
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('resetToken');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Errore reset password:', error);
      this.resetPasswordMessage =
        'Impossibile reimpostare la password. Verifica il link o richiedine uno nuovo.';
    } finally {
      this.resetPasswordLoading = false;
    }
  }

  async saveAdminUser(): Promise<void> {
    try {
      await firstValueFrom(this.api.getCsrf());
      if (this.adminUserForm.id) {
        await firstValueFrom(
          this.api.updateAdminUser(this.adminUserForm.id, this.adminUserForm),
        );
      } else {
        await firstValueFrom(this.api.createAdminUser(this.adminUserForm));
      }
      this.resetAdminUserForm();
      await this.openAdminDashboard();
    } catch (error) {
      console.error('Errore salvataggio utente admin:', error);
      this.adminDashboardError = 'Impossibile salvare il refertatore/admin.';
    }
  }

  async saveAdminProfessional(): Promise<void> {
    try {
      await firstValueFrom(this.api.getCsrf());
      if (this.adminProfessionalForm.id) {
        await firstValueFrom(
          this.api.updateAdminProfessional(
            this.adminProfessionalForm.id,
            this.adminProfessionalForm,
          ),
        );
      } else {
        await firstValueFrom(
          this.api.createAdminProfessional(this.adminProfessionalForm),
        );
      }
      this.resetAdminProfessionalForm();
      await this.openAdminDashboard();
      await this.loadOperationalOptions();
    } catch (error) {
      console.error('Errore salvataggio professionista admin:', error);
      this.adminDashboardError = 'Impossibile salvare il professionista.';
    }
  }

  editAdminUser(user: AdminUserItem): void {
    this.adminTab = 'users';
    this.adminUserForm = {
      id: user.id,
      role: user.role,
      email: user.email,
      password: '',
      display_name: user.display_name,
      specializzazione: user.specializzazione || '',
      assignedTypes: [...user.assignedTypes],
    };
  }

  editAdminProfessional(professional: ProfessionalItem): void {
    this.adminTab = 'professionals';
    this.adminProfessionalForm = {
      id: professional.id,
      first_name: professional.first_name || '',
      last_name: professional.last_name || '',
      display_name: professional.display_name,
      title: professional.title || '',
      email: professional.email || '',
      phone: professional.phone || '',
      specializzazione: professional.specializzazione || '',
      role_label: professional.role_label || '',
      professional_type: professional.professional_type,
      visible_in_standard: professional.visible_in_standard,
      is_refertatore: professional.is_refertatore,
      active: professional.active,
      sort_order: professional.sort_order,
    };
  }

  toggleAdminAssignedType(
    tipo: 'emg' | 'psg',
    checked: boolean,
  ): void {
    const current = new Set(this.adminUserForm.assignedTypes);

    if (checked) {
      current.add(tipo);
    } else {
      current.delete(tipo);
    }

    this.adminUserForm.assignedTypes = [...current] as Array<'emg' | 'psg'>;
  }

  resetAdminUserForm(): void {
    this.adminUserForm = {
      id: '',
      role: 'refertatore',
      email: '',
      password: '',
      display_name: '',
      specializzazione: '',
      assignedTypes: [],
    };
  }

  resetAdminProfessionalForm(): void {
    this.adminProfessionalForm = {
      id: '',
      first_name: '',
      last_name: '',
      display_name: '',
      title: '',
      email: '',
      phone: '',
      specializzazione: '',
      role_label: '',
      professional_type: 'medico',
      visible_in_standard: true,
      is_refertatore: false,
      active: true,
      sort_order: 0,
    };
  }

  private mapProfessionalToDoctor(item: ProfessionalItem): DoctorInfo {
    return {
      id: item.id,
      nome: item.first_name || item.display_name,
      cognome: item.last_name || '',
      specialita: item.specializzazione || '',
      ruolo: item.role_label || '',
      tipo: item.professional_type,
      displayName: item.display_name,
      email: item.email,
      isRefertatore: item.is_refertatore,
      active: item.active,
    };
  }

  private mapRefertatoreToDoctor(item: {
    id: string;
    email: string;
    display_name: string;
    specializzazione: string | null;
    assignedTypes: Array<'emg' | 'psg'>;
  }): DoctorInfo {
    const [nome, ...rest] = item.display_name.replace(/^Dott\.ssa\s+|^Dott\.\s+/i, '').split(' ');
    return {
      id: item.id,
      nome: nome || item.display_name,
      cognome: rest.join(' '),
      specialita: item.specializzazione || '',
      ruolo: 'Refertatore',
      tipo: 'medico',
      displayName: item.display_name,
      email: item.email,
      assignedTypes: item.assignedTypes,
      isRefertatore: true,
      active: true,
    };
  }

  private findDoctorEmailById(id: string): string | null {
    if (!id) {
      return null;
    }

    return (
      this.refertatoriEmg.find((item) => item.id === id)?.email ||
      this.refertatoriPsg.find((item) => item.id === id)?.email ||
      this.doctors.find((item) => item.id === id)?.email ||
      null
    );
  }

  private setEmgNeurologistMode(enabled: boolean): void {
    this.emgNeurologistMode = enabled;
    this.reviewerMode = enabled;

    this.form.enable({ emitEvent: false });
    this.sections.enable({ emitEvent: false });

    if (enabled && this.reportType === 'emg') {
      [
        'dataVisitaDisplay',
        'dataVisita',
        'prestazione',
        'anagrafica',
        'medico',
        'emg.tecnicoEsecutoreId',
        'emg.tecnicoEsecutore',
        'emg.tecnicoRuolo',
        'emg.medicoInviante',
        'emg.quesitoDiagnostico',
        'emg.sintomatologiaRiferita',
        'emg.distrettoEsaminato',
        'emg.esameEseguito',
        'emg.consensoInformatoTesto',
        'emg.dataOraAcquisizioneTecnica',
        'emg.materialeProdotto',
        'emg.noteTecnicheEsecutore',
        'emg.attestazioneTecnico',
        'emg.tracciati',
        'emg.firmaTecnico',
        'emg.checklistNeuropatie',
      ].forEach((path) => this.form.get(path)?.disable({ emitEvent: false }));
    }

    if (enabled && this.reportType === 'psg') {
      [
        'dataVisitaDisplay',
        'dataVisita',
        'prestazione',
        'anagrafica',
        'medico',
        'psg.dataRegistrazioneInizio',
        'psg.dataRegistrazioneFine',
        'psg.sistemaRegistrazione',
        'psg.staturaCm',
        'psg.pesoKg',
        'psg.bmi',
        'psg.consensoInformato',
        'psg.dataRefertazione',
        'psg.anamnesiRaccolta',
        'psg.reportTecnico',
        'psg.quesitoClinico',
        'psg.reportStrumentalePdf',
        'psg.anamnesiSonno',
        'psg.ess',
        'psg.essTotale',
        'psg.interpretazioneEss',
      ].forEach((path) => this.form.get(path)?.disable({ emitEvent: false }));

      [
        'psg.interpretazioneMedico',
        'psg.conclusioneDiagnostica',
        'psg.indicazioniCliniche',
        'psg.notaDocumentale',
      ].forEach((path) => this.form.get(path)?.enable({ emitEvent: false }));
    }

    this.updateModeValidators();
  }

  private async hydratePersistedAttachments(
    draftId: string,
    neurologistToken?: string,
  ): Promise<void> {
    if (!draftId) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.api.listDraftAttachments(draftId, neurologistToken),
      );
      this.currentDraftAttachments = response.items;

      if (this.reportType === 'psg') {
        const reportMetadata = response.items.find(
          (item) => item.kind === 'psg_report_strumentale',
        );
        const reportAsset = reportMetadata
          ? await this.mapDraftAttachmentToAsset(
              draftId,
              reportMetadata,
              neurologistToken,
            )
          : null;
        this.form.get('psg.reportStrumentalePdf')?.setValue(reportAsset, {
          emitEvent: false,
        });
        return;
      }

      if (this.reportType !== 'emg') {
        return;
      }

      const traceMetadatas = response.items.filter(
        (item) => item.kind === 'emg_tracciato',
      );
      const signatureMetadata = response.items.find(
        (item) => item.kind === 'emg_firma_tnfp',
      );

      const traceAssets = await Promise.all(
        traceMetadatas.map((item) =>
          this.mapDraftAttachmentToAsset(draftId, item, neurologistToken),
        ),
      );

      const signatureAsset = signatureMetadata
        ? await this.mapDraftAttachmentToAsset(
            draftId,
            signatureMetadata,
            neurologistToken,
          )
        : null;

      this.form.get('emg.tracciati')?.setValue(traceAssets, { emitEvent: false });
      this.form.get('emg.firmaTecnico')?.setValue(signatureAsset, {
        emitEvent: false,
      });
    } catch (error) {
      console.error('Errore ripristino allegati EMG persistiti:', error);
      this.currentDraftAttachments = [];

      if (this.reportType === 'psg') {
        this.form.get('psg.reportStrumentalePdf')?.setValue(null, {
          emitEvent: false,
        });
        this.setDraftMessage(
          'Bozza caricata, ma non sono riuscito a ripristinare il report strumentale PSG persistito.',
          'warning',
        );
        return;
      }

      if (this.reportType !== 'emg') {
        return;
      }

      this.form.get('emg.tracciati')?.setValue([], { emitEvent: false });
      this.form.get('emg.firmaTecnico')?.setValue(null, { emitEvent: false });
      this.setDraftMessage(
        'Bozza caricata, ma non sono riuscito a ripristinare tutti gli allegati EMG persistiti.',
        'warning',
      );
    }
  }

  private async mapDraftAttachmentToAsset(
    draftId: string,
    metadata: DraftAttachmentMetadata,
    neurologistToken?: string,
  ): Promise<EmgUploadedAsset> {
    const isPdf = metadata.mime_type === 'application/pdf';
    const asset: EmgUploadedAsset = {
      id: metadata.id,
      attachmentId: metadata.id,
      persisted: true,
      source: 'draft',
      name: metadata.original_name || metadata.file_name,
      size: metadata.size_bytes,
      mimeType: metadata.mime_type,
      kind: isPdf ? 'pdf' : 'image',
    };

    if (isPdf) {
      const response = await firstValueFrom(
        this.api.getDraftAttachmentBase64(
          draftId,
          metadata.id,
          neurologistToken,
        ),
      );
      return {
        ...asset,
        base64: response.base64,
      };
    }

    const response = await firstValueFrom(
      this.api.getDraftAttachmentDataUrl(
        draftId,
        metadata.id,
        neurologistToken,
      ),
    );

    return {
      ...asset,
      dataUrl: response.dataUrl,
    };
  }

  private async syncEmgDraftAttachments(draftId: string): Promise<void> {
    const existingAttachments = await firstValueFrom(
      this.api.listDraftAttachments(draftId),
    );

    const existingTraceAttachments = existingAttachments.items.filter(
      (item) => item.kind === 'emg_tracciato',
    );
    const existingSignatureAttachments = existingAttachments.items.filter(
      (item) => item.kind === 'emg_firma_tnfp',
    );

    for (const attachment of existingTraceAttachments) {
      await firstValueFrom(
        this.api.deleteDraftAttachment(draftId, attachment.id),
      );
    }

    const signatureAsset = this.emgSignatureAsset();

    if (!signatureAsset) {
      for (const attachment of existingSignatureAttachments) {
        await firstValueFrom(
          this.api.deleteDraftAttachment(draftId, attachment.id),
        );
      }
    }

    for (const asset of this.emgTraceAssets()) {
      await this.uploadEmgDraftAttachment(draftId, 'emg_tracciato', asset);
    }

    if (signatureAsset) {
      await this.uploadEmgDraftAttachment(
        draftId,
        'emg_firma_tnfp',
        signatureAsset,
      );
    }
  }

  private async syncPsgDraftAttachments(draftId: string): Promise<void> {
    const existingAttachments = await firstValueFrom(
      this.api.listDraftAttachments(draftId),
    );

    const existingReportAttachment = existingAttachments.items.find(
      (item) => item.kind === 'psg_report_strumentale',
    );

    if (existingReportAttachment) {
      await firstValueFrom(
        this.api.deleteDraftAttachment(draftId, existingReportAttachment.id),
      );
    }

    const reportAsset = this.psgReportAsset();
    if (!reportAsset) {
      return;
    }

    await this.uploadEmgDraftAttachment(
      draftId,
      'psg_report_strumentale',
      reportAsset,
    );
  }

  private async uploadEmgDraftAttachment(
    draftId: string,
    kind: DraftAttachmentUploadPayload['kind'],
    asset: EmgUploadedAsset,
  ): Promise<void> {
    const base64 =
      asset.kind === 'pdf'
        ? asset.base64 || ''
        : this.extractBase64FromDataUrl(asset.dataUrl);

    if (!base64) {
      throw new Error(
        `Contenuto allegato non disponibile per il file ${asset.name}.`,
      );
    }

    await firstValueFrom(
      this.api.uploadDraftAttachment(draftId, {
        kind,
        fileName: asset.name,
        mimeType: asset.mimeType,
        base64,
      }),
    );
  }

  private extractBase64FromDataUrl(dataUrl?: string | null): string {
    if (!dataUrl) {
      return '';
    }

    const [, base64 = ''] = String(dataUrl).split(',');
    return base64;
  }

  private isDraftDeletable(draft: ReportDraftSummary): boolean {
    return draft.stato !== 'completato' && draft.stato !== 'firmato_caricato';
  }

  private buildDeleteDraftConfirmationMessage(draft: ReportDraftSummary): string {
    const hasKnownServerAttachments =
      draft.tipo_referto === 'emg' &&
      draft.stato !== 'bozza';

    return hasKnownServerAttachments
      ? 'Vuoi eliminare questa bozza? Verranno eliminati anche eventuali allegati caricati nel sistema. L’azione non puo essere annullata.\n\nQuesta bozza contiene allegati, tracciati o firme salvati sul server.'
      : 'Vuoi eliminare questa bozza? Verranno eliminati anche eventuali allegati caricati nel sistema. L’azione non puo essere annullata.';
  }

  private async resolveSignedAttachmentForDraft(
    draftId: string,
  ): Promise<DraftAttachmentMetadata | null> {
    if (this.currentDraftId === draftId && this.currentSignedStoredAttachment) {
      return this.currentSignedStoredAttachment;
    }

    const response = await firstValueFrom(this.api.listDraftAttachments(draftId));
    const signedAttachment =
      response.items.find((item) => item.kind === 'emg_pdf_firmato') ||
      response.items.find((item) => item.kind === 'psg_pdf_firmato') ||
      null;

    if (this.currentDraftId === draftId) {
      this.currentDraftAttachments = response.items;
    }

    return signedAttachment;
  }

  private async openDraftAttachmentBlob(
    attachment: DraftAttachmentMetadata,
  ): Promise<void> {
    const blob = await firstValueFrom(
      this.api.getDraftAttachmentBlob(
        attachment.draft_id,
        attachment.id,
        this.emgNeurologistMode ? this.neurologistToken : undefined,
      ),
    );
    this.openBlobInNewTab(blob, attachment.original_name || attachment.file_name);
  }

  private async downloadDraftAttachmentBlob(
    attachment: DraftAttachmentMetadata,
  ): Promise<void> {
    const blob = await firstValueFrom(
      this.api.getDraftAttachmentBlob(
        attachment.draft_id,
        attachment.id,
        this.emgNeurologistMode ? this.neurologistToken : undefined,
      ),
    );
    this.downloadBlob(blob, attachment.original_name || attachment.file_name);
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
  }

  private emgTraceAssets(): EmgUploadedAsset[] {
    return (
      (this.form.get('emg.tracciati')?.value as EmgUploadedAsset[] | null) ?? []
    );
  }

  private emgSignatureAsset(): EmgUploadedAsset | null {
    return (
      (this.form.get('emg.firmaTecnico')?.value as EmgUploadedAsset | null) ??
      null
    );
  }

  private psgReportAsset(): EmgUploadedAsset | null {
    return (
      (this.form.get('psg.reportStrumentalePdf')?.value as EmgUploadedAsset | null) ??
      null
    );
  }

  private isEmgChecklistComplete(): boolean {
    if (this.emgNeurologistMode) {
      return true;
    }

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

  private markPsgAnamnesisTouched(): void {
    this.markPsgSleepHistoryTouched();
    this.markPsgEssTouched();
    this.form.get('psg.anamnesiSonno.farmaciRilevanti')?.markAllAsTouched();
    this.form.get('psg.anamnesiSonno.comorbiditaRilevanti')?.markAllAsTouched();
    this.control('psg.anamnesiSonno.noteAnamnesticheUlteriori').markAsTouched();
  }

  private isPsgAnamnesisReadyForSave(): boolean {
    return (
      this.isPsgSleepHistoryComplete() &&
      this.isPsgEssComplete() &&
      !!this.form.get('psg.anamnesiSonno.farmaciRilevanti')?.valid &&
      !!this.form.get('psg.anamnesiSonno.comorbiditaRilevanti')?.valid
    );
  }

  private selectionRequiredValidator(keys: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value as Record<string, unknown> | null;
      const hasSelection = keys.some((key) => value?.[key] === true);

      return hasSelection ? null : { selectionRequired: true };
    };
  }

  private usesNeurologiaDoctors(): boolean {
    return false;
  }

  private getNeurologiaSpecialization(): string {
    return this.reportType === 'psg'
      ? PSG_DEFAULTS.specializzazione
      : EMG_DEFAULTS.specializzazione;
  }
}

