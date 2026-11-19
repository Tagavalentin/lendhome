# Plateforme collaborative de réservation de salles et de prêt de matériel

Frontend (React + TypeScript) d'une plateforme de réservation de salles et de prêt de
matériel pour fablabs, campus et espaces collaboratifs.

## Stack

- **React 18 + TypeScript strict**, Vite
- **React Router** (routes protégées par rôle), **TanStack Query**, **Zustand**
- **React Hook Form + Zod** (schémas partagés dans `packages/shared`)
- **Tailwind CSS** + composants accessibles maison
- **FullCalendar** (jour / semaine / mois), **socket.io-client**, **MSW** (mocks),
  **Recharts**, **Vitest + Testing Library**, **Playwright**

## Démarrage

```bash
npm install
npm run dev          # http://localhost:5173 (mode mock par défaut)
```

Copier `.env.example` vers `.env` et adapter :

| Variable          | Rôle                                                                    |
| ----------------- | ----------------------------------------------------------------------- |
| `VITE_API_URL`    | URL de l'API REST (vide = same-origin, intercepté par MSW en mode mock) |
| `VITE_SOCKET_URL` | URL Socket.IO (vide = mock local BroadcastChannel)                      |
| `VITE_USE_MOCKS`  | `true` → MSW simule toute l'API                                         |

Le passage au vrai backend ne nécessite que de renseigner `VITE_API_URL`,
`VITE_SOCKET_URL` et `VITE_USE_MOCKS=false`.

## Comptes de démonstration

Mot de passe pour tous : `demo1234`

| Rôle           | E-mail                      |
| -------------- | --------------------------- |
| Utilisateur    | alice@demo.fr / ben@demo.fr |
| Responsable    | claire@demo.fr              |
| Administrateur | david@demo.fr               |

## Scripts

```bash
npm run dev          # dev server
npm run build        # build production
npm run typecheck    # tsc --noEmit (tous les workspaces)
npm run lint         # ESLint + Prettier
npm run test         # Vitest
npm run test:e2e     # Playwright
```

## Structure

```
apps/web/src/
  app/           providers, router, layout, gardes de rôle
  components/ui/ design system (Button, Modal, Table, Toast…)
  features/      auth, dashboard, resources, availability, reservations,
                 loans, notifications, collaboration, chatbot
  lib/           client API unique, client socket, utilitaires
  mocks/         handlers MSW + base en mémoire + événements socket
packages/shared/ types TypeScript + schémas Zod communs
docs/            api-assumptions.md, demo.md
```

## Stratégie Git

`main` (stable) ← `develop` (intégration) ← `feature/<nom>` (une branche par
fonctionnalité, mergée par PR, Conventional Commits, CI : lint + typecheck +
tests + build).

## Accessibilité & i18n

Interface en français, WCAG AA (labels, focus visible, navigation clavier,
contrastes), responsive mobile (375 px) et desktop.
