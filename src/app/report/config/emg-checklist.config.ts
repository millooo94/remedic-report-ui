export type EmgChecklistKey =
  | 'diabete'
  | 'insufficienza_renale'
  | 'ipotiroidismo'
  | 'abuso_alcol'
  | 'carenze_vitaminiche_note'
  | 'pregresse_chemioterapie'
  | 'malattie_autoimmuni'
  | 'traumi_recenti_distretto'
  | 'terapia_anticoagulante_antiaggregante'
  | 'pacemaker_icd';

export type EmgChecklistOutcome = 'si' | 'no' | null;

export interface EmgChecklistItem {
  key: EmgChecklistKey;
  label: string;
}

export const EMG_CHECKLIST_ITEMS: readonly EmgChecklistItem[] = [
  { key: 'diabete', label: 'Diabete' },
  { key: 'insufficienza_renale', label: 'Insufficienza renale' },
  { key: 'ipotiroidismo', label: 'Ipotiroidismo' },
  { key: 'abuso_alcol', label: 'Abuso di alcol' },
  { key: 'carenze_vitaminiche_note', label: 'Carenze vitaminiche note' },
  { key: 'pregresse_chemioterapie', label: 'Pregresse chemioterapie' },
  { key: 'malattie_autoimmuni', label: 'Malattie autoimmuni' },
  {
    key: 'traumi_recenti_distretto',
    label: 'Traumi recenti nel distretto esaminato',
  },
  {
    key: 'terapia_anticoagulante_antiaggregante',
    label: 'Terapia anticoagulante e/o antiaggregante in corso',
  },
  {
    key: 'pacemaker_icd',
    label: 'Portatore di dispositivo cardiaco impiantabile pacemaker/ICD',
  },
] as const;

export const EMG_DEFAULTS = {
  titoloVisita: 'Referto di Elettroneurografia / Elettromiografia',
  specializzazione: 'Neurologia',
  prestazione: 'Studio elettrofisiologico ENG/EMG',
  testoStandardEsecuzione:
    'Esame eseguito presso Remedic - Centro Medico Polispecialistico dal tecnico esecutore indicato. Validazione clinica e refertazione asincrona eseguita dal medico specialista refertatore, su incarico della struttura, sulla base dei dati clinici, anamnestici e strumentali acquisiti presso Remedic.',
  consensoInformatoTesto:
    "Consenso informato all'esecuzione dell'esame elettrofisiologico acquisito prima della prestazione e conservato agli atti presso Remedic. Il consenso non viene allegato al referto, salvo richiesta di copia da parte del paziente.",
  materialeProdotto:
    'Tracciati elettrofisiologici, tabelle dei parametri tecnici, dati anamnestici e clinici minimi',
  attestazioneTecnico:
    "Il tecnico esecutore attesta esclusivamente l'esecuzione tecnica dell'indagine, la corretta acquisizione dei tracciati e la raccolta delle informazioni anamnestiche indicate. La valutazione clinica e le conclusioni diagnostiche sono di competenza del medico refertatore.",
  esameEseguito:
    "Studio elettrofisiologico eseguito secondo protocollo, con acquisizione dei tracciati e dei parametri tecnici pertinenti al distretto esaminato. I tracciati elettrofisiologici e le tabelle dei parametri tecnici sono allegati al presente referto e ne costituiscono parte integrante.",
} as const;
