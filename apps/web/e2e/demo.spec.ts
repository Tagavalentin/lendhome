import { expect, test } from '@playwright/test';

// Scénario de démonstration : connexion → recherche → disponibilité →
// réservation → calendrier → notification → annulation.
// Nécessite `npx playwright install chromium` une fois.

test.describe('Scénario de démonstration', () => {
  test('connexion, recherche et réservation', async ({ page }) => {
    // 1. Connexion
    await page.goto('/login');
    await page.getByLabel(/adresse e-mail/i).fill('alice@demo.fr');
    await page.getByLabel(/mot de passe/i).fill('demo1234');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /bonjour/i })).toBeVisible();

    // 2. Recherche d'une salle
    await page
      .getByRole('link', { name: /Salles et matériel/i })
      .first()
      .click();
    await page.getByLabel(/rechercher/i).fill('Agora');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByRole('link', { name: /Salle de réunion Agora/i }).first()).toBeVisible();

    // 3. Fiche + disponibilités
    await page
      .getByRole('link', { name: /Salle de réunion Agora/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Salle de réunion Agora' })).toBeVisible();
    await page.getByRole('link', { name: 'Réserver' }).click();
    await expect(page).toHaveURL(/disponibilite/);
    await expect(page.getByText('Créneau').first()).toBeVisible();

    // 4. Réservation via le sélecteur de créneaux (dates explicites)
    const slotDay = new Date(Date.now() + 10 * 86400_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${slotDay.getFullYear()}-${pad(slotDay.getMonth() + 1)}-${pad(slotDay.getDate())}`;
    await page.locator('#slot-date').fill(dateStr);
    const freeSlot = page
      .locator('button[aria-pressed]:not([disabled])')
      .filter({ hasText: /\d{2}:\d{2} - \d{2}:\d{2}/ })
      .first();
    await freeSlot.click();
    await page.locator('#slot-title').fill('Réservation E2E');
    await page.locator('#slot-motif').fill('Test automatisé');
    await page.getByRole('button', { name: /Confirmer la réservation/i }).click();
    await expect(page.getByText('Réservation confirmée')).toBeVisible();

    // 5. La réservation apparaît dans « Mes réservations »
    await page.getByRole('link', { name: 'Mes réservations' }).first().click();
    await expect(page.getByText('Réservation E2E')).toBeVisible();
  });

  test('accès refusé pour un utilisateur sur une page admin', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/adresse e-mail/i).fill('alice@demo.fr');
    await page.getByLabel(/mot de passe/i).fill('demo1234');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/admin');
    await expect(page.getByText('Accès refusé')).toBeVisible();
  });
});
