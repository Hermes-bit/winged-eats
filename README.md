# Winged Eats

Application de commande de repas et de livraison à Ouagadougou et Bobo-Dioulasso (Burkina Faso). Module restaurants en version MVP ; pharmacies de garde et mobilité sont prévues après validation.

**Maquette en ligne** : https://hermes-bit.github.io/winged-eats/ (branche `gh-pages`, source : [maquettes/maquette-winged-eats.html](maquettes/maquette-winged-eats.html)). L'application reprend ce design.

Dans l'application, les écrans suivants sont des **démonstrations**, clairement signalées :
- paiement Orange Money et Moov Money ;
- vérification par SMS ;
- application livreur ;
- abonnements restaurant et livreur.

Ces fonctions attendent des comptes marchands (Orange, Moov) et un fournisseur SMS. Aujourd'hui, le paiement se fait en espèces à la livraison.

## Prérequis
- Node.js 22.13 ou plus récent (version testée : 24.14.0).
- Windows PowerShell ou tout terminal.

## Installation et lancement
```powershell
npm install
npm test
npm start
```

Au premier démarrage, la base de démonstration est créée et les **codes partenaires** sont affichés une seule fois. Notez-les.

- Client : http://localhost:3000/client/
- Partenaire (restaurant) : http://localhost:3000/partner/ (connexion avec le code affiché)

## Structure
- `server/` : API Express, logique métier (prix, commandes, statuts), base SQLite.
- `web/client/` : interface client mobile.
- `web/partner/` : interface restaurateur.
- `test/` : tests de règles métier (`npm test`).
- `docs/` : feuille de route, cadrage MVP, design UI (charte Burkina Faso, écrans, catégorisation des données), guide pour les prochains projets.
- `maquettes/MAQUETTES_UI.html` (et `.pdf`) : 11 écrans mobiles dans la charte appliquée à l'app.
- `SPECIFICATIONS.md`, `MAQUETTES.html` : spécification fonctionnelle et première maquette (version orange, remplacée par `maquettes/`).

## Configuration
Les tarifs et paramètres sont dans [server/config.js](server/config.js) : frais de livraison, rayon, commission par défaut, longueur du code de remise.

### Restaurants réels et carte Google (facultatif)
Les clés se collent dans le fichier **`.env`** à la racine du projet. Il n'est jamais versionné ; le modèle est `.env.example`.
```
GOOGLE_PLACES_API_KEY=...     # clé serveur : Places API (New)
GOOGLE_MAPS_BROWSER_KEY=...   # clé navigateur : Maps JavaScript API (fond de carte)
```
Redémarrez `npm start` après chaque modification.

Dans Google Cloud :
- activez « Places API (New) » et « Maps JavaScript API » ;
- liez un **compte de facturation** au projet. Sans facturation, Google renvoie les restaurants sans leurs photos ni leurs avis ;
- restreignez la clé navigateur à Maps JavaScript API et au domaine du site.

Fonctionnement :
- Les restaurants de Ouagadougou sont demandés **en direct** à Google : populaires autour de l'adresse, par catégorie, ou par recherche. Rien n'est enregistré en base, conformément aux conditions de Google Maps Platform. C'est pourquoi photos, notes et horaires restent toujours à jour.
- Ils sont classés dans des catégories façon plateforme de livraison : Maquis, Grillades, Africaine, Fast-food, Pizza, Chawarma, Asiatique, Européenne, Café, Boulangerie, Desserts.
- Ce sont des fiches vitrines (appeler, itinéraire) avec la mention « Bientôt sur Winged Eats ». Seuls les restaurants partenaires sont commandables.
- Chaque affichage consomme des appels facturés au-delà du quota gratuit de Google. Deux plafonds protègent la facture : `GOOGLE_MAX_CALLS_PER_MINUTE` et `GOOGLE_MAX_CALLS_PER_DAY`.
- Sans clé, l'application fonctionne avec ses seules données et un plan simplifié.

## Limites actuelles
- Paiement en espèces uniquement.
- Distance à vol d'oiseau (pas d'itinéraire routier).
- Authentification partenaire par code (pas de comptes utilisateurs).
- Restaurants commandables : uniquement les partenaires de la base (démo pour l'instant). Il manque encore un outil d'inscription des restaurants partenaires (menu, code).

## Données locales
La base est créée dans `data/winged_eats.db`. Ce dossier ne doit pas être versionné.
