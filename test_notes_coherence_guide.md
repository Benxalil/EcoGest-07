# Guide de Test - Cohérence de la Gestion des Notes

## 🎯 Objectifs du Test

Vérifier que la gestion des notes est cohérente entre les deux interfaces et que toutes les fonctionnalités fonctionnent correctement.

## 📋 Checklist de Vérification

### ✅ 1. Cohérence d'Affichage

#### Test 1.1 : Examen de Composition
- [ ] **Créer un examen** avec "Composition" dans le nom
- [ ] **Consulter les Notes** → Vérifier colonnes "Devoir" + "Composition"
- [ ] **Notes par Élève** → Vérifier colonnes "Devoir" + "Composition"
- [ ] **Titre dynamique** → "Saisie des Notes - [Nom de l'examen]"

#### Test 1.2 : Examen Non-Composition
- [ ] **Créer un examen** sans "Composition" dans le nom (ex: "Examen Blanc")
- [ ] **Consulter les Notes** → Vérifier une seule colonne avec le nom de l'examen
- [ ] **Notes par Élève** → Vérifier une seule colonne avec le nom de l'examen
- [ ] **Titre dynamique** → "Saisie des Notes - [Nom de l'examen]"

### ✅ 2. Champs Vides par Défaut

#### Test 2.1 : Nouvel Examen
- [ ] **Créer un nouvel examen**
- [ ] **Ouvrir "Consulter les Notes"** → Tous les champs doivent être vides
- [ ] **Ouvrir "Notes par Élève"** → Tous les champs doivent être vides
- [ ] **Aucune valeur par défaut** → Pas de zéro ou autre valeur

#### Test 2.2 : Examen Existant
- [ ] **Ouvrir un examen existant**
- [ ] **Vérifier l'affichage** → Les notes existantes doivent s'afficher
- [ ] **Champs vides** → Les champs sans notes doivent rester vides

### ✅ 3. Synchronisation Bidirectionnelle

#### Test 3.1 : Consulter → Notes par Élève
- [ ] **Saisir une note** dans "Consulter les Notes"
- [ ] **Sauvegarder** la note
- [ ] **Aller à "Notes par Élève"** → La note doit apparaître
- [ ] **Modifier la note** dans "Notes par Élève"
- [ ] **Sauvegarder** la modification
- [ ] **Retourner à "Consulter les Notes"** → La modification doit apparaître

#### Test 3.2 : Notes par Élève → Consulter
- [ ] **Saisir une note** dans "Notes par Élève"
- [ ] **Sauvegarder** la note
- [ ] **Aller à "Consulter les Notes"** → La note doit apparaître
- [ ] **Modifier la note** dans "Consulter les Notes"
- [ ] **Sauvegarder** la modification
- [ ] **Retourner à "Notes par Élève"** → La modification doit apparaître

### ✅ 4. Suppression en Cascade

#### Test 4.1 : Suppression d'Examen
- [ ] **Créer un examen** avec des notes
- [ ] **Vérifier les notes** en base de données
- [ ] **Supprimer l'examen** via l'interface
- [ ] **Vérifier** que les notes associées sont supprimées
- [ ] **Aucune donnée orpheline** → Vérifier qu'il n'y a pas de notes sans examen

#### Test 4.2 : Vérification Base de Données
- [ ] **Exécuter le script SQL** `test_final_notes_management.sql`
- [ ] **Vérifier les contraintes** de clé étrangère
- [ ] **Vérifier l'intégrité** des données

## 🧪 Scénarios de Test Détaillés

### Scénario 1 : Examen de Composition Complet

1. **Créer un examen** "Première Composition"
2. **Ouvrir "Consulter les Notes"**
   - Vérifier : Titre "Saisie des Notes - Première Composition"
   - Vérifier : Colonnes "Devoir", "Composition", "Coeff."
   - Vérifier : Champs vides par défaut
3. **Saisir des notes** (ex: Devoir: 8, Composition: 12)
4. **Sauvegarder** les notes
5. **Ouvrir "Notes par Élève"**
   - Vérifier : Colonnes "Devoir", "Composition", "Coeff."
   - Vérifier : Notes affichées (8, 12)
6. **Modifier une note** (ex: Devoir: 9)
7. **Sauvegarder** la modification
8. **Retourner à "Consulter les Notes"**
   - Vérifier : Note modifiée affichée (9, 12)

### Scénario 2 : Examen Non-Composition Complet

1. **Créer un examen** "Examen Blanc"
2. **Ouvrir "Consulter les Notes"**
   - Vérifier : Titre "Saisie des Notes - Examen Blanc"
   - Vérifier : Colonne "Examen Blanc", "Coeff."
   - Vérifier : Champs vides par défaut
3. **Saisir une note** (ex: 15.5)
4. **Sauvegarder** la note
5. **Ouvrir "Notes par Élève"**
   - Vérifier : Colonne "Examen Blanc", "Coeff."
   - Vérifier : Note affichée (15.5)
6. **Modifier la note** (ex: 16.5)
7. **Sauvegarder** la modification
8. **Retourner à "Consulter les Notes"**
   - Vérifier : Note modifiée affichée (16.5)

### Scénario 3 : Suppression en Cascade

1. **Créer un examen** "Test Suppression"
2. **Ajouter des notes** pour plusieurs élèves
3. **Vérifier en base** : `SELECT COUNT(*) FROM grades WHERE exam_id = 'exam-id'`
4. **Supprimer l'examen** via l'interface
5. **Vérifier en base** : `SELECT COUNT(*) FROM grades WHERE exam_id = 'exam-id'`
6. **Résultat attendu** : 0 notes restantes

## 🔍 Points de Vérification Critiques

### Interface Utilisateur
- [ ] **Titres dynamiques** selon le type d'examen
- [ ] **Colonnes correctes** selon le type d'examen
- [ ] **Champs vides** par défaut
- [ ] **Boutons de sauvegarde** actifs/inactifs correctement
- [ ] **Messages de confirmation** appropriés

### Base de Données
- [ ] **Intégrité des données** préservée
- [ ] **Suppression en cascade** fonctionnelle
- [ ] **Aucune donnée orpheline**
- [ ] **Types d'examens** correctement stockés
- [ ] **Notes** correctement associées aux examens

### Performance
- [ ] **Chargement rapide** des notes
- [ ] **Sauvegarde rapide** des modifications
- [ ] **Synchronisation** en temps réel
- [ ] **Pas de requêtes** inutiles

## 📊 Résultats Attendus

### ✅ Succès
- **Cohérence parfaite** entre les deux interfaces
- **Champs vides** par défaut pour les nouveaux examens
- **Synchronisation bidirectionnelle** fonctionnelle
- **Suppression en cascade** sans données orphelines
- **Performance optimale** pour toutes les opérations

### ❌ Échecs à Corriger
- **Incohérence d'affichage** entre les interfaces
- **Valeurs par défaut** non vides
- **Synchronisation** non fonctionnelle
- **Données orphelines** après suppression
- **Performance** dégradée

## 🚀 Actions Correctives

Si des problèmes sont détectés :

1. **Vérifier la logique** de détection du type d'examen
2. **Corriger l'initialisation** des champs vides
3. **Améliorer la synchronisation** entre les interfaces
4. **Renforcer la suppression** en cascade
5. **Optimiser les performances** des requêtes

## 📝 Rapport de Test

Après chaque test, documenter :
- **Date et heure** du test
- **Scénario testé**
- **Résultats obtenus**
- **Problèmes détectés**
- **Actions correctives** prises
- **Statut final** (✅ Succès / ❌ Échec)
