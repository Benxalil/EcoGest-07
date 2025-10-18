# Stratégie de Cache HTTP - EcoGest

## 📋 Vue d'ensemble

Cette documentation décrit la stratégie de cache HTTP mise en place pour optimiser les performances du projet EcoGest.

## 🎯 Objectifs

- **Réduire la charge serveur** en évitant les téléchargements répétitifs
- **Accélérer les visites récurrentes** grâce au cache navigateur
- **Améliorer le score LCP** (Largest Contentful Paint)
- **Optimiser le SEO** via des temps de chargement réduits

## 🔧 Configuration

### Fichiers de configuration

1. **`public/_headers`** : Configuration Netlify pour les en-têtes HTTP
2. **`netlify.toml`** : Configuration alternative Netlify (plus robuste)
3. **`vite.config.ts`** : Configuration Vite pour hasher les assets
4. **`public/sw.js`** : Service Worker aligné sur la stratégie de cache

### Stratégies de cache par type de fichier

#### 1. Assets versionnés (hashés) - Cache immutable ✅

**Fichiers concernés :**
- `/assets/*.js` (bundles JavaScript)
- `/assets/*.css` (feuilles de style)
- `*.webp`, `*.png`, `*.jpg`, `*.svg` (images)
- `*.woff2`, `*.woff`, `*.ttf` (fonts)

**Header appliqué :**
```
Cache-Control: public, max-age=31536000, immutable
```

**Explication :**
- `public` : Le cache peut être partagé (CDN, proxy)
- `max-age=31536000` : Cache valide pendant 1 an (365 jours)
- `immutable` : Le navigateur ne revalide JAMAIS ce fichier (hashé = unique)

**Avantages :**
- ✅ Zero requête réseau après la première visite
- ✅ Chargement instantané des assets
- ✅ Réduction drastique de la bande passante

#### 2. Fichiers non versionnés - Cache court avec revalidation 🔄

**Fichiers concernés :**
- `index.html`
- `/` (page racine)

**Header appliqué :**
```
Cache-Control: public, max-age=3600, must-revalidate
```

**Explication :**
- `max-age=3600` : Cache valide pendant 1 heure
- `must-revalidate` : Le navigateur doit revalider après expiration

**Avantages :**
- ✅ Cache rapide pour les visiteurs récurrents
- ✅ Revalidation régulière pour détecter les mises à jour
- ✅ Équilibre entre performance et fraîcheur du contenu

#### 3. Routes API - Aucun cache 🚫

**Fichiers concernés :**
- `/api/*` (toutes les routes API)

**Header appliqué :**
```
Cache-Control: no-store, private
```

**Explication :**
- `no-store` : Ne JAMAIS mettre en cache
- `private` : Cache uniquement côté client (pas de CDN)

**Avantages :**
- ✅ Données toujours à jour
- ✅ Sécurité renforcée (pas de cache de données sensibles)

## 🧪 Tests et validation

### Tests locaux (avant déploiement)

```bash
# Build du projet
npm run build

# Servir en local
npx serve dist -p 3000

# Tester les headers
curl -I http://localhost:3000/assets/index.abc123.js
curl -I http://localhost:3000/logo-complete.webp
curl -I http://localhost:3000/index.html
```

### Tests en production (après déploiement)

```bash
# Tester les assets hashés
curl -I https://votre-app.lovable.app/assets/index.abc123.js

# Vérifier la sortie attendue :
# Cache-Control: public, max-age=31536000, immutable
# X-Content-Type-Options: nosniff

# Tester les images WebP
curl -I https://votre-app.lovable.app/logo-complete.webp

# Vérifier la sortie attendue :
# Cache-Control: public, max-age=31536000, immutable

# Tester le HTML
curl -I https://votre-app.lovable.app/index.html

# Vérifier la sortie attendue :
# Cache-Control: public, max-age=3600, must-revalidate
# X-Content-Type-Options: nosniff
```

### Tests avec GTmetrix / PageSpeed Insights

