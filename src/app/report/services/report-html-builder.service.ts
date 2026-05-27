import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ReportHtmlBuilderService {
  build(report: {
    titoloVisita: string;
    dataVisitaDisplay: string;
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
  }): string {
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
  border: 0.35mm solid #4A4A4A;
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
  color: #1C9EBD;
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

/* LIBERO SENZA CORNICE */
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
  </style>
</head>
<body>
  <div class="page-frame"></div>

  <div class="sheet">
    <div class="container">

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

      <div class="visit-row">
        <div class="visit-main">
          <div class="visit-title">${this.escape(
            this.withFallback(report.titoloVisita),
          )}</div>
          <div class="visit-date">
            Data: <span class="date-value">${this.escape(
              this.withFallback(report.dataVisitaDisplay),
            )}</span>
          </div>
        </div>

        <div class="doctor-card-wrap">
          <div class="doctor-card">
            <div class="doctor-line">
              <span class="doctor-label">Medico:</span>
              <span class="doctor-value">${this.escape(fullDoctorName)}</span>
            </div>
            <div class="doctor-line">
              <span class="doctor-label">Specialità:</span>
              <span class="doctor-value">${this.escape(
                this.withFallback(report.medico.specialita),
              )}</span>
            </div>
          </div>
        </div>
      </div>

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
        ? [
            {
              title: 'Porta in visione',
              html: contenuti.portaInVisione,
            },
          ]
        : []),

      ...(this.hasContent(contenuti.esamiEseguitiInLoco)
        ? [
            {
              title: 'Esami eseguiti',
              html: contenuti.esamiEseguitiInLoco,
            },
          ]
        : []),

      {
        title: 'Esame obiettivo',
        html: contenuti.esameObiettivo,
      },
      {
        title: 'Diagnosi',
        html: contenuti.diagnosi,
      },
      {
        title: 'Prescrizione',
        html: contenuti.prescrizione,
      },
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

          /*
            NORMAL: pagine non finali (senza riserva timbro).
            LAST: ultima pagina (con riserva timbro/firma).
          */
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

  private hasContent(value?: string | null): boolean {
    return !!value && !!value.trim();
  }

  private withFallback(value?: string | null): string {
    return value && value.trim() ? value.trim() : '-';
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
