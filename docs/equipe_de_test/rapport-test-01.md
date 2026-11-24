# Rapport de test n°1 — Plateforme Lendhome

**Projet :** Plateforme collaborative de réservation de salles et de prêt de matériel
**Date du test :** 24 novembre 2026
**Type d'audit :** Test fonctionnel + vérification d'architecture
**Version auditée :** commit `24243eb` (branche `develop`)

---

## 1. Équipe de test

| Nom                    | Rôle                                              |
| ---------------------- | ------------------------------------------------- |
| **AZONOUTSOU KOSSI**   | Responsable du test / Vérificateur d'architecture |
| SABA Akouété Felicio   | Membre de l'équipe test                           |
| TCHASSAMA Noumane      | Membre de l'équipe test                           |
| KAKPOVI Nadia          | Membre de l'équipe test                           |
| AGBOFIN MOISE          | Membre de l'équipe test                           |
| DZIWONU Adjo Priscille | Membre de l'équipe test                           |

---

## 2. Résumé exécutif

| Contrôle                           | Résultat                                  |
| ---------------------------------- | ----------------------------------------- |
| TypeScript (`npm run typecheck`)   | ✅ Conforme                               |
| ESLint                             | ✅ Conforme                               |
| Prettier (`npm run lint`)          | ❌ Échec en environnement Windows (CRLF)  |
| Tests unitaires Vitest (17 tests)  | ✅ Tous réussis                           |
| Build production (`npm run build`) | ✅ Réussi (warnings cosmétiques)          |
| Tests E2E Playwright               | ⚠️ Non exécutés en CI                     |
| Mode mock (MSW)                    | ❌ Plusieurs parcours cassés              |
| Temps réel (Socket.IO)             | ❌ Code non monté                         |
| Responsive mobile                  | ❌ Menu profil / déconnexion inaccessible |

**Verdict :** Le socle technique est sain (typage strict, architecture par features,
couche API unique), mais le projet **n'est pas livrable en l'état** : le mode mock —
qui sert de filet de développement et de démo — est cassé sur plusieurs parcours
majeurs, et deux bugs bloquants affectent l'expérience mobile et le temps réel.

---

## 3. Environnement de test

- OS : Windows (Git Bash), `core.autocrlf=true`
- Node.js : ≥ 20 (workspaces npm), npm workspaces (`apps/*`, `packages/*`)
- Commandes exécutées : `npm run typecheck`, `npm run lint`, `npm run test`,
  `npm run build`

### 3.1 Outils et dépendances utilisés par le projet

| Outil                            | Version        | Rôle                                                   |
| -------------------------------- | -------------- | ------------------------------------------------------ |
| React / react-dom                | 18.3           | UI                                                     |
| TypeScript                       | ~5.6           | Typage strict                                          |
| Vite                             | ^5.4           | Build / dev server                                     |
| React Router                     | ^6.28          | Routage + gardes de rôle                               |
| TanStack Query                   | ^5.62          | Cache serveur, mutations                               |
| Zustand                          | ^5.0           | État client (auth, UI)                                 |
| React Hook Form + Zod            | ^7.54 / ^3.24  | Formulaires + validation                               |
| Tailwind CSS                     | ^3.4           | Styles utilitaires                                     |
| MSW                              | ^2.7           | Mock de l'API (mode `VITE_USE_MOCKS`)                  |
| socket.io-client                 | ^4.8           | Temps réel (actuellement non monté)                    |
| Recharts                         | ^2.15          | ⚠️ Installé mais **jamais utilisé** (dépendance morte) |
| Vitest + Testing Library         | ^2.1 / ^16     | Tests unitaires                                        |
| Playwright                       | ^1.49          | Tests E2E (non exécutés en CI)                         |
| ESLint + typescript-eslint       | ^9.17 / ^8.18  | Qualité statique                                       |
| Prettier                         | ^3.4           | Formatage                                              |
| Husky + commitlint + lint-staged | ^9 / ^19 / ^17 | Git hooks + conventions de commit                      |

