// Smoke test : parcourt toutes les pages et remonte les erreurs console/page.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ACCOUNTS = [
  ['alice@demo.fr', 'user'],
  ['claire@demo.fr', 'manager'],
  ['david@demo.fr', 'admin'],
];

const ROUTES = ['/', '/ressources', '/mes-reservations', '/mes-prets', '/notifications'];
const MANAGER_ROUTES = ['/reservations', '/prets'];
const ADMIN_ROUTES = ['/admin', '/admin/audit', '/admin/parametres'];

const errors = [];

async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).fill('demo1234');
  await page.getByRole('button', { name: /connecter/i }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
}

async function visit(page, route) {
  const msgs = [];
  const onConsole = (m) => {
    if (m.type() === 'error') msgs.push(`console: ${m.text()}`);
  };
  const onPageError = (e) => msgs.push(`pageerror: ${e.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  if (msgs.length || !resp || resp.status() >= 400) {
    errors.push({ route, status: resp?.status(), msgs });
  }
  console.log(`${resp?.status()} ${route}${msgs.length ? '  <-- ERREURS' : ''}`);
  msgs.forEach((m) => console.log('   ', m.slice(0, 300)));
}

const browser = await chromium.launch();
const page = await browser.newPage();

for (const [email, role] of ACCOUNTS) {
  console.log(`\n=== ${email} (${role}) ===`);
  await login(page, email);

  const routes = [...ROUTES];
  if (role !== 'user') routes.push(...MANAGER_ROUTES);
  if (role === 'admin') routes.push(...ADMIN_ROUTES);

  // fiche ressource + disponibilité via le premier lien de la liste
  await visit(page, '/ressources');
  const firstLink = page.locator('a[href^="/ressources/"]').first();
  if (await firstLink.count()) {
    const href = await firstLink.getAttribute('href');
    await visit(page, href);
    if (href) await visit(page, `${href}/disponibilite`);
  }

  for (const r of routes) await visit(page, r);

  await page.goto(`${BASE}/login`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

await browser.close();
console.log('\n===== RÉSUMÉ =====');
console.log(errors.length ? JSON.stringify(errors, null, 2) : 'Aucune erreur détectée.');
