export const REPORT_PREVIEW_MOCK = {
  titoloVisita: 'Prima visita dermatologica',
  dataVisitaDisplay: '08/03/2026',
  paziente: {
    nome: 'Mario',
    cognome: 'Rossi',
    sesso: 'M',
    dataNascitaDisplay: '12/05/1985',
    codiceFiscale: 'RSSMRA85E12H501X',
    telefono: '3331234567',
    email: 'mario.rossi@email.it',
    indirizzo: 'Via Etnea 100, Catania',
  },
  medico: {
    nome: 'Antonio',
    cognome: 'Di Salvo',
    specialita: 'Dermatologia',
  },
  contenuti: {
    anamnesiPatologicaRemota:
      '<p>Pregressa dermatite atopica in età adolescenziale.</p>',
    anamnesiPatologicaProssima:
      '<p>Il paziente riferisce comparsa di lesione eritematosa pruriginosa da circa 3 settimane.</p>',
    portaInVisione:
      '<p>Porta in visione esami ematochimici recenti e precedente referto dermatologico.</p>',
    esamiEseguitiInLoco: '<p>Dermatoscopia effettuata in sede.</p>',
    esameObiettivo:
      '<p>Lesione eritemato-desquamativa in sede pretibiale destra, margini netti.</p>',
    diagnosi: '<p>Quadro compatibile con dermatite cronica recidivante.</p>',
    prescrizione:
      '<ul><li>Crema corticosteroidea locale per 7 giorni</li><li>Controllo tra 15 giorni</li></ul>',
  },
};
