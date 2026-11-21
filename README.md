# Cave à Café — Application PWA

Application web progressive pour gérer votre collection personnelle de cafés de spécialité. 
Suivez votre stock, enregistrez vos dégustations avec un système de notation structuré, 
et exportez vos données en Markdown.

## Caractéristiques principales

- **100% local** : aucune connexion serveur requise, toutes les données restent dans votre navigateur
- **Optimisé pour iPhone Safari** : interface tactile, zones de sécurité, mode standalone
- **Import de fiches café** : parseur intelligent pour fichiers Markdown Plaine Café
- **Système de notation 1-5** : avec génération automatique de texte formaté
- **Méthodes d'infusion** : Moka, Piston, V60 pour chaque dégustation
- **Synthèse automatique** : moyennes et statistiques de vos dégustations
- **Mode Admin** : gestion des doublons, suppression de cafés et dégustations
- **Pastilles visuelles** : indicateurs rapides (torréfaction, bio, déca, fermenté) sur chaque carte
- **Export Markdown** : tableau récapitulatif + fiches détaillées pour sauvegarde
- **Restauration de sauvegarde** : réimportez vos exports pour récupérer toutes vos données

## Installation sur iPhone

1. Ouvrez Safari et naviguez vers l'URL de l'application
2. Tapez sur le bouton **Partager** (icône carré avec flèche)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Nommez l'app "Cave à Café" et tapez **"Ajouter"**
5. L'icône apparaît sur votre écran d'accueil

> **Important** : Safari peut purger les données d'un site inactif après plusieurs semaines. 
> Pensez à exporter régulièrement vos données (voir section Export).

> **Guide complet** : Voir `GUIDE_INSTALLATION_IPHONE.md` pour des instructions détaillées pas à pas.

## Installation locale (développement)

```bash
# Cloner ou copier le dossier cave-cafe
# Lancer un serveur HTTP local
npx serve .
# ou
python -m http.server 8080
```

Ouvrir http://localhost:8080 dans un navigateur.

## Utilisation

### Importer des cafés

**Depuis des fiches Plaine Café (.md)** :
1. Tapez sur ⚙️ → Import/Export
2. Sélectionnez "Importer fiches .md"
3. Choisissez un ou plusieurs fichiers .md
4. L'app extrait automatiquement : nom, origine, process, score, etc.

**Depuis un tableau de suivi (.md)** :
1. Préparez un fichier .md avec tableau Markdown (voir format ci-dessous)
2. Tapez sur "Importer tableau .md"
3. Les données sont fusionnées avec les fiches existantes

Format tableau attendu :
```markdown
| Nom du café | Origine | Fermenté | Saveurs | Variété | Process | Score RCA | Mon appréciation |
|-------------|---------|----------|---------|---------|---------|-----------|------------------|
| ...         | ...     | ...      | ...     | ...     | ...     | ...       | ...              |
```

### Gérer le stock

Chaque café a un statut parmi :
- **En stock** : paquet neuf non ouvert
- **Entamé** : en cours de consommation
- **Fini** : paquet terminé

Pour changer le statut :
1. Tapez sur une carte café
2. Allez dans l'onglet **"Statut"**
3. Tapez sur le nouveau statut
4. L'historique enregistre automatiquement la date et l'heure

### Enregistrer une dégustation

1. Ouvrez le détail d'un café
2. Onglet **"Dégustations"** → **"Nouvelle dégustation"**
3. Remplissez :
   - **Méthode d'infusion** : Moka (par défaut), Piston ou V60
   - **Au nez** : vos impressions olfactives
   - **Acidité** (1-5)
   - **Amertume** (1-5)
   - **Corps** (1-5)
   - **Longueur en bouche** (1-5)
   - **Note globale** (1-5)
   - **À racheter** : Oui / Non / Peut-être
   - **Commentaire** (optionnel)
4. Visualisez l'aperçu du texte généré
5. Tapez **"Enregistrer"**

### Synthèse des dégustations

Dans l'onglet "Dégustations" de chaque café, vous verrez :
- Un bloc de **synthèse** avec les moyennes de toutes vos dégustations
- Des barres visuelles pour chaque critère (acidité, amertume, corps, longueur)
- La note moyenne et le compteur "À racheter"
- Les méthodes d'infusion testées

Les dégustations sont listées de la plus récente à la plus ancienne.

### Mode Admin

Pour gérer les doublons et supprimer des données :

1. Allez dans ⚙️ → **Administration**
2. Activez le **Mode Admin** (interrupteur)
3. En mode admin, chaque carte affiche :
   - Une **checkbox "Sélectionner"** pour la suppression en masse
   - Un **bouton "Ouvrir"** pour accéder au détail et aux dégustations
4. Fonctionnalités disponibles :
   - **Modifier une fiche café** : bouton "Modifier cette fiche" dans le détail
   - **Dupliquer une fiche café** : créer une copie d'un café existant
   - **Supprimer des cafés** : cochez les cartes, puis "Supprimer la sélection"
   - **Rechercher les doublons** : détecte les cafés avec des noms similaires
   - **Modifier/Supprimer une dégustation** : boutons ✎ et × sur chaque dégustation
   - **Créer un nouveau café** : bouton "Nouveau café" dans les paramètres
   - **Réinitialiser la base** : supprime TOUTES les données (attention !)

### Filtrer et trier

Tapez sur l'icône filtre pour accéder aux filtres :
- **Statut** : En stock / Entamé / Fini
- **Fermenté** : Oui / Non
- **Origine** : liste dynamique
- **Score** : curseur min-max
- **À racheter** : Oui seulement

### Exporter vos données

**Pourquoi exporter ?**
Safari peut supprimer les données d'un site inactif. L'export .md est votre sauvegarde fiable.

