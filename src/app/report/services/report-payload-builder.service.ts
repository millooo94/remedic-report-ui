import { Injectable } from '@angular/core';
import { ReportPdfRequest } from '../models/report-pdf-request';
import { EmgUploadedAsset } from '../models/emg-uploaded-asset';
import { ReportHtmlBuilderService } from './report-html-builder.service';
import { EMG_DEFAULTS } from '../config/emg-checklist.config';
import { PSG_DEFAULTS } from '../config/psg-report.config';

@Injectable({
  providedIn: 'root',
})
export class ReportPayloadBuilderService {
  constructor(private htmlBuilder: ReportHtmlBuilderService) {}

  build(formValue: any, sectionsValue: any): ReportPdfRequest {
    const pazienteNome =
      `${formValue.anagrafica.nome} ${formValue.anagrafica.cognome}`.trim();

    const medicoNome =
      `${formValue.medico.nome} ${formValue.medico.cognome}`.trim();

    const isFreeMode = formValue.modalitaReferto === 'libero';
    const isEmg = formValue.tipoReferto === 'emg';
    const isPsg = formValue.tipoReferto === 'psg';

    const html = this.htmlBuilder.build({
      tipoReferto: formValue.tipoReferto,
      titoloVisita: formValue.titoloVisita,
      dataVisitaDisplay: formValue.dataVisitaDisplay,
      prestazione: formValue.prestazione,
      modalitaReferto: formValue.modalitaReferto,
      paziente: {
        ...formValue.anagrafica,
      },
      medico: {
        ...formValue.medico,
      },
      emg: formValue.emg,
      psg: formValue.psg,
      contenuti: isFreeMode
        ? {
            testoLibero: formValue.testoLibero || '',
            anamnesiPatologicaRemota: '',
            anamnesiPatologicaProssima: '',
            portaInVisione: '',
            esamiEseguitiInLoco: '',
            esameObiettivo: '',
            diagnosi: '',
            prescrizione: '',
          }
        : {
            testoLibero: '',
            anamnesiPatologicaRemota: sectionsValue.anamnesiRemota
              ? formValue.anamnesiPatologicaRemota
              : '',
            anamnesiPatologicaProssima: formValue.anamnesiPatologicaProssima,
            portaInVisione: sectionsValue.portaInVisione
              ? formValue.portaInVisione
              : '',
            esamiEseguitiInLoco: sectionsValue.esamiInLoco
              ? formValue.esamiEseguitiInLoco
              : '',
            esameObiettivo: formValue.esameObiettivo,
            diagnosi: formValue.diagnosi,
            prescrizione: formValue.prescrizione,
          },
    });

    const pdfAttachments = this.collectPdfAttachments(formValue);

    return {
      html,
      specializzazione:
        formValue.medico.specialita ||
        (isEmg
          ? EMG_DEFAULTS.specializzazione
          : isPsg
            ? PSG_DEFAULTS.specializzazione
            : ''),
      medico: medicoNome,
      paziente_nome: pazienteNome,
      data_nascita: formValue.anagrafica.dataNascita || '',
      titolo_visita:
        formValue.titoloVisita ||
        (isEmg
          ? EMG_DEFAULTS.titoloVisita
          : isPsg
            ? PSG_DEFAULTS.titoloVisita
            : ''),
      data_visita: formValue.dataVisita || '',
      ...(pdfAttachments.length
        ? {
            attachments: {
              pdfs: pdfAttachments,
            },
          }
        : {}),
    };
  }

  private collectPdfAttachments(formValue: any) {
    const attachments: Array<{
      fileName: string;
      mimeType: 'application/pdf';
      base64: string;
    }> = [];

    if (Array.isArray(formValue.emg?.tracciati)) {
      attachments.push(
        ...(formValue.emg.tracciati as EmgUploadedAsset[])
          .filter(
            (asset) =>
              asset.kind === 'pdf' &&
              asset.mimeType === 'application/pdf' &&
              !!asset.base64,
          )
          .map((asset) => ({
            fileName: asset.name,
            mimeType: 'application/pdf' as const,
            base64: asset.base64 as string,
          })),
      );
    }

    const psgReport = formValue.psg?.reportStrumentalePdf as
      | EmgUploadedAsset
      | null
      | undefined;

    if (
      psgReport?.kind === 'pdf' &&
      psgReport.mimeType === 'application/pdf' &&
      psgReport.base64
    ) {
      attachments.push({
        fileName: psgReport.name,
        mimeType: 'application/pdf',
        base64: psgReport.base64,
      });
    }

    return attachments;
  }
}
