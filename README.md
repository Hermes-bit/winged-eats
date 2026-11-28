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

Les données de démonstration ne sont plus créées ni affichées par le serveur. Les données existantes ne sont pas effacées.

- Client : http://localhost:3000/client/
- Partenaire (restaurant) : http://localhost:3000/partner/ (nécessite un code partenaire réel)

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
- liez un **compte de facturation** au projet ;
- utilisez deux clés distinctes : la clé serveur pour Places API (New) et la clé navigateur pour Maps JavaScript API ;
- restreignez la clé navigateur aux sites `https://hermes-bit.github.io/*` et `https://winged-eats-1.onrender.com/*` et à Maps JavaScript API. Ne mettez pas cette clé restreinte aux sites dans `GOOGLE_PLACES_API_KEY`.

Fonctionnement :
- Les restaurants de Ouagadougou sont demandés **en direct** à Google : populaires autour de l'adresse, par catégorie, ou par recherche. Rien n'est enregistré en base, conformément aux conditions de Google Maps Platform. C'est pourquoi photos, notes et horaires restent toujours à jour.
- La recherche par quartier est déclenchée à la demande et paginée. Les résultats Google peuvent inclure des adresses voisines et ne constituent pas une liste exhaustive ni un découpage administratif vérifié. Chaque page supplémentaire consomme un appel.
- Sur GitHub Pages, la carte Google affiche au maximum 20 établissements par recherche. Déplacer la carte puis choisir « Rechercher dans cette zone » lance une nouvelle recherche ; Google ne garantit pas que tous les établissements soient répertoriés.
- Si la clé de carte manque ou est refusée, GitHub Pages utilise la carte et les établissements OpenStreetMap ; ces données ne sont pas mélangées aux données Google.
- GitHub Pages n'affiche plus les données ou commandes de démonstration ; les commandes et l'espace partenaire de cette version restent indisponibles.
- Les fiches suspectes sont examinées manuellement : après vérification, ajouter leur identifiant Google à `excluded_place_ids` ou leur identifiant OpenStreetMap (`node/…`, `way/…`, `relation/…`) à `excluded_osm_ids` dans `server/moderation.json`, puis redéployer. L'exclusion masque la fiche correspondante dans Winged Eats sans la modifier chez Google ou OpenStreetMap ; aucune fiche n'est exclue automatiquement.
- Ils sont classés dans des catégories façon plateforme de livraison : Maquis, Grillades, Africaine, Fast-food, Pizza, Chawarma, Asiatique, Européenne, Café, Boulangerie, Desserts.
- Ce sont des fiches vitrines (appeler, itinéraire) avec la mention « Bientôt sur Winged Eats ». Seuls les restaurants partenaires sont commandables.
- Le menu des établissements Google n'est pas garanti : la fiche propose le site du restaurant lorsqu'il est disponible, sinon Google Maps, et invite à contacter le restaurant. Aucun plat ni prix n'est inventé.
- Les favoris sont propres à chaque appareil. Pour les établissements Google, seul l'identifiant est enregistré localement ; les détails et les photos sont chargés à nouveau à l'ouverture des favoris.
- Chaque affichage consomme des appels facturés au-delà du quota gratuit de Google. Deux plafonds protègent la facture : `GOOGLE_MAX_CALLS_PER_MINUTE` et `GOOGLE_MAX_CALLS_PER_DAY`.
- Sans clé, l'application fonctionne avec ses seules données et un plan simplifié.

## Limites actuelles
- Paiement en espèces uniquement.
- Les frais affichés dans le panier sont estimés ; le serveur recalcule les prix et la livraison au moment de la commande. Le pourboire est facultatif et remis séparément en espèces.
- Distance à vol d'oiseau (pas d'itinéraire routier).
- Authentification partenaire par code (pas de comptes utilisateurs).
- Restaurants commandables : uniquement les partenaires de la base (démo pour l'instant). Il manque encore un outil d'inscription des restaurants partenaires (menu, code).

## Données locales
La base est créée dans `data/winged_eats.db`. Ce dossier ne doit pas être versionné.

## Administration des restaurants Google

L'interface privée est accessible sur `https://hermes-bit.github.io/winged-eats/admin/`.
Elle recherche les fiches Google par quartier et permet de masquer un restaurant ou
toutes ses photos, puis de retrouver et annuler les décisions enregistrées. Les
identifiants Google et les décisions sont conservés dans Supabase, pas les photos
ni les noms et adresses Google. Les photos Google ne disposent pas de référence
durable : le choix individuel d'une photo n'est pas proposé. Les décisions ne
modifient ni Google Maps ni le repli OpenStreetMap. Les listes déjà ouvertes
peuvent rester en mémoire jusqu'à cinq minutes ; actualiser l'application pour
voir immédiatement une décision. Les recherches et photos utilisent Google Places
et peuvent être facturées.

Pour activer l'administration :

1. Dans le projet Supabase Winged Eats, exécuter `docs/moderation-supabase.sql`
   dans le SQL Editor. La table est protégée par RLS ; ne pas créer de règle
   permettant à `anon` ou `authenticated` d'y écrire ou de la lire.
2. Dans Authentication > Users, créer l'unique compte administrateur avec un
   mot de passe solide et noter son identifiant UUID. Garder les inscriptions
   publiques désactivées si elles ne sont pas nécessaires.
3. Dans les variables d'environnement **privées** du service Render, ajouter
   ensemble `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   et `WINGED_ADMIN_USER_ID` (UUID du compte créé), puis redéployer. L'URL est
   de la forme `https://<project-ref>.supabase.co`. La clé `service_role` doit
   rester exclusivement sur le serveur, jamais dans le site, Git ou un message.
4. Se connecter à l'interface et vérifier le masquage puis la restauration d'une
   fiche. Sans configuration complète, l'administration est indisponible ; une
   erreur Supabase après activation empêche d'afficher les résultats Google au
   lieu d'ignorer silencieusement les décisions.
