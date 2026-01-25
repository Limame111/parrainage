# 🎓 Journée d'Intégration - Section Informatique

Application Angular **premium** pour le système de parrainage automatique entre étudiants L1 (filleuls) et L2 (parrains).

## ✨ Fonctionnalités

- 🎨 **Design premium** avec glassmorphism et effets de lumière avancés
- 🎬 **Animations fluides** avec GSAP et CSS optimisées
- 📊 **Parrainage automatique** : attribution aléatoire de 1 ou 2 parrains par filleul
- 📄 **Données JSON** : chargement rapide depuis `/assets/l1.json` et `/assets/l2.json`
- 🎯 **Révélation progressive** des résultats avec animations spectaculaires
- ⚡ **Performance optimisée** : fonts système, chargement rapide, animations fluides
- 📱 **Responsive** : optimisé pour desktop et mobile

## 🚀 Démarrage rapide

### Prérequis

- Node.js (v18 ou supérieur)
- npm ou yarn

### Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm start
```

L'application sera accessible sur `http://localhost:4200/`

## 📋 Format des fichiers JSON

Les données sont chargées depuis les fichiers JSON dans `/public/assets/` :

### Format attendu

```json
[
  { "id": 1, "nom": "Amine Benali" },
  { "id": 2, "nom": "Sara Khadija" },
  { "id": 3, "nom": "Youssef Alami" }
]
```

### Fichiers requis

- **`/public/assets/l1.json`** : Liste des étudiants L1 (filleuls)
- **`/public/assets/l2.json`** : Liste des étudiants L2 (parrains)

### Exemples

Des fichiers d'exemple sont déjà présents dans `public/assets/` :
- `l1.json` : Liste de 20 étudiants L1 (filleuls)
- `l2.json` : Liste de 20 étudiants L2 (parrains)

## 🎯 Utilisation

1. **Page d'accueil** : Cliquez sur "Lancer le Parrainage"
2. **Chargement automatique** : Les données JSON sont chargées automatiquement
3. **Statistiques** : Visualisez le nombre de filleuls et parrains
4. **Lancement** : Cliquez sur "🚀 Lancer le Parrainage"
5. **Résultats** : Les résultats s'affichent avec une révélation animée progressive et confetti final

## 🏗️ Architecture

```
src/
├── app/
│   ├── components/
│   │   ├── landing/          # Page d'accueil avec animations
│   │   └── main/             # Page principale avec résultats
│   └── services/
│       ├── data-loader.service.ts    # Service de chargement JSON
│       └── parrainage.service.ts      # Service de parrainage automatique
├── styles.css                 # Styles globaux (design premium)
└── index.html

public/
└── assets/
    ├── l1.json                # Données des filleuls (L1)
    └── l2.json                # Données des parrains (L2)
```

## 🎨 Design & Technologies

- **Angular 20** : Framework principal
- **TypeScript** : Langage de développement
- **GSAP** : Animations premium
- **CSS3** : Glassmorphism, gradients, animations optimisées
- **HTTP Client** : Chargement des données JSON
- **Responsive Design** : Flexbox & Grid
- **Performance** : Fonts système, optimisations CSS

## 🔧 Scripts disponibles

```bash
# Développement
npm start          # Lance le serveur de développement

# Build
npm run build      # Compile l'application pour la production

# Tests
npm test           # Lance les tests unitaires
```

## 📝 Notes techniques

### Performance

- **Fonts système** : Utilisation de fonts système avec fallback pour un chargement ultra-rapide
- **Animations optimisées** : GSAP avec hardware acceleration
- **Lazy loading** : Composants chargés à la demande
- **CSS optimisé** : Variables CSS, transitions fluides

### Parrainage

- **Parrainage équilibré** : L'algorithme répartit les parrains de manière équilibrée
- **Aléatoire** : Les parrains sont mélangés aléatoirement (Fisher-Yates)
- **1 ou 2 parrains** : Chaque filleul reçoit 1 ou 2 parrains selon la disponibilité
- **Aucun backend** : Tout fonctionne côté client

### Design Premium

- **Glassmorphism** : Effets de verre avec backdrop-filter
- **Dégradés animés** : Gradients animés sur les titres
- **Effets de lumière** : Glow, shadows, particules animées
- **Animations 3D** : Transformations 3D sur les cartes
- **Confetti final** : Animation festive à la fin

## 🎓 Crédits

Développé pour la **Journée d'Intégration de la Section Informatique**

---

**Bon parrainage ! 🚀**
