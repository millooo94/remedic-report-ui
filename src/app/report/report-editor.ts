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
import {
  isEmgAssignableSpecialization,
  isPsgAssignableSpecialization,
  isRefertatoreCompatibleSpecialization,
  normalizeSpecialization,
  PROFESSIONAL_SPECIALIZATIONS,
} from './config/professional-taxonomy';

type SectionKey = (typeof REPORT_SECTION_KEYS)[number];
type EditorUiState =
  | 'initialTypeSelection'
  | 'asyncTypeSelection'
  | 'typeActionSelection'
  | 'wizard'
  | 'reservedLogin'
  | 'forgotPassword'
  | 'resetPassword'
  | 'adminDashboard'
  | 'refertatoreDashboard';

type EntryContext = 'public' | 'admin' | 'refertatore';

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
  auditPage = 1;
  auditPageSize = 20;
  auditTotal = 0;
  draftEmailDeliveries: DraftEmailDeliveryItem[] = [];
  adminDashboardLoading = false;
  adminDashboardError = '';
  adminTab: 'professionals' | 'users' | 'drafts' | 'archive' | 'audit' = 'professionals';
  adminArchiveTab: 'standard' | 'async' = 'standard';
  showAdminProfessionalModal = false;
  showAdminUserModal = false;
  showChangePasswordModal = false;
  showDeleteResourceModal = false;
  professionalsPage = 1;
  professionalsPageSize = 10;
  refertatoriPage = 1;
  refertatoriPageSize = 10;
  professionalSearchQuery = '';
  professionalSpecializationSearch = '';
  showProfessionalSpecializationSuggestions = false;
  adminUserProfessionalSearch = '';
  showAdminUserProfessionalSuggestions = false;
  adminUserProfessionalError = '';
  adminProfessionalFieldErrors: Record<string, string> = {};
  adminUserFieldErrors: Record<string, string> = {};
  archiveProfessionalFilter = '';
  archiveProfessionalSearch = '';
  showArchiveProfessionalSuggestions = false;
  deleteResourceLoading = false;
  deleteResourceError = '';
  deleteResourceTarget: {
    kind: 'professional' | 'refertatore' | 'workingDraft' | 'archiveDraft';
    id: string;
    name: string;
  } | null = null;
  entryContext: EntryContext = 'public';
  specializations = [...PROFESSIONAL_SPECIALIZATIONS];
  draftActionLoadingId: string | null = null;
  adminArchiveDriveLoadingId: string | null = null;
  standardPdfGenerating = false;
  viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : 1440;
  adminUserForm = {
    id: '',
    role: 'refertatore' as 'admin' | 'refertatore',
    professional_id: '',
    professional_display_name: '',
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
    email: '',
    specializzazione: '',
    role_label: '',
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
    { value: 'in_attesa_refertatore', label: 'In attesa refertatore' },
    { value: 'in_refertazione_refertatore', label: 'Refertazione in corso' },
    { value: 'pronto_per_firma', label: 'Pronto per firma' },
    { value: 'firmato_caricato', label: 'Firmato caricato' },
    { value: 'completato', label: 'Completato' },
  ];
  refertatoreEmail = '';
  refertatorePassword = '';
  showReservedPassword = false;
  refertatoreLoginLoading = false;
  refertatoreLoginError = '';
  refertatoreUser: AuthUser | null = null;
  refertatoreToken = '';
  refertatoreDraftsLoading = false;
  refertatoreDraftsError = '';
  refertatoreTab: 'emg' | 'psg' = 'emg';
  refertatoreOpeningDraftId: string | null = null;
  showDashboardSignedPdfModal = false;
  dashboardSignedPdfDraft: ReportDraftSummary | null = null;
  dashboardSignedPdfAsset: EmgUploadedAsset | null = null;
  dashboardSignedPdfSaving = false;
  dashboardSignedPdfError = '';
  emgRefertatoreMode = false;
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
  changePasswordLoading = false;
  changePasswordError = '';
  changePasswordMessage = '';
  showReservedUserMenu = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  changePasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  private draftMessageTimeoutId: ReturnType<typeof window.setTimeout> | null = null;
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
    if (this.uiState !== 'wizard' || this.showResetModal) return;

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    if (!target.closest('.userMenuWrap')) {
      this.showReservedUserMenu = false;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.viewportWidth =
      typeof window !== 'undefined' ? window.innerWidth : this.viewportWidth;
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
      return 'Gestisci acquisizione tecnica, refertazione clinica e firma digitale del documento finale.';
    }

    if (this.selectedReportType === 'psg') {
      return 'Gestisci raccolta dati, refertazione clinica e caricamento del PDF firmato definitivo.';
    }

    return 'Crea un referto medico con esportazione e archiviazione immediata.';
  }

  get isMobileBlocked(): boolean {
    return this.viewportWidth < 1024;
  }

  get showRefertatoreAreaCard(): boolean {
    return false;
  }

  get isReadonlyWizardMode(): boolean {
    return this.reviewerMode || this.completedReadonlyMode;
  }

  get isArchiveBrowserMode(): boolean {
    return this.draftBrowserMode === 'archive';
  }

  get showPrimaryAction(): boolean {
    if (
      this.entryContext === 'refertatore' &&
      this.step === this.steps.length - 1 &&
      this.currentDraftStatus === 'pronto_per_firma'
    ) {
      return false;
    }

    return !this.completedReadonlyMode;
  }

  get showDraftWriteActions(): boolean {
    return !this.completedReadonlyMode && this.entryContext === 'public';
  }

  get showReviewerSaveAction(): boolean {
    return !this.completedReadonlyMode && this.entryContext === 'refertatore';
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

  get refertatoreDisplayName(): string {
    return this.reservedUser?.displayName || this.refertatoreUser?.displayName || 'Refertatore';
  }

  get reservedUserInitials(): string {
    const source = this.reservedUser?.displayName || this.refertatoreDisplayName || 'RR';
    const parts = source
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) {
      return 'RR';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  get reservedUserRoleLabel(): string {
    return this.reservedUser?.role === 'admin' ? 'Admin' : 'Refertatore';
  }

  get reservedUserAssignedAreasLabel(): string {
    if (this.reservedUser?.role !== 'refertatore') {
      return '';
    }

    return (this.reservedUser.assignedTypes || []).map((item) => item.toUpperCase()).join(', ');
  }

  get adminSidebarItems(): Array<{
    key: 'professionals' | 'users' | 'drafts' | 'archive' | 'audit';
    label: string;
    badge?: number;
  }> {
    return [
      { key: 'professionals', label: 'Professionisti' },
      { key: 'users', label: 'Refertatori asincroni' },
      { key: 'drafts', label: 'Referti in lavorazione' },
      { key: 'archive', label: 'Archivio', badge: this.adminPendingPatientSendCount || undefined },
      { key: 'audit', label: 'Audit log' },
    ];
  }

  get archiveProfessionalOptions(): string[] {
    const source =
      this.adminArchiveTab === 'standard'
        ? [
            ...this.adminProfessionals.map((item) => item.display_name),
            ...this.adminArchiveDrafts
              .filter((item) => item.tipo_referto === 'standard')
              .map((item) => item.medico_refertatore || '')
              .filter(Boolean),
          ]
        : [
            ...this.adminUsers
              .filter((item) => item.role === 'refertatore')
              .map((item) => item.display_name),
            ...this.adminArchiveDrafts
              .map((item) => item.assigned_refertatore_name || item.medico_refertatore || '')
              .filter(Boolean),
          ];

    const query = this.archiveProfessionalSearch.trim().toLowerCase();
    return [...new Set(source.filter(Boolean))]
      .filter((item) => !query || item.toLowerCase().includes(query))
      .sort((a, b) => a.localeCompare(b, 'it'));
  }

  get filteredAdminArchiveDrafts(): ReportDraftSummary[] {
    const professionistaFilter = this.archiveProfessionalFilter.trim().toLowerCase();
    return this.adminArchiveDrafts.filter((draft) => {
      const matchesType =
        this.adminArchiveTab === 'standard'
          ? draft.tipo_referto === 'standard'
          : draft.tipo_referto === 'emg' || draft.tipo_referto === 'psg';

      if (!matchesType) {
        return false;
      }

      if (!professionistaFilter) {
        return true;
      }

      const professionista =
        this.adminArchiveTab === 'standard'
          ? draft.medico_refertatore || ''
          : draft.assigned_refertatore_name || draft.medico_refertatore || '';

      return professionista.toLowerCase().includes(professionistaFilter);
    });
  }

  get adminPendingPatientSendCount(): number {
    return this.adminArchiveDrafts.filter(
      (draft) =>
        (draft.tipo_referto === 'emg' || draft.tipo_referto === 'psg') &&
        draft.stato === 'completato' &&
        draft.has_signed_pdf &&
        !draft.patient_email_sent,
    ).length;
  }

  refertatorePendingBadge(tipo: 'emg' | 'psg'): number {
    return this.readyForSignatureDraftsByType(tipo).length;
  }

  get showControlPreviewButton(): boolean {
    return (
      !this.completedReadonlyMode &&
      !this.reviewerMode &&
      this.step === this.steps.length - 1 &&
      (this.reportType === 'psg' ||
        (this.reportType === 'emg' && !this.emgRefertatoreMode))
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

  get showRefertatoreTabs(): boolean {
    return this.hasEmgAssignment && this.hasPsgAssignment;
  }

  get activeRefertatoreTab(): 'emg' | 'psg' {
    if (this.showRefertatoreTabs) {
      return this.refertatoreTab;
    }

    return this.hasPsgAssignment ? 'psg' : 'emg';
  }

  get pagedAdminProfessionals(): ProfessionalItem[] {
    const start = (this.professionalsPage - 1) * this.professionalsPageSize;
    return this.filteredAdminProfessionals.slice(start, start + this.professionalsPageSize);
  }

  get professionalsTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAdminProfessionals.length / this.professionalsPageSize));
  }

  get filteredAdminProfessionals(): ProfessionalItem[] {
    const query = this.professionalSearchQuery.trim().toLowerCase();
    if (!query) {
      return this.adminProfessionals;
    }

    return this.adminProfessionals.filter((professional) =>
      [
        professional.first_name,
        professional.last_name,
        professional.display_name,
        professional.specializzazione,
        professional.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }

  get filteredProfessionalSpecializations(): string[] {
    const query = this.professionalSpecializationSearch.trim().toLowerCase();
    if (!query) {
      return this.specializations;
    }

    return this.specializations.filter((item) =>
      item.toLowerCase().includes(query),
    );
  }

  get pagedAdminRefertatori(): AdminUserItem[] {
    const onlyRefertatori = this.adminUsers.filter((user) => user.role === 'refertatore');
    const start = (this.refertatoriPage - 1) * this.refertatoriPageSize;
    return onlyRefertatori.slice(start, start + this.refertatoriPageSize);
  }

  get refertatoriTotal(): number {
    return this.adminUsers.filter((user) => user.role === 'refertatore').length;
  }

  get refertatoriTotalPages(): number {
    return Math.max(1, Math.ceil(this.refertatoriTotal / this.refertatoriPageSize));
  }

  get auditTotalPages(): number {
    return Math.max(1, Math.ceil(this.auditTotal / this.auditPageSize));
  }

  get technicianAvailableCount(): number {
    return this.filteredTechnicians().length;
  }

  get selectedAdminUserProfessional(): ProfessionalItem | null {
    if (!this.adminUserForm.professional_id) {
      return null;
    }

    return (
      this.adminProfessionals.find(
        (professional) => professional.id === this.adminUserForm.professional_id,
      ) || null
    );
  }

  get filteredRefertatoreProfessionals(): ProfessionalItem[] {
    const query = this.adminUserProfessionalSearch.trim().toLowerCase();

    return this.adminProfessionals.filter((professional) => {
      if (!professional.active) {
        return false;
      }

      if (
        !isRefertatoreCompatibleSpecialization(professional.specializzazione)
      ) {
        return false;
      }

      const alreadyLinked =
        this.adminUsers.some(
          (user) =>
            user.role === 'refertatore' &&
            user.professional_id === professional.id &&
            user.id !== this.adminUserForm.id,
        );

      if (alreadyLinked) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        professional.display_name,
        professional.specializzazione,
        professional.email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }

  get adminUserEmailRequired(): boolean {
    const professionalEmail =
      this.selectedAdminUserProfessional?.email?.trim() || '';
    return !professionalEmail;
  }

  get canAssignEmgToSelectedProfessional(): boolean {
    return isEmgAssignableSpecialization(
      this.adminUserForm.specializzazione,
    );
  }

  get canAssignPsgToSelectedProfessional(): boolean {
    return isPsgAssignableSpecialization(
      this.adminUserForm.specializzazione,
    );
  }

  get wizardFlowButtonLabel(): string {
    if (this.entryContext === 'admin') {
      return "Torna all'Area Admin";
    }

    if (this.entryContext === 'refertatore') {
      return "Torna all'Area Refertatore";
    }

    return 'Cambia flusso';
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
            ? "Completa i campi clinici PSG e conferma la refertazione. L'export PDF da firmare e il caricamento del firmato avvengono dalla dashboard refertatore."
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
          return this.emgRefertatoreMode
            ? "Completa Reperti e Conclusioni e conferma la refertazione. L'export PDF da firmare e il caricamento del firmato avvengono dalla dashboard refertatore."
          : "Completa il contenuto tecnico EMG e invia l'acquisizione al refertatore.";
      default:
        return 'Compila l\'anagrafica del paziente una sola volta per tutto il documento.';
    }
  }

  private applyReportTypeDefaults(type: ReportType): void {
    if (type === 'emg') {
      this.ensureTechnicalAcquisitionDefault();

      const defaultRefertatore = this.findDefaultRefertatore();
      const medicoId = this.control('medico.id').value;
      const medicoNome = this.control('medico.nome').value;
      const medicoCognome = this.control('medico.cognome').value;
      const medicoSpecialita = this.control('medico.specialita').value;
      const doctorStillValid =
        !medicoId || medicoSpecialita.trim() === EMG_DEFAULTS.specializzazione;
      const selectedDoctor = doctorStillValid
        ? {
            id: medicoId || defaultRefertatore?.id || '',
            nome: medicoNome || defaultRefertatore?.nome || '',
            cognome: medicoCognome || defaultRefertatore?.cognome || '',
            specialita: EMG_DEFAULTS.specializzazione,
          }
        : {
            id: defaultRefertatore?.id || '',
            nome: defaultRefertatore?.nome || '',
            cognome: defaultRefertatore?.cognome || '',
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
      const defaultRefertatore = this.findDefaultRefertatore();
      const medicoId = this.control('medico.id').value;
      const medicoNome = this.control('medico.nome').value;
      const medicoCognome = this.control('medico.cognome').value;
      const medicoSpecialita = this.control('medico.specialita').value;
      const doctorStillValid =
        !medicoId || medicoSpecialita.trim() === PSG_DEFAULTS.specializzazione;
      const selectedDoctor = doctorStillValid
        ? {
            id: medicoId || defaultRefertatore?.id || '',
            nome: medicoNome || defaultRefertatore?.nome || '',
            cognome: medicoCognome || defaultRefertatore?.cognome || '',
            specialita: PSG_DEFAULTS.specializzazione,
          }
        : {
            id: defaultRefertatore?.id || '',
            nome: defaultRefertatore?.nome || '',
            cognome: defaultRefertatore?.cognome || '',
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
        if (this.reportType === 'emg' && this.emgRefertatoreMode) {
          return true;
        }
        return this.form.get('anagrafica')?.valid ?? false;

      case 1:
        if (this.reportType === 'emg') {
          if (this.emgRefertatoreMode) {
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
          if (this.emgRefertatoreMode) {
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
          return this.emgRefertatoreMode
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
          if (this.emgRefertatoreMode) {
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
      if (this.emgRefertatoreMode) {
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
        this.emgRefertatoreMode ? [] : [Validators.required],
      );
      checklistControls.forEach((control: FormControl) =>
        control.setValidators([Validators.required]),
      );

      if (this.emgRefertatoreMode) {
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
        (d.specialita ?? '').toLowerCase().startsWith(q) ||
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
      return this.draftSaving ? 'Invio in corso...' : 'Invia al refertatore';
    }

    if (this.reviewerMode) {
      return this.draftSaving
        ? 'Completo ed esporto...'
        : 'Completa ed esporta PDF da firmare';
    }

    return this.standardPdfGenerating ? 'Esportazione in corso...' : 'Genera referto';
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

  openAsyncTypeSelection(): void {
    this.selectedReportType = null;
    this.uiState = 'asyncTypeSelection';
    this.draftMessage = '';
    this.draftError = '';
  }

  goToInitialTypeSelection(): void {
    this.entryContext = 'public';
    this.uiState = 'initialTypeSelection';
    this.selectedReportType = null;
    this.setEmgRefertatoreMode(false);
    this.closeResumeDraftModal();
    this.closePsgAnamnesisModal();
    this.closeEmgAnamnesisModal();
    this.archiveProfessionalFilter = '';
    this.archiveProfessionalSearch = '';
    this.showArchiveProfessionalSuggestions = false;
  }

  goToTypeActionSelection(): void {
    if (!this.selectedReportType) {
      this.uiState = 'initialTypeSelection';
      return;
    }

    this.uiState = 'typeActionSelection';
    this.entryContext = 'public';
    this.setEmgRefertatoreMode(false);
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
    this.entryContext = 'public';
    this.setEmgRefertatoreMode(false);
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

  startRefertatoreArea(): void {
    this.openReservedArea();
  }

  async handleWizardFlowAction(): Promise<void> {
    if (this.entryContext === 'admin') {
      if (this.hasUnsavedWizardChanges()) {
        const confirmed = window.confirm(
          'Ci sono modifiche non salvate. Vuoi davvero tornare all’Area Admin?',
        );
        if (!confirmed) {
          return;
        }
      }
      await this.openAdminDashboard();
      return;
    }

    if (this.entryContext === 'refertatore') {
      if (this.hasUnsavedWizardChanges()) {
        const confirmed = window.confirm(
          'Ci sono modifiche non salvate. Vuoi davvero tornare all’Area Refertatore?',
        );
        if (!confirmed) {
          return;
        }
      }
      await this.openRefertatoreDashboard(this.reportType as 'emg' | 'psg');
      return;
    }

    this.goToTypeActionSelection();
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
        void this.completeRefertoAsRefertatore();
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

  private async completeRefertoAsRefertatore(): Promise<void> {
    if (!this.reviewerMode) {
      return;
    }

    if (!this.isPreviewExportValid(true)) {
      return;
    }

    if (!this.currentDraftId) {
      this.setDraftMessage(
        'Salva o riprendi prima una bozza valida prima di completare il referto.',
        'warning',
      );
      return;
    }

    this.draftSaving = true;
    this.draftError = '';

    try {
      const payload = this.buildDraftPayload('pronto_per_firma');
      const completedDraft = await firstValueFrom(
        this.api.completeRefertatoreDraft(this.currentDraftId, payload),
      );

      this.currentDraftStatus = completedDraft.stato;
      this.draftLoaded = true;
      const previewPayload = this.payloadBuilder.build(
        this.form.getRawValue(),
        this.sections.getRawValue(),
      );
      const exported = await this.openPreviewPdfBlob(
        previewPayload,
        completedDraft.id,
      );
      this.setDraftMessage(
        exported
          ? 'PDF esportato. Firmalo digitalmente e caricalo dalla dashboard.'
          : "Referto completato. Se necessario puoi caricare il PDF firmato dalla dashboard dopo aver ripetuto l'esportazione.",
        exported ? 'success' : 'warning',
      );
      await this.openRefertatoreDashboard(this.reportType as 'emg' | 'psg');
    } catch (error: any) {
      console.error('Errore completamento referto refertatore:', error);
      this.draftError =
        error?.error?.error ||
        'Impossibile completare il referto in questo momento.';
      this.setDraftMessage(this.draftError, 'error');
    } finally {
      this.draftSaving = false;
    }
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

    if (this.reportType === 'emg' && this.emgRefertatoreMode) {
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

  private async openPreviewPdfBlob(
    payload: ReportPdfRequest,
    previewDraftId?: string | null,
  ): Promise<boolean> {
    try {
      const targetPreviewDraftId = previewDraftId ?? this.currentDraftId;
      if (targetPreviewDraftId && this.entryContext === 'refertatore') {
        await firstValueFrom(this.api.exportRefertatoreDraftPreview(targetPreviewDraftId));
      }
      const blob = await firstValueFrom(this.api.previewPdf(payload));
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
          this.reviewerMode ? this.refertatoreToken : undefined,
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
          this.reviewerMode ? this.refertatoreToken : undefined,
        );
      }

      this.completedReadonlyMode = true;
      await this.refreshDraftList(false);
      if (this.reviewerMode) {
        await this.openRefertatoreDashboard(this.reportType as 'emg' | 'psg');
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
    if (this.reviewerMode && this.currentDraftId) {
      await this.saveRefertatoreDraftProgress();
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

  async submitRefertatoreLogin(): Promise<void> {
    this.refertatoreLoginError = '';

    if (this.refertatoreLoginLoading) {
      return;
    }

    if (!this.refertatoreEmail.trim() || !this.refertatorePassword.trim()) {
      this.refertatoreLoginError = 'Inserisci email e password dell’Area Riservata.';
      return;
    }

    this.refertatoreLoginLoading = true;

    try {
      const response = await firstValueFrom(
        this.api.login(
          this.refertatoreEmail.trim(),
          this.refertatorePassword,
        ),
      );

      this.refertatoreUser = response.user;
      this.reservedUser = response.user;
      this.refertatoreToken = 'session';
      this.refertatorePassword = '';
      this.showReservedPassword = false;
      this.persistRefertatoreSession();
      await this.routeReservedUserDashboard();
    } catch (error) {
      console.error('Errore login area riservata:', error);
      this.refertatoreLoginError = 'Credenziali non valide.';
    } finally {
      this.refertatoreLoginLoading = false;
    }
  }

  async logoutRefertatore(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch (error) {
      console.error('Errore logout area riservata:', error);
    }

    this.refertatorePassword = '';
    this.showReservedPassword = false;
    this.refertatoreLoginError = '';
    this.showReservedUserMenu = false;
    this.refertatoreDrafts = [];
    this.refertatoreArchiveDrafts = [];
    this.clearRefertatoreSession();
    this.entryContext = 'public';
    this.uiState = 'initialTypeSelection';
  }

  toggleReservedUserMenu(): void {
    this.showReservedUserMenu = !this.showReservedUserMenu;
  }

  openChangePasswordFromMenu(): void {
    this.showReservedUserMenu = false;
    this.openChangePasswordModal();
  }

  openChangePasswordModal(): void {
    this.changePasswordError = '';
    this.changePasswordMessage = '';
    this.changePasswordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
    this.showChangePasswordModal = true;
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
  }

  async submitChangePassword(): Promise<void> {
    this.changePasswordError = '';
    this.changePasswordMessage = '';

    const currentPassword = this.changePasswordForm.currentPassword.trim();
    const newPassword = this.changePasswordForm.newPassword.trim();
    const confirmPassword = this.changePasswordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      this.changePasswordError = 'Compila tutti i campi password.';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.changePasswordError = 'La conferma password non coincide.';
      return;
    }

    if (currentPassword === newPassword) {
      this.changePasswordError = 'La nuova password deve essere diversa da quella attuale.';
      return;
    }

    this.changePasswordLoading = true;

    try {
      await firstValueFrom(this.api.getCsrf());
      const response = await firstValueFrom(
        this.api.changePassword(currentPassword, newPassword),
      );
      this.changePasswordMessage = response.message;
      this.changePasswordForm = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      };
      this.setDraftMessage('Password aggiornata correttamente.', 'success');
      this.showChangePasswordModal = false;
    } catch (error: any) {
      console.error('Errore cambio password:', error);
      this.changePasswordError =
        error?.error?.error || "Impossibile aggiornare la password in questo momento.";
    } finally {
      this.changePasswordLoading = false;
    }
  }

  async openRefertatoreDashboard(preferredTab?: 'emg' | 'psg'): Promise<void> {
    if (!this.reservedUser || this.reservedUser.role !== 'refertatore') {
      this.uiState = 'reservedLogin';
      return;
    }

    this.refertatoreDraftsLoading = true;
    this.refertatoreDraftsError = '';

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
      this.refertatoreTab =
        preferredTab && assignedTypes.includes(preferredTab)
          ? preferredTab
          : this.hasEmgAssignment
            ? 'emg'
            : 'psg';
      this.showReservedUserMenu = false;
      this.entryContext = 'refertatore';
      this.uiState = 'refertatoreDashboard';
    } catch (error) {
      console.error('Errore caricamento area refertatore:', error);
      this.refertatoreDraftsError =
        'Impossibile caricare i referti assegnati al refertatore.';
      this.uiState = 'reservedLogin';
      this.clearRefertatoreSession();
    } finally {
      this.refertatoreDraftsLoading = false;
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
        entryContext: 'public',
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

  async openRefertatoreDraft(id: string): Promise<void> {
    if (!this.reservedUser) {
      this.uiState = 'reservedLogin';
      return;
    }

    this.refertatoreOpeningDraftId = id;
    this.refertatoreDraftsError = '';

    try {
      const draft = await firstValueFrom(
        this.api.getRefertatoreDraft(id),
      );
      await this.hydrateDraft(draft, {
        refertatoreMode: true,
        refertatoreToken: 'session',
        entryContext: 'refertatore',
      });
      this.uiState = 'wizard';
      this.setDraftMessage('Referto assegnato aperto in area refertatore.', 'success');
    } catch (error) {
      console.error('Errore apertura referto refertatore:', error);
      this.refertatoreDraftsError =
        'Impossibile aprire il referto assegnato selezionato.';
    } finally {
      this.refertatoreOpeningDraftId = null;
    }
  }

  setRefertatoreTab(tab: 'emg' | 'psg'): void {
    this.refertatoreTab = tab;
    this.draftMessage = '';
  }

  async exportReadyRefertatoreDraft(draft: ReportDraftSummary): Promise<void> {
    if (draft.stato !== 'pronto_per_firma') {
      this.setDraftMessage(
        'Completa prima il referto prima di esportare il PDF da firmare.',
        'warning',
      );
      return;
    }

    this.draftActionLoadingId = draft.id;
    this.refertatoreDraftsError = '';

    try {
      const payload = await this.buildDashboardPreviewPayload(draft.id);
      const ok = await this.openPreviewPdfBlob(payload, draft.id);

      if (ok) {
        this.setDraftMessage(
          'PDF temporaneo esportato senza salvataggio su Drive.',
          'success',
        );
      }
    } catch (error) {
      console.error('Errore export dashboard refertatore:', error);
      this.refertatoreDraftsError =
        'Impossibile esportare il PDF da firmare in questo momento.';
    } finally {
      this.draftActionLoadingId = null;
    }
  }

  openDashboardSignedPdfModal(draft: ReportDraftSummary): void {
    this.dashboardSignedPdfDraft = draft;
    this.dashboardSignedPdfAsset = null;
    this.dashboardSignedPdfError = '';
    this.showDashboardSignedPdfModal = true;
  }

  closeDashboardSignedPdfModal(): void {
    this.showDashboardSignedPdfModal = false;
    this.dashboardSignedPdfDraft = null;
    this.dashboardSignedPdfAsset = null;
    this.dashboardSignedPdfSaving = false;
    this.dashboardSignedPdfError = '';
  }

  async onDashboardSignedPdfSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.dashboardSignedPdfError = '';

    if (!file) {
      input.value = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      this.dashboardSignedPdfError = 'Puoi caricare solo file PDF firmati.';
      input.value = '';
      return;
    }

    try {
      this.dashboardSignedPdfAsset = await this.buildPdfAssetFromFile(file);
    } catch (error) {
      console.error('Errore lettura PDF firmato:', error);
      this.dashboardSignedPdfError =
        'Impossibile leggere il PDF firmato selezionato.';
    } finally {
      input.value = '';
    }
  }

  async saveDashboardSignedPdf(): Promise<void> {
    const draft = this.dashboardSignedPdfDraft;
    const asset = this.dashboardSignedPdfAsset;

    if (!draft) {
      return;
    }

    if (draft.stato !== 'pronto_per_firma') {
      this.dashboardSignedPdfError =
        'Il PDF firmato puo essere caricato solo per referti pronti per firma.';
      return;
    }

    if (!asset?.base64) {
      this.dashboardSignedPdfError = 'Seleziona prima un PDF firmato da caricare.';
      return;
    }

    const confirmed = window.confirm(
      'Confermi di voler caricare questo PDF firmato come referto definitivo?',
    );

    if (!confirmed) {
      return;
    }

    this.dashboardSignedPdfSaving = true;
    this.dashboardSignedPdfError = '';

    try {
      await firstValueFrom(
        this.api.uploadSignedDraftPdf(
          draft.id,
          {
            tipo_referto: draft.tipo_referto as 'emg' | 'psg',
            fileName: asset.name,
            mimeType: 'application/pdf',
            base64: asset.base64,
          },
          this.refertatoreToken,
        ),
      );
      this.closeDashboardSignedPdfModal();
      await this.openRefertatoreDashboard(this.reportType as 'emg' | 'psg');
      this.setDraftMessage(
        'PDF firmato caricato e archiviato su Drive come referto definitivo.',
        'success',
      );
    } catch (error) {
      console.error('Errore upload PDF firmato da dashboard:', error);
      this.dashboardSignedPdfError =
        'Impossibile salvare il PDF firmato in questo momento.';
    } finally {
      this.dashboardSignedPdfSaving = false;
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
      refertatoreMode?: boolean;
      refertatoreToken?: string;
      readonlyMode?: boolean;
      entryContext?: EntryContext;
    } = {},
  ): Promise<void> {
    const formData = draft.form_data?.form ?? {};
    const sectionsData = draft.form_data?.sections ?? {};
    const meta = draft.form_data?.meta;
    const rawForm = this.getFreshFormState();
    const rawSections = this.getFreshSectionsState();
    const tipoReferto = draft.tipo_referto || formData.tipoReferto || 'standard';
    const reviewerEnabled =
      !!options.refertatoreMode &&
      draft.stato !== 'completato' &&
      draft.stato !== 'firmato_caricato';
    this.selectedReportType = tipoReferto;
    this.entryContext = options.entryContext || 'public';

    this.resetTransientUiState();
    this.setEmgRefertatoreMode(false);
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
      options.refertatoreToken,
    );
    if (this.completedReadonlyMode) {
      this.form.disable({ emitEvent: false });
      this.sections.disable({ emitEvent: false });
      this.reviewerMode = false;
      this.emgRefertatoreMode = false;
    } else {
      this.setEmgRefertatoreMode(reviewerEnabled);
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

    if (this.reportType === 'emg' && this.emgRefertatoreMode && this.currentDraftId) {
      const saved = await this.saveRefertatoreDraftProgress(false);
      if (!saved) {
        return;
      }
    }

    if (this.reportType === 'standard') {
      const prepared = await this.ensureStandardArchiveDraftBeforePdf();
      if (!prepared) {
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

    this.standardPdfGenerating = true;

    this.api.generatePdf(payload).subscribe({
      next: (response) => {
        const htmlResponse = response.body || '';
        printWindow?.document.open();
        printWindow?.document.write(htmlResponse);
        printWindow?.document.close();
        void this.markDraftCompletedAfterPdfSuccess({
          driveFileId: response.headers.get('x-remedic-drive-file-id'),
          driveWebViewLink: response.headers.get('x-remedic-drive-link'),
        });
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
        this.standardPdfGenerating = false;
      },
      complete: () => {
        this.standardPdfGenerating = false;
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

  private restoreRefertatoreSession(): void {
    void this.restoreReservedSession();
  }

  private persistRefertatoreSession(): void {
    // Gestione sessione delegata ai cookie HttpOnly del backend.
  }

  private clearRefertatoreSession(): void {
    this.api.clearAuthState();
    this.refertatoreToken = '';
    this.refertatoreUser = null;
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
      this.goToInitialTypeSelection();
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

  private async saveRefertatoreDraftProgress(
    showSuccessMessage = true,
  ): Promise<ReportDraftDetail | null> {
    if (!this.currentDraftId || !this.refertatoreToken) {
      this.setDraftMessage(
        'Sessione refertatore non disponibile per il salvataggio.',
        'warning',
      );
      return null;
    }

    this.draftSaving = true;
    this.draftError = '';

    try {
      const payload = this.buildDraftPayload('in_refertazione_refertatore');
      const savedDraft = await firstValueFrom(
        this.api.updateRefertatoreDraft(this.currentDraftId, payload),
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
            status === 'in_attesa_refertatore' ||
            status === 'in_refertazione_refertatore' ||
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
    if (this.reviewerMode) {
      if (this.currentDraftStatus === 'pronto_per_firma') {
        return 'pronto_per_firma';
      }

      return 'in_refertazione_refertatore';
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
      if (this.currentDraftStatus === 'in_attesa_refertatore') {
        return 'in_attesa_refertatore';
      }

      if (this.currentDraftStatus === 'pronto_per_firma') {
        return 'pronto_per_firma';
      }

      if (this.currentDraftStatus === 'in_refertazione_refertatore') {
        return 'in_refertazione_refertatore';
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

  private async ensureStandardArchiveDraftBeforePdf(): Promise<boolean> {
    this.draftError = '';

    try {
      const payload = this.buildDraftPayload('in_refertazione');
      const savedDraft = this.currentDraftId
        ? await firstValueFrom(this.api.updateDraft(this.currentDraftId, payload))
        : await firstValueFrom(this.api.createDraft(payload));

      this.currentDraftId = savedDraft.id;
      this.currentDraftStatus = savedDraft.stato;
      this.draftLoaded = true;
      return true;
    } catch (error) {
      console.error('Errore preparazione archivio referto standard:', error);
      this.setDraftMessage(
        'Impossibile preparare l’archivio del referto standard prima dell’esportazione.',
        'error',
      );
      return false;
    }
  }

  private async markDraftCompletedAfterPdfSuccess(driveInfo?: {
    driveFileId?: string | null;
    driveWebViewLink?: string | null;
  }): Promise<void> {
    if (!this.currentDraftId) {
      return;
    }

    try {
      const payload = this.buildDraftPayload('completato');
      payload.form_data.meta = {
        ...payload.form_data.meta,
        ...(driveInfo?.driveFileId ? { driveFileId: driveInfo.driveFileId } : {}),
        ...(driveInfo?.driveWebViewLink
          ? { driveWebViewLink: driveInfo.driveWebViewLink }
          : {}),
      };

      const updatedDraft = await firstValueFrom(
        this.api.updateDraft(this.currentDraftId, payload),
      );
      this.currentDraftStatus = updatedDraft.stato;
      this.setDraftMessage('Referto standard archiviato correttamente.', 'success');
    } catch (error) {
      console.error('Errore aggiornamento stato bozza:', error);
      this.setDraftMessage(
        'Il PDF e stato generato, ma non sono riuscito ad aggiornare correttamente l’archivio.',
        'warning',
      );
    }
  }

  private setDraftMessage(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ): void {
    if (this.draftMessageTimeoutId) {
      window.clearTimeout(this.draftMessageTimeoutId);
      this.draftMessageTimeoutId = null;
    }

    this.draftMessage = message;
    this.draftMessageType = type;

    const dismissAfterMs =
      type === 'success'
        ? 3800
        : type === 'warning'
          ? 5600
          : type === 'info'
            ? 4200
            : 0;

    if (dismissAfterMs > 0) {
      this.draftMessageTimeoutId = window.setTimeout(() => {
        this.dismissDraftMessage();
      }, dismissAfterMs);
    }
  }

  dismissDraftMessage(): void {
    if (this.draftMessageTimeoutId) {
      window.clearTimeout(this.draftMessageTimeoutId);
      this.draftMessageTimeoutId = null;
    }

    this.draftMessage = '';
    this.draftMessageType = 'info';
  }

  private resetTransientUiState(): void {
    this.attachmentsReloadNotice = '';
    this.draftError = '';
    this.dismissDraftMessage();
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
      this.adminArchiveDrafts = this.adminArchiveDrafts.map((draft) =>
        draft.id === this.sendToPatientDraft?.id
          ? { ...draft, patient_email_sent: true }
          : draft,
      );
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

  openDraftDriveLink(draft: ReportDraftSummary): void {
    if (!draft.drive_web_view_link) {
      this.setDraftMessage(
        'Link Drive non disponibile per il referto selezionato.',
        'warning',
      );
      return;
    }

    window.open(draft.drive_web_view_link, '_blank', 'noopener,noreferrer');
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

  formatDateValue(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const dateOnly = this.extractDatePart(value);
    if (!dateOnly) {
      return '-';
    }

    const [year, month, day] = dateOnly.split('-');
    if (!year || !month || !day) {
      return '-';
    }

    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return this.formatDateValue(value);
    }

    return `${this.formatDateDisplay(date)} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes(),
    ).padStart(2, '0')}`;
  }

  private filteredDoctors(): DoctorInfo[] {
    if (this.reportType === 'emg') {
      return this.refertatoriEmg;
    }

    if (this.reportType === 'psg') {
      return this.refertatoriPsg;
    }

    return this.doctors.filter(
      (doctor) =>
        doctor.visibleInStandard !== false &&
        !this.isTechnicianSpecialization(doctor.specialita),
    );
  }

  private findDefaultRefertatore(): DoctorInfo | undefined {
    return this.filteredDoctors().find(
      (doctor) =>
        !this.isTechnicianSpecialization(doctor.specialita) &&
        doctor.nome === 'Sebastiano' &&
        doctor.cognome.includes('Arena'),
    );
  }

  private filteredTechnicians(): DoctorInfo[] {
    return this.doctors.filter(
      (doctor) =>
        doctor.active !== false &&
        this.isTechnicianSpecialization(doctor.specialita),
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
          firstValueFrom(this.api.listProfessionals({ active: true })),
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
        (item) =>
          !this.isTechnicianSpecialization(item.specialita) &&
          isEmgAssignableSpecialization(item.specialita),
      );
      this.refertatoriPsg = this.fallbackDoctors.filter(
        (item) =>
          !this.isTechnicianSpecialization(item.specialita) &&
          isPsgAssignableSpecialization(item.specialita),
      );
    }
  }

  private async restoreReservedSession(): Promise<void> {
    try {
      const response = await firstValueFrom(this.api.me());
      this.reservedUser = response.user;
      this.refertatoreUser = response.user;
      this.refertatoreToken = 'session';
      await firstValueFrom(this.api.getCsrf());
    } catch {
      this.clearRefertatoreSession();
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
    this.refertatoreLoginError = '';
    this.showReservedUserMenu = false;
    if (this.reservedUser) {
      void this.routeReservedUserDashboard();
      return;
    }
    this.uiState = 'reservedLogin';
  }

  goToReservedLogin(): void {
    this.refertatoreLoginError = '';
    this.forgotPasswordMessage = '';
    this.resetPasswordMessage = '';
    this.showReservedUserMenu = false;
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

    await this.openRefertatoreDashboard();
  }

  async openAdminDashboard(): Promise<void> {
    this.adminDashboardLoading = true;
    this.adminDashboardError = '';

    try {
      await firstValueFrom(this.api.getCsrf());
      const [usersResponse, professionalsResponse, draftsResponse, archiveResponse] =
        await Promise.all([
          firstValueFrom(this.api.listAdminUsers()),
          firstValueFrom(this.api.listAdminProfessionals()),
          firstValueFrom(this.api.listAdminDrafts()),
          firstValueFrom(this.api.listAdminArchive()),
        ]);

      this.adminUsers = usersResponse.items;
      this.adminProfessionals = professionalsResponse.items;
      this.adminDrafts = draftsResponse.items;
      this.adminArchiveDrafts = archiveResponse.items;
      await this.loadAuditLogs(1);
      this.professionalsPage = 1;
      this.refertatoriPage = 1;
      this.adminArchiveTab = 'standard';
      this.archiveProfessionalFilter = '';
      this.archiveProfessionalSearch = '';
      this.showArchiveProfessionalSuggestions = false;
      this.showReservedUserMenu = false;
      this.entryContext = 'admin';
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

  async loadAuditLogs(page = this.auditPage): Promise<void> {
    const response = await firstValueFrom(
      this.api.listAuditLogs(page, this.auditPageSize),
    );
    this.auditLogs = response.items;
    this.auditTotal = response.total;
    this.auditPage = response.page;
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
        entryContext: 'admin',
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

  draftsToCompleteByType(tipo: 'emg' | 'psg'): ReportDraftSummary[] {
    return this.refertatoreDrafts.filter(
      (draft) =>
        draft.tipo_referto === tipo &&
        (draft.stato === 'in_attesa_refertatore' ||
          draft.stato === 'in_refertazione_refertatore'),
    );
  }

  readyForSignatureDraftsByType(tipo: 'emg' | 'psg'): ReportDraftSummary[] {
    return this.refertatoreDrafts.filter(
      (draft) => draft.tipo_referto === tipo && draft.stato === 'pronto_per_firma',
    );
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
    this.adminDashboardError = '';
    this.adminUserProfessionalError = '';
    this.adminUserFieldErrors = {};

    if (!this.adminUserForm.professional_id) {
      this.adminUserFieldErrors['professional_id'] =
        'Seleziona un professionista esistente prima di creare il refertatore.';
      return;
    }

    if (!this.adminUserForm.email.trim() && this.adminUserEmailRequired) {
      this.adminUserFieldErrors['email'] =
        "L'email e obbligatoria se il professionista selezionato non ne ha una.";
      return;
    }

    if (!this.adminUserForm.id && !this.adminUserForm.password.trim()) {
      this.adminUserFieldErrors['password'] =
        'La password temporanea e obbligatoria per creare il refertatore.';
      return;
    }

    if (
      !this.canAssignEmgToSelectedProfessional &&
      this.adminUserForm.assignedTypes.includes('emg')
    ) {
      this.adminUserFieldErrors['assignedTypes'] =
        'Il professionista selezionato non puo essere assegnato a EMG.';
      return;
    }

    if (
      !this.canAssignPsgToSelectedProfessional &&
      this.adminUserForm.assignedTypes.includes('psg')
    ) {
      this.adminUserFieldErrors['assignedTypes'] =
        'Il professionista selezionato non puo essere assegnato a PSG.';
      return;
    }

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
      this.showAdminUserModal = false;
      await this.openAdminDashboard();
    } catch (error) {
      console.error('Errore salvataggio utente admin:', error);
      if (!this.applyAdminFieldErrors(error, this.adminUserFieldErrors)) {
        this.adminDashboardError = 'Impossibile salvare il refertatore/admin.';
      }
    }
  }

  async saveAdminProfessional(): Promise<void> {
    this.adminDashboardError = '';
    this.adminProfessionalFieldErrors = {};
    const normalizedSpecialization = normalizeSpecialization(
      this.professionalSpecializationSearch,
    );
    if (!normalizedSpecialization) {
      this.adminProfessionalFieldErrors['specializzazione'] =
        "Seleziona una specializzazione valida dall'elenco disponibile.";
      return;
    }

    this.adminProfessionalForm.specializzazione = normalizedSpecialization;
    this.professionalSpecializationSearch = normalizedSpecialization;
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
      this.showAdminProfessionalModal = false;
      await this.openAdminDashboard();
      await this.loadOperationalOptions();
    } catch (error) {
      console.error('Errore salvataggio professionista admin:', error);
      if (!this.applyAdminFieldErrors(error, this.adminProfessionalFieldErrors)) {
        this.adminDashboardError = 'Impossibile salvare il professionista.';
      }
    }
  }

  editAdminUser(user: AdminUserItem): void {
    this.adminTab = 'users';
    this.adminUserForm = {
      id: user.id,
      role: user.role,
      professional_id: user.professional_id || '',
      professional_display_name:
        user.professional_display_name || user.display_name,
      email: user.email,
      password: '',
      display_name: user.display_name,
      specializzazione: user.specializzazione || '',
      assignedTypes: [...user.assignedTypes],
    };
    this.adminUserProfessionalSearch =
      user.professional_display_name || user.display_name;
    this.adminUserProfessionalError = '';
    this.adminUserFieldErrors = {};
    this.showAdminUserModal = true;
  }

  editAdminProfessional(professional: ProfessionalItem): void {
    this.adminTab = 'professionals';
    this.adminProfessionalForm = {
      id: professional.id,
      first_name: professional.first_name || '',
      last_name: professional.last_name || '',
      display_name: professional.display_name,
      email: professional.email || '',
      specializzazione: professional.specializzazione || '',
      role_label: professional.role_label || '',
      visible_in_standard: professional.visible_in_standard,
      is_refertatore: professional.is_refertatore,
      active: professional.active,
      sort_order: professional.sort_order,
    };
    this.professionalSpecializationSearch =
      professional.specializzazione || '';
    this.adminProfessionalFieldErrors = {};
    this.showAdminProfessionalModal = true;
  }

  toggleAdminAssignedType(
    tipo: 'emg' | 'psg',
    checked: boolean,
  ): void {
    if (tipo === 'emg' && !this.canAssignEmgToSelectedProfessional) {
      return;
    }

    if (tipo === 'psg' && !this.canAssignPsgToSelectedProfessional) {
      return;
    }

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
      professional_id: '',
      professional_display_name: '',
      email: '',
      password: '',
      display_name: '',
      specializzazione: '',
      assignedTypes: [],
    };
    this.adminUserProfessionalSearch = '';
    this.adminUserProfessionalError = '';
    this.adminUserFieldErrors = {};
    this.showAdminUserProfessionalSuggestions = false;
  }

  resetAdminProfessionalForm(): void {
    this.adminProfessionalForm = {
      id: '',
      first_name: '',
      last_name: '',
      display_name: '',
      email: '',
      specializzazione: '',
      role_label: '',
      visible_in_standard: true,
      is_refertatore: false,
      active: true,
      sort_order: 0,
    };
    this.professionalSpecializationSearch = '';
    this.showProfessionalSpecializationSuggestions = false;
    this.adminProfessionalFieldErrors = {};
  }

  openNewProfessionalModal(): void {
    this.resetAdminProfessionalForm();
    this.showAdminProfessionalModal = true;
  }

  closeProfessionalModal(): void {
    this.showAdminProfessionalModal = false;
    this.adminProfessionalFieldErrors = {};
  }

  openNewRefertatoreModal(): void {
    this.resetAdminUserForm();
    this.adminUserForm.role = 'refertatore';
    this.showAdminUserModal = true;
  }

  closeRefertatoreModal(): void {
    this.showAdminUserModal = false;
    this.adminUserFieldErrors = {};
  }

  selectProfessionalForRefertatore(professional: ProfessionalItem): void {
    this.adminUserForm.professional_id = professional.id;
    this.adminUserForm.professional_display_name = professional.display_name;
    this.adminUserForm.display_name = professional.display_name;
    this.adminUserForm.specializzazione = professional.specializzazione || '';
    this.adminUserForm.email = professional.email || '';
    this.adminUserProfessionalSearch = professional.display_name;
    this.adminUserProfessionalError = '';
    this.adminUserFieldErrors['professional_id'] = '';
    this.adminUserFieldErrors['email'] = '';
    this.showAdminUserProfessionalSuggestions = false;

    this.adminUserForm.assignedTypes = this.adminUserForm.assignedTypes.filter(
      (tipo) =>
        (tipo === 'emg' && this.canAssignEmgToSelectedProfessional) ||
        (tipo === 'psg' && this.canAssignPsgToSelectedProfessional),
    );
  }

  requestDeleteProfessional(professional: ProfessionalItem): void {
    this.openDeleteResourceModal(
      'professional',
      professional.id,
      professional.display_name,
    );
  }

  requestDeleteRefertatore(user: AdminUserItem): void {
    this.openDeleteResourceModal('refertatore', user.id, user.display_name);
  }

  requestDeleteWorkingDraft(draft: ReportDraftSummary): void {
    this.openDeleteResourceModal(
      'workingDraft',
      draft.id,
      draft.paziente_nome_completo || 'Referto in lavorazione',
    );
  }

  requestDeleteArchiveDraft(draft: ReportDraftSummary): void {
    this.openDeleteResourceModal(
      'archiveDraft',
      draft.id,
      draft.paziente_nome_completo || 'Referto archiviato',
    );
  }

  openDeleteResourceModal(
    kind: 'professional' | 'refertatore' | 'workingDraft' | 'archiveDraft',
    id: string,
    name: string,
  ): void {
    this.deleteResourceTarget = { kind, id, name };
    this.deleteResourceError = '';
    this.deleteResourceLoading = false;
    this.showDeleteResourceModal = true;
  }

  closeDeleteResourceModal(): void {
    if (this.deleteResourceLoading) {
      return;
    }

    this.showDeleteResourceModal = false;
    this.deleteResourceError = '';
    this.deleteResourceTarget = null;
  }

  async confirmDeleteResource(): Promise<void> {
    if (!this.deleteResourceTarget) {
      return;
    }

    this.deleteResourceLoading = true;
    this.deleteResourceError = '';

    try {
      await firstValueFrom(this.api.getCsrf());

      if (this.deleteResourceTarget.kind === 'professional') {
        await firstValueFrom(
          this.api.deleteAdminProfessional(this.deleteResourceTarget.id),
        );
        this.adminProfessionals = this.adminProfessionals.filter(
          (item) => item.id !== this.deleteResourceTarget?.id,
        );
        this.professionalsPage = Math.min(
          this.professionalsPage,
          this.professionalsTotalPages,
        );
        await this.loadOperationalOptions();
        this.setDraftMessage('Professionista eliminato (disattivato).', 'success');
      } else if (this.deleteResourceTarget.kind === 'refertatore') {
        await firstValueFrom(this.api.deleteAdminUser(this.deleteResourceTarget.id));
        this.adminUsers = this.adminUsers.filter(
          (item) => item.id !== this.deleteResourceTarget?.id,
        );
        this.refertatoriPage = Math.min(
          this.refertatoriPage,
          this.refertatoriTotalPages,
        );
        this.setDraftMessage(
          'Refertatore disattivato. I referti storici restano conservati.',
          'success',
        );
      } else if (this.deleteResourceTarget.kind === 'workingDraft') {
        await firstValueFrom(this.api.deleteAdminDraft(this.deleteResourceTarget.id));
        this.adminDrafts = this.adminDrafts.filter(
          (item) => item.id !== this.deleteResourceTarget?.id,
        );
        this.setDraftMessage(
          'Referto in lavorazione eliminato correttamente.',
          'success',
        );
      } else {
        await firstValueFrom(
          this.api.deleteAdminArchiveDraft(this.deleteResourceTarget.id),
        );
        this.adminArchiveDrafts = this.adminArchiveDrafts.filter(
          (item) => item.id !== this.deleteResourceTarget?.id,
        );
        this.setDraftMessage(
          'Referto archiviato rimosso dalla lista admin.',
          'success',
        );
      }
      this.deleteResourceLoading = false;
      this.showDeleteResourceModal = false;
      this.deleteResourceError = '';
      this.deleteResourceTarget = null;
    } catch (error: any) {
      console.error('Errore eliminazione risorsa admin:', error);
      this.deleteResourceError =
        error?.error?.message ||
        error?.error?.error ||
        'Impossibile eliminare la risorsa selezionata.';
    } finally {
      this.deleteResourceLoading = false;
    }
  }

  setAdminArchiveTab(tab: 'standard' | 'async'): void {
    this.adminArchiveTab = tab;
    this.archiveProfessionalFilter = '';
    this.archiveProfessionalSearch = '';
    this.showArchiveProfessionalSuggestions = false;
  }

  selectArchiveProfessionalFilter(value: string): void {
    this.archiveProfessionalFilter = value;
    this.archiveProfessionalSearch = value;
    this.showArchiveProfessionalSuggestions = false;
  }

  clearArchiveProfessionalFilter(): void {
    this.archiveProfessionalFilter = '';
    this.archiveProfessionalSearch = '';
    this.showArchiveProfessionalSuggestions = false;
  }

  canArchiveDraftBeSentToPatient(draft: ReportDraftSummary): boolean {
    return (
      (draft.tipo_referto === 'emg' || draft.tipo_referto === 'psg') &&
      draft.stato === 'completato' &&
      !!draft.has_signed_pdf
    );
  }

  canArchiveDraftBeSavedToDrive(draft: ReportDraftSummary): boolean {
    return (
      (draft.tipo_referto === 'emg' || draft.tipo_referto === 'psg') &&
      draft.stato === 'completato' &&
      !!draft.has_signed_pdf &&
      !draft.drive_file_id
    );
  }

  async saveArchiveDraftToDrive(draft: ReportDraftSummary): Promise<void> {
    if (!this.canArchiveDraftBeSavedToDrive(draft)) {
      return;
    }

    this.adminArchiveDriveLoadingId = draft.id;
    this.adminDashboardError = '';

    try {
      await firstValueFrom(this.api.getCsrf());
      const response = await firstValueFrom(
        this.api.saveAdminArchiveDraftToDrive(draft.id),
      );
      this.adminArchiveDrafts = this.adminArchiveDrafts.map((item) =>
        item.id === draft.id
          ? {
              ...item,
              drive_file_id:
                response?.attachment?.drive_file_id ||
                response?.drive?.driveFileId ||
                item.drive_file_id ||
                null,
              drive_web_view_link:
                response?.attachment?.drive_web_view_link ||
                response?.drive?.driveWebViewLink ||
                item.drive_web_view_link ||
                null,
            }
          : item,
      );
      this.setDraftMessage(
        response?.message || 'Referto archiviato su Drive correttamente.',
        'success',
      );
    } catch (error: any) {
      console.error('Errore archiviazione su Drive da area admin:', error);
      this.adminDashboardError =
        error?.error?.message ||
        "Impossibile completare il salvataggio su Drive dall'archivio admin.";
    } finally {
      this.adminArchiveDriveLoadingId = null;
    }
  }

  onProfessionalSpecializationSearchFocus(): void {
    this.showProfessionalSpecializationSuggestions = true;
  }

  onProfessionalSpecializationSearchBlur(): void {
    window.setTimeout(() => {
      this.showProfessionalSpecializationSuggestions = false;
    }, 120);
  }

  onAdminUserProfessionalFocus(): void {
    this.showAdminUserProfessionalSuggestions = true;
  }

  onAdminUserProfessionalBlur(): void {
    window.setTimeout(() => {
      this.showAdminUserProfessionalSuggestions = false;
    }, 120);
  }

  selectProfessionalSpecialization(value: string): void {
    this.professionalSpecializationSearch = value;
    this.adminProfessionalForm.specializzazione = value;
    this.adminProfessionalFieldErrors['specializzazione'] = '';
    this.showProfessionalSpecializationSuggestions = false;
  }

  private applyAdminFieldErrors(
    error: any,
    target: Record<string, string>,
  ): boolean {
    const fieldErrors = error?.error?.fieldErrors;
    if (!fieldErrors || typeof fieldErrors !== 'object') {
      return false;
    }

    Object.keys(target).forEach((key) => delete target[key]);
    Object.entries(fieldErrors).forEach(([key, value]) => {
      target[key] = String(value || '');
    });
    return true;
  }

  onProfessionalSearchChange(): void {
    this.professionalsPage = 1;
  }

  nextProfessionalsPage(): void {
    if (this.professionalsPage < this.professionalsTotalPages) {
      this.professionalsPage += 1;
    }
  }

  prevProfessionalsPage(): void {
    if (this.professionalsPage > 1) {
      this.professionalsPage -= 1;
    }
  }

  nextRefertatoriPage(): void {
    if (this.refertatoriPage < this.refertatoriTotalPages) {
      this.refertatoriPage += 1;
    }
  }

  prevRefertatoriPage(): void {
    if (this.refertatoriPage > 1) {
      this.refertatoriPage -= 1;
    }
  }

  async nextAuditPage(): Promise<void> {
    if (this.auditPage < this.auditTotalPages) {
      await this.loadAuditLogs(this.auditPage + 1);
    }
  }

  async prevAuditPage(): Promise<void> {
    if (this.auditPage > 1) {
      await this.loadAuditLogs(this.auditPage - 1);
    }
  }

  private mapProfessionalToDoctor(item: ProfessionalItem): DoctorInfo {
    return {
      id: item.id,
      nome: item.first_name || item.display_name,
      cognome: item.last_name || '',
      specialita: item.specializzazione || '',
      ruolo: item.role_label || '',
      displayName: item.display_name,
      email: item.email,
      isRefertatore: item.is_refertatore,
      active: item.active,
      visibleInStandard: item.visible_in_standard,
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
      displayName: item.display_name,
      email: item.email,
      assignedTypes: item.assignedTypes,
      isRefertatore: true,
      active: true,
    };
  }

  private isTechnicianSpecialization(
    specializzazione?: string | null,
  ): boolean {
    return (
      normalizeSpecialization(specializzazione) ===
      'Tecnico di Neurofisiopatologia'
    );
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

  private setEmgRefertatoreMode(enabled: boolean): void {
    this.reviewerMode = enabled;
    this.emgRefertatoreMode = enabled && this.reportType === 'emg';

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
    refertatoreToken?: string,
  ): Promise<void> {
    if (!draftId) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.api.listDraftAttachments(draftId, refertatoreToken),
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
              refertatoreToken,
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
          this.mapDraftAttachmentToAsset(draftId, item, refertatoreToken),
        ),
      );

      const signatureAsset = signatureMetadata
        ? await this.mapDraftAttachmentToAsset(
            draftId,
            signatureMetadata,
            refertatoreToken,
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
    refertatoreToken?: string,
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
          refertatoreToken,
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
        refertatoreToken,
      ),
    );

    return {
      ...asset,
      dataUrl: response.dataUrl,
    };
  }

  private async buildDashboardPreviewPayload(
    draftId: string,
  ): Promise<ReportPdfRequest> {
    const draft = await firstValueFrom(this.api.getRefertatoreDraft(draftId));
    const formSnapshot = JSON.parse(
      JSON.stringify(draft.form_data?.form ?? this.getFreshFormState()),
    );
    const sectionsSnapshot = JSON.parse(
      JSON.stringify(draft.form_data?.sections ?? this.getFreshSectionsState()),
    );
    const attachments = draft.attachments ?? [];

    if (draft.tipo_referto === 'emg') {
      const traceAssets = await Promise.all(
        attachments
          .filter((item) => item.kind === 'emg_tracciato')
          .map((item) =>
            this.mapDraftAttachmentToAsset(draftId, item, this.refertatoreToken),
          ),
      );
      const signatureMetadata =
        attachments.find((item) => item.kind === 'emg_firma_tnfp') || null;
      const signatureAsset = signatureMetadata
        ? await this.mapDraftAttachmentToAsset(
            draftId,
            signatureMetadata,
            this.refertatoreToken,
          )
        : null;

      formSnapshot.emg = {
        ...(formSnapshot.emg ?? {}),
        tracciati: traceAssets,
        firmaTecnico: signatureAsset,
      };
    }

    if (draft.tipo_referto === 'psg') {
      const reportMetadata =
        attachments.find((item) => item.kind === 'psg_report_strumentale') || null;
      const reportAsset = reportMetadata
        ? await this.mapDraftAttachmentToAsset(
            draftId,
            reportMetadata,
            this.refertatoreToken,
          )
        : null;
      formSnapshot.psg = {
        ...(formSnapshot.psg ?? {}),
        reportStrumentalePdf: reportAsset,
      };
    }

    return this.payloadBuilder.build(formSnapshot, sectionsSnapshot);
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

  private async buildPdfAssetFromFile(file: File): Promise<EmgUploadedAsset> {
    const dataUrl = await this.readFileAsDataUrl(file);
    return {
      id: `signed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/pdf',
      kind: 'pdf',
      base64: this.extractBase64FromDataUrl(dataUrl),
    };
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('File read error'));
      reader.readAsDataURL(file);
    });
  }

  private isDraftDeletable(draft: ReportDraftSummary): boolean {
    return draft.stato !== 'completato' && draft.stato !== 'firmato_caricato';
  }

  private hasUnsavedWizardChanges(): boolean {
    return (
      !this.completedReadonlyMode &&
      (this.form.dirty ||
        this.sections.dirty ||
        !!this.currentSignedPdfAsset)
    );
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
        this.reviewerMode ? this.refertatoreToken : undefined,
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
        this.reviewerMode ? this.refertatoreToken : undefined,
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
    if (this.emgRefertatoreMode) {
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





