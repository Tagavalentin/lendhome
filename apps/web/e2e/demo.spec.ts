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
    await page.getByRole('link', { name: 'Ressources' }).first().click();
    await page.getByLabel('Recherche').fill('Agora');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    await expect(page.getByRole('link', { name: /Salle de réunion Agora/i })).toBeVisible();

    // 3. Fiche + disponibilités
    await page
      .getByRole('link', { name: /Salle de réunion Agora/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: 'Salle de réunion Agora' })).toBeVisible();
    await page.getByRole('link', { name: 'Réserver' }).click();
    await expect(page).toHaveURL(/disponibilite/);
    await expect(page.locator('.fc')).toBeVisible();

    // 4. Réservation via formulaire (dates explicites)
    await page.locator('.fc').click({ position: { x: 200, y: 200 } });
    const start = page.getByLabel('Début');
    // Jour sans réservation seedée (les mocks occupent demain 10h-11h).
    const slotDay = new Date(Date.now() + 10 * 86400_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${slotDay.getFullYear()}-${pad(slotDay.getMonth() + 1)}-${pad(slotDay.getDate())}`;
    await start.fill(`${dateStr}T10:00`);
    await page.getByLabel('Fin').fill(`${dateStr}T11:00`);
    await page.getByLabel('Titre').fill('Réservation E2E');
    await page.getByLabel('Motif').fill('Test automatisé');
    await page.getByRole('button', { name: 'Réserver', exact: true }).click();

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