1. **Accéder à [GTmetrix](https://gtmetrix.com/)**
2. **Entrer l'URL** : `https://votre-app.lovable.app`
3. **Vérifier les indicateurs :**
   - ✅ "Leverage browser caching" doit être vert
   - ✅ Score LCP amélioré (< 2.5s)
   - ✅ Aucune ressource statique re-téléchargée en visite récurrente

## 📊 Résultats attendus

### Avant optimisation ❌
- Assets re-téléchargés à chaque visite
- Temps de chargement : 3-5s (visiteurs récurrents)
- Score GTmetrix : C/D

### Après optimisation ✅
- Assets servis depuis le cache navigateur
- Temps de chargement : 0.5-1s (visiteurs récurrents)
- Score GTmetrix : A/B
- **Réduction de 80% du temps de chargement** en visite récurrente

## 🔄 Mise à jour des assets

### Comment forcer un rechargement ?

Grâce au **hashing automatique** de Vite :
1. Modifier un fichier source (ex: `App.tsx`)
2. Rebuilder : `npm run build`
3. Vite génère un nouveau hash : `index.abc123.js` → `index.def456.js`
4. Le navigateur télécharge automatiquement la nouvelle version

**Important :** Le fichier `index.html` (cache court) pointe toujours vers le dernier hash.

### Procédure de déploiement

```bash
# 1. Build avec nouveaux hashs
npm run build

# 2. Vérifier les hashs générés
ls -la dist/assets/

# 3. Déployer (Lovable fait automatiquement)
git push

# 4. Tester les nouveaux headers
curl -I https://votre-app.lovable.app/assets/index.NEW_HASH.js
```

## 🛡️ Sécurité

### Headers de sécurité inclus

```
X-Content-Type-Options: nosniff
```

**Explication :**
- Empêche le navigateur de "deviner" le type MIME
- Protège contre les attaques XSS via type MIME sniffing

## 📈 Métriques de performance

### Avant/Après (exemple)

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Temps de chargement (visite récurrente)** | 3.2s | 0.6s | -81% |
| **Requêtes réseau** | 45 | 3 | -93% |
| **Bande passante utilisée** | 2.5 MB | 0.3 MB | -88% |
| **Score GTmetrix** | C (68%) | A (94%) | +26 pts |
| **LCP (Largest Contentful Paint)** | 2.8s | 1.1s | -61% |

## 🚀 Optimisations futures possibles

1. **CDN** : Utiliser Cloudflare/Vercel Edge pour cache géographique
2. **HTTP/3** : Activer QUIC pour réduire la latence
3. **Preload** : Ajouter `<link rel="preload">` pour ressources critiques
4. **Service Worker avancé** : Cache offline complet (PWA)

## 📝 Notes techniques

### Pourquoi `immutable` est si important ?

Sans `immutable` :
- Le navigateur envoie une requête `If-None-Match` (validation)
- Le serveur répond `304 Not Modified`
- **Coût :** 50-100ms de latence réseau

Avec `immutable` :
- Le navigateur ne fait **AUCUNE requête**
- **Coût :** 0ms (instantané)

### Compatibilité navigateurs

| Navigateur | `Cache-Control: immutable` | `must-revalidate` |
|------------|----------------------------|-------------------|
| Chrome 54+ | ✅ | ✅ |
| Firefox 49+ | ✅ | ✅ |
| Safari 11+ | ✅ | ✅ |
| Edge 15+ | ✅ | ✅ |

**Conclusion :** Support universel pour tous les navigateurs modernes.

## 📚 Ressources

- [MDN: Cache-Control](https://developer.mozilla.org/fr/docs/Web/HTTP/Headers/Cache-Control)
- [Netlify Headers](https://docs.netlify.com/routing/headers/)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Web.dev: HTTP Caching](https://web.dev/http-cache/)

---

**Dernière mise à jour :** 2025-10-18  
**Auteur :** EcoGest Team  
**Version :** 1.0.0
