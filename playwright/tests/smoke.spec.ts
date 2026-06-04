import { expect, type Page, type Route, type TestInfo, test } from '@playwright/test';

const baseProfessionalOptions = [
  {
    id: 'prof-1',
    first_name: 'Laura',
    last_name: 'Bianchi',
    display_name: 'Dott.ssa Laura Bianchi',
    email: 'laura.bianchi@example.test',
    specializzazione: 'Neurologia',
    role_label: 'Neurologa',
    visible_in_standard: true,
    is_refertatore: false,
    active: true,
  },
];

const baseRefertatoreOptions = [
  {
    id: 'ref-1',
    email: 'marco.rossi@example.test',
    display_name: 'Dott. Marco Rossi',
    specializzazione: 'Neurologia',
    assignedTypes: ['emg', 'psg'],
  },
];

const adminProfessionals = [
  {
    id: 'adm-prof-1',
    first_name: 'Laura',
    last_name: 'Bianchi',
    display_name: 'Dott.ssa Laura Bianchi',
    email: 'laura.bianchi@example.test',
    specializzazione: 'Neurologia',
    role_label: 'Neurologa',
    visible_in_standard: true,
    is_refertatore: false,
    active: true,
    sort_order: 1,
    reserved_user_id: 'reserved-1',
    reserved_user_email: 'laura.bianchi@example.test',
    reserved_user_role: 'professionista',
    reserved_user_active: true,
    reserved_user_two_factor_enabled: true,
    created_at: '2026-05-01T08:00:00.000Z',
    updated_at: '2026-05-15T11:30:00.000Z',
  },
  {
    id: 'adm-prof-2',
    first_name: 'Giulia',
    last_name: 'Verdi',
    display_name: 'Dott.ssa Giulia Verdi',
    email: 'giulia.verdi@example.test',
    specializzazione: 'Pneumologia',
    role_label: 'Pneumologa',
    visible_in_standard: false,
    is_refertatore: false,
    active: false,
    sort_order: 2,
    reserved_user_id: null,
    reserved_user_email: null,
    reserved_user_role: null,
    reserved_user_active: null,
    reserved_user_two_factor_enabled: null,
    created_at: '2026-04-11T08:00:00.000Z',
    updated_at: '2026-05-12T09:00:00.000Z',
  },
];

const adminUsers = [
  {
    id: 'admin-user-1',
    email: 'marco.rossi@example.test',
    display_name: 'Dott. Marco Rossi',
    role: 'refertatore',
    specializzazione: 'Neurologia',
    assignedTypes: ['emg', 'psg'],
    active: true,
  },
  {
    id: 'admin-user-2',
    email: 'alessia.neri@example.test',
    display_name: 'Dott.ssa Alessia Neri',
    role: 'refertatore',
    specializzazione: 'Pneumologia',
    assignedTypes: ['psg'],
    active: false,
  },
];

function makeDraft(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    tipo_referto: 'emg',
    stato: 'in_attesa_refertatore',
    paziente_nome: 'Mario',
    paziente_cognome: 'Rossi',
    paziente_nome_completo: 'Mario Rossi',
    data_nascita: '1980-02-15',
    codice_fiscale: 'RSSMRA80B15H501Z',
    telefono: '3330001111',
    email: 'mario.rossi@example.test',
    medico_refertatore: 'Dott.ssa Laura Bianchi',
    medico_refertatore_id: 'prof-1',
    assigned_refertatore_id: 'ref-1',
    assigned_refertatore_email: 'marco.rossi@example.test',
    assigned_refertatore_name: 'Dott. Marco Rossi',
    assigned_refertatore_specializzazione: 'Neurologia',
    specializzazione: 'Neurologia',
    prestazione: 'Elettromiografia arti superiori',
    data_esame: '2026-05-20',
    has_signed_pdf: false,
    patient_email_sent: false,
    drive_file_id: null,
    drive_web_view_link: null,
    created_at: '2026-05-20T08:00:00.000Z',
    updated_at: '2026-05-21T10:30:00.000Z',
    completed_at: null,
    ...overrides,
  };
}

