import { Injectable } from '@angular/core';
import { EMG_CHECKLIST_ITEMS, EMG_DEFAULTS } from '../config/emg-checklist.config';
import {
  PSG_ESS_ITEMS,
  PSG_SLEEP_HISTORY_ITEMS,
} from '../config/psg-report.config';
import { EmgUploadedAsset } from '../models/emg-uploaded-asset';

type ReportBuildInput = {
  tipoReferto?: 'standard' | 'emg' | 'psg';
  titoloVisita: string;
  dataVisitaDisplay: string;
  prestazione?: string;
  modalitaReferto?: 'sezioni' | 'libero';
  paziente: {
    nome: string;
    cognome: string;
    sesso?: string | null;
    dataNascitaDisplay: string;
    codiceFiscale?: string;
    telefono?: string;
    email?: string;
    indirizzo?: string;
  };
  medico: {
    nome: string;
    cognome: string;
    specialita?: string;
  };
  emg?: {
    tecnicoEsecutore?: string;
    tecnicoEsecutoreSpecialita?: string;
    tecnicoRuolo?: string;
    medicoInviante?: string;
    quesitoDiagnostico?: string;
    sintomatologiaRiferita?: string;
    distrettoEsaminato?: string;
    esameEseguito?: string;
    repertiElettrofisiologici?: string;
    conclusioni?: string;
    consensoInformatoTesto?: string;
    dataOraAcquisizioneTecnica?: string;
    materialeProdotto?: string;
    noteTecnicheEsecutore?: string;
    attestazioneTecnico?: string;
    tracciati?: EmgUploadedAsset[];
    firmaTecnico?: EmgUploadedAsset | null;
    checklistNeuropatie?: Record<
      string,
      {
        esito?: 'si' | 'no' | null;
        note?: string;
      }
    >;
  };
  psg?: {
    dataRegistrazioneInizio?: string;
    dataRegistrazioneFine?: string;
    sistemaRegistrazione?: string;
    staturaCm?: string;
    pesoKg?: string;
    bmi?: string;
    consensoInformato?: string;
    dataRefertazione?: string;
    anamnesiRaccolta?: string;
    reportTecnico?: string;
    modalitaRaccolta?: string;
    operatore?: string;
    quesitoClinico?: string;
    interpretazioneMedico?: string;
    conclusioneDiagnostica?: string;
    indicazioniCliniche?: string;
    notaDocumentale?: string;
    reportStrumentalePdf?: EmgUploadedAsset | null;
    anamnesiSonno?: {
      noteAnamnesticheUlteriori?: string;
      farmaciRilevanti?: Record<string, boolean | string>;
      comorbiditaRilevanti?: Record<string, boolean | string>;
    } & Record<
      string,
      | {
          esito?: 'no' | 'si' | 'non_noto' | null;
          note?: string;
        }
      | Record<string, boolean | string>
      | string
      | undefined
    >;
    ess?: Record<string, number | null | undefined>;
    essTotale?: number;
    interpretazioneEss?: string;
  };
  contenuti: {
    testoLibero?: string;
    anamnesiPatologicaRemota?: string;
    anamnesiPatologicaProssima?: string;
    portaInVisione?: string;
    esamiEseguitiInLoco?: string;
    esameObiettivo?: string;
    diagnosi?: string;
    prescrizione?: string;
  };
};

@Injectable({
  providedIn: 'root',
})
export class ReportHtmlBuilderService {
  build(report: ReportBuildInput): string {
    if (report.tipoReferto === 'psg') {
      return this.buildPsgHtml(report);
    }

    if (report.tipoReferto === 'emg') {
      return this.buildEmgHtml(report);
    }

    return this.buildStandardHtml(report);
  }

