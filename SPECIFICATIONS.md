# Winged Eats : spécifications fonctionnelles et techniques (Burkina Faso)

Version 0.1 : document de cadrage à valider avant le développement.

---

## 1. Vision et périmètre

Winged Eats est une plateforme mobile (et web) qui regroupe trois services dans une seule application :

| Module | Équivalent | Description |
|---|---|---|
| **Restauration** | Uber Eats | Commander des plats de restaurants et se faire livrer |
| **Pharmacie de garde** | Aucun équivalent local | Trouver la pharmacie de garde la plus proche, ouverte maintenant, et se faire livrer des médicaments |
| **Mobilité** | Uber / Yango | Demander une course (moto-taxi, taxi, voiture) ou devenir chauffeur |

Une seule application contient les trois modules. Le client choisit le service en page d'accueil. Un même compte client sert à tout. Les livreurs et chauffeurs utilisent une application dédiée, ou un mode « partenaire » dans la même application.

**Hypothèse à valider :** « se déplacer » est compris comme la mise en relation client / chauffeur (type VTC). Si vous visez la moto-taxi uniquement, le module mobilité se simplifie.

### 1.1 Villes de lancement

- Phase 1 : Ouagadougou (zones denses : Gounghin, Patte d'Oie, Tampouy, Zone du Bois, Ouaga 2000, Koulouba).
- Phase 2 : Bobo-Dioulasso.
- Phase 3 : Koudougou, Ouahigouya, Banfora, Kaya.

---

## 2. Contexte local : contraintes à prendre en compte

Ces points conditionnent la conception. Ils ne sont pas optionnels.

### 2.1 Paiement
- **Monnaie** : franc CFA (XOF), sans centimes. Format : `2 500 FCFA`.
- **Mobile money** (indispensable) : Orange Money, Moov Money, Coris Money. Chaque opérateur a son API marchande et son contrat (à négocier, délai de plusieurs semaines).
- **Paiement à la livraison (cash)** : mode majoritaire au début. À prévoir dès le MVP, avec un suivi strict des encaissements livreur.
- **Carte bancaire** : faible usage, à reporter.

### 2.2 Adresses
- Peu d'adresses formelles (numéros de rue rares, quartiers non nommés officiellement dans certaines zones).
- Il faut combiner :
  1. **Position GPS** (point sur la carte, déplaçable par l'utilisateur) ;
  2. **Repère textuel** obligatoire (« en face de la pharmacie X, portail bleu ») ;
  3. **Quartier et secteur** (liste déroulante).
- Vérifier la couverture de OpenStreetMap et Google Maps sur chaque ville avant de choisir le fournisseur de cartes.

### 2.3 Téléphone et connexion
- Identification par **numéro de téléphone +226** (8 chiffres) et **code OTP par SMS**. Pas d'obligation d'email.
- Nombreux smartphones d'entrée de gamme (Android, 2 à 3 Go de RAM) et connexion 3G/4G instable.
- Exigences : application légère (cible < 25 Mo), images compressées, mode dégradé (liste mise en cache), pas de vidéo en page d'accueil.
- Notifications via **SMS** et push ; WhatsApp Business en option (coût à évaluer).

### 2.4 Langues
- Français (par défaut), avec prévision d'un passage aux langues locales (mooré, dioula) pour l'interface simple (boutons, statuts).
- Les noms de plats et de restaurants restent saisis librement par les partenaires.

### 2.5 Réglementation et partenaires
- **Restaurants** : registre de commerce (RCCM), IFU, autorisation d'exploitation ; à vérifier au moment de l'inscription.
- **Pharmacies** : titulaire inscrit à l'**Ordre des pharmaciens du Burkina Faso** ; le planning de garde doit être validé par l'Ordre ou la Direction de la pharmacie. Winged Eats ne doit pas publier un planning non officiel.
- **Médicaments** : distinction stricte entre médicaments sans ordonnance (vente libre possible) et médicaments sur ordonnance (ordonnance obligatoire, photo vérifiée par le pharmacien avant validation). Les substances contrôlées sont exclues.
- **Données personnelles** : déclaration et conformité à la législation burkinabè sur la protection des données (Commission de l'informatique et des libertés, CIL). Consulter un juriste avant le lancement.
- **Fiscalité** : commissions et TVA à valider avec un expert-comptable.

---

## 3. Acteurs et rôles

| Rôle | Application | Droits principaux |
|---|---|---|
| **Client** | Winged Eats (mobile/web) | Commander plats, médicaments, courses ; suivre ; noter |
| **Restaurant** | Winged Eats Partenaire (web + tablette) | Gérer menu, horaires, accepter/refuser commandes |
| **Pharmacie** | Winged Eats Partenaire | Gérer stock simplifié, valider ordonnances, statut « de garde » |
| **Livreur (coursier)** | Winged Eats Livreur (mobile) | Recevoir missions, navigation, confirmer livraison et encaissement |
| **Chauffeur** | Winged Eats Chauffeur (mobile) | Accepter courses, navigation, historique de gains |
| **Administrateur** | Back-office web | Validation des partenaires, litiges, commissions, tarifs, planning de garde |

---

## 4. Module Restauration (Uber Eats)

### 4.1 Parcours client
1. Ouverture : sélection de la ville et de l'adresse de livraison.
2. Liste des restaurants : filtres (ouvert maintenant, note, temps de livraison, prix, catégorie).
3. Fiche restaurant : menu par catégories, options (taille, suppléments), photo, avis.
4. Panier : un seul restaurant par commande, frais de livraison visibles, code promo.
5. Paiement : mobile money ou cash à la livraison.
6. Suivi : « Confirmée » → « En préparation » → « Livreur en route » → « Livrée ».
7. Notation du restaurant et du livreur.

### 4.2 Fonctionnalités MVP
- Inscription / connexion (OTP SMS).
- Recherche et filtres ; recherche par nom de plat.
- Gestion d'adresses avec repère.
- Panier, commande, historique, réorientation (« recommander »).
- Suivi temps réel sur carte.
- Notes et avis.
- Restaurant : accepter / refuser / marquer prêt, gestion de disponibilité des plats, horaires.
- Back-office : validation des restaurants, commissions, litiges.

### 4.3 Hors MVP
- Abonnements clients, programme de fidélité, commande programmée, groupes de commande, cuisines fantômes.

---

## 5. Module Pharmacie de garde (spécifique)

### 5.1 Objectif
Répondre à la question « quelle pharmacie est ouverte maintenant près de moi, et peut-elle me livrer ? » en moins de 30 secondes.

### 5.2 Parcours client
1. Bouton **« Pharmacie de garde »** visible sur l'accueil.
2. Liste des pharmacies de garde triées par distance, avec badge « Ouverte maintenant » et « De garde cette nuit ».
3. Carte avec numéro de téléphone cliquable (appel direct, sans passer par l'app).
4. Option **Commander / Livraison** : recherche de médicaments dans le stock déclaré, ou téléversement d'une ordonnance.
5. Si ordonnance : le pharmacien valide ou demande une correction avant préparation.
6. Paiement et livraison (même chaîne que la restauration).

### 5.3 Règles métier
- Le statut « de garde » vient du **planning officiel** saisi par l'administrateur, pas du seul choix de la pharmacie.
- Une pharmacie n'apparaît comme ouverte que si l'horaire courant est dans sa plage ou si elle est de garde.
- Au-delà de la garde, le client voit la pharmacie la plus proche ouverte, avec mention « fermée à partir de ... ».
- En cas d'urgence, l'application affiche en permanence le numéro du SAMU / urgences (à confirmer) et l'avertissement « Winged Eats ne remplace pas un avis médical ».

### 5.4 Fonctionnalités MVP
- Planning de garde (import CSV ou saisie par l'administrateur, par zone et par date).
- Recherche géographique et filtres.
- Stock simplifié : liste de médicaments avec disponibilité (oui / non / quantité approximative), sans gestion comptable complète.
- Upload d'ordonnance (photo), validation par le pharmacien, historique chiffré.
- Appel direct et partage de position.

### 5.5 Hors MVP
- Intégration avec les logiciels de gestion de pharmacie, rappel de renouvellement, téléconsultation.

---

## 6. Module Mobilité (course)

### 6.1 Parcours client
1. Saisie de la destination (recherche ou carte).
2. Choix du type de véhicule : moto-taxi, taxi, voiture, avec prix estimé en FCFA.
3. Recherche du chauffeur et affichage (nom, photo, véhicule, plaque, note).
4. Suivi du trajet, partage de trajet avec un proche.
5. Paiement (mobile money ou cash), note.

### 6.2 Parcours chauffeur
1. Inscription : pièce d'identité, permis, carte grise, photo, assurance.
2. Validation par l'administrateur.
3. Mode « en ligne / hors ligne », réception des demandes à proximité, acceptation.
4. Historique des courses et gains, retrait vers mobile money.

### 6.3 Règles de tarification (à paramétrer)
- Prix = prise en charge + (km × tarif/km) + (min × tarif/min) × multiplicateur de demande, avec un plancher.
- Tarifs et multiplicateur définis dans le back-office par ville.
- Le prix estimé est affiché avant validation.

### 6.4 Sécurité (incontournable)
- Partage de trajet, bouton SOS, enregistrement des trajets.
- Vérification du chauffeur (pièce, photo, plaque).
- Code de confirmation à 4 chiffres donné par le client au chauffeur.

---

## 7. Module livraison (coursiers)

Le module livraison est partagé par la restauration et la pharmacie.

- Affectation automatique à proximité avec délai d'acceptation de 30 secondes, sinon proposition au suivant.
- Étapes : prise en charge chez le partenaire → livraison au client → confirmation (photo ou code).
- Encaissement cash : le livreur confirme le montant encaissé, rapprochement quotidien avec le back-office.
- Rémunération : forfait par course + bonus pluie / nuit / zone difficile.
- Retrait vers mobile money, historique.

---

## 8. Paiement, commissions et finances

- **Client** : mobile money (Orange Money, Moov Money, Coris Money) ou cash.
- **Flux** : le paiement mobile money est encaissé sur le compte de Winged Eats, puis reversé au partenaire et au livreur, moins commission.
- **Commissions** (valeurs de départ à négocier) : restaurants 15 à 25 %, pharmacies 10 %, frais de service client pour lisser les coûts.
- **Reversements** : hebdomadaires au début, quotidiens ensuite.
- **Journal financier** : chaque commande génère des lignes comptables (montant, commission, TVA, reversement).

---

## 9. Notifications

| Événement | Canal |
|---|---|
| Code OTP | SMS (obligatoire) |
| Statut de commande | Push + SMS si app fermée |
| Nouvelle commande (partenaire) | Push + son + SMS de secours |
| Nouvelle mission (livreur, chauffeur) | Push prioritaire |
| Promotions | Push, opt-in |

---

## 10. Modèle de données (principales entités)

- `User` (id, téléphone, rôle, nom, statut)
- `Address` (user_id, libellé, latitude, longitude, quartier, repère)
- `Restaurant` (id, nom, adresse, horaires, statut de validation, commission)
- `MenuCategory`, `MenuItem` (prix XOF, disponibilité, options)
- `Pharmacy` (id, nom, adresse, latitude, longitude, téléphone, horaires)
- `GuardSchedule` (pharmacy_id, date_debut, date_fin, zone)
- `Medicine` (nom, forme, dosage, ordonnance_requise)
- `PharmacyStock` (pharmacy_id, medicine_id, disponibilité)
- `Prescription` (user_id, fichier, statut, validé_par)
- `Order` (client_id, partenaire_id, type [resto|pharma], statut, montants, mode_paiement)
- `OrderItem`
- `Delivery` (order_id, livreur_id, statuts, horodatages, preuve)
- `Ride` (client_id, chauffeur_id, départ, arrivée, tarif, statut)
- `Driver`, `Courier` (véhicule, documents, statut de vérification, zone)
- `Payment` (order_id ou ride_id, opérateur, référence, statut, montant)
- `Payout` (bénéficiaire, montant, date, statut)
- `Review` (auteur, cible, note, commentaire)

### Statuts de commande
`CREEE` → `PAYEE` (si mobile money) → `ACCEPTEE` → `EN_PREPARATION` → `PRETE` → `EN_LIVRAISON` → `LIVREE`, avec les sorties `REFUSEE`, `ANNULEE`, `LITIGE`.

---

## 11. Exigences non fonctionnelles

- **Performance** : écran d'accueil affiché en moins de 3 s en 3G ; réponse API < 500 ms (95e percentile).
- **Disponibilité** : 99 % minimum, avec surveillance renforcée sur les heures de déjeuner et de dîner et sur les nuits de garde.
- **Sécurité** : chiffrement en transit (TLS) et au repos, stockage des ordonnances en espace privé, journalisation des accès, rôles et permissions.
- **Accessibilité** : texte minimum 16 px, contrastes élevés, boutons larges, icônes accompagnées de texte.
- **Taille de l'app** : < 25 Mo à l'installation.
- **Hors ligne** : consultation des dernières données (restaurants, pharmacies de garde) et numéros d'urgence.

---

## 12. Stack technique proposée

| Couche | Choix proposé | Alternative |
|---|---|---|
| Application client / livreur / chauffeur | **Flutter** (un seul code pour Android et iOS) | React Native |
| Web (client et back-office) | **Next.js** ou **React + Vite** | Vue / Nuxt |
| Backend API | **Node.js (NestJS)** ou **Laravel** | Django, Spring Boot |
| Base de données | **PostgreSQL + PostGIS** (requêtes géographiques) | MySQL |
| Cache et temps réel | **Redis** + WebSocket / Socket.IO | Firebase Realtime |
| Fichiers (ordonnances, photos) | Stockage objet (S3 compatible) | Cloudinary |
| Cartes | **OpenStreetMap** (tuiles et géocodage) ou Google Maps | Mapbox |
| Notifications | Firebase Cloud Messaging + passerelle SMS locale | Twilio (coût plus élevé) |
| Paiement | APIs marchandes Orange Money, Moov Money, Coris Money | Agrégateurs locaux |
| Hébergement | Serveur en Afrique de l'Ouest ou cloud proche (latence) | Cloud européen |
| Supervision | Sentry + Grafana | — |

**Remarque :** la mise en place des APIs de paiement et des passerelles SMS dépend des contrats avec les opérateurs. Ce délai est souvent le point critique du calendrier.

---

## 13. Phasage proposé

| Phase | Durée indicative | Contenu |
|---|---|---|
| **0. Cadrage** | 3 à 4 semaines | Validation de ce document, juridique, contrats opérateurs, recrutement des premiers partenaires à Ouagadougou |
| **1. MVP restauration + pharmacie de garde** | 3 à 4 mois | Client, partenaire, livreur, back-office, paiement cash et mobile money |
| **2. Mobilité** | 2 à 3 mois | Client course, chauffeur, tarification, sécurité |
| **3. Extension** | Continu | Bobo-Dioulasso, langues locales, fidélité, abonnements |

Pour le MVP, commencer par **un quartier pilote** ou un **périmètre de 50 à 100 restaurants** et **10 à 20 pharmacies** avant d'étendre.

---

## 14. Indicateurs de succès

- Nombre de commandes par jour et par zone.
- Taux de commandes livrées sans annulation (objectif > 90 %).
- Délai moyen de livraison (objectif < 40 min en centre-ville).
- Taux de réponse des pharmacies de garde aux demandes (objectif > 95 %).
- Taux de rétention à 30 jours.
- Panier moyen en FCFA.

---

## 15. Risques et points à valider

| Risque | Action |
|---|---|
| Lenteur de l'accès aux APIs mobile money | Lancer les démarches dès la phase 0 |
| Adresses imprécises | Repères obligatoires, géolocalisation, pilotage par zone |
| Faible confiance dans le paiement en ligne | Cash à la livraison au lancement, communication locale |
| Planning de garde non officiel ou obsolète | Accord formel avec l'Ordre des pharmaciens |
| Ordonnances falsifiées | Validation humaine par le pharmacien |
| Coût des livraisons, faible panier moyen | Seuil minimum de commande, frais de service, test des tarifs |
| Sécurité des livreurs et chauffeurs | Vérification des documents, SOS, assurance |

### Questions à trancher avant de commencer
1. Le module mobilité inclut-il les voitures, ou uniquement les motos ?
2. Quel est le budget et l'équipe disponible (développeurs, opérations, support) ?
3. Souhaitez-vous une application native unique (Flutter) ou des applications séparées par rôle ?
4. Qui gère le planning de garde : vous directement, ou un partenariat avec l'Ordre ?
5. Quelle commission et quels frais de livraison visez-vous ?