const adminDraftItems = [
  makeDraft('draft-working-1', {
    tipo_referto: 'standard',
    stato: 'bozza',
    medico_refertatore: 'Dott.ssa Laura Bianchi',
    assigned_refertatore_name: null,
    assigned_refertatore_specializzazione: null,
    specializzazione: 'Neurologia',
    prestazione: 'Visita neurologica',
    data_esame: '2026-05-18',
  }),
  makeDraft('draft-working-2', {
    tipo_referto: 'psg',
    stato: 'in_refertazione_refertatore',
    paziente_nome_completo: 'Anna Verdi',
    codice_fiscale: 'VRDNNA78M41H501B',
    assigned_refertatore_name: 'Dott.ssa Alessia Neri',
    assigned_refertatore_specializzazione: 'Pneumologia',
    specializzazione: 'Pneumologia',
    prestazione: 'Polisonnografia notturna',
    data_esame: '2026-05-19',
    updated_at: '2026-05-22T14:10:00.000Z',
  }),
];

const adminArchiveItems = [
  makeDraft('draft-archive-1', {
    tipo_referto: 'emg',
    stato: 'firmato_caricato',
    paziente_nome_completo: 'Luca Neri',
    codice_fiscale: 'NRELCU76E12H501K',
    assigned_refertatore_name: 'Dott. Marco Rossi',
    assigned_refertatore_specializzazione: 'Neurologia',
    prestazione: 'EMG arti inferiori',
    data_esame: '2026-05-10',
    updated_at: '2026-05-14T09:45:00.000Z',
    completed_at: '2026-05-14T09:45:00.000Z',
    drive_file_id: null,
    patient_email_sent: false,
  }),
  makeDraft('draft-archive-2', {
    tipo_referto: 'standard',
    stato: 'completato',
    paziente_nome_completo: 'Sara Bianchi',
    codice_fiscale: 'BNCSRA82P50H501Q',
    medico_refertatore: 'Dott.ssa Laura Bianchi',
    assigned_refertatore_name: null,
    assigned_refertatore_specializzazione: null,
    specializzazione: 'Neurologia',
    prestazione: 'Visita neurologica',
    data_esame: '2026-05-09',
    updated_at: '2026-05-12T16:00:00.000Z',
    completed_at: '2026-05-12T16:00:00.000Z',
    drive_file_id: 'drive-standard-1',
    patient_email_sent: true,
  }),
];

const auditLogs = [
  {
    id: 'audit-1',
    user_id: 'admin-1',
    role: 'admin',
    action: 'archive.send_to_patient',
    entity_type: 'draft',
    entity_id: 'draft-archive-2',
    ip_address: '127.0.0.1',
    user_agent: 'Playwright',
    metadata: {},
    created_at: '2026-05-23T09:15:00.000Z',
  },
  {
    id: 'audit-2',
    user_id: 'admin-1',
    role: 'admin',
    action: 'draft.delete',
    entity_type: 'draft',
    entity_id: 'draft-working-3',
    ip_address: '127.0.0.1',
    user_agent: 'Playwright',
    metadata: {},
    created_at: '2026-05-23T10:05:00.000Z',
  },
];

const refertatoreDraftsByType = {
  emg: [
    makeDraft('ref-emg-1', {
      tipo_referto: 'emg',
      stato: 'in_refertazione_refertatore',
      paziente_nome_completo: 'Giovanni Riva',
      codice_fiscale: 'RVIGNN75C10H501P',
      prestazione: 'EMG arti superiori',
      data_esame: '2026-05-24',
      updated_at: '2026-05-24T14:40:00.000Z',
    }),
    makeDraft('ref-emg-2', {
      tipo_referto: 'emg',
      stato: 'pronto_per_firma',
      paziente_nome_completo: 'Paolo Conti',
      codice_fiscale: 'CNTPLO68S01H501D',
      prestazione: 'EMG arti inferiori',
      data_esame: '2026-05-22',
      updated_at: '2026-05-24T08:20:00.000Z',
    }),
  ],
  psg: [
    makeDraft('ref-psg-1', {
      tipo_referto: 'psg',
      stato: 'in_attesa_refertatore',
      paziente_nome_completo: 'Francesca Galli',
      codice_fiscale: 'GLLFNC79L55H501E',
      specializzazione: 'Pneumologia',
      prestazione: 'Polisonnografia',
      data_esame: '2026-05-23',
      updated_at: '2026-05-24T11:15:00.000Z',
    }),
    makeDraft('ref-psg-2', {
      tipo_referto: 'psg',
      stato: 'pronto_per_firma',
      paziente_nome_completo: 'Elena Fontana',
      codice_fiscale: 'FNTLNE81R41H501J',
      specializzazione: 'Pneumologia',
      prestazione: 'Polisonnografia domiciliare',
      data_esame: '2026-05-21',
      updated_at: '2026-05-23T17:10:00.000Z',
    }),
  ],
};

