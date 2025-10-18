# Optimisations de Performance - EcoGest

## 📊 Vue d'ensemble

Ce document décrit toutes les optimisations de performance appliquées au projet EcoGest pour améliorer le FCP (First Contentful Paint), LCP (Largest Contentful Paint), et TBT (Total Blocking Time).

---

## 🎯 Objectifs de Performance

| Métrique | Cible | Impact Attendu |
|----------|-------|----------------|
| **FCP** | < 1.0s | -300 à -500ms |
| **LCP** | < 2.0s | -200 à -400ms |
| **TBT** | < 150ms | -100 à -300ms |
| **Performance Score** | > 90 | +15 à +25 points |
| **Bundle Size** | Réduit | -100 à -150KB |

---

## 🚀 Optimisations Appliquées

### 1. **CSS Critique**

#### Problème
Le CSS Tailwind complet (50-100KB) était chargé en série avant le premier rendu, retardant le FCP/LCP.

#### Solution
- **Inline du CSS above-the-fold** avec `vite-plugin-critical-css`
- **Preload du CSS complet** en arrière-plan
- **Préchargement explicite** dans `index.html`

#### Configuration
```html
<!-- index.html -->
<link rel="preload" href="/src/index.css" as="style" />
<link rel="stylesheet" href="/src/index.css" />
```

```typescript
// vite.config.ts
critical({
  inline: true,
  minify: true,
  extract: true,
  dimensions: [
    { width: 375, height: 667 },  // Mobile
    { width: 1920, height: 1080 } // Desktop
  ]
})
```

#### Impact
- **FCP** : -200 à -400ms
- **LCP** : -100 à -200ms

---

### 2. **Scripts Non Critiques**

#### Problème
Le script `gptengineer.js` utilisait `defer`, bloquant partiellement le parsing HTML.

#### Solution
Changement de `defer` à `async` pour un chargement non-bloquant :

```html
<!-- Avant -->
<script src="https://cdn.gpteng.co/gptengineer.js" type="module" defer></script>

<!-- Après -->
<script src="https://cdn.gpteng.co/gptengineer.js" type="module" async></script>
```

#### Impact
- **FCP** : -20 à -50ms
- Parsing HTML non bloqué

---

### 3. **Code Splitting Intelligent**

#### Problème
- Routes lazy-loaded sans prefetching
- Navigation lente entre pages
- Pas de chunking vendor optimal

#### Solution A : Prefetch Intelligent
Création de `src/utils/routePrefetch.ts` avec `lazyWithPrefetch()` :

```typescript
const PageListeEnseignants = lazyWithPrefetch(
  () => import("./pages/enseignants/ListeEnseignants"),
  'idle'
);
```

**Stratégies de prefetch :**
- `'idle'` : Précharge pendant les moments idle du navigateur
- `'hover'` : Précharge au survol d'un lien (futur)
- `'visible'` : Précharge quand visible dans le viewport (futur)

#### Solution B : Chunking Vendor Manuel
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        'query-vendor': ['@tanstack/react-query'],
        'supabase-vendor': ['@supabase/supabase-js']
      }
    }
  }
}
```

#### Impact
- **Navigation inter-routes** : -500ms à -1s (instantanée après prefetch)
- **Cache plus granulaire** : Changement d'une lib n'invalide pas tout
- **Meilleure parallélisation** des téléchargements

---

### 4. **Optimisation React Query**

#### Problème
`ReactQueryDevtools` était inclus dans le bundle de production (+50-80KB).

#### Solution
Import conditionnel avec dynamic import :

```typescript
// src/main.tsx
const DevTools = import.meta.env.DEV 
  ? lazy(() => import('@tanstack/react-query-devtools').then(m => ({ 
      default: () => <m.ReactQueryDevtools initialIsOpen={false} /> 
    })))
  : null;
```

#### Impact
- **Bundle prod** : -50 à -80KB
- **TBT** : -20 à -50ms

---

### 5. **Initialisation Non-Bloquante**

#### Problème
Initialisations synchrones dans `main.tsx` retardaient le premier rendu :
- Performance monitoring
- Service Worker registration

#### Solution
Déplacement des initialisations après le premier rendu avec `requestIdleCallback` :

```typescript
// Render immédiat
createRoot(rootElement!).render(<App />);