---

## 4. Constats critiques (bloquants)

### 4.1 Mode mock MSW désynchronisé du contrat backend

Le commit `24243eb` (« connexion à l'API backend réelle ») a fait évoluer le
contrat d'API côté frontend sans mettre à jour les handlers MSW
(`onUnhandledRequest: 'bypass'` → les requêtes non mockées partent sur le réseau
réel et échouent).

| #   | Fonctionnalité                    | Appel frontend                             | Handler MSW                                                          | Impact                                                                   |
| --- | --------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| C1  | Liste des réservations            | `GET /api/reservations` (tableau attendu)  | renvoie `{ items: [...] }`                                           | Crash `raw.map is not a function` — `features/reservations/api.ts:17-19` |
| C2  | Marquer une notification lue      | `PATCH /api/notifications/:id/read`        | `POST` uniquement                                                    | Échec 404 — `features/notifications/api.ts:24`                           |
| C3  | Collaboration (annonces/messages) | `/api/collaboration/resources/:id/...`     | `/api/resources/:id/announcements`, `/api/announcements/:id/replies` | Section entièrement cassée sur `ResourceDetailPage`                      |
| C4  | Création salle / équipement       | `POST /api/resources/rooms`, `/equipments` | Aucun handler                                                        | Création de ressource impossible en mock                                 |
| C5  | Upload de photo                   | `POST /api/files/upload`                   | Aucun handler                                                        | Upload impossible en mock                                                |
| C6  | Statistiques dashboard            | `GET /api/admin/stats`                     | Seulement `/api/stats/overview`                                      | `.catch(() => undefined)` masque l'erreur → stats vides                  |

> **Note de méthode :** les tests `src/mocks/api.test.ts` testent les handlers MSW
> directement, pas la couche `features/*/api.ts`. Le mismatch frontend/mock
> n'est donc pas détecté. Le test E2E `e2e/demo.spec.ts` existe mais n'est pas
> exécuté en CI.

### 4.2 Menu profil inaccessible sur mobile

Le markup du menu déroulant est à l'intérieur de l'`<aside>` portant
`hidden lg:flex`. Le bouton avatar mobile bascule bien `menuOpen`, mais aucun
menu ne s'affiche : **il est impossible de se déconnecter depuis un mobile**.
— `app/layout.tsx:87-139`

### 4.3 Temps réel non activé

`useRealtime()` (`hooks/useRealtime.ts`) n'est appelé nulle part dans
l'application : aucune invalidation de cache sur événements socket, aucun toast
de notification temps réel. Toute la couche `lib/socket.ts` est du code mort.
Seul un polling de 60 s subsiste côté notifications.

---

## 5. Constats importants (non bloquants)

| #   | Constat                            | Détail                                                                                                                                                                                                          |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | `RealSocketClient.on()` défectueux | L'unsubscribe appelle `socket.off(event)` qui supprime **tous** les listeners de l'événement — `lib/socket.ts:134-137`                                                                                          |
| I2  | `npm run lint` échoue sous Windows | `core.autocrlf=true` → fins de ligne CRLF ; Prettier sans `endOfLine` ni `.gitattributes` → 96 fichiers flaggés. La CI Ubuntu passe, tout dev Windows est bloqué                                                |
| I3  | Double `.env.example`              | Le fichier racine est trompeur : Vite ne lit que `apps/web/.env`                                                                                                                                                |
| I4  | Token JWT en `localStorage`        | Exposition XSS ; à documenter ou migrer vers cookie `httpOnly` côté backend                                                                                                                                     |
| I5  | Couverture de tests faible         | 17 tests uniquement (mocks + LoginPage) ; guards, ErrorBoundary, formulaires et pages non couverts                                                                                                              |
| I6  | Tests E2E absents de la CI         | `.github/workflows/ci.yml` : lint + typecheck + tests + build, pas de Playwright                                                                                                                                |
| I7  | Warnings build Vite                | Imports dynamiques/statiques mixtes de `api.ts` et `stores/auth.ts` via `main.tsx` (cosmétique)                                                                                                                 |
| I8  | README non professionnel           | Nom incohérent avec l'UI (« Lendhome »), pas de badges/prérequis/architecture/tests/contribution/licence ; outils non documentés ; FullCalendar annoncé mais absent, Recharts installé mais inutilisé — voir §9 |
| I9  | Dépendances mortes                 | `recharts` installée sans usage ; `socket.io-client` utilisé mais jamais monté                                                                                                                                  |

---

## 6. Points forts constatés

- Architecture modulaire propre : `features/*` avec `api.ts` / `hooks.ts` /
  `pages` par domaine, design system `components/ui`, couche d'adaptation
  backend explicite (`lib/backend.ts`).
- `lib/api.ts` : client unique, erreurs typées `ApiError`, gestion centralisée
  du 401 (purge token + logout + redirection avec `state.from`).
- Gardes de rôle correctes et hiérarchiques (`ROLE_RANK` dans `app/guards.tsx`).
- `docs/api-assumptions.md` documente honnêtement les endpoints à valider
  avec l'équipe backend.
- CI complète, Husky + commitlint + lint-staged, aucun secret commité.
- Accessibilité soignée (labels, `aria-expanded`, navigation clavier sur les
  menus, contrastes).

---

## 7. Comparatif : architecture documentée vs implémentée

Source de référence : `Architecture_plateforme_fablab.pdf` (v1.0, 19/11/2026,
équipes d'architecture et de test : SABA, TCHASSAMA, KAKPOVI, AGBOFIN,
**AZONOUTSOU Kossi**, DZIWONU).

### 7.1 Structure du monorepo

| Documenté                         | Réalité dans le repo             | Écart                                                                   |
| --------------------------------- | -------------------------------- | ----------------------------------------------------------------------- |
| `apps/web`                        | ✅ Présent                       | Conforme                                                                |
| `apps/api` (NestJS)               | ❌ Absent du repo                | Backend externe, non versionné ici — normal si repo séparé, à confirmer |
| `packages/shared`                 | ✅ Présent (types + schémas Zod) | Conforme                                                                |
| `infra/` (docker, nginx, compose) | ❌ Absent                        | Aucun Dockerfile, ni compose, ni config nginx dans le repo              |
| `docs/`                           | ✅ Présent                       | Conforme                                                                |

### 7.2 Routes API : doc vs frontend

| Route documentée                                                                    | Utilisée par le front                                                  | Statut                                                                                                                                       |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/login`, `/logout`, `GET /api/me`                                    | ✅ Oui                                                                 | Conforme                                                                                                                                     |
| `GET /api/locations`, `/resources`, `/resources/:id`, `/resources/:id/availability` | ✅ Oui                                                                 | Conforme                                                                                                                                     |
| `GET/POST /api/reservations`, `GET/PATCH /:id`, `POST /:id/cancel`                  | ✅ Oui                                                                 | Conforme                                                                                                                                     |
| `POST /api/reservations/:id/approve` et `/reject`                                   | ✅ Oui (front + mocks)                                                 | ⚠️ **Absent de la doc** — le doc prévoit `PATCH /:id` avec `{ status }`. Endpoint inventé, à faire valider par le backend                    |
| `GET/POST /api/loans`, `POST /:id/return`                                           | ✅ Oui                                                                 | Conforme                                                                                                                                     |
| `POST /api/loans/:id/checkout`                                                      | ❌ Non utilisé par le front                                            | Endpoint mock orphelin (doc : « enregistrer les retours » ; validation des demandes de prêt côté manager non exposée — **question ouverte**) |
| `GET /api/notifications`                                                            | ✅ Oui                                                                 | Conforme                                                                                                                                     |
| `PATCH /api/notifications/:id/read`, `POST /read-all`                               | ✅ Oui (front)                                                         | ⚠️ **Absents de la doc** — mock en `POST` seulement, incohérence interne front/mock (constat C2)                                             |
| `POST /api/chatbot/message`                                                         | ✅ Oui                                                                 | Conforme                                                                                                                                     |
| `GET /api/health`                                                                   | ❌ Non appelé par le front                                             | Prévu pour le load balancer — normal                                                                                                         |
| Module « Collaboration » (annonces/échanges)                                        | Front : `/api/collaboration/resources/:id/announcements` + `/messages` | ⚠️ **Routes inventées**, non documentées ni mockées (constat C3)                                                                             |
| Module « Fichiers»                                                                  | Front : `POST /api/files/upload`                                       | ⚠️ Route plausible (module `files/` documenté) mais non spécifiée ni mockée (constat C5)                                                     |
| `GET /api/admin/stats` vs `/api/stats/overview`                                     | Les deux existent (dashboard vs mocks)                                 | ⚠️ **Double convention** front/mock à unifier                                                                                                |
| `GET /api/users`, `PATCH /api/users/:id`, `GET /api/audit-logs`                     | ✅ Oui (admin)                                                         | Non détaillés dans la doc §8 mais collection `auditLogs` prévue — à confirmer                                                                |
| Liste d'attente des réservations (§5)                                               | ❌ Aucune implémentation front                                         | **Écart fonctionnel** documenté mais non livré                                                                                               |
| Module « Organisations »                                                            | ❌ Front n'appelle que `/api/locations`                                | Partiellement couvert                                                                                                                        |

### 7.3 Exigences transverses

| Exigence documentée                                | État constaté                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| WebSocket / Socket.IO temps réel                   | ⚠️ Client implémenté (`lib/socket.ts`) mais `useRealtime()` jamais monté → temps réel **inactif** (constat 4.3) |
| Redis pour événements multi-instances              | Non vérifiable côté front (backend)                                                                             |
| Load balancer / autoscaling / health checks        | Non vérifiable — `infra/` absente du repo                                                                       |
| Chatbot via backend, jamais de clé côté navigateur | ✅ Conforme (proxy `POST /api/chatbot/message`)                                                                 |
| Validation des conflits côté backend (§4)          | ✅ Principe respecté (le front relaie les 409)                                                                  |
| Notifications e-mail                               | Non vérifiable côté front                                                                                       |

### 7.4 Synthèse

L'architecture **documentée** (monorepo complet + backend NestJS + MongoDB +
Redis + Socket.IO + LB) est cohérente avec ce que le frontend attend, **à
l'exception de plusieurs routes inventées** (`/approve`, `/reject`,
`/notifications/:id/read`, `/collaboration/*`, `/files/upload`, stats) qui
doivent être arbitrées avec l'équipe backend avant mise en production.
Le repo ne contient que `apps/web` + `packages/shared` : si `apps/api` et
`infra/` existent ailleurs, leur absence ici est normale ; sinon, ils sont à
créer.

---

## 8. Conformité aux normes et bonnes pratiques

### 8.1 Ce qui est conforme

| Norme / bonne pratique                                                                   | État                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------ |
| Séparation des couches (client HTTP unique, métier côté backend, adaptateurs de contrat) | ✅ `lib/api.ts`, `lib/backend.ts`    |
| REST + WebSocket avec rôles distincts (§10 du dossier d'architecture)                    | ✅ Prévu et implémenté côté client   |
| Le navigateur ne communique jamais avec la base de données (§4)                          | ✅ Tout passe par l'API              |
| Chatbot sans clé secrète côté navigateur (§11)                                           | ✅ Proxy `POST /api/chatbot/message` |
| Validation des données (Zod côté front, erreurs 409/422 relayées)                        | ✅ `packages/shared`, `ApiError`     |
| Monorepo + package partagé (contract-first)                                              | ✅ `packages/shared`                 |
| Git propre (Conventional Commits, husky, commitlint, lint-staged)                        | ✅                                   |
| CI (lint + typecheck + tests + build)                                                    | ✅ `.github/workflows/ci.yml`        |
| Accessibilité (WCAG AA : labels, aria, navigation clavier)                               | ✅ Globalement respecté              |

### 8.2 Écarts par rapport aux normes

| #   | Écart                                                                                                                                                                                            | Gravité |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| N1  | **Contrat API non figé** : ~7 routes inventées côté front (`/approve`, `/reject`, `/notifications/:id/read`, `/collaboration/*`, `/files/upload`, stats) sans validation backend ni spec OpenAPI | 🔴      |
| N2  | **Enveloppes de réponse incohérentes** : `{ items }` vs tableau brut (`/api/reservations`) selon les endpoints — une API REST sérieuse impose un format unifié                                   | 🟠      |
| N3  | **Pas de spec OpenAPI/Swagger** ni tests de contrat (Pact) entre front et back                                                                                                                   | 🟠      |
| N4  | **Infra non versionnée** : `infra/` (Docker, nginx, compose) documentée mais absente du repo → déploiement non reproductible                                                                     | 🟠      |
| N5  | **Token JWT en `localStorage`** : vulnérable au XSS ; la norme moderne recommande cookie `httpOnly` + refresh token rotatif                                                                      | 🟡      |
| N6  | **Pas de versioning d'API** au-delà du préfixe `/api`                                                                                                                                            | 🟡      |
| N7  | **Temps réel mort** : Socket.IO documenté et implémenté mais jamais monté                                                                                                                        | 🔴      |
| N8  | **Pagination** : enveloppes `{ items }` sans `page`/`total` uniforme — à vérifier côté backend                                                                                                   | 🟡      |
| N9  | **RBAC front = UX seulement** : conforme à la norme _si_ chaque endpoint re-vérifie les droits côté backend (prévu §4, non vérifiable ici)                                                       | ℹ️      |

**Verdict conformité :** l'architecture respecte les grandes lignes du dossier
d'architecture (SPA React + API REST + WebSocket + MongoDB + Redis, monorepo,
package partagé), mais **n'est pas encore contract-first** : contrat flou,
enveloppes incohérentes, absence de spec formelle et d'infra-as-code.

---

## 9. Documentation & qualité des livrables

### 9.1 README non professionnel

Le `README.md` racine est **insuffisant pour un projet de cette envergure** :

- **Nom incohérent** : le `package.json` racine s'appelle `plateforme-fablab` et
  le README « Plateforme collaborative de réservation… » — le projet est
  présenté comme « Lendhome » dans l'UI mais jamais défini dans le README.
- **Pas de badges** (CI status, version, licence).
- **Pas de section « Architecture »** : la structure documentée (§6 du dossier
  d'architecture : `apps/api`, `infra/`, etc.) n'est pas reflétée ni expliquée.
- **Pas de prérequis** détaillés (version Node exacte, gestionnaire de paquets,
  backend requis ou non).
- **Pas de documentation des outils** : aucune mention de MSW, des comptes de
  démo contextuels, de Playwright, des variables d'environnement complètes,
  ni des scripts disponibles au-delà d'une liste brute.
- **Pas de section Tests / Contribution / Licence / Contact équipe**.
- **Pas de lien vers les documents de l'équipe** (`docs/equipe_de_test/`,
  `Architecture_plateforme_fablab.pdf`, `api-assumptions.md`).

### 9.2 Outils utilisés non renseignés

| Outil / dépendance                                   | Documenté ?                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| React, TypeScript, Vite                              | ✅ Partiellement (stack listée)                                                                         |
| React Router, TanStack Query, Zustand                | ✅ Listés mais sans rôle expliqué                                                                       |
| Zod / React Hook Form                                | ✅ Mentionnés                                                                                           |
| Tailwind CSS                                         | ✅ Mentionné (« composants accessibles maison »)                                                        |
| **FullCalendar**                                     | ❌ Annoncé dans le README mais **ni installé ni utilisé** (page calendrier custom) — dépendance fantôme |
| **socket.io-client**                                 | ✅ Listé — mais non fonctionnel (constat 4.3)                                                           |
| **MSW**                                              | ✅ Mentionné en une ligne, sans expliquer le mode mock ni ses limites actuelles                         |
| **Recharts**                                         | ❌ **Installé (`package.json`) mais jamais importé** — dépendance morte                                 |
| **Vitest / Testing Library / Playwright**            | ✅ Listés dans la stack, section Scripts ok                                                             |
| **Husky, commitlint, lint-staged, ESLint, Prettier** | ❌ **Aucun outillage qualité mentionné**                                                                |
| **Docker / déploiement**                             | ❌ Jamais abordé (alors que le dossier d'architecture le prévoit)                                       |

### 9.3 Recommandations documentation

1. Réécrire le README : badges CI, synopsis, prérequis (Node ≥ 20, npm),
   démarrage (mock vs backend réel), comptes de démo, scripts, architecture
   (lien vers le PDF), tests, contribution, licence.
2. Ajouter un `CONTRIBUTING.md` et documenter la chaîne d'outils
   (lint-staged → commitlint → CI).
3. Centraliser les variables d'environnement : **un seul** `.env.example`
   (dans `apps/web`) documenté ligne par ligne.
4. Créer `docs/ARCHITECTURE.md` reprenant le schéma du dossier d'architecture
   adapté à l'état réel du repo.
5. Lier `docs/api-assumptions.md` depuis le README (endpoints à valider).

---

## 10. Plan d'action recommandé

| Priorité | Action                                                                                     | Responsable proposé |
| -------- | ------------------------------------------------------------------------------------------ | ------------------- |
| P0       | Resynchroniser les handlers MSW avec le contrat backend réel (C1–C6)                       | Dev frontend        |
| P0       | Monter `useRealtime()` dans `AppLayout` ou `Providers`                                     | Dev frontend        |
| P0       | Corriger le menu profil mobile (sortir le dropdown de l'`<aside>` masqué)                  | Dev frontend        |
| P1       | Ajouter `"endOfLine": "lf"` à `.prettierrc.json` + `.gitattributes` (`* text=auto eol=lf`) | DevOps              |
| P1       | Ajouter `test:e2e` (au minimum `demo.spec.ts`) à la CI                                     | DevOps              |
| P1       | Corriger `RealSocketClient.on()` (supprimer le listener ciblé, pas tout l'event)           | Dev frontend        |
| P2       | Ajouter des tests sur guards, mutations et pages principales                               | Équipe test         |
| P2       | Clarifier la documentation `.env` (un seul fichier, à la racine de `apps/web`)             | Tech lead           |
| P2       | Faire valider par le backend les endpoints listés dans `docs/api-assumptions.md`           | Product owner       |
| P2       | Réécrire le README (badges, prérequis, architecture, tests, contribution, licence)         | Tech lead           |
| P2       | Produire une spec OpenAPI du contrat API et unifier les enveloppes de réponse              | Backend + Tech lead |
| P3       | Versionner `infra/` (Dockerfile, compose, nginx) conformément au dossier d'architecture    | DevOps              |

---

## 11. Critères de recette pour le prochain test

- [ ] `npm run lint` passe sur un poste Windows fraîchement cloné
- [ ] Parcours complet fonctionnel en `VITE_USE_MOCKS=true` : login → réservation →
      prêt → notification → collaboration → admin
- [ ] Déconnexion possible sur viewport 375 px
- [ ] Notifications temps réel visibles sans rechargement (mode socket réel)
- [ ] `npm run test:e2e` vert en CI

---

_Rapport établi par **AZONOUTSOU KOSSI** — Responsable du test & vérification
d'architecture._
