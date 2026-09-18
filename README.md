# Punitions ISL

Projet complet HTML/CSS/JavaScript + Node.js/Express + SQLite + Web Push.

## 1. Tester sur PC
1. Installer Node.js.
2. Dans ce dossier : `npm install`
3. Créer les clés VAPID :
   `npx web-push generate-vapid-keys`
4. Définir les variables d'environnement :
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (ex. `mailto:admin@ton-domaine.be`)
5. Lancer : `npm start`
6. Ouvrir `http://localhost:3000`.

## 2. Notifications Android
Les Web Push nécessitent HTTPS en production (localhost est l'exception pour le développement).
1. Héberger le serveur sur une URL HTTPS.
2. Ouvrir cette URL dans Chrome Android.
3. Appuyer sur « 🔔 Activer les notifications ».
4. Autoriser les notifications.
5. Le navigateur enregistre l'abonnement Push. Quand une punition est ajoutée, le serveur envoie une notification.

Si Chrome demande l'autorisation, choisir « Autoriser ». Si les notifications sont bloquées : Chrome > ⋮ > Paramètres > Paramètres des sites > Notifications, puis autoriser le site.

## 3. Hébergement
Pour un vrai usage avec SQLite + Web Push, choisir un hébergeur qui permet un serveur Node.js et un stockage persistant (ou remplacer SQLite par une base cloud). Un hébergement serverless pur comme GitHub Pages ne peut pas exécuter `server.js`, donc il ne suffit pas pour ce projet.

## Sécurité
Ce projet est un prototype fonctionnel. Pour des données réelles d'élèves, ajoute avant mise en production une authentification, des comptes enseignants, des droits d'accès, HTTPS, sauvegardes et une politique de conservation des données adaptée à ton établissement. Ne publie pas de données d'élèves dans une démo publique.