// Initialiser après le premier rendu
requestIdleCallback(() => {
  performanceMonitor.initialize();
  initializePerformanceOptimizations();
  // Service Worker registration
});
```

#### Impact
- **TTI** : -100 à -300ms
- **TBT** : -50 à -100ms

---

### 6. **Resource Hints**

#### Solution
Ajout de preconnect/dns-prefetch pour les ressources externes :

```html
<!-- index.html -->
<link rel="dns-prefetch" href="https://uoqierhqpnqnbsnbzaqa.supabase.co" />
<link rel="preconnect" href="https://uoqierhqpnqnbsnbzaqa.supabase.co" crossorigin />
<link rel="modulepreload" href="/src/main.tsx" />
```

#### Impact
- **Connexion Supabase** : -100 à -200ms
- **Module principal** : Préchargé en parallèle

---

## 📈 Résultats Attendus

### Métriques Lighthouse (Score Production)

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Performance** | 70-75 | 90-95 | +20-25 points |
| **FCP** | 1.5-2.0s | 0.8-1.0s | -500 à -700ms |
| **LCP** | 2.5-3.0s | 1.5-2.0s | -700 à -1000ms |
| **TBT** | 300-400ms | 100-150ms | -200 à -300ms |
| **CLS** | < 0.1 | < 0.1 | Stable |

### Bundle Size

| Chunk | Avant | Après | Réduction |
|-------|-------|-------|-----------|
| **index.js** | ~250KB | ~180KB | -70KB (-28%) |
| **vendor-react** | Inclus | ~120KB | Séparé |
| **vendor-ui** | Inclus | ~80KB | Séparé |
| **Total initial** | ~250KB | ~180KB | -70KB (-28%) |

---

## 🧪 Tests et Validation

### Tests Locaux

```bash
# 1. Build de production
npm run build

# 2. Serveur local
npx serve dist -p 3000

# 3. Lighthouse CLI
npx lighthouse http://localhost:3000 --view

# 4. Vérifier les headers de cache
curl -I http://localhost:3000/assets/index.[hash].js
# Attendu: Cache-Control: public, max-age=31536000, immutable
```

### Tests Production (Lovable/Netlify)

```bash
# 1. Vérifier les headers
curl -I https://votre-app.lovable.app/

# 2. Lighthouse en ligne
# Ouvrir chrome://lighthouse/ et analyser l'URL de production

# 3. GTmetrix
# https://gtmetrix.com/ avec l'URL de production
```

### Checklist de Validation

- [ ] **FCP < 1.0s** sur mobile 4G
- [ ] **LCP < 2.0s** sur mobile 4G
- [ ] **TBT < 150ms** sur desktop
- [ ] **Performance Score > 90** sur desktop et mobile
- [ ] **Cache headers** corrects sur tous les assets
- [ ] **Preload** visible dans les Network headers
- [ ] **Chunking vendor** visible dans le waterfall (DevTools)
- [ ] **Navigation instantanée** entre routes après prefetch

---

## 🔄 Procédure de Mise à Jour

### Quand modifier les assets statiques :

1. **Build** : `npm run build`
2. **Vérifier hash** : Les fichiers dans `dist/assets/` doivent avoir des hash différents
3. **Tester localement** : `npx serve dist`
4. **Push** : Le cache long (`max-age=31536000, immutable`) garantit que les nouveaux hash invalident le cache

### Quand modifier le HTML :

1. Le cache court (`max-age=3600, must-revalidate`) garantit que les changements HTML sont visibles rapidement
2. Forcer un refresh : `Ctrl+Shift+R` (Chrome) ou `Cmd+Shift+R` (Mac)

---

## 🛠️ Outils et Plugins Utilisés

| Outil | Usage | Documentation |
|-------|-------|---------------|
| **vite-plugin-critical-css** | Extraction CSS critique | [GitHub](https://github.com/Dschungelabenteuer/vite-plugin-critical) |
| **Vite rollupOptions** | Chunking vendor | [Vite Docs](https://vitejs.dev/config/build-options.html#build-rollupoptions) |
| **React.lazy()** | Code splitting | [React Docs](https://react.dev/reference/react/lazy) |
| **requestIdleCallback** | Initialisation non-bloquante | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) |

---

## 📚 Références

- [Web.dev - Optimize FCP](https://web.dev/fcp/)
- [Web.dev - Optimize LCP](https://web.dev/lcp/)
- [Vite - Asset Handling](https://vitejs.dev/guide/assets.html)
- [HTTP Caching Strategy](./CACHE_STRATEGY.md)
- [Lovable Performance Best Practices](https://docs.lovable.dev/)

---

## 🔮 Optimisations Futures

### Phase 2 (À considérer)
- [ ] **Image optimization** : Format AVIF + lazy loading natif
- [ ] **CDN implementation** : Cloudflare/Vercel Edge pour latence < 50ms
- [ ] **HTTP/3** : Si supporté par l'hébergeur
- [ ] **WebAssembly** : Pour calculs lourds (PDF génération)
- [ ] **Prefetch hover-based** : Précharger au survol des liens
- [ ] **Service Worker avancé** : Cache API responses

### Phase 3 (Avancé)
- [ ] **Edge Functions** : SSR partiel pour LCP critique
- [ ] **Islands Architecture** : Hydratation partielle
- [ ] **Streaming SSR** : React 18 Suspense boundaries

---

**Dernière mise à jour** : 2025-10-18  
**Auteur** : EcoGest Team  
**Version** : 1.0.0
