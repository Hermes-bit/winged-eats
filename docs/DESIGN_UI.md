# Design UI - Winged Eats (Ouagadougou)

Ce document décrit le design retenu pour l'application de restaurants : charte graphique, écrans, et catégorisation des données. Les maquettes interactives sont dans [maquettes/MAQUETTES_UI.html](../maquettes/MAQUETTES_UI.html). L'application réelle (client) reprend ce design dans [web/client](../web/client).

Référence visuelle : les vidéos de [proposual](../proposual) montrent des applications de livraison de repas. On reprend la **structure** (accueil par catégories, sections, page restaurant avec onglets, panier, suivi, carte) et **aucun élément de marque** : pas de logo, pas de nom, pas de photo ni de couleur de marque tierce.

## 1. Charte graphique (Burkina Faso)

| Rôle | Couleur | Hex | Usage |
|---|---|---|---|
| Principal | Vert Faso | `#0B7A3E` | Boutons, barre de navigation, état actif |
| Principal foncé | Vert foncé | `#075C2E` | Titres, bannières, texte fort |
| Accent chaud | Or du Sahel | `#F5B82E` | Promotions, badges, petits éléments |
| Alerte | Rouge Burkina | `#D62E2E` | Erreurs, annulations, accents |
| Fond | Sable | `#FBF7F0` | Fond de l'application |
| Texte | Encre | `#1E1A16` | Texte principal |
| Secondaire | Gris terreux | `#766E63` | Métadonnées, sous-titres |
| Filets | Beige | `#ECE3D4` | Bordures et séparateurs |
| Teintes douces | Vert / or / rouge clairs | `#E5F2EA` / `#FFF4D6` / `#FBE6E6` | Fonds de pastilles et d'icônes |

