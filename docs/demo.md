# Déroulé de la démonstration finale

Prérequis : `npm install && npm run dev` (mode mock, `VITE_USE_MOCKS=true`).
Ouvrir l'application dans **deux onglets** pour montrer le temps réel.

## Comptes

| Rôle           | Compte         | Mot de passe |
| -------------- | -------------- | ------------ |
| Utilisateur    | alice@demo.fr  | demo1234     |
| Responsable    | claire@demo.fr | demo1234     |
| Administrateur | david@demo.fr  | demo1234     |

## Scénario pas à pas

### 1. Connexion (30 s)

- Aller sur `/login`, saisir `alice@demo.fr` / `demo1234` (ou cliquer la puce
  « Utilisateur »).
- Montrer la redirection vers le tableau de bord, le badge de connexion
  temps réel (« Connecté ») et la cloche de notifications.

### 2. Recherche d'une ressource (1 min)

- Menu **Ressources** → rechercher « imprimante » ou filtrer par type
  « Équipement » / lieu.
- Montrer la bascule grille/liste et la pagination.
- Ouvrir la fiche « Imprimante 3D Prusa MK4 » : photos, n° d'inventaire,
  état, règles d'utilisation, section annonces.

### 3. Consultation de la disponibilité (1 min)

- Depuis la fiche, cliquer **Réserver** (pour une salle, ex. « Salle de
  réunion Agora ») ou **Disponibilités**.
- Montrer le calendrier FullCalendar : événements colorés par statut
  (ambre = en attente, vert = approuvée, gris = annulée), vues
  jour/semaine/mois/liste.

### 4. Création d'une réservation (2 min)

- Cliquer/glisser un créneau libre → le formulaire s'ouvre pré-rempli.
- Remplir titre, motif, participants → **Réserver**.
- Variante : cliquer sur un créneau occupé ou réessayer le même créneau →
  message « Créneau déjà pris » (erreur 409 gérée).

### 5. Visibilité dans le calendrier (30 s)

- La nouvelle réservation apparaît immédiatement (vert si approuvée
  automatiquement, ambre si la salle exige une validation).

### 6. Notification temps réel (1 min)

- **Onglet 2** : se connecter en `claire@demo.fr` (responsable).
- **Onglet 1** : créer une réservation sur une salle à validation requise
  (« Atelier Fabrique »).
- Onglet 2 : la cloche affiche le badge de non-lues et un toast apparaît,
  **sans rechargement** (Socket.IO mock via BroadcastChannel).
- Le responsable approuve depuis `/reservations` → l'utilisateur reçoit une
  notification « Réservation approuvée ».

### 7. Modification / annulation (1 min)

- Onglet 1 (`alice`) : **Mes réservations** → Modifier (changer l'horaire)
  puis Annuler avec confirmation.
- L'événement disparaît du calendrier (statut annulée, grisé).

### 8. Prêt de matériel (2 min)

- Alice : fiche « Découpeuse laser xTool » → **Emprunter** → dates de
  sortie/retour → envoyer la demande.
- Claire : **Prêts à traiter** → « Remettre le matériel » puis, au retour,
  « Enregistrer le retour » avec l'état du matériel.
- Alice : **Mes prêts** reflète les changements.

### 9. Chatbot (1 min)

- Ouvrir l'assistant (bouton 💬 en bas à droite), taper « une salle de
  réunion » → cartes de ressources cliquables.
- Taper « réserver la salle agora » → proposition de créneau avec carte de
  confirmation : **rien n'est créé sans cliquer Confirmer**.

### 10. Administration (1 min, compte david@demo.fr)

- **Administration** : lister les utilisateurs, changer un rôle.
- **Journal d'audit** : filtrer par action/utilisateur, pagination.
- Tableau de bord : statistiques et graphique sur 7 jours.

## Points à vérifier en revue

- Navigation clavier (Tab) sur login, formulaires, modales (Échap ferme).
- Mode mobile (375 px) : menu horizontal, tableaux scrollables.
- Déconnexion → retour `/login` ; token expiré → 401 → reconnexion.
