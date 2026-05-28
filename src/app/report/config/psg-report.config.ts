export type PsgBinaryResponse = 'no' | 'si' | 'non_noto' | null;

export type PsgSleepHistoryKey =
  | 'russamentoAbituale'
  | 'pauseRespiratorieOsservate'
  | 'risvegliSoffocamento'
  | 'sonnolenzaDiurna'
  | 'sonnoNonRistoratore'
  | 'cefaleaMattutina'
  | 'nicturia';

export interface PsgSleepHistoryItem {
  key: PsgSleepHistoryKey;
  label: string;
}

export const PSG_SLEEP_HISTORY_ITEMS: readonly PsgSleepHistoryItem[] = [
  { key: 'russamentoAbituale', label: 'Russamento abituale' },
  {
    key: 'pauseRespiratorieOsservate',
    label: 'Pause respiratorie osservate dal partner',
  },
  {
    key: 'risvegliSoffocamento',
    label: 'Risvegli con senso di soffocamento',
  },
  { key: 'sonnolenzaDiurna', label: 'Sonnolenza diurna' },
  { key: 'sonnoNonRistoratore', label: 'Sonno non ristoratore' },
  { key: 'cefaleaMattutina', label: 'Cefalea mattutina' },
  { key: 'nicturia', label: 'Nicturia' },
] as const;

export type PsgEssKey =
  | 'sedutoLeggere'
  | 'guardandoTv'
  | 'sedutoInattivoLuogoPubblico'
  | 'passeggeroAutoUnOra'
  | 'sdraiatoPomeriggio'
  | 'sedutoParlare'
  | 'sedutoDopoPranzo'
  | 'autoFermoTraffico';

export interface PsgEssItem {
  key: PsgEssKey;
  label: string;
}

export const PSG_ESS_ITEMS: readonly PsgEssItem[] = [
  { key: 'sedutoLeggere', label: 'Seduto/a a leggere' },
  { key: 'guardandoTv', label: 'Guardando la TV' },
  {
    key: 'sedutoInattivoLuogoPubblico',
    label: 'Seduto/a inattivo/a in luogo pubblico',
  },
  {
    key: 'passeggeroAutoUnOra',
    label: "Passeggero/a in auto per circa un'ora senza sosta",
  },
  {
    key: 'sdraiatoPomeriggio',
    label: 'Sdraiato/a per riposare nel pomeriggio',
  },
  { key: 'sedutoParlare', label: 'Seduto/a a parlare con qualcuno' },
  {
    key: 'sedutoDopoPranzo',
    label: 'Seduto/a tranquillamente dopo pranzo senza alcol',
  },
  {
    key: 'autoFermoTraffico',
    label: 'In auto, fermo/a per pochi minuti nel traffico',
  },
] as const;

export const PSG_FARMACI_OPTIONS = [
  { key: 'nessuno', label: 'Nessuno' },
  { key: 'sedativi_ipnotici', label: 'Sedativi / ipnotici' },
  { key: 'oppioidi', label: 'Oppioidi' },
  { key: 'altro', label: 'Altro' },
] as const;

export const PSG_COMORBIDITA_OPTIONS = [
  { key: 'ipertensione', label: 'Ipertensione' },
  { key: 'cardiopatia', label: 'Cardiopatia' },
  { key: 'bpco', label: 'BPCO' },
  { key: 'diabete', label: 'Diabete' },
  { key: 'aritmie', label: 'Aritmie' },
  { key: 'altro', label: 'Altro' },
] as const;

export const PSG_DEFAULTS = {
  titoloVisita: 'Refertazione polisonnografica cardio-respiratoria (PSG)',
  prestazione: 'Monitoraggio cardio-respiratorio notturno domiciliare',
  specializzazione: 'Neurologia',
  sistemaRegistrazione: 'SOMNOtouch RESP',
  consensoInformato: 'Acquisito presso la struttura',
  anamnesiRaccolta: 'Raccolta telefonicamente',
  reportTecnico: 'Allegato al presente referto',
  modalitaRaccolta: 'Telefonica',
  operatore: 'Remedic',
  quesitoClinico:
    'Valutazione di sospetto disturbo respiratorio del sonno mediante monitoraggio cardio-respiratorio notturno domiciliare. La scheda anamnestica e la scala di Epworth sono riportate nella pagina successiva. I dettagli numerici, le tabelle e i grafici generati dal dispositivo sono riportati esclusivamente nel report strumentale allegato.',
  interpretazioneMedico:
    "Sulla base della registrazione cardio-respiratoria notturna e della documentazione allegata, il quadro appare compatibile con disturbo respiratorio del sonno a prevalente componente ostruttiva. La qualita del materiale disponibile e ritenuta adeguata alla refertazione. L'interpretazione clinica deve essere correlata con anamnesi, sintomatologia diurna, comorbidita e valutazione specialistica del paziente.",
  conclusioneDiagnostica:
    'Quadro compatibile con disturbo respiratorio del sonno. Si raccomanda correlazione clinica e valutazione specialistica per definire il percorso terapeutico piu appropriato.',
  indicazioniCliniche:
    'Valutare interventi su fattori modificabili e igiene del sonno; evitare alcol e sedativi serali ove clinicamente appropriato; considerare eventuale terapia posizionale se indicata. In base al quadro clinico, alle comorbidita e alla sintomatologia diurna, valutare percorso terapeutico specialistico dedicato.',
  notaDocumentale:
    'Il report strumentale allegato conserva il dettaglio tecnico della registrazione. Le prime pagine Remedic riportano la refertazione medica, la scheda anamnestica telefonica e la scala ESS.',
} as const;

export function getPsgEssInterpretation(total: number): string {
  if (total <= 10) return 'nei limiti';
  if (total <= 12) return 'sonnolenza lieve';
  if (total <= 15) return 'sonnolenza moderata';
  return 'sonnolenza severa';
}
