import { Injectable } from '@angular/core';
import { ReportPdfRequest } from '../models/report-pdf-request';
import { ReportHtmlBuilderService } from './report-html-builder.service';

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

    const html = this.htmlBuilder.build({
      titoloVisita: formValue.titoloVisita,
      dataVisitaDisplay: formValue.dataVisitaDisplay,
      modalitaReferto: formValue.modalitaReferto,
      paziente: {
        ...formValue.anagrafica,
      },
      medico: {
        ...formValue.medico,
      },
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

    return {
      html,
      specializzazione: formValue.medico.specialita || '',
      medico: medicoNome,
      paziente_nome: pazienteNome,
      data_nascita: formValue.anagrafica.dataNascita || '',
      titolo_visita: formValue.titoloVisita || '',
      data_visita: formValue.dataVisita || '',
    };
  }
}
