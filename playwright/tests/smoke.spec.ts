import { expect, test } from '@playwright/test';

test('captures the reachable initial type-selection state', async ({ page }, testInfo) => {
  await page.route('http://localhost:4010/**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === '/auth/me') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthenticated' }),
      });
      return;
    }

    if (url.pathname === '/creation-access') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          allowed: true,
          allowedTypes: ['standard', 'emg', 'psg'],
        }),
      });
      return;
    }

    if (url.pathname === '/professionals') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
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
          ],
        }),
      });
      return;
    }

    if (url.pathname === '/refertatori') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'ref-1',
              email: 'refertatore@example.test',
              display_name: 'Dott. Marco Rossi',
              specializzazione: 'Neurologia',
              assignedTypes: ['emg', 'psg'],
            },
          ],
        }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Mock not configured for this endpoint' }),
    });
  });

  await page.goto('/?view=creation');

  await expect(
    page.getByRole('heading', { name: 'Scegli il percorso di refertazione' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Area riservata' })).toBeVisible();

  const screenshotPath = testInfo.outputPath('initial-type-selection.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach('initial-type-selection', {
    path: screenshotPath,
    contentType: 'image/png',
  });
});