**Comment exporter ?**
1. ⚙️ → Import/Export
2. **"Exporter tout en .md"**
3. Un fichier `cave-cafe-export-YYYY-MM-DD.md` est téléchargé avec toutes vos données

### Restaurer une sauvegarde

**Quand utiliser ?**
- Après une réinstallation de l'app
- Si Safari a purgé vos données
- Pour transférer vos données vers un autre appareil

**Comment restaurer ?**
1. ⚙️ → Import/Export
2. Tapez sur **"Restaurer une sauvegarde"** (bouton en haut, mis en évidence)
3. Sélectionnez votre fichier `cave-cafe-export-*.md`
4. L'app restaure :
   - Tous vos cafés avec leurs informations complètes
   - L'historique des statuts
   - Toutes vos dégustations
5. Les données existantes sont fusionnées intelligemment (pas de doublons)

## Échelle de notation (1-5)

### Acidité
1. **Très faible** — 2. **Faible** — 3. **Modérée** — 4. **Élevée** — 5. **Très élevée**

### Amertume
1. **Très faible** — 2. **Faible** — 3. **Modérée** — 4. **Élevée** — 5. **Très élevée**

### Corps
1. **Très léger** — 2. **Léger** — 3. **Moyen** — 4. **Corsé** — 5. **Très corsé**

### Longueur en bouche
1. **Très courte** — 2. **Courte** — 3. **Moyenne** — 4. **Longue** — 5. **Très longue**

### Note globale
1. **Médiocre** — 2. **Passable** — 3. **Bon** — 4. **Excellent** — 5. **Exceptionnel**

## Méthodes d'infusion

- **Moka** : cafetière italienne (choix par défaut)
- **Piston** : French press / cafetière à piston
- **V60** : méthode pour-over / filtre

## Pastilles visuelles

Chaque carte café affiche des pastilles colorées pour identifier rapidement ses caractéristiques :

| Pastille | Couleur | Signification |
|----------|---------|---------------|
| **TL** | Ambre/Or | Torréfaction Légère (blonde) |
| **TM** | Marron | Torréfaction Moyenne (médium) |
| **TF** | Marron foncé | Torréfaction Forte (foncée) |
| **Bio** | Vert | Label biologique |
| **Déca** | Bleu | Décaféiné |
| **Fermenté** | Violet | Café fermenté |

Ces pastilles sont modifiables via le formulaire d'édition en mode Admin.

## Structure du projet

```
cave-cafe/
├── index.html                    # Point d'entrée HTML
├── styles.css                    # Styles CSS responsive
├── db.js                         # Module IndexedDB (CRUD)
├── parser.js                     # Parseur de fichiers .md
├── exporter.js                   # Générateur d'export .md
├── app.js                        # Application principale
├── manifest.json                 # Manifest PWA
├── sw.js                         # Service Worker (v2)
├── icons/                        # Icônes de l'application
│   └── icon.svg
├── README.md                     # Cette documentation
└── GUIDE_INSTALLATION_IPHONE.md  # Guide d'installation détaillé
```

## Technologies

- **HTML5 / CSS3** : responsive mobile-first avec safe-area iOS
- **JavaScript ES6+** : vanilla, sans framework
- **IndexedDB** : stockage local structuré
- **Service Worker** : mode offline et installation PWA (stratégie Network-first)

## Données et confidentialité

Toutes vos données restent 100% locales dans votre navigateur. Aucune information n'est 
envoyée à un serveur. Vous êtes propriétaire de vos données et pouvez les exporter à 
tout moment au format Markdown.

## Mise à jour de l'application

Voir `GUIDE_INSTALLATION_IPHONE.md` pour les instructions de mise à jour.

En cas de problème de cache sur Safari :
1. Réglages → Safari → Avancé → Données de sites
2. Supprimer les données github.io
3. Réinstaller l'application depuis Safari

## Génération des icônes

Pour générer les icônes PNG depuis le SVG :

```bash
# Avec ImageMagick
convert -background none icons/icon.svg -resize 192x192 icons/icon-192.png
convert -background none icons/icon.svg -resize 512x512 icons/icon-512.png

# Ou utilisez un outil en ligne comme realfavicongenerator.net
```

## Historique des versions

### Version 2.4 (Novembre 2026)
- **Mode Admin amélioré** : barre d'administration sur chaque carte avec checkbox + bouton "Ouvrir"
- Accès direct au détail et aux dégustations même en mode admin
- Pastilles repositionnées sous le nom pour une meilleure lisibilité

### Version 2.3 (Novembre 2026)
- **Pastilles visuelles** sur les cartes : TL/TM/TF (torréfaction), Bio, Déca, Fermenté
- Ajout du champ "Décaféiné" dans le formulaire d'édition
- Affichage optimisé des caractéristiques sur chaque carte

### Version 2.2 (Novembre 2026)
- **Restauration de sauvegarde** : réimportez vos fichiers `cave-cafe-export-*.md`
- Récupération complète : cafés, historique des statuts, dégustations
- Fusion intelligente avec les données existantes

### Version 2.0 (Novembre 2026)
- Ajout des méthodes d'infusion (Moka, Piston, V60)
- Synthèse automatique des dégustations avec moyennes
- Mode Admin avec gestion des doublons
- Modification et suppression des dégustations
- Amélioration du Service Worker (mise à jour automatique)

### Version 1.0 (Novembre 2026)
- Version initiale
- Import de fiches Plaine Café
- Gestion du stock (En stock / Entamé / Fini)
- Système de notation 1-5
- Export Markdown

## Licence

MIT License - Libre d'utilisation et de modification.

---

**Version** : 2.4  
**Auteur** : Cave à Café  
**Date** : Novembre 2026