const refertatoreArchiveByType = {
  emg: [
    makeDraft('ref-arch-emg-1', {
      tipo_referto: 'emg',
      stato: 'firmato_caricato',
      paziente_nome_completo: 'Alberto Sala',
      codice_fiscale: 'SLALRT72D18H501N',
      prestazione: 'EMG arti inferiori',
      data_esame: '2026-05-11',
      completed_at: '2026-05-14T10:00:00.000Z',
      updated_at: '2026-05-14T10:00:00.000Z',
      drive_file_id: null,
    }),
  ],
  psg: [
    makeDraft('ref-arch-psg-1', {
      tipo_referto: 'psg',
      stato: 'completato',
      paziente_nome_completo: 'Martina Valli',
      codice_fiscale: 'VLLMTN84A46H501R',
      specializzazione: 'Pneumologia',
      prestazione: 'Polisonnografia completa',
      data_esame: '2026-05-13',
      completed_at: '2026-05-16T12:20:00.000Z',
      updated_at: '2026-05-16T12:20:00.000Z',
      drive_file_id: 'drive-psg-1',
    }),
  ],
};

const personalArchiveItems = [
  makeDraft('personal-std-1', {
    tipo_referto: 'standard',
    stato: 'completato',
    paziente_nome_completo: 'Nadia Moretti',
    codice_fiscale: 'MRTNDA83B60H501F',
    medico_refertatore: 'Dott.ssa Laura Bianchi',
    assigned_refertatore_name: null,
    assigned_refertatore_specializzazione: null,
    specializzazione: 'Neurologia',
    prestazione: 'Visita neurologica',
    data_esame: '2026-05-07',
    completed_at: '2026-05-09T08:45:00.000Z',
    updated_at: '2026-05-09T08:45:00.000Z',
  }),
];

const resumableDraftItems = [
  makeDraft('resume-1', {
    tipo_referto: 'standard',
    stato: 'bozza',
    paziente_nome_completo: 'Irene Fabbri',
    codice_fiscale: 'FBBRNI91C55H501S',
    updated_at: '2026-05-25T08:30:00.000Z',
  }),
  makeDraft('resume-2', {
    tipo_referto: 'standard',
    stato: 'anamnesi_raccolta',
    paziente_nome_completo: 'Matteo Rinaldi',
    codice_fiscale: 'RNLMTT88D15H501L',
    updated_at: '2026-05-25T12:10:00.000Z',
  }),
];

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  fileName: string,
): Promise<void> {
  const screenshotPath = testInfo.outputPath(fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(fileName.replace(/\.png$/, ''), {
    path: screenshotPath,
    contentType: 'image/png',
  });
}

async function installMockApi(
  page: Page,
  options: {
    authUser?: Record<string, unknown> | null;
    creationAccessAllowed?: boolean;
    draftList?: Array<Record<string, unknown>>;
  } = {},
): Promise<void> {
  const {
    authUser = null,
    creationAccessAllowed = true,
    draftList = [],
  } = options;

  await page.route('http://localhost:4010/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/auth/me') {
      if (authUser) {
        await fulfillJson(route, { user: authUser });
      } else {
        await fulfillJson(route, { message: 'Unauthenticated' }, 401);
      }
      return;
    }

    if (path === '/auth/csrf') {
      await fulfillJson(route, { csrfToken: 'playwright-csrf-token' });
      return;
    }

    if (path === '/creation-access') {
      await fulfillJson(route, {
        allowed: creationAccessAllowed,
        reason: creationAccessAllowed ? 'admin_allowed' : 'denied',
        allowedTypes: ['standard', 'emg', 'psg'],
      });
      return;
    }

    if (path === '/professionals') {
      await fulfillJson(route, { items: baseProfessionalOptions });
      return;
    }

    if (path === '/refertatori') {
      await fulfillJson(route, { items: baseRefertatoreOptions });
      return;
    }

    if (path === '/drafts') {
      await fulfillJson(route, {
        items: draftList,
        total: draftList.length,
        limit: draftList.length || 20,
        offset: 0,
      });
      return;
    }

    if (path === '/admin/users') {
      await fulfillJson(route, { items: adminUsers });
      return;
    }

    if (path === '/admin/professionals') {
      await fulfillJson(route, { items: adminProfessionals });
      return;
    }

    if (path === '/admin/drafts') {
      await fulfillJson(route, {
        items: adminDraftItems,
        total: adminDraftItems.length,
        limit: adminDraftItems.length,
        offset: 0,
      });
      return;
    }

    if (path === '/admin/archive') {
      await fulfillJson(route, {
        items: adminArchiveItems,
        total: adminArchiveItems.length,
        limit: adminArchiveItems.length,
        offset: 0,
      });
      return;
    }

    if (path === '/admin/audit-logs') {
      await fulfillJson(route, {
        items: auditLogs,
        total: auditLogs.length,
        page: 1,
        pageSize: 20,
        limit: 20,
        offset: 0,
      });
      return;
    }

    if (path === '/refertatore/drafts') {
      const tipo = url.searchParams.get('tipo_referto') === 'psg' ? 'psg' : 'emg';
      await fulfillJson(route, {
        items: refertatoreDraftsByType[tipo],
        total: refertatoreDraftsByType[tipo].length,
        limit: refertatoreDraftsByType[tipo].length,
        offset: 0,
      });
      return;
    }

    if (path === '/refertatore/archive') {
      const tipo = url.searchParams.get('tipo_referto') === 'psg' ? 'psg' : 'emg';
      await fulfillJson(route, {
        items: refertatoreArchiveByType[tipo],
        total: refertatoreArchiveByType[tipo].length,
        limit: refertatoreArchiveByType[tipo].length,
        offset: 0,
      });
      return;
    }

    if (path === '/refertatore/personal-archive') {
      await fulfillJson(route, {
        items: personalArchiveItems,
        total: personalArchiveItems.length,
        limit: personalArchiveItems.length,
        offset: 0,
      });
      return;
    }

    await fulfillJson(
      route,
      { message: `Mock not configured for ${path}` },
      404,
    );
  });
}

