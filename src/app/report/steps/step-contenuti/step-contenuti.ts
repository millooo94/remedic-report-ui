import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EmgUploadedAsset } from '../../models/emg-uploaded-asset';
import { RichTextField } from '../../components/rich-text-field/rich-text-field';
import { ReportType } from '../../types/report-type';

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
  @Input({ required: true }) reportType!: ReportType;
  @Input() emgRefertatoreMode = false;
  @Input() readonlyMode = false;
  @Input() reviewerMode = false;
  @Input() signedPdfAsset: EmgUploadedAsset | null = null;
  @Input() signedPdfSaving = false;
  @Output() signedPdfSelected = new EventEmitter<EmgUploadedAsset | null>();
  @Output() saveSignedPdf = new EventEmitter<void>();

  readonly limits = {
    testoLibero: { max: 10000 },
    anamnesiPatologicaRemota: { max: 1000 },
    anamnesiPatologicaProssima: { max: 1000 },
    portaInVisione: { max: 1000 },
    esamiEseguitiInLoco: { max: 1000 },
    esameObiettivo: { max: 1000 },
    diagnosi: { max: 1000 },
    prescrizione: { max: 1000 },
    esameEseguito: { max: 3000 },
    repertiElettrofisiologici: { max: 4000 },
    conclusioni: { max: 2000 },
    consensoInformatoTesto: { max: 2500 },
    noteTecnicheEsecutore: { max: 2000 },
    attestazioneTecnico: { max: 2500 },
    psgQuesitoClinico: { max: 3500 },
    psgInterpretazioneMedico: { max: 4500 },
    psgConclusioneDiagnostica: { max: 2500 },
    psgIndicazioniCliniche: { max: 2500 },
    psgNotaDocumentale: { max: 2500 },
  };

  traceUploadError = '';
  signatureUploadError = '';
  psgReportUploadError = '';
  signedPdfUploadError = '';

  get isPsg(): boolean {
    return this.reportType === 'psg';
  }

  get contentReadonlyMode(): boolean {
    return this.readonlyMode || this.emgRefertatoreMode;
  }

  get psgReadonlyMode(): boolean {
    return this.readonlyMode || this.reviewerMode;
  }

  get showSignedPdfSection(): boolean {
    return false;
  }

  get emgTraceFiles(): EmgUploadedAsset[] {
    return (this.control('emg.tracciati').value as EmgUploadedAsset[] | null) ?? [];
  }

  get emgSignature(): EmgUploadedAsset | null {
    return (this.control('emg.firmaTecnico').value as EmgUploadedAsset | null) ?? null;
  }

  get psgReportAsset(): EmgUploadedAsset | null {
    return (this.control('psg.reportStrumentalePdf').value as EmgUploadedAsset | null) ?? null;
  }

  get signatureRequiredError(): boolean {
    const control = this.control('emg.firmaTecnico');
    return !!(control.touched && control.hasError('required'));
  }

  plainTextLength(path: string): number {
    const value = this.control(path).value ?? '';
    return this.stripHtml(String(value)).length;
  }

  isOverLimit(path: string, max: number): boolean {
    return this.plainTextLength(path) > max;
  }

  openFilePicker(input: HTMLInputElement): void {
    if (this.contentReadonlyMode) {
      return;
    }

    input.click();
  }

  openSignedPdfPicker(input: HTMLInputElement): void {
    if (this.readonlyMode) {
      return;
    }

    input.click();
  }

  async onTraceFilesSelected(event: Event): Promise<void> {
    if (this.contentReadonlyMode) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.traceUploadError = '';

    if (!files.length) {
      input.value = '';
      return;
    }

    try {
      const nextAssets = await Promise.all(
        files.map((file) => this.buildAsset(file)),
      );
      const control = this.control('emg.tracciati');
      const current = this.emgTraceFiles;
      control.setValue([...current, ...nextAssets]);
      control.markAsDirty();
      control.markAsTouched();
    } catch (error) {
      this.traceUploadError = this.buildUploadErrorMessage(
        error,
        'Impossibile caricare i tracciati selezionati.',
      );
    } finally {
      input.value = '';
    }
  }

  async onSignatureSelected(event: Event): Promise<void> {
    if (this.contentReadonlyMode) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.signatureUploadError = '';

    if (!file) {
      input.value = '';
      return;
    }

    try {
      const asset = await this.buildAsset(file, true);
      const control = this.control('emg.firmaTecnico');
      control.setValue(asset);
      control.markAsDirty();
      control.markAsTouched();
    } catch (error) {
      this.signatureUploadError = this.buildUploadErrorMessage(
        error,
        'Impossibile caricare la firma selezionata.',
      );
    } finally {
      input.value = '';
    }
  }

  async onPsgReportSelected(event: Event): Promise<void> {
    if (this.psgReadonlyMode) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.psgReportUploadError = '';

    if (!file) {
      input.value = '';
      return;
    }

    try {
      const asset = await this.buildAsset(file);
      if (asset.kind !== 'pdf') {
        throw new Error('Il report strumentale PSG deve essere un file PDF.');
      }

      const control = this.control('psg.reportStrumentalePdf');
      control.setValue(asset);
      control.markAsDirty();
      control.markAsTouched();
    } catch (error) {
      this.psgReportUploadError = this.buildUploadErrorMessage(
        error,
        'Impossibile caricare il report strumentale PSG.',
      );
    } finally {
      input.value = '';
    }
  }

  removeTraceFile(id: string): void {
    if (this.contentReadonlyMode) {
      return;
    }

    const control = this.control('emg.tracciati');
    control.setValue(this.emgTraceFiles.filter((item) => item.id !== id));
    control.markAsDirty();
    control.markAsTouched();
  }

  removeSignature(): void {
    if (this.contentReadonlyMode) {
      return;
    }

    const control = this.control('emg.firmaTecnico');
    control.setValue(null);
    control.markAsDirty();
    control.markAsTouched();
    this.signatureUploadError = '';
  }

  removePsgReport(): void {
    if (this.psgReadonlyMode) {
      return;
    }

    const control = this.control('psg.reportStrumentalePdf');
    control.setValue(null);
    control.markAsDirty();
    control.markAsTouched();
    this.psgReportUploadError = '';
  }

  async onSignedPdfSelected(event: Event): Promise<void> {
    if (this.readonlyMode) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.signedPdfUploadError = '';

    if (!file) {
      input.value = '';
      return;
    }

    try {
      const asset = await this.buildAsset(file);
      if (asset.kind !== 'pdf') {
        throw new Error('Il PDF firmato deve essere un file PDF.');
      }

      this.signedPdfSelected.emit(asset);
    } catch (error) {
      this.signedPdfUploadError = this.buildUploadErrorMessage(
        error,
        'Impossibile caricare il PDF firmato selezionato.',
      );
    } finally {
      input.value = '';
    }
  }

  clearSignedPdfSelection(): void {
    this.signedPdfSelected.emit(null);
    this.signedPdfUploadError = '';
  }

  isImage(asset: EmgUploadedAsset | null | undefined): boolean {
    return !!asset && asset.kind === 'image';
  }

  isPdf(asset: EmgUploadedAsset | null | undefined): boolean {
    return !!asset && asset.kind === 'pdf';
  }

  openAsset(asset: EmgUploadedAsset): void {
    const newWindow = window.open('', '_blank');

    if (!newWindow) {
      return;
    }

    if (asset.kind === 'image' && asset.dataUrl) {
      newWindow.location.href = asset.dataUrl;
      return;
    }

    if (asset.kind === 'pdf' && asset.base64) {
      newWindow.location.href = `data:${asset.mimeType};base64,${asset.base64}`;
      return;
    }

    newWindow.close();
  }

  fileSizeLabel(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  private async buildAsset(
    file: File,
    forceImage = false,
  ): Promise<EmgUploadedAsset> {
    const mimeType = file.type || this.guessMimeType(file.name);
    const allowedTraceTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
    ];
    const allowedSignatureTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (forceImage && !allowedSignatureTypes.includes(mimeType)) {
      throw new Error(
        'Formato firma non supportato. Usa PNG, JPG, JPEG o WEBP.',
      );
    }

    if (!forceImage && !allowedTraceTypes.includes(mimeType)) {
      throw new Error(
        'Formato file non supportato. Carica PNG, JPG, JPEG, WEBP o PDF.',
      );
    }

    const isPdf = !forceImage && mimeType === 'application/pdf';
    const kind: EmgUploadedAsset['kind'] = isPdf ? 'pdf' : 'image';

    return {
      id: this.buildAssetId(file),
      name: file.name,
      size: file.size,
      mimeType,
      kind,
      dataUrl: kind === 'image' ? await this.readFileAsDataUrl(file) : undefined,
      base64: kind === 'pdf' ? await this.readFileAsBase64(file) : undefined,
    };
  }

  private buildAssetId(file: File): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${file.name}-${file.size}-${Date.now()}`;
  }

  private guessMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () =>
        reject(
          reader.error ??
            new Error('Errore durante la lettura del file selezionato.'),
        );
      reader.readAsDataURL(file);
    });
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result ?? '');
        const [, base64 = ''] = result.split(',');

        if (!base64) {
          reject(new Error('Impossibile leggere il contenuto base64 del PDF.'));
          return;
        }

        resolve(base64);
      };
      reader.onerror = () =>
        reject(
          reader.error ?? new Error('Errore durante la lettura del PDF.'),
        );
      reader.readAsDataURL(file);
    });
  }

  private buildUploadErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
