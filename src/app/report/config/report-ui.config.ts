export type SectionKey =
  | 'anamnesiRemota'
  | 'anamnesiProssima'
  | 'portaInVisione'
  | 'esamiInLoco'
  | 'esameObiettivo'
  | 'diagnosi'
  | 'prescrizione';

export const REPORT_STEPS = [
  { key: 'anagrafica', title: 'Anagrafica' },
  { key: 'visita', title: 'Visita' },
  { key: 'sezioni', title: 'Sezioni' },
  { key: 'contenuti', title: 'Contenuti' },
] as const;

export const EMG_REPORT_STEPS = [
  { key: 'anagrafica', title: 'Anagrafica' },
  { key: 'visita', title: 'Dati esame' },
  { key: 'sezioni', title: 'Dati clinici' },
  { key: 'contenuti', title: 'Contenuti' },
] as const;

export const PSG_REPORT_STEPS = [
  { key: 'anagrafica', title: 'Anagrafica' },
  { key: 'visita', title: 'Dati esame' },
  { key: 'sezioni', title: 'Quesito e refertazione' },
  { key: 'contenuti', title: 'Report strumentale' },
] as const;

export const REPORT_SECTION_KEYS: readonly SectionKey[] = [
  'anamnesiRemota',
  'anamnesiProssima',
  'portaInVisione',
  'esameObiettivo',
  'esamiInLoco',
  'diagnosi',
  'prescrizione',
];

export const REPORT_MANDATORY_SECTIONS: SectionKey[] = [
  'anamnesiProssima',
  'esameObiettivo',
  'diagnosi',
  'prescrizione',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  anamnesiRemota: 'Anamnesi patologica remota',
  anamnesiProssima: 'Anamnesi patologica prossima',
  portaInVisione: 'Porta in visione',
  esamiInLoco: 'Esami eseguiti',
  esameObiettivo: 'Esame obiettivo',
  diagnosi: 'Diagnosi',
  prescrizione: 'Prescrizione',
};

export const SECTION_DESCRIPTIONS: Record<SectionKey, string> = {
  anamnesiRemota:
    'Patologie, interventi o condizioni cliniche rilevanti del passato.',
  anamnesiProssima:
    'Motivo della visita e sintomi attuali riferiti dal paziente.',
  esameObiettivo:
    'Valutazione clinica effettuata dal medico durante la visita.',
  portaInVisione:
    'Documentazione clinica portata dal paziente (esami, referti, immagini).',
  esamiInLoco: 'Esami strumentali o diagnostici eseguiti durante la visita.',
  diagnosi: 'Conclusione clinica formulata dal medico sulla base della visita.',
  prescrizione:
    'Terapia farmacologica, indicazioni o raccomandazioni cliniche.',
};
