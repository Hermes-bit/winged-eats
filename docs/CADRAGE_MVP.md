# Cadrage MVP — Winged Eats, Ouagadougou

Ce document couvre la priorité 1 : périmètre du MVP, user stories des trois acteurs et modèle économique. Les chiffres marqués **hypothèse** doivent être validés sur le terrain avant tout investissement.

## 1. Périmètre du MVP

**Inclus :** commande de repas dans un restaurant ou maquis partenaire, livraison dans un rayon de 6 km, paiement en espèces, suivi de commande, espace partenaire (accepter/refuser, préparation, rupture, fermeture).

**Exclus pour le lancement :** pharmacies de garde, covoiturage/déplacement, paiement mobile money, dispatch automatique, application mobile native, comptes clients avec mot de passe.

**Zone pilote :** Ouaga 2000, Zone du Bois, Patte d'Oie.

## 2. User stories

### Client
- En tant que client, je choisis mon adresse (position GPS ou quartier pilote) pour voir les restaurants qui livrent chez moi.
- En tant que client, je vois le prix de livraison et la distance avant de commander.
- En tant que client, je choisis un plat avec ses options (ex. poulet braisé + alloco) et la quantité.
- En tant que client, je renseigne un repère visuel (portail, face à la pharmacie) pour le livreur.
- En tant que client, je paie en espèces à la remise et je reçois un code à 4 chiffres à donner au livreur.
- En tant que client, je suis l'état de ma commande et je peux l'annuler tant que le restaurant ne l'a pas acceptée.

### Restaurateur / maquis
- En tant que restaurateur, je reçois une commande et je l'accepte ou la refuse en un clic.
- En tant que restaurateur, je fais avancer la commande (en préparation, prête, remise).
- En tant que restaurateur, je désactive un plat en rupture pour qu'il ne soit plus commandable.
- En tant que restaurateur, je ferme mon établissement quand je ne peux plus prendre de commandes.
- En tant que restaurateur, je vois ma commission et le montant qui me revient par commande.

### Livreur (MVP : livraison assignée manuellement)
- En tant que livreur, je reçois l'adresse, le repère et le montant à encaisser.
- En tant que livreur, je remets la commande en vérifiant le code à 4 chiffres du client.
- *Hors MVP :* application livreur, dispatch automatique, caution et portefeuille.

## 3. Modèle économique (hypothèses en FCFA)

Les formules sont celles implémentées dans [server/services/geo.js](../server/services/geo.js) et [server/config.js](../server/config.js).

| Paramètre | Valeur | Statut |
|-----------|--------|--------|
| Panier moyen | 4 000 FCFA | **Hypothèse** à mesurer |
| Taux de commission restaurant | 15 % | **Hypothèse** (à comparer aux plateformes existantes) |
| Frais de livraison | 300 + 250 × km, arrondi à 50 FCFA | **Hypothèse** |
| Distance moyenne de livraison | 2,5 km | **Hypothèse** |
| Rémunération livreur | 100 % des frais de livraison | **Hypothèse** à négocier |
| Coût fixe mensuel (serveur, téléphone, assurance, communication) | 150 000 FCFA | **Hypothèse** |

### Calcul unitaire (exemple)
- Frais de livraison client : 300 + 250 × 2,5 = 925 → arrondi à **950 FCFA**.
- Commission restaurant : 4 000 × 15 % = **600 FCFA** par commande.
- Rémunération livreur : **950 FCFA** (dans cette hypothèse, la plateforme ne prend rien sur la livraison).
- Revenu plateforme par commande : **600 FCFA**.
- Coût variable hors livreur (paiement, support) : hypothèse 0 à valider.

### Seuil de rentabilité
- Commandes mensuelles nécessaires = coût fixe / revenu par commande = 150 000 / 600 ≈ **250 commandes par mois**, soit environ 8 commandes par jour sur les 3 quartiers.

### Sensibilité
- Si la commission tombe à 10 % : 400 FCFA par commande, seuil ≈ 375 commandes/mois.
- Si la plateforme prend 200 FCFA sur la livraison : revenu par commande 800 FCFA, seuil ≈ 188 commandes/mois.

Un tableur de simulation doit être construit à partir de ces formules avant le recrutement des premiers partenaires.

## 4. Cadre légal et opérationnel (à valider avec un juriste local)
- Statut des livreurs (indépendants ou salariés) et couverture d'assurance moto.
- Contrat partenaire restaurant : commission, délais de reversement, responsabilité en cas de rupture.
- Protection des données des clients (nom, téléphone, repère) : conservation et accès.
- Autorisations municipales éventuelles pour la livraison et les contrôles d'hygiène des maquis.

## 5. Critères de passage à la priorité 2
- Modèle économique accepté par le porteur du projet.
- Au moins 5 restaurants partenaires de la zone pilote d'accord de principe.
- Cadre légal des livreurs documenté.
