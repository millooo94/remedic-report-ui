# Deploy Vercel

## Configurazione progetto

- Root Directory: `remedic-report-ui`
- Framework: `Angular`
- Build command: `npm run build`
- Output directory: `dist/remedic-report/browser`
- Install command: `npm ci`
- Dominio frontend previsto: `report.remedic.it`
- Backend da chiamare: `https://report-api.remedic.it`

Se in futuro il repository non includesse piu `package-lock.json`, usa `npm install`.

## Nota sugli environment

Questa app oggi usa i file Angular:

- `src/environments/environment.ts` per la build di produzione
- `src/environments/environment.development.ts` per lo sviluppo locale

Non e stata introdotta una sostituzione runtime tramite variabili Vercel. Questo significa che i valori API vengono decisi in fase di build Angular.

La chiave inviata come header `x-api-key` e inclusa nel bundle frontend e deve quindi essere trattata come pubblica, non come segreto.

## Configurazione dominio

Su Vercel collega il dominio:

`report.remedic.it`

## CORS backend

Il backend deve consentire richieste da:

`https://report.remedic.it`

## Rewrites SPA

Il file `vercel.json` aggiunge un fallback verso `index.html` per le route SPA.

## Test locale

```bash
cd remedic-report-ui
npm install
npm run build
npm start
```

Lo sviluppo locale standard resta disponibile su:

`http://localhost:4200`
