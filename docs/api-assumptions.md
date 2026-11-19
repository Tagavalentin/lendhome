# Hypothèses de contrat API à valider avec l'équipe backend

Le contrat fourni ne couvre pas tout ce dont le frontend a besoin. Les endpoints
suivants sont **inventés côté mocks** et doivent être confirmés ou ajustés :

## 1. Notifications

Le contrat expose `GET /api/notifications` mais pas de marquage comme lu.
Implémenté côté mock :

- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

→ À confirmer : verbes HTTP, ou un `PATCH /api/notifications/:id` avec `{ read: true }` ?

## 2. Modération des réservations

Le contrat prévoit `PATCH /api/reservations/:id`. Le front utilise en plus :

- `POST /api/reservations/:id/approve`
- `POST /api/reservations/:id/reject` (body `{ reason?: string }`)

Alternative possible : `PATCH` avec `{ status: 'approved' | 'rejected', rejectionReason? }`.
→ À trancher avec le backend.

## 3. Prêts : remise du matériel

`POST /api/loans` crée une demande (`requested`). Pour passer en `active`, le mock
expose `POST /api/loans/:id/checkout` (non spécifié dans le contrat).
→ Confirmer le nom et l'existence de cet endpoint.

## 4. Annonces & fil d'échanges (feature collaboration)

Non spécifié dans le contrat. Endpoints mock :

- `GET /api/resources/:id/announcements` → `{ announcements, replies }`
- `POST /api/resources/:id/announcements` `{ title, body }`
- `POST /api/announcements/:id/replies` `{ body }`

→ À valider : modèle de données (annonces vs. commentaires plats), règles
d'« annonce officielle » (réservée manager/admin côté mock).

## 5. Administration & audit

Non spécifiés. Endpoints mock :

- `GET /api/users`, `PATCH /api/users/:id` `{ role?, firstName?, lastName? }`
- `GET /api/audit-logs?action=&userId=&from=&to=&page=&pageSize=` (paginé)
- `GET /api/stats/overview` (agrégats dashboard)
- CRUD partiel `GET /api/locations` (lecture seule côté front pour l'instant)

→ À confirmer : noms, pagination, forme des stats.

## 6. Chatbot

`POST /api/chatbot/message` : la forme de la réponse (`ChatResponse` avec
`resourceCards`, `slotSuggestions`, `actionProposal`) est une proposition
front — le backend devra renvoyer une structure compatible ou le front
adaptera.

## 7. Auth

- Login : `{ email, password }` → `{ user, tokens: { accessToken } }`.
- Token transporté en `Authorization: Bearer`.
- `GET /api/me` renvoie le profil courant.
- 401 → le front déconnecte et redirige vers `/login`.
- Pas de refresh token géré pour l'instant (session mock de 8 h).

## 8. Disponibilité

`GET /api/resources/:id/availability?from=&to=` renvoie des créneaux horaires
(`free | busy | closed | blocked`) avec `reason` optionnelle. Le front n'utilise
actuellement que les réservations pour le calendrier ; les slots servent de
secours visuel. → Confirmer la granularité attendue (horaire ? journalière ?).

## 9. Formats

- Dates : ISO 8601 (`new Date(iso)` côté front).
- Erreurs : `{ message: string }` ; le code HTTP porte la sémantique
  (401/403/404/409/422/500). Un `details`/`errors` par champ pour le 422
  serait le bienvenu (React Hook Form les afficherait champ par champ).
- Pagination : `{ items, total, page, pageSize }` partout où c'est paginé.
