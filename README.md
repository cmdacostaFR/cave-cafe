# Cave à Café — Application PWA

Application web progressive pour gérer votre collection personnelle de cafés de spécialité. 
Suivez votre stock, enregistrez vos dégustations avec un système de notation structuré, 
et exportez vos données en Markdown.

## Caractéristiques principales

- **100% local** : aucune connexion serveur requise, toutes les données restent dans votre navigateur
- **Optimisé pour iPhone Safari** : interface tactile, zones de sécurité, mode standalone
- **Import de fiches café** : parseur intelligent pour fichiers Markdown Plaine Café
- **Système de notation 1-5** : avec génération automatique de texte formaté
- **Export Markdown** : tableau récapitulatif + fiches détaillées pour sauvegarde

## Installation sur iPhone

1. Ouvrez Safari et naviguez vers l'URL de l'application
2. Tapez sur le bouton **Partager** (icône carré avec flèche)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Nommez l'app "Cave à Café" et tapez **"Ajouter"**
5. L'icône apparaît sur votre écran d'accueil

> **Important** : Safari peut purger les données d'un site inactif après plusieurs semaines. 
> Pensez à exporter régulièrement vos données (voir section Export).

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
3. Un fichier est téléchargé avec toutes vos données

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

## Structure du projet

```
cave-cafe/
├── index.html          # Point d'entrée HTML
├── styles.css          # Styles CSS responsive
├── db.js               # Module IndexedDB (CRUD)
├── parser.js           # Parseur de fichiers .md
├── exporter.js         # Générateur d'export .md
├── app.js              # Application principale
├── manifest.json       # Manifest PWA
├── sw.js               # Service Worker
├── icons/              # Icônes de l'application
│   └── icon.svg
└── README.md           # Cette documentation
```

## Technologies

- **HTML5 / CSS3** : responsive mobile-first avec safe-area iOS
- **JavaScript ES6+** : vanilla, sans framework
- **IndexedDB** : stockage local structuré
- **Service Worker** : mode offline et installation PWA

## Données et confidentialité

Toutes vos données restent 100% locales dans votre navigateur. Aucune information n'est 
envoyée à un serveur. Vous êtes propriétaire de vos données et pouvez les exporter à 
tout moment au format Markdown.

## Génération des icônes

Pour générer les icônes PNG depuis le SVG :

```bash
# Avec ImageMagick
convert -background none icons/icon.svg -resize 192x192 icons/icon-192.png
convert -background none icons/icon.svg -resize 512x512 icons/icon-512.png

# Ou utilisez un outil en ligne comme realfavicongenerator.net
```

## Licence

MIT License - Libre d'utilisation et de modification.

---

**Version** : 1.0  
**Auteur** : Cave à Café  
**Date** : Novembre 2026