  private buildStandardHtml(report: ReportBuildInput): string {
    const fullPatientName =
      `${report.paziente.nome} ${report.paziente.cognome}`.trim() ||
      'Non disponibile';

    const fullDoctorName =
      `${report.medico.nome} ${report.medico.cognome}`.trim() ||
      'Non disponibile';

    const isFreeMode = report.modalitaReferto === 'libero';

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${this.escape(report.titoloVisita || 'Referto')}</title>
  <style>
${this.sharedStyles()}
  </style>
</head>
<body>
  <div class="page-frame"></div>

  <div class="sheet">
    <div class="container">
      ${this.renderPatientCard(report)}
      ${this.renderVisitRow({
        title: report.titoloVisita,
        dateLabel: 'Data',
        dateValue: report.dataVisitaDisplay,
        doctorLabel: 'Medico',
        doctorName: fullDoctorName,
        specialty: report.medico.specialita,
      })}

      ${
        isFreeMode
          ? this.renderFreeText(report.contenuti.testoLibero)
          : this.renderGuidedPages(report.contenuti)
      }
    </div>
  </div>
</body>
</html>
    `;
  }

  private buildEmgHtml(report: ReportBuildInput): string {
    const fullDoctorName =
      `${report.medico.nome} ${report.medico.cognome}`.trim() ||
      'Non disponibile';

    const emg = report.emg ?? {};
    const specialty = report.medico.specialita || 'Neurologia';
    const prestazione = report.prestazione || '-';
    const tracciati = emg.tracciati ?? [];

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${this.escape(
    report.titoloVisita || 'Referto di Elettroneurografia / Elettromiografia',
  )}</title>
  <style>
${this.sharedStyles()}

.emg-meta-card {
  width: 100%;
  border: 0.35mm solid #cfd6de;
  border-radius: 1.5mm;
  padding: 3.2mm 3.6mm;
  background: #ffffff;
  margin-bottom: 3.4mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.emg-kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2.8mm 6mm;
}

.emg-kv {
  min-width: 0;
}

.emg-kv-label {
  display: block;
  font-size: 8.4pt;
  color: #5a6872;
  margin-bottom: 0.7mm;
}

.emg-kv-value {
  display: block;
  font-size: 10pt;
  font-weight: 700;
  color: #101820;
  word-break: break-word;
}

.emg-section {
  width: 100%;
  border: 0.35mm solid #cfd6de;
  border-radius: 1.5mm;
  padding: 2.8mm 3.2mm;
  margin-bottom: 3mm;
  background: #ffffff;
  page-break-inside: avoid;
  break-inside: avoid;
}

.emg-section:last-child {
  margin-bottom: 0;
}

.emg-section h3 {
  font-size: 10.5pt;
  font-weight: 700;
  margin: 0 0 1.8mm 0;
  color: #1c9ebd;
  border-bottom: 0.25mm solid #d9dde3;
  padding-bottom: 0.9mm;
  line-height: 1.2;
}

.emg-section .content {
  color: #1f2933;
  word-break: break-word;
}

.emg-section .content p,
.emg-section .content div,
.emg-section .content li {
  font-size: 9.6pt;
  line-height: 1.35;
}

.emg-section .content p {
  margin: 0 0 1.4mm 0;
}

.emg-section .content p:last-child,
.emg-section .content ul:last-child,
.emg-section .content ol:last-child {
  margin-bottom: 0;
}

.emg-inline-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2mm 6mm;
}

.emg-inline-item {
  font-size: 9.4pt;
  line-height: 1.4;
}

.emg-inline-item strong {
  color: #101820;
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5mm;
}

.signature-card {
  border: 0.3mm solid #d7dfe6;
  border-radius: 1.3mm;
  padding: 3mm;
  min-height: 22mm;
}

.signature-label {
  font-size: 8.5pt;
  color: #5a6872;
  margin-bottom: 8mm;
}

.signature-value {
  border-top: 0.3mm solid #aeb9c3;
  padding-top: 2mm;
  font-size: 9.6pt;
  font-weight: 700;
  color: #111111;
  word-break: break-word;
}

.signature-image {
  display: block;
  max-width: 100%;
  max-height: 18mm;
  object-fit: contain;
}

.attachment-page {
  page-break-before: always;
  break-before: page;
  padding-top: 34mm;
}

.attachment-intro {
  margin: 0 0 4mm 0;
  font-size: 9.6pt;
  color: #425466;
  line-height: 1.5;
}

.attachment-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2mm 6mm;
}

.attachment-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.attachment-table th,
.attachment-table td {
  border: 0.3mm solid #cfd6de;
  padding: 2.2mm 2.4mm;
  vertical-align: top;
  font-size: 8.9pt;
  line-height: 1.35;
}

.attachment-table th {
  background: #f3f9fc;
  text-align: left;
  font-weight: 700;
  color: #29404d;
}

.attachment-table th.center,
.attachment-table td.center {
  text-align: center;
}

.attachment-table td.center {
  font-weight: 700;
}

.mono-note {
  white-space: pre-wrap;
}

.trace-gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4mm;
}

.trace-figure {
  border: 0.3mm solid #d8e0e8;
  border-radius: 1.5mm;
  padding: 2.4mm;
  background: #fbfdff;
  page-break-inside: avoid;
  break-inside: avoid;
}

.trace-figure img {
  display: block;
  width: 100%;
  max-height: 180mm;
  object-fit: contain;
  border-radius: 1mm;
}

.trace-caption {
  margin-top: 2mm;
  font-size: 8.8pt;
  color: #4b5c6b;
}

.trace-pdf-list {
  margin: 0;
  padding-left: 5mm;
}
  </style>
</head>
<body>
  <div class="page-frame"></div>

  <div class="sheet">
    <div class="container">
      ${this.renderPatientCard(report)}
      ${this.renderVisitRow({
        title:
          report.titoloVisita ||
          'Referto di Elettroneurografia / Elettromiografia',
        dateLabel: 'Data esame',
        dateValue: report.dataVisitaDisplay,
        doctorLabel: 'Medico refertatore',
        doctorName: fullDoctorName,
        specialty,
      })}

      <section class="emg-meta-card">
        <div class="emg-kv-grid">
          ${this.renderMetaItem('Prestazione', prestazione)}
          ${this.renderMetaItem(
            'Tecnico esecutore',
            this.withFallback(emg.tecnicoEsecutore),
          )}
          ${this.renderMetaItem(
            'Specialita tecnico',
            this.withFallback(
              emg.tecnicoEsecutoreSpecialita || emg.tecnicoRuolo,
            ),
          )}
          ${this.renderMetaItem('Specialita', specialty)}
          ${this.renderMetaItem(
            'Data e ora acquisizione tecnica',
            this.withFallback(
              this.formatDateTimeLocal(emg.dataOraAcquisizioneTecnica),
            ),
          )}
        </div>
      </section>

      ${this.renderHtmlSection(
        'Modalita di esecuzione e refertazione',
        EMG_DEFAULTS.testoStandardEsecuzione,
      )}

      <section class="emg-section">
        <h3>Dati clinici e quesito</h3>
        <div class="content">
          <div class="emg-inline-grid">
            <div class="emg-inline-item"><strong>Medico inviante:</strong> ${this.escape(
              this.withFallback(emg.medicoInviante),
            )}</div>
            <div class="emg-inline-item"><strong>Distretto esaminato:</strong> ${this.escape(
              this.withFallback(emg.distrettoEsaminato),
            )}</div>
            <div class="emg-inline-item"><strong>Quesito diagnostico:</strong> ${this.escape(
              this.withFallback(emg.quesitoDiagnostico),
            )}</div>
            <div class="emg-inline-item"><strong>Sintomatologia riferita:</strong> ${this.escape(
              this.withFallback(emg.sintomatologiaRiferita),
            )}</div>
          </div>
        </div>
      </section>

      ${this.renderHtmlSection('Esame eseguito', emg.esameEseguito)}
      ${this.renderHtmlSection(
        'Reperti elettrofisiologici',
        emg.repertiElettrofisiologici,
        'Da compilare a cura del medico refertatore.',
      )}
      ${this.renderHtmlSection(
        'Conclusioni',
        emg.conclusioni,
        'Da compilare a cura del medico refertatore.',
      )}
      ${this.renderHtmlSection(
        'Consenso informato',
        emg.consensoInformatoTesto,
      )}

      <section class="emg-section">
        <h3>Firme</h3>
        <div class="signature-grid">
          ${this.renderSignatureCard('Tecnico esecutore', emg.firmaTecnico)}
          ${this.renderSignatureCard(
            /neurologia/i.test(report.medico?.specialita || '')
              ? 'Il Neurologo refertatore'
              : 'Il Medico refertatore',
          )}
        </div>
      </section>

      <div class="attachment-page">
        <section class="emg-section">
          <h3>Allegato - Scheda di esecuzione tecnica e anamnesi mirata</h3>
          <p class="attachment-intro">
            Questa pagina documenta la parte compilata prima/durante
            l'esecuzione tecnica dell'esame. Non contiene diagnosi autonoma del
            tecnico.
          </p>

          <div class="attachment-summary">
            <div class="emg-inline-item"><strong>Paziente:</strong> ${this.escape(
              this.withFallback(
                `${report.paziente.nome} ${report.paziente.cognome}`.trim(),
              ),
            )}</div>
            <div class="emg-inline-item"><strong>Data di nascita:</strong> ${this.escape(
              this.withFallback(report.paziente.dataNascitaDisplay),
            )}</div>
            <div class="emg-inline-item"><strong>Data e ora esame:</strong> ${this.escape(
              this.withFallback(
                this.formatDateTimeLocal(emg.dataOraAcquisizioneTecnica) ||
                  report.dataVisitaDisplay,
              ),
            )}</div>
            <div class="emg-inline-item"><strong>Tecnico esecutore:</strong> ${this.escape(
              this.withFallback(emg.tecnicoEsecutore),
            )}</div>
            <div class="emg-inline-item"><strong>Specialita tecnico:</strong> ${this.escape(
              this.withFallback(
                emg.tecnicoEsecutoreSpecialita || emg.tecnicoRuolo,
              ),
            )}</div>
            <div class="emg-inline-item"><strong>Tipo di indagine:</strong> ${this.escape(
              prestazione,
            )}</div>
            <div class="emg-inline-item"><strong>Distretto:</strong> ${this.escape(
              this.withFallback(emg.distrettoEsaminato),
            )}</div>
          </div>
        </section>

        <section class="emg-section">
          <h3>Documentazione tecnica</h3>
          <div class="content">
            <p><strong>Consenso informato:</strong> ${this.escape(
              this.withFallback(this.stripHtmlToText(emg.consensoInformatoTesto)),
            )}</p>
            <p><strong>Materiale prodotto:</strong> ${this.escape(
              this.withFallback(emg.materialeProdotto),
            )}</p>
          </div>
        </section>

        <section class="emg-section">
          <h3>Checklist anamnestica neuropatie</h3>
          ${this.buildEmgChecklistTable(emg.checklistNeuropatie)}
        </section>

        ${this.renderHtmlSection(
          "Note tecniche dell'esecutore",
          emg.noteTecnicheEsecutore,
        )}
        ${this.renderHtmlSection(
          'Attestazione del tecnico esecutore',
          emg.attestazioneTecnico,
        )}
        ${this.renderTracciatiSection(tracciati)}

        <section class="emg-section">
          <h3>Tecnico esecutore</h3>
          <div class="signature-card">
            <div class="signature-value">
              ${this.renderSignatureImage(emg.firmaTecnico)}
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  private buildPsgHtml(report: ReportBuildInput): string {
    const psg = report.psg ?? {};
    const fullDoctorName =
      `${report.medico.nome} ${report.medico.cognome}`.trim() ||
      'Non disponibile';
    const fullPatientName =
      `${report.paziente.nome} ${report.paziente.cognome}`.trim() ||
      'Non disponibile';
    const reportName = psg.reportStrumentalePdf?.name || 'Report strumentale PDF';

    return `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>${this.escape(
    report.titoloVisita || 'Refertazione polisonnografica cardio-respiratoria (PSG)',
  )}</title>
  <style>
${this.sharedStyles()}

.psg-page-break {
  page-break-before: always;
  break-before: page;
  padding-top: 34mm;
}

.psg-hero {
  margin-bottom: 5mm;
}

.psg-title {
  margin: 0 0 1.2mm 0;
  font-size: 15pt;
  line-height: 1.2;
  font-weight: 800;
  color: #111111;
}

.psg-subtitle {
  margin: 0;
  font-size: 10.2pt;
  line-height: 1.45;
  color: #50606d;
}

.psg-section {
  width: 100%;
  border: 0.35mm solid #cfd6de;
  border-radius: 1.5mm;
  padding: 2.8mm 3.2mm;
  margin-bottom: 3mm;
  background: #ffffff;
  page-break-inside: avoid;
  break-inside: avoid;
}

.psg-section h3 {
  font-size: 10.5pt;
  font-weight: 700;
  margin: 0 0 1.8mm 0;
  color: #1c9ebd;
  border-bottom: 0.25mm solid #d9dde3;
  padding-bottom: 0.9mm;
  line-height: 1.2;
}

.psg-section .content,
.psg-section .content p,
.psg-section .content li,
.psg-section .content div {
  font-size: 9.5pt;
  line-height: 1.4;
  color: #1f2933;
}

.psg-section .content p {
  margin: 0 0 1.4mm 0;
}

.psg-section .content p:last-child {
  margin-bottom: 0;
}

.psg-meta-card {
  width: 100%;
  border: 0.35mm solid #cfd6de;
  border-radius: 1.5mm;
  padding: 3.2mm 3.6mm;
  background: #ffffff;
  margin-bottom: 3.4mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.psg-kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2.6mm 6mm;
}

.psg-kv-label {
  display: block;
  font-size: 8.4pt;
  color: #5a6872;
  margin-bottom: 0.7mm;
}

.psg-kv-value {
  display: block;
  font-size: 10pt;
  font-weight: 700;
  color: #101820;
  word-break: break-word;
}

.psg-data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.psg-data-table th,
.psg-data-table td {
  border: 0.3mm solid #cfd6de;
  padding: 2.2mm 2.4mm;
  vertical-align: top;
  font-size: 8.9pt;
  line-height: 1.35;
}

.psg-data-table th {
  background: #f3f9fc;
  text-align: left;
  font-weight: 700;
  color: #29404d;
}

.psg-data-table td.center,
.psg-data-table th.center {
  text-align: center;
}

.psg-box {
  border: 0.3mm solid #d7dfe6;
  border-radius: 1.4mm;
  padding: 2.6mm 2.8mm;
  background: #fbfdff;
}

.psg-list {
  margin: 0;
  padding-left: 5mm;
}

.psg-signature {
  border: 0.3mm solid #d7dfe6;
  border-radius: 1.4mm;
  min-height: 24mm;
  padding: 3mm;
}

.psg-signature-label {
  font-size: 8.5pt;
  color: #5a6872;
  margin-bottom: 8mm;
}

.psg-signature-value {
  border-top: 0.3mm solid #aeb9c3;
  padding-top: 2mm;
  font-size: 9.6pt;
  font-weight: 700;
  color: #111111;
}

.psg-inline-note {
  margin: 0;
  font-size: 9.4pt;
  line-height: 1.5;
  color: #425466;
}
  </style>
</head>
<body>
  <div class="page-frame"></div>

  <div class="sheet">
    <div class="container">
      ${this.renderPatientCard(report)}

      <section class="psg-hero">
        <h1 class="psg-title">REFERTAZIONE POLISONNOGRAFICA CARDIO-RESPIRATORIA (PSG)</h1>
        <p class="psg-subtitle">Monitoraggio cardio-respiratorio notturno domiciliare</p>
      </section>

      <section class="psg-meta-card">
        <div class="psg-kv-grid">
          ${this.renderPsgMetaItem('Paziente', fullPatientName)}
          ${this.renderPsgMetaItem(
            'Data di nascita',
            this.withFallback(report.paziente.dataNascitaDisplay),
          )}
          ${this.renderPsgMetaItem(
            'Data registrazione',
            this.formatDateRange(
              psg.dataRegistrazioneInizio,
              psg.dataRegistrazioneFine,
            ),
          )}
          ${this.renderPsgMetaItem(
            'Sistema',
            this.withFallback(psg.sistemaRegistrazione),
          )}
          ${this.renderPsgMetaItem(
            'Statura / Peso / BMI',
            `${this.withFallback(psg.staturaCm)} cm / ${this.withFallback(
              psg.pesoKg,
            )} kg / ${this.withFallback(psg.bmi)}`,
          )}
          ${this.renderPsgMetaItem(
            'Consenso informato',
            this.withFallback(psg.consensoInformato),
          )}
          ${this.renderPsgMetaItem(
            'Medico refertatore',
            fullDoctorName,
          )}
          ${this.renderPsgMetaItem(
            'Specialita',
            this.withFallback(report.medico.specialita),
          )}
          ${this.renderPsgMetaItem(
            'Data refertazione',
            this.withFallback(this.formatDateOnly(psg.dataRefertazione)),
          )}
          ${this.renderPsgMetaItem(
            'Anamnesi',
            this.withFallback(psg.anamnesiRaccolta),
          )}
          ${this.renderPsgMetaItem(
            'Report tecnico',
            this.withFallback(psg.reportTecnico),
          )}
          ${this.renderPsgMetaItem(
            'Report strumentale',
            reportName,
          )}
        </div>
      </section>

      ${this.renderPsgTextSection('Quesito clinico', psg.quesitoClinico)}

      <section class="psg-section">
        <h3>Documentazione valutata</h3>
        <table class="psg-data-table">
          <tbody>
            <tr>
              <th style="width: 38mm">Scheda anamnestica</th>
              <td>Dati clinici raccolti telefonicamente da Remedic sulla base delle dichiarazioni del paziente.</td>
            </tr>
            <tr>
              <th>Scala di Epworth ESS</th>
              <td>Valutazione della sonnolenza diurna riferita, raccolta telefonicamente.</td>
            </tr>
            <tr>
              <th>Report strumentale</th>
              <td>Report strumentale originale allegato, con parametri, tabelle, grafici e tracciati del dispositivo.</td>
            </tr>
          </tbody>
        </table>
      </section>

      ${this.renderPsgTextSection(
        'Interpretazione del medico refertatore',
        psg.interpretazioneMedico,
      )}

      <section class="psg-section">
        <h3>Conclusioni diagnostiche</h3>
        <div class="psg-box content">
          ${this.renderEscapedParagraphs(psg.conclusioneDiagnostica)}
        </div>
      </section>

      <section class="psg-section">
        <h3>Indicazioni</h3>
        <div class="psg-box content">
          ${this.renderEscapedParagraphs(psg.indicazioniCliniche)}
        </div>
      </section>

      <section class="psg-section">
        <h3>Allegati consegnati al paziente</h3>
        <ol class="psg-list">
          <li>Scheda anamnestica del sonno e scala di Epworth ESS.</li>
          <li>Report strumentale originale generato dal dispositivo.</li>
        </ol>
      </section>

      ${this.renderPsgTextSection('Nota documentale', psg.notaDocumentale)}

      <section class="psg-section">
        <h3>Il Medico refertatore</h3>
        <div class="psg-signature">
          <div class="psg-signature-label">Firma</div>
          <div class="psg-signature-value">${this.escape(fullDoctorName)}</div>
        </div>
      </section>

      <div class="psg-page-break">
        <section class="psg-hero">
          <h1 class="psg-title">ANAMNESI DEL SONNO E SCALA DI EPWORTH (ESS)</h1>
          <p class="psg-subtitle">Scheda raccolta telefonicamente su dichiarazione del paziente</p>
        </section>

        <section class="psg-meta-card">
          <div class="psg-kv-grid">
            ${this.renderPsgMetaItem('Paziente', fullPatientName)}
            ${this.renderPsgMetaItem(
              'Data di nascita',
              this.withFallback(report.paziente.dataNascitaDisplay),
            )}
            ${this.renderPsgMetaItem(
              'Data registrazione',
              this.formatDateRange(
                psg.dataRegistrazioneInizio,
                psg.dataRegistrazioneFine,
              ),
            )}
            ${this.renderPsgMetaItem(
              'Data raccolta',
              this.withFallback(this.formatDateOnly(psg.dataRefertazione)),
            )}
            ${this.renderPsgMetaItem(
              'Modalita raccolta',
              this.withFallback(psg.modalitaRaccolta),
            )}
            ${this.renderPsgMetaItem(
              'Operatore',
              this.withFallback(psg.operatore),
            )}
          </div>
        </section>

        <section class="psg-section">
          <p class="psg-inline-note">
            La presente scheda e compilata da Remedic sulla base delle dichiarazioni telefoniche del paziente. Non e prevista firma del paziente su questa pagina.
          </p>
        </section>

        <section class="psg-section">
          <h3>Anamnesi mirata del sonno</h3>
          ${this.buildPsgSleepHistoryTable(psg)}
        </section>

        <section class="psg-section">
          <h3>Farmaci rilevanti</h3>
          <div class="content">
            <p>${this.escape(this.formatSelectedOptions(psg.anamnesiSonno?.farmaciRilevanti))}</p>
            <p><strong>Note:</strong> ${this.escape(
              this.withFallback(
                this.extractSelectionNote(psg.anamnesiSonno?.farmaciRilevanti),
              ),
            )}</p>
          </div>
        </section>

        <section class="psg-section">
          <h3>Comorbidita rilevanti</h3>
          <div class="content">
            <p>${this.escape(
              this.formatSelectedOptions(psg.anamnesiSonno?.comorbiditaRilevanti),
            )}</p>
            <p><strong>Note:</strong> ${this.escape(
              this.withFallback(
                this.extractSelectionNote(psg.anamnesiSonno?.comorbiditaRilevanti),
              ),
            )}</p>
          </div>
        </section>

        <section class="psg-section">
          <h3>Scala di Epworth - ESS</h3>
          <div class="content">
            <p>Indicare per ciascuna situazione la probabilita di addormentarsi: 0 = nessuna, 1 = lieve, 2 = moderata, 3 = elevata.</p>
          </div>
          ${this.buildPsgEssTable(psg.ess)}
          <div class="content" style="margin-top: 2.4mm">
            <p><strong>Punteggio totale ESS:</strong> ${this.escape(
              `${psg.essTotale ?? 0} / 24`,
            )}</p>
            <p><strong>Interpretazione:</strong> ${this.escape(
              this.withFallback(psg.interpretazioneEss),
            )}</p>
          </div>
        </section>

        ${this.renderPsgTextSection(
          'Note anamnestiche ulteriori',
          typeof psg.anamnesiSonno?.noteAnamnesticheUlteriori === 'string'
            ? psg.anamnesiSonno.noteAnamnesticheUlteriori
            : '',
        )}

        <section class="psg-section">
          <h3>Chiusura scheda</h3>
          <div class="content">
            <p>Scheda anamnestica ed ESS raccolte telefonicamente da Remedic e inserite nel fascicolo della prestazione.</p>
            <p><strong>Report strumentale allegato:</strong> ${this.escape(reportName)}</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  private sharedStyles(): string {
    return `
@page {
  size: A4;
  margin: 0 0 12mm 0;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  color: #1f2933;
  font-size: 11pt;
  line-height: 1.45;
  background: #ffffff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page-frame {
  position: fixed;
  top: 4mm;
  left: 4mm;
  right: 4mm;
  bottom: 4mm;
  border: 0.35mm solid #4a4a4a;
  pointer-events: none;
}

.sheet {
  padding: 34mm 12mm 12mm 12mm;
}

.container {
  width: 100%;
  background: #ffffff;
  padding: 0;
}

.patient-card {
  width: 100%;
  border: 0.5mm solid #5b5b5b;
  padding: 2.4mm 2.8mm;
  margin-bottom: 6mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.patient-grid {
  width: 100%;
  display: table;
  table-layout: fixed;
}

.patient-col {
  display: table-cell;
  width: 50%;
  vertical-align: top;
}

.patient-col.left {
  padding-right: 6mm;
}

.patient-col.right {
  padding-left: 6mm;
}

.info-line {
  margin: 0 0 1.2mm 0;
  font-size: 9.5pt;
  line-height: 1.2;
  color: #2f2f2f;
  word-break: break-word;
}

.info-line:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 400;
  color: #2f2f2f;
}

.info-value {
  font-weight: 700;
  color: #1f1f1f;
}

.visit-row {
  width: 100%;
  display: table;
  table-layout: fixed;
  margin-bottom: 10mm;
  page-break-inside: avoid;
  break-inside: avoid;
}

.visit-main,
.doctor-card-wrap {
  display: table-cell;
  vertical-align: bottom;
}

.visit-main {
  width: 52%;
  padding-right: 8mm;
}

.doctor-card-wrap {
  width: 48%;
  text-align: right;
}

.visit-title {
  font-size: 13pt;
  line-height: 1.15;
  font-weight: 700;
  color: #111111;
  margin: 0 0 3mm 0;
  word-break: break-word;
}

.visit-date {
  font-size: 10pt;
  color: #333333;
  margin: 0;
}

.visit-date .date-value {
  font-weight: 700;
  color: #111111;
}

.doctor-card {
  display: block;
  width: 100%;
  border: 0.5mm solid #5b5b5b;
  padding: 2.4mm 3mm;
  text-align: left;
  vertical-align: bottom;
}

.doctor-line {
  margin: 0 0 1.2mm 0;
  font-size: 9pt;
  line-height: 1.2;
  color: #2f2f2f;
  word-break: break-word;
}

.doctor-line:last-child {
  margin-bottom: 0;
}

.doctor-label {
  font-weight: 400;
  color: #2f2f2f;
}

.doctor-value {
  font-weight: 700;
  color: #111111;
}

.guided-page {
  width: 100%;
}

.guided-page + .guided-page {
  page-break-before: always;
  break-before: page;
  padding-top: 34mm;
}

.section-stack {
  width: 100%;
}

.guided-section {
  width: 100%;
  border: 0.35mm solid #cfd6de;
  border-radius: 1.5mm;
  padding: 2.6mm 3.2mm 2.8mm 3.2mm;
  margin-bottom: 2.8mm;
  background: #ffffff;
  page-break-inside: avoid;
  break-inside: avoid;
  min-height: 32mm;
}

.guided-section:last-child {
  margin-bottom: 0;
}

.guided-section h3 {
  font-size: 10.5pt;
  font-weight: 700;
  margin: 0 0 1.8mm 0;
  color: #1c9ebd;
  border-bottom: 0.25mm solid #d9dde3;
  padding-bottom: 0.9mm;
  line-height: 1.2;
  page-break-after: avoid;
  break-after: avoid;
}

.guided-section .content {
  color: #1f2933;
  word-break: break-word;
}

.guided-section .content p,
.guided-section .content div,
.guided-section .content li {
  font-size: 9.5pt;
  line-height: 1.3;
}

.guided-section .content p {
  margin: 0 0 1.2mm 0;
}

.guided-section .content p:last-child,
.guided-section .content div:last-child,
.guided-section .content ul:last-child,
.guided-section .content ol:last-child {
  margin-bottom: 0;
}

.guided-section .content ul,
.guided-section .content ol {
  margin: 0 0 1.2mm 0;
  padding-left: 5mm;
}

.guided-section .content strong {
  font-weight: 700;
}

.guided-section .content em {
  font-style: italic;
}

.guided-source {
  position: absolute;
  left: -99999px;
  top: 0;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
}

.free-text {
  width: 100%;
  color: #1f2933;
  word-break: break-word;
}

.free-text p,
.free-text div,
.free-text li {
  font-size: 10.5pt;
  line-height: 1.5;
}

.free-text p {
  margin: 0 0 2mm 0;
}

.free-text ul,
.free-text ol {
  margin: 0 0 2mm 0;
  padding-left: 5mm;
}

.free-text strong {
  font-weight: 700;
}

.free-text em {
  font-style: italic;
}

.free-source {
  position: absolute;
  left: -99999px;
  top: 0;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
}

.free-page {
  width: 100%;
}

.free-page + .free-page {
  page-break-before: always;
  break-before: page;
  padding-top: 34mm;
}

.free-page-body {
  width: 100%;
}
    `;
  }

  private renderPatientCard(report: ReportBuildInput): string {
    const fullPatientName =
      `${report.paziente.nome} ${report.paziente.cognome}`.trim() ||
      'Non disponibile';

    return `
      <div class="patient-card">
        <div class="patient-grid">
          <div class="patient-col left">
            <div class="info-line">
              <span class="info-label">Paziente:</span>
              <span class="info-value">${this.escape(fullPatientName)}</span>
            </div>

            <div class="info-line">
              <span class="info-label">Sesso:</span>
              <span class="info-value">${this.escape(
                this.withFallback(report.paziente.sesso),
              )}</span>
            </div>

            <div class="info-line">
              <span class="info-label">Data di nascita:</span>
              <span class="info-value">${this.escape(
                this.withFallback(report.paziente.dataNascitaDisplay),
              )}</span>
            </div>

            <div class="info-line">
              <span class="info-label">Codice Fiscale:</span>
              <span class="info-value">${this.escape(
                this.withFallback(report.paziente.codiceFiscale),
              )}</span>
            </div>
          </div>

          <div class="patient-col right">
            <div class="info-line">
              <span class="info-label">Indirizzo:</span>
              <span class="info-value">${this.escape(
                this.withFallback(report.paziente.indirizzo),
              )}</span>
            </div>

            <div class="info-line">
              <span class="info-label">Telefono:</span>
              <span class="info-value">${this.escape(
                this.withFallback(report.paziente.telefono),
              )}</span>
            </div>

            <div class="info-line">
              <span class="info-label">Email:</span>
              <span class="info-value">${this.escape(
                this.withFallback(report.paziente.email),
              )}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderVisitRow(input: {
    title: string;
    dateLabel: string;
    dateValue: string;
    doctorLabel: string;
    doctorName: string;
    specialty?: string;
  }): string {
    return `
      <div class="visit-row">
        <div class="visit-main">
          <div class="visit-title">${this.escape(
            this.withFallback(input.title),
          )}</div>
          <div class="visit-date">
            ${this.escape(input.dateLabel)}:
            <span class="date-value">${this.escape(
              this.withFallback(input.dateValue),
            )}</span>
          </div>
        </div>

        <div class="doctor-card-wrap">
          <div class="doctor-card">
            <div class="doctor-line">
              <span class="doctor-label">${this.escape(input.doctorLabel)}:</span>
              <span class="doctor-value">${this.escape(
                this.withFallback(input.doctorName),
              )}</span>
            </div>
            <div class="doctor-line">
              <span class="doctor-label">Specialita:</span>
              <span class="doctor-value">${this.escape(
                this.withFallback(input.specialty),
              )}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderGuidedPages(contenuti: {
    anamnesiPatologicaRemota?: string;
    anamnesiPatologicaProssima?: string;
    portaInVisione?: string;
    esamiEseguitiInLoco?: string;
    esameObiettivo?: string;
    diagnosi?: string;
    prescrizione?: string;
  }): string {
    const hasAnamnesiRemota = this.hasContent(
      contenuti.anamnesiPatologicaRemota,
    );

    const sections = [
      ...(hasAnamnesiRemota
        ? [
            {
              title: 'Anamnesi patologica remota',
              html: contenuti.anamnesiPatologicaRemota,
            },
            {
              title: 'Anamnesi patologica prossima',
              html: contenuti.anamnesiPatologicaProssima,
            },
          ]
        : [
            {
              title: 'Anamnesi',
              html: contenuti.anamnesiPatologicaProssima,
            },
          ]),
      ...(this.hasContent(contenuti.portaInVisione)
        ? [{ title: 'Porta in visione', html: contenuti.portaInVisione }]
        : []),
      ...(this.hasContent(contenuti.esamiEseguitiInLoco)
        ? [{ title: 'Esami eseguiti', html: contenuti.esamiEseguitiInLoco }]
        : []),
      { title: 'Esame obiettivo', html: contenuti.esameObiettivo },
      { title: 'Diagnosi', html: contenuti.diagnosi },
      { title: 'Prescrizione', html: contenuti.prescrizione },
    ];

    return `
      <div id="guided-source" class="guided-source">
        ${sections
          .map((section) =>
            this.renderGuidedSection(section.title, section.html),
          )
          .join('')}
      </div>

      <div id="guided-pages-root"></div>

      <script>
        (function () {
          const source = document.getElementById('guided-source');
          const root = document.getElementById('guided-pages-root');

          if (!source || !root) return;

          const allSections = Array.from(source.children);

          const PAGE_CONTENT_HEIGHT_FIRST = 520;
          const PAGE_CONTENT_HEIGHT_NEXT = 690;

          let currentStack = null;
          let pageIndex = 0;

          function createPage() {
            const page = document.createElement('div');
            page.className = 'guided-page';

            const stack = document.createElement('div');
            stack.className = 'section-stack';

            page.appendChild(stack);
            root.appendChild(page);

            currentStack = stack;
            pageIndex += 1;
          }

          function getMaxHeight() {
            return pageIndex === 1
              ? PAGE_CONTENT_HEIGHT_FIRST
              : PAGE_CONTENT_HEIGHT_NEXT;
          }

          createPage();

          allSections.forEach((section) => {
            if (!currentStack) return;

            currentStack.appendChild(section);

            const maxHeight = getMaxHeight();
            const currentHeight = currentStack.offsetHeight;

            if (currentHeight > maxHeight && currentStack.children.length > 1) {
              currentStack.removeChild(section);
              createPage();
              currentStack.appendChild(section);
            }
          });

          source.remove();
        })();
      </script>
    `;
  }

  private renderGuidedSection(title: string, html?: string): string {
    return `
      <div class="guided-section">
        <h3>${this.escape(title)}</h3>
        <div class="content">
          ${html && html.trim() ? html : '&nbsp;'}
        </div>
      </div>
    `;
  }

  private renderFreeText(html?: string): string {
    if (!html || !html.trim()) return '';

    return `
      <div id="free-source" class="free-source">
        <div class="free-text">
          ${html}
        </div>
      </div>

      <div id="free-pages-root"></div>

      <script>
        (function () {
          const source = document.getElementById('free-source');
          const root = document.getElementById('free-pages-root');

          if (!source || !root) return;

          const freeText = source.querySelector('.free-text');
          if (!freeText) return;

          const nodes = Array.from(freeText.childNodes).filter((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              return (node.textContent || '').trim() !== '';
            }
            return true;
          });

          const PAGE_CONTENT_HEIGHT_FIRST_NORMAL = 650;
          const PAGE_CONTENT_HEIGHT_NEXT_NORMAL = 790;
          const PAGE_CONTENT_HEIGHT_FIRST_LAST = 580;
          const PAGE_CONTENT_HEIGHT_NEXT_LAST = 720;

          let currentBody = null;
          let pageIndex = 0;

          function createPage() {
            const page = document.createElement('div');
            page.className = 'free-page';

            const body = document.createElement('div');
            body.className = 'free-page-body free-text';

            page.appendChild(body);
            root.appendChild(page);

            currentBody = body;
            pageIndex += 1;
          }

          function getNormalMaxHeight() {
            return pageIndex === 1
              ? PAGE_CONTENT_HEIGHT_FIRST_NORMAL
              : PAGE_CONTENT_HEIGHT_NEXT_NORMAL;
          }

          function getLastPageMaxHeight() {
            return pageIndex === 1
              ? PAGE_CONTENT_HEIGHT_FIRST_LAST
              : PAGE_CONTENT_HEIGHT_NEXT_LAST;
          }

          function buildNodeWithText(sampleNode, text) {
            if (sampleNode.nodeType === Node.TEXT_NODE) {
              return document.createTextNode(text);
            }

            const element = sampleNode.cloneNode(false);
            element.textContent = text;
            return element;
          }

          function splitNodeByWordsToFit(sampleNode, maxHeight) {
            if (!currentBody) return null;

            const rawText = (sampleNode.textContent || '').replace(/\s+/g, ' ').trim();
            if (!rawText) return null;

            const words = rawText.split(' ');
            if (words.length < 2) return null;

            let low = 1;
            let high = words.length;
            let bestCount = 0;

            while (low <= high) {
              const mid = Math.floor((low + high) / 2);
              const candidateText = words.slice(0, mid).join(' ');
              const candidateNode = buildNodeWithText(sampleNode, candidateText);

              currentBody.appendChild(candidateNode);
              const fits = currentBody.offsetHeight <= maxHeight;
              currentBody.removeChild(candidateNode);

              if (fits) {
                bestCount = mid;
                low = mid + 1;
              } else {
                high = mid - 1;
              }
            }

            if (bestCount === 0) {
              bestCount = 1;
            }

            const headText = words.slice(0, bestCount).join(' ');
            const tailText = words.slice(bestCount).join(' ').trim();

            const headNode = buildNodeWithText(sampleNode, headText);
            const tailNode = tailText
              ? buildNodeWithText(sampleNode, tailText)
              : null;

            return {
              headNode,
              tailNode,
            };
          }

          createPage();

          const queue = nodes.slice();

          while (queue.length > 0) {
            if (!currentBody) break;

            const node = queue.shift();
            if (!node) continue;

            const isLastChunk = queue.length === 0;
            if (isLastChunk && currentBody.offsetHeight > getLastPageMaxHeight()) {
              createPage();
            }

            const clone = node.cloneNode(true);
            currentBody.appendChild(clone);

            const maxHeight = isLastChunk
              ? getLastPageMaxHeight()
              : getNormalMaxHeight();

            if (currentBody.offsetHeight <= maxHeight) {
              continue;
            }

            currentBody.removeChild(clone);

            if (currentBody.childNodes.length > 0) {
              createPage();
              queue.unshift(node);
              continue;
            }

            const split = splitNodeByWordsToFit(node, maxHeight);

            if (!split) {
              currentBody.appendChild(clone);
              continue;
            }

            currentBody.appendChild(split.headNode);

            if (split.tailNode) {
              createPage();
              queue.unshift(split.tailNode);
            }
          }

          source.remove();
        })();
      </script>
    `;
  }

  private renderMetaItem(label: string, value: string): string {
    return `
      <div class="emg-kv">
        <span class="emg-kv-label">${this.escape(label)}</span>
        <span class="emg-kv-value">${this.escape(value)}</span>
      </div>
    `;
  }

  private renderHtmlSection(
    title: string,
    html?: string,
    emptyText = '-',
  ): string {
    return `
      <section class="emg-section">
        <h3>${this.escape(title)}</h3>
        <div class="content">
          ${html && html.trim() ? html : `<p>${this.escape(emptyText)}</p>`}
        </div>
      </section>
    `;
  }

  private renderSignatureCard(
    label: string,
    signature?: EmgUploadedAsset | null,
  ): string {
    return `
      <div class="signature-card">
        <div class="signature-label">${this.escape(label)}</div>
        <div class="signature-value">
          ${this.renderSignatureImage(signature)}
        </div>
      </div>
    `;
  }

  private renderSignatureImage(signature?: EmgUploadedAsset | null): string {
    if (!signature?.dataUrl) return '';

    return `<img class="signature-image" src="${signature.dataUrl}" alt="${this.escape(
      signature.name,
    )}" />`;
  }

  private renderTracciatiSection(tracciati: EmgUploadedAsset[]): string {
    const immagini = tracciati.filter((item) => item.kind === 'image' && item.dataUrl);
    const pdfFiles = tracciati.filter((item) => item.kind === 'pdf');

    if (!tracciati.length) {
      return `
        <section class="emg-section">
          <h3>Tracciati elettrofisiologici</h3>
          <div class="content">
            <p>Tracciati non allegati in questa generazione.</p>
          </div>
        </section>
      `;
    }

    return `
      <section class="emg-section">
        <h3>Tracciati elettrofisiologici</h3>
        <div class="content">
          ${
            immagini.length
              ? `
                <div class="trace-gallery">
                  ${immagini
                    .map(
                      (item) => `
                        <figure class="trace-figure">
                          <img src="${item.dataUrl}" alt="${this.escape(item.name)}" />
                          <figcaption class="trace-caption">${this.escape(item.name)}</figcaption>
                        </figure>
                      `,
                    )
                    .join('')}
                </div>
              `
              : ''
          }
          ${
            pdfFiles.length
              ? `
                <ul class="trace-pdf-list">
                  ${pdfFiles
                    .map(
                      (item) =>
                        `<li>File PDF allegato e unito come pagine finali del referto: ${this.escape(item.name)}</li>`,
                    )
                    .join('')}
                </ul>
              `
              : ''
          }
        </div>
      </section>
    `;
  }

  private renderPsgMetaItem(label: string, value: string): string {
    return `
      <div>
        <span class="psg-kv-label">${this.escape(label)}</span>
        <span class="psg-kv-value">${this.escape(value)}</span>
      </div>
    `;
  }

  private renderPsgTextSection(title: string, value?: string): string {
    return `
      <section class="psg-section">
        <h3>${this.escape(title)}</h3>
        <div class="content">
          ${this.renderEscapedParagraphs(value)}
        </div>
      </section>
    `;
  }

  private renderEscapedParagraphs(value?: string | null, fallback = '-'): string {
    const normalized = this.withFallback(value, fallback);
    const lines = normalized
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      return `<p>${this.escape(fallback)}</p>`;
    }

    return lines.map((line) => `<p>${this.escape(line)}</p>`).join('');
  }

  private buildPsgSleepHistoryTable(psg: NonNullable<ReportBuildInput['psg']>): string {
    return `
      <table class="psg-data-table">
        <thead>
          <tr>
            <th>Voce</th>
            <th style="width: 54mm">Risposta</th>
            <th style="width: 44mm">Note</th>
          </tr>
        </thead>
        <tbody>
          ${PSG_SLEEP_HISTORY_ITEMS.map((item) => {
            const entry = psg.anamnesiSonno?.[item.key] as
              | { esito?: 'no' | 'si' | 'non_noto' | null; note?: string }
              | undefined;

            return `
              <tr>
                <td>${this.escape(item.label)}</td>
                <td>${this.renderPsgSleepResponse(entry?.esito ?? null)}</td>
                <td>${this.escape(this.withFallback(entry?.note, ''))}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  private renderPsgSleepResponse(
    value: 'no' | 'si' | 'non_noto' | null,
  ): string {
    return [
      `No ${value === 'no' ? '[X]' : '[ ]'}`,
      `Si ${value === 'si' ? '[X]' : '[ ]'}`,
      `Non noto ${value === 'non_noto' ? '[X]' : '[ ]'}`,
    ].join(' &nbsp;&nbsp; ');
  }

  private buildPsgEssTable(
    ess?: Record<string, number | null | undefined>,
  ): string {
    return `
      <table class="psg-data-table">
        <thead>
          <tr>
            <th>Situazione</th>
            <th class="center" style="width: 12mm">0</th>
            <th class="center" style="width: 12mm">1</th>
            <th class="center" style="width: 12mm">2</th>
            <th class="center" style="width: 12mm">3</th>
          </tr>
        </thead>
        <tbody>
          ${PSG_ESS_ITEMS.map((item) => {
            const score = ess?.[item.key] ?? null;

            return `
              <tr>
                <td>${this.escape(item.label)}</td>
                ${[0, 1, 2, 3]
                  .map(
                    (value) =>
                      `<td class="center">${score === value ? 'X' : ''}</td>`,
                  )
                  .join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  private formatSelectedOptions(
    value?: Record<string, boolean | string> | null,
  ): string {
    if (!value) return '-';

    const optionLabels: Record<string, string> = {
      nessuno: 'Nessuno',
      sedativi_ipnotici: 'Sedativi / ipnotici',
      oppioidi: 'Oppioidi',
      altro: 'Altro',
      ipertensione: 'Ipertensione',
      cardiopatia: 'Cardiopatia',
      bpco: 'BPCO',
      diabete: 'Diabete',
      aritmie: 'Aritmie',
    };

    const selected = Object.entries(value)
      .filter(([key, entry]) => key !== 'note' && entry === true)
      .map(([key]) => optionLabels[key] || key);

    return selected.length ? selected.join(', ') : '-';
  }

  private extractSelectionNote(
    value?: Record<string, boolean | string> | null,
  ): string {
    if (!value) return '';
    return typeof value['note'] === 'string' ? value['note'] : '';
  }

  private buildEmgChecklistTable(
    checklist?: Record<
      string,
      {
        esito?: 'si' | 'no' | null;
        note?: string;
      }
    >,
  ): string {
    return `
      <table class="attachment-table">
        <thead>
          <tr>
            <th>Fattore</th>
            <th class="center" style="width: 14mm">Si</th>
            <th class="center" style="width: 14mm">No</th>
            <th style="width: 42mm">Note</th>
          </tr>
        </thead>
        <tbody>
          ${EMG_CHECKLIST_ITEMS.map((item) => {
            const entry = checklist?.[item.key];
            const esito = entry?.esito ?? null;

            return `
              <tr>
                <td>${this.escape(item.label)}</td>
                <td class="center">${esito === 'si' ? 'X' : ''}</td>
                <td class="center">${esito === 'no' ? 'X' : ''}</td>
                <td>${this.escape(this.withFallback(entry?.note, ''))}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  private formatDateTimeLocal(value?: string | null): string {
    if (!value) return '';

    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/,
    );

    if (!match) return value;

    return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
  }

  private formatDateOnly(value?: string | null): string {
    if (!value) return '';

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }

    if (value.includes('T')) {
      return this.formatDateTimeLocal(value).split(' ')[0] || value;
    }

    return value;
  }

  private formatDateRange(start?: string | null, end?: string | null): string {
    const startLabel = this.formatDateTimeLocal(start);
    const endLabel = this.formatDateTimeLocal(end);

    if (startLabel && endLabel) {
      return `${startLabel} - ${endLabel}`;
    }

    return startLabel || endLabel || '-';
  }

  private stripHtmlToText(value?: string | null): string {
    if (!value) return '';

    return value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hasContent(value?: string | null): boolean {
    return !!value && !!value.trim();
  }

  private withFallback(value?: string | null, fallback = '-'): string {
    return value && value.trim() ? value.trim() : fallback;
  }

  private escape(value: string): string {
    return (value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