async function openStandardWizard(page: Page): Promise<void> {
  await page.goto('/?view=creation');
  await page.getByRole('button', { name: /Referto standard/ }).click();
  await expect(page.getByRole('heading', { name: 'Referto standard' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuovo referto' }).click();
  await expect(page.getByRole('heading', { name: 'Anagrafica' }).first()).toBeVisible();
}

async function reachStandardModeSelector(page: Page): Promise<void> {
  await openStandardWizard(page);

  const anagraficaStep = page.locator('step-anagrafica');
  const anagraficaFields = anagraficaStep.locator('.grid2 > .field');
  await anagraficaFields.nth(0).locator('input').fill('Irene');
  await anagraficaFields.nth(1).locator('input').fill('Fabbri');
  await anagraficaFields.nth(2).locator('select').selectOption({ label: 'F' });
  await anagraficaFields.nth(3).locator('input').fill('15/02/1980');
  await page.getByRole('button', { name: 'Avanti' }).click();

  await expect(page.getByRole('heading', { name: 'Visita', exact: true })).toBeVisible();
  const visitaStep = page.locator('step-visita');
  const visitaFields = visitaStep.locator('.section .grid2').first().locator('> .field');
  await visitaFields.nth(0).locator('input').fill('20/05/2026');
  await visitaFields.nth(1).locator('input').fill('Visita neurologica di controllo');
  const doctorAutocomplete = visitaStep.locator('doctor-autocomplete').last();
  await doctorAutocomplete.locator('input').fill('Laura');
  await doctorAutocomplete.locator('.autocomplete li').filter({ hasText: 'Bianchi Laura' }).first().click();
  await page.getByRole('button', { name: 'Avanti' }).click();

  await expect(page.getByRole('heading', { name: 'Come vuoi compilare il referto?' })).toBeVisible();
}

test('captures the reachable initial type-selection state', async ({ page }, testInfo) => {
  await installMockApi(page);

  await page.goto('/?view=creation');

  await expect(
    page.getByRole('heading', { name: 'Scegli il percorso di refertazione' }),
  ).toBeVisible();

  await attachScreenshot(page, testInfo, 'phase6-public-entry.png');
});

test('captures the reserved login state', async ({ page }, testInfo) => {
  await installMockApi(page);

  await page.goto('/?view=creation');
  await page.getByRole('button', { name: /Area riservata/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Accedi all\'area riservata' }),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase6-reserved-login.png');
});

test('captures the draft resume table state', async ({ page }, testInfo) => {
  await installMockApi(page, { draftList: resumableDraftItems });

  await page.goto('/?view=creation');
  await expect(
    page.getByRole('heading', { name: 'Scegli il percorso di refertazione' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Referto standard/ }).click();
  await expect(page.getByRole('heading', { name: 'Referto standard' })).toBeVisible();
  await page.getByRole('button', { name: /Riprendi referto/ }).click();
  await expect(page.locator('.modalEyebrow', { hasText: 'Bozze' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-draft-resume-table.png');
});

test('captures the mobile blocked shell', async ({ page }, testInfo) => {
  await installMockApi(page);
  await page.setViewportSize({ width: 540, height: 900 });

  await page.goto('/?view=creation');

  await expect(
    page.getByRole('heading', { name: 'Accesso da schermo ampio richiesto' }),
  ).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase6-mobile-blocked.png');
});

test('captures the standard wizard header state', async ({ page }, testInfo) => {
  await installMockApi(page);

  await openStandardWizard(page);
  await attachScreenshot(page, testInfo, 'phase6-standard-wizard.png');
});

test('captures the standard guided versus free-text selector', async ({ page }, testInfo) => {
  await installMockApi(page);

  await reachStandardModeSelector(page);
  await attachScreenshot(page, testInfo, 'phase6-standard-mode-selector.png');
});

test('captures admin table states with safe runtime mocks', async ({ page }, testInfo) => {
  await installMockApi(page, {
    authUser: {
      id: 'admin-1',
      role: 'admin',
      professionalId: null,
      email: 'admin@example.test',
      firstName: 'Admin',
      lastName: 'Remedic',
      displayName: 'Admin Remedic',
      specializzazione: null,
      avatarDataUrl: null,
      active: true,
      mustChangePassword: false,
      twoFactorEnabled: true,
      assignedTypes: [],
    },
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Governance e controlli' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-admin-dashboard.png');

  await page.locator('.dashboardSidebarNav .sidebarNavBtn').filter({ hasText: 'Refertatori asincroni' }).click();
  await expect(page.getByRole('heading', { name: 'Refertatori asincroni' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-admin-users.png');

  await page.locator('.dashboardSidebarNav .sidebarNavBtn').filter({ hasText: 'Referti in lavorazione' }).click();
  await expect(page.getByRole('heading', { name: 'Referti in lavorazione' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-admin-working-drafts.png');

  await page.locator('.dashboardSidebarNav .sidebarNavBtn').filter({ hasText: 'Archivio' }).click();
  await expect(page.getByRole('heading', { name: 'Archivio referti' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-admin-archive.png');

  await page.locator('.dashboardSidebarNav .sidebarNavBtn').filter({ hasText: 'Audit log' }).click();
  await expect(page.getByRole('heading', { name: 'Audit log base' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-admin-audit.png');
});

test('captures refertatore queue and archive tables with safe runtime mocks', async ({ page }, testInfo) => {
  await installMockApi(page, {
    authUser: {
      id: 'ref-1',
      role: 'refertatore',
      professionalId: 'prof-1',
      email: 'marco.rossi@example.test',
      firstName: 'Marco',
      lastName: 'Rossi',
      displayName: 'Dott. Marco Rossi',
      specializzazione: 'Neurologia',
      avatarDataUrl: null,
      active: true,
      mustChangePassword: false,
      twoFactorEnabled: true,
      assignedTypes: ['emg', 'psg'],
    },
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard refertatore' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-refertatore-dashboard.png');

  await page.locator('.dashboardSidebarNav .sidebarNavBtn').filter({ hasText: 'Da refertare' }).click();
  await expect(page.getByRole('heading', { name: 'Da completare' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-refertatore-queue.png');

  await page.locator('.dashboardSidebarNav .sidebarNavBtn').filter({ hasText: 'Referti da firmare' }).click();
  await expect(page.getByRole('heading', { name: 'Referti da firmare' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-refertatore-signing.png');

  await page.locator('.dashboardSidebarNav .sidebarNavBtn').filter({ hasText: 'Archivio referti' }).click();
  await expect(page.getByRole('heading', { name: 'Archivio referti standard' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-refertatore-archive.png');
});

test('captures the professionista personal archive table with safe runtime mocks', async ({
  page,
}, testInfo) => {
  await installMockApi(page, {
    authUser: {
      id: 'prof-user-1',
      role: 'professionista',
      professionalId: 'prof-1',
      email: 'laura.bianchi@example.test',
      firstName: 'Laura',
      lastName: 'Bianchi',
      displayName: 'Dott.ssa Laura Bianchi',
      specializzazione: 'Neurologia',
      avatarDataUrl: null,
      active: true,
      mustChangePassword: false,
      twoFactorEnabled: true,
      assignedTypes: [],
    },
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard professionista' })).toBeVisible();
  await attachScreenshot(page, testInfo, 'phase2b5b-professionista-archive.png');
});