Règles :
- Le vert est la couleur d'action, l'or sert aux promotions, le rouge reste réservé aux alertes (ne pas l'utiliser pour les boutons principaux).
- Contraste texte/fond suffisant (texte encre sur sable, blanc sur vert foncé).
- Un liseré tricolore (vert, or, rouge) peut ponctuer les en-têtes. Ne pas utiliser de drapeau complet ni de symboles officiels.
- Typographie système (Segoe UI, Arial), titres en gras. Pas de police externe à charger, pour rester léger en 3G.
- Coins arrondis : 12 à 14 px pour les cartes, 999 px pour les pastilles.
- Vignettes : dégradés aux couleurs de la charte et icônes de plats (emoji), pour éviter les photos lourdes sur 3G.

### 1.1 Système visuel appliqué (novembre 2026)

Implémenté dans [web/client/index.html](../web/client/index.html) et [web/partner/index.html](../web/partner/index.html), sous forme de variables CSS (`--green-*`, `--gold-*`, `--red-*`, `--bg`, `--surface`, `--ink`, `--muted`, `--line`).

- **Logo** : carré vert arrondi, aile or aux plumes découpées. Le même SVG sert d'icône d'onglet, sur l'écran d'accueil et dans l'espace restaurateur.
- **Motif tissé** (`--weave`) : fines rayures inspirées des bandes du Faso Dan Fani, superposées aux dégradés. Il remplace les photos, sans aucun fichier image.
- **Thèmes de vignette par catégorie** : chaque catégorie a son dégradé, ses tuiles d'icône et ses vignettes de plats.

  | Catégorie | Thème | Dégradé |
  |---|---|---|
  | Grillades | `ember` | braise |
  | Cuisine africaine | `savane` | vert |
  | Maquis | `sahel` | or |
  | Plats du jour | `terre` | terre |
  | Boissons | `bissap` | rouge hibiscus |
- **Icônes** : jeu de pictogrammes SVG au trait (24 px), dessinés pour l'application. Les emoji restent réservés aux illustrations de plats.
- **Rayons** : 10 / 14 / 20 / 28 px, et 999 px pour les pastilles. Les ombres ont trois niveaux (`--sh-1` à `--sh-3`).
- **Composants** :
  - dock de navigation flottant en pilule (Accueil, Carte, Rechercher, Panier, Compte) ;
  - feuilles du bas (plat, adresse, tri, confirmation) ;
  - bandeau « commande en cours » au-dessus du dock ;
  - toasts, squelettes de chargement ;
  - états vides illustrés (SVG) ;
  - code de remise en 4 tuiles.
- **Accessibilité** : focus visible (contour or), libellés ARIA sur les boutons-icônes, `role="switch"` sur les interrupteurs, respect de `prefers-reduced-motion`.
- **Restaurants de démonstration** : le suffixe « (démo) » s'affiche sous forme de badge « Démo ».

## 2. Écrans

| # | Écran | Rôle | Éléments clés |
|---|---|---|---|
| 1 | Lancement | Présentation | Logo texte, bouton « Commencer » |
| 2 | Choix de la zone | Définir où livrer | Position GPS, zones pilotes (Ouaga 2000, Zone du Bois, Patte d'Oie) |
| 3 | Accueil | Catalogue | Recherche, promotion, pastilles de filtres, rail de catégories, sections, liste |
| 4 | Recherche | Trouver un plat ou un restaurant | Suggestions, recherches récentes, cuisines |
| 5 | Page restaurant | Voir le menu | Bandeau, infos (note, distance, frais), onglets de rubriques, articles |
| 6 | Personnaliser un plat | Choisir les options | Feuille du bas, options obligatoires et facultatives, total mis à jour |
| 7 | Panier et paiement | Valider | Lignes, sous-total, livraison, frais de service, total, mode de paiement |
| 8 | Suivi de commande | Suivre la livraison | Étapes, mini-carte, code PIN à 4 chiffres |
| 9 | Commandes | Historique | En cours, passées, statut |
| 10 | Carte | Restaurants proches | Carte avec repères, feuille des restaurants |
| 11 | Compte | Profil | Adresses enregistrées avec repère visuel, préférences, aide |

Navigation : dock flottant à 5 entrées (Accueil, Carte, Rechercher, Panier avec badge, Compte). Les commandes sont accessibles depuis l'en-tête de l'accueil, le panier et le compte. Une commande en cours s'affiche aussi en bandeau au-dessus du dock.

Carte : plan schématique centré sur l'adresse choisie. Il montre des cercles de distance (jusqu'au rayon de livraison de 6 km) et les repères des restaurants, placés d'après leurs coordonnées, sans tuiles cartographiques externes. L'API `GET /api/restaurants` renvoie pour cela `latitude` et `longitude`.

Application partenaire (restaurateur) :
- en-tête vert avec un interrupteur Ouvert/Fermé (confirmation avant fermeture) ;
- indicateurs : à accepter, en cuisine, prêtes, part du jour ;
- commandes en colonnes : à accepter (mises en évidence), en cuisine, prêtes, terminées ;
- confirmation avant tout refus ou annulation ;
- onglet « Menu & stock » avec un interrupteur Disponible/En rupture par plat.

Elle reprend la même charte.

## 3. Catégorisation des données

| Niveau | Donnée | Exemples | Règle |
|---|---|---|---|
| Catégorie (accueil) | `restaurants.category` | Grillades, Maquis, Cuisine africaine, Plats du jour, Boissons | Une catégorie principale par restaurant, affichée en rail d'icônes |
| Zone | `restaurants.quartier` | Ouaga 2000, Zone du Bois, Patte d'Oie | Filtre la liste selon la zone choisie |
| Filtres rapides | Calculés | Tout, Livraison < 2 000 F, Ouvert, Note 4+ | Cumulables |
| Sections d'accueil | Calculées (tri) | Les plus proches, Livraison la moins chère | Tri par distance ou frais croissants, limité à 6 cartes |
| Distance et frais | `latitude`, `longitude` | 1.2 km → 500 F | Frais = 300 F + 250 F/km, arrondis à 50 F, rayon 6 km |
| Rubrique du menu | `menu_categories` | Populaires, Poulet, Brochettes, Boissons | Onglets sticky sur la page restaurant |
| Article | `menu_items` | Demi-poulet braisé 3 500 F | Prix en FCFA entiers. Un article en rupture reste visible mais désactivé |
| Groupe d'options | `option_groups` | Accompagnement (obligatoire, 1 choix), Suppléments (max 2) | Obligatoire = bloque l'ajout tant que rien n'est choisi |
| Option | `options` | Attiéké +0 F, Alloco +500 F, Œuf +300 F | Le surcoût s'ajoute au prix ; le serveur recalcule le total |
| Statut de commande | `orders.status` | En attente → Acceptée → En préparation → Prête → Livrée (ou Refusée / Annulée) | Transitions contrôlées côté serveur (409 si invalide) |
| Mode de paiement | `orders.payment_method` | Espèces (démo), Mobile Money (prévu) | Le code PIN à 4 chiffres valide la remise |

## 4. États à prévoir

- Hors zone de livraison (au-delà de 6 km).
- Restaurant fermé.
- Article en rupture.
- Panier vide.
- Connexion 3G faible : afficher le texte avant les images, relancer les appels en cas d'échec.
- Commande refusée par le restaurant.

## 5. Ce qui reste à valider

- Validation de la charte (couleurs exactes, éventuel logo).
- Ajout ou non du paiement Mobile Money dans le MVP.
- Pharmacies et livraison de personnes : hors de ce design, traités après la validation du module restaurants.
