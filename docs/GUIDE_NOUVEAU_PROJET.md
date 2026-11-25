# Guide : démarrer un nouveau projet sans refaire les mêmes erreurs

Ce guide résume les points à verrouiller avant d'écrire du code, à partir de ce qui a été vécu sur Winged Eats. Il est à relire au début de chaque nouveau projet.

## 1. Environnement (Windows)

- [ ] Vérifier les versions : `node -v`, `npm -v`, `python --version`, `git --version`. Noter les versions dans le README.
- [ ] Utiliser PowerShell 5.1 et 7 : éviter `&&`, `||`, `??` et `?.` dans les commandes (ils échouent sur 5.1). Chaîner avec `;` et `if ($?)`.
- [ ] Les chemins Windows contiennent des espaces ou des accents possibles : toujours les mettre entre guillemets.
- [ ] Tester qu'un outil externe (`psql`, `pandoc`, Docker) est réellement présent avant de bâtir dessus. Ici, `psql` et `pandoc` étaient absents.
- [ ] Préférer les solutions sans compilation native (`node:sqlite` intégré à Node 22+ plutôt que `better-sqlite3`, qui demande des outils de build C++ sous Windows).

## 2. Dépendances et scripts

- [ ] Figer la version majeure des paquets (ex. `express@4`) et noter la raison.
- [ ] Ajouter dans `package.json` les scripts `start`, `test`, et un `engines` pour la version de Node.
- [ ] Après une installation, lancer `npm test` avant tout développement.
- [ ] Un avertissement `ExperimentalWarning` de Node peut polluer la sortie : le neutraliser dans le script, pas dans le code.
- [ ] Ne jamais versionner `node_modules/` ni le dossier `data/` (base de données). Créer un `.gitignore` dès le premier commit.

## 3. Processus serveur sous Windows

- [ ] Un processus lancé par un shell détaché peut s'arrêter avec le shell. Pour un test, lancer avec `Start-Process -WindowStyle Hidden -PassThru` et noter le PID.
- [ ] Arrêter un processus avec `Stop-Process -Id <PID>` (jamais par nom).
- [ ] Vérifier la disponibilité avec `Invoke-WebRequest -UseBasicParsing http://localhost:PORT/...` après chaque démarrage.

## 4. Base de données

- [ ] Décider dès le départ si la base est SQLite (simple) ou PostgreSQL/PostGIS (géographie). Le choix doit être écrit dans la spécification.
- [ ] Gérer les transactions explicitement (`BEGIN` / `COMMIT` / `ROLLBACK`) quand plusieurs tables sont écrites.
- [ ] Les identifiants retournés par l'insertion peuvent être des nombres spéciaux : les convertir (`Number(...)`) avant de les utiliser.
- [ ] Activer les clés étrangères (`PRAGMA foreign_keys = ON`) : SQLite ne les applique pas par défaut.
- [ ] Ne jamais stocker de code d'accès en clair : stocker un hachage (SHA-256 au minimum, bcrypt/argon2 pour des mots de passe utilisateurs).

## 5. Règles métier et sécurité

- [ ] Ne jamais faire confiance aux prix, quantités ou statuts envoyés par le client : tout recalculer côté serveur.
- [ ] Vérifier que chaque ressource appartient au bon acteur (ex. une commande d'un restaurant ne peut être modifiée que par ce restaurant).
- [ ] Les transitions de statut doivent être explicites (liste des transitions autorisées) et refuser les autres avec un code 409.
- [ ] Valider les numéros de téléphone du pays (Burkina Faso : 8 chiffres, préfixe +226) et les coordonnées GPS.
- [ ] Ne pas renvoyer les détails techniques d'erreur au client : réponse générique pour les erreurs 500.

## 6. Tests

- [ ] Écrire les tests de règles métier (calcul de prix, transitions, droits d'accès) dès le premier jour, avec le module `node:test`.
- [ ] Tester sur une base en mémoire et un port éphémère (`listen(0)`) pour ne pas dépendre de l'état du disque.
- [ ] Un test qui échoue doit être corrigé sur la règle, pas sur la valeur attendue, sauf si la règle était fausse (vérifier avec le cahier des charges).

## 7. Interfaces web

- [ ] Ne jamais insérer des données utilisateur avec `innerHTML` : utiliser `textContent` ou la création d'éléments.
- [ ] Nettoyer les minuteries (`setInterval`) lors d'un changement d'écran, sinon elles s'accumulent.
- [ ] Prévoir le réseau instable : boutons désactivés pendant l'envoi, messages d'erreur lisibles, rechargement manuel.
- [ ] Vérifier l'interface dans un navigateur réel (et pas seulement les réponses HTTP) avant de la déclarer prête.
- [ ] Les styles et classes CSS doivent exister : contrôler que chaque classe utilisée par le JavaScript est définie dans la feuille de style.

## 8. Documentation et livrables

- [ ] Garder la spécification, le cadrage et la feuille de route dans `docs/` et les convertir en PDF pour lecture hors ligne.
- [ ] Tenir un README avec : prérequis, installation, commandes, adresses locales, et où trouver les codes d'accès initiaux.
- [ ] Documenter les hypothèses chiffrées (prix, commissions) à part, avec leur statut « à valider ».

## 9. Conversion Markdown vers PDF sous Windows

- `pandoc` n'était pas installé. Options sans installation lourde :
  - Microsoft Edge en mode headless : `msedge --headless --print-to-pdf="sortie.pdf" fichier.html` (après conversion HTML).
  - Python : `pip install markdown xhtml2pdf` puis conversion Markdown → HTML → PDF.
- Toujours vérifier que le PDF existe et s'ouvre (taille > 0, nombre de pages).

## 10. Points à clarifier avec le porteur du projet au démarrage

- Zone pilote et nombre de partenaires visés.
- Modèle économique et tarifs (commission, frais de livraison, rémunération livreur).
- Moyens de paiement réellement disponibles et contrat avec l'agrégateur.
- Cadre légal des livreurs.
- Les difficultés concrètes rencontrées sur les projets précédents, à ajouter à ce guide.
