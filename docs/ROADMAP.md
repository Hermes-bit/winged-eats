# Feuille de route — Winged Eats (Ouagadougou)

Statut au moment de la rédaction. Le module restaurants est en cours de développement ; les pharmacies de garde et la mobilité sont reportées après la validation du module restaurants.

| # | Priorité | Semaines | Contenu | Statut |
|---|----------|----------|---------|--------|
| 1 | Cadrage business, juridique & modèle économique | 1-2 | User stories MVP, modèle économique en FCFA, zone pilote, cadre légal des livreurs | Document prêt : [CADRAGE_MVP.md](./CADRAGE_MVP.md) — validations métier à faire |
| 2 | Architecture de données & socle SIG | 3-4 | Schéma PostGIS, index spatiaux, ETL OpenStreetMap, calcul d'itinéraire | MVP : SQLite + distance à vol d'oiseau (Haversine). PostGIS et OSRM/Valhalla à faire |
| 3 | Cœur métier, paiements & dispatch | 5-7 | Mobile money (Ligdicash/CinetPay), caution livreurs, code PIN, dispatch PostGIS | Paiement espèces seulement. Mobile money et dispatch à faire |
| 4 | Prototypage UI/UX & interfaces | 8-10 | Maquette client, application partenaire, suivi de livraison | Client et partenaire fonctionnels (web mobile). Maquettes : [MAQUETTES.html](../MAQUETTES.html) |
| 5 | Opérations terrain, recrutement & lancement | 11-12 | Kit commercial, contrat type, charte livreurs, tableau de bord, plan de lancement | Documents à produire (hors code) |

## Détail par priorité

### 1. Cadrage business, juridique & modèle économique
- Définir le cahier des charges MVP pour les 3 acteurs (client, restaurateur, livreur).
- Valider le modèle économique : panier moyen, commission restaurant (15 % par défaut dans [server/config.js](../server/config.js)), tarif de livraison (300 FCFA + 250 FCFA/km, arrondi à 50 FCFA), rémunération du livreur, seuil de rentabilité.
- Valider le cadre légal : statut des livreurs, contrats partenaires, données personnelles.
- **Critère de sortie :** tarifs et commissions validés par le porteur du projet.

### 2. Architecture de données & socle SIG
- Migrer le schéma SQLite vers PostgreSQL/PostGIS (tables, index spatiaux, contraintes).
- Écrire l'ETL Overpass API + GeoPandas pour extraire les restaurants et maquis de Ouagadougou.
- Remplacer la distance Haversine par OSRM ou Valhalla pour des itinéraires réalistes.
- **Critère de sortie :** les restaurants réels de la zone pilote sont géocodés et leur livraison est calculée par itinéraire.

### 3. Cœur métier, paiements & dispatch
- Intégrer Mobile money (Orange Money, Moov Money, Wave) via un agrégateur (Ligdicash ou CinetPay) ; garder les espèces.
- Ajouter le portefeuille prépayé (caution) des livreurs et la validation de remise par code PIN à 4 chiffres (le code existe déjà dans les commandes).
- Ajouter le dispatch automatique (livreur disponible le plus proche, commandes groupées) et les WebSockets.
- **Critère de sortie :** une commande payée est attribuée à un livreur sans intervention manuelle.

### 4. Prototypage UI/UX & interfaces
- Client : parcours complet (repère GPS, choix de plat, personnalisation, suivi). Fait en version web mobile.
- Partenaire : acceptation en un clic, temps de préparation, rupture de stock. Fait en version web.
- Tests sur réseau 3G instable et téléphones d'entrée de gamme (à faire sur le terrain).

### 5. Opérations terrain, recrutement & lancement
- Argumentaire commercial et contrat type simplifié pour les 30 premiers restaurants/maquis.
- Charte qualité et grille de recrutement des 15 premiers livreurs moto.
- Tableau de bord (KPIs techniques, logistiques, financiers) et plan de lancement sur 30 jours (objectif : 500 premières commandes).

## Ordre recommandé pour la suite
1. Valider le cadrage (priorité 1) avant d'élargir le code.
2. Pharmacies de garde : module séparé, à lancer après validation du module restaurants.
3. Dispatch et mobile money seulement après que la commande restaurant est utilisée par de vrais restaurants.
