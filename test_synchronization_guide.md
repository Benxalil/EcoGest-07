# Guide de Test - Synchronisation des Notes

## Problème résolu
Les notes saisies via "Notes par Élève" et "Consulter les Notes" n'étaient pas synchronisées. Chaque interface utilisait sa propre logique de sauvegarde et de chargement.

## Modifications apportées

### 1. Unification de la logique de sauvegarde
- **Notes par Élève** : Suppression de la sauvegarde automatique, ajout d'un bouton "Sauvegarder toutes les notes"
- **Consulter les Notes** : Conservation de la logique de sauvegarde manuelle
- **Base de données** : Utilisation du même hook `useGrades` et de la même table `grades`

### 2. Gestion des changements non sauvegardés
- Ajout de l'état `hasUnsavedChanges` dans "Notes par Élève"
- Le bouton "Sauvegarder toutes les notes" est désactivé par défaut
- Le bouton s'active automatiquement quand des notes sont modifiées
- Le bouton se désactive après sauvegarde réussie

### 3. Synchronisation bidirectionnelle
- Les deux interfaces utilisent la même structure de données en base
- Les notes sont chargées depuis la base de données à chaque ouverture
- Les modifications sont persistées dans la même table `grades`

## Scripts de test fournis

### 1. `test_notes_synchronization.sql`
- Vérifie la cohérence des données entre les interfaces
- Affiche les notes par élève, matière et type d'examen
- Contrôle la cohérence des types d'examens

### 2. `cleanup_test_notes.sql`
- Permet de nettoyer les données de test si nécessaire
- Affiche d'abord les notes qui seront supprimées
- Supprime les notes de test (à décommenter si nécessaire)

## Instructions de test

### Test 1 : Synchronisation Notes par Élève → Consulter les Notes

1. **Ouvrir "Notes par Élève"**
   - Sélectionner un élève
   - Saisir des notes (devoir et composition)
   - Cliquer sur "Sauvegarder toutes les notes"
   - Vérifier le message de succès

2. **Ouvrir "Consulter les Notes"**
   - Sélectionner la même classe et matière
   - Vérifier que les notes saisies précédemment s'affichent
   - Les champs doivent être pré-remplis avec les valeurs correctes

### Test 2 : Synchronisation Consulter les Notes → Notes par Élève

1. **Ouvrir "Consulter les Notes"**
   - Sélectionner une classe et une matière
   - Saisir des notes pour plusieurs élèves
   - Cliquer sur "Sauvegarder"
   - Vérifier le message de succès

2. **Ouvrir "Notes par Élève"**
   - Sélectionner un élève de la même classe
   - Vérifier que les notes saisies précédemment s'affichent
   - Les champs doivent être pré-remplis avec les valeurs correctes

### Test 3 : Vérification en base de données

1. **Exécuter `test_notes_synchronization.sql`**
   - Vérifier que toutes les notes sont bien enregistrées
   - Contrôler la cohérence des types d'examens
   - Vérifier que les notes de composition sont bien séparées (devoir/composition)

### Test 4 : Test de persistance

1. **Saisir des notes via une interface**
2. **Fermer et rouvrir l'application**
3. **Vérifier que les notes sont toujours présentes**
4. **Tester avec l'autre interface**

## Comportement attendu

### Notes par Élève
- ✅ Bouton "Sauvegarder toutes les notes" désactivé par défaut
- ✅ Bouton s'active quand des notes sont modifiées
- ✅ Bouton se désactive après sauvegarde réussie
- ✅ Notes chargées depuis la base de données au démarrage
- ✅ Notes affichées correctement selon le type d'examen

### Consulter les Notes
- ✅ Notes chargées depuis la base de données au démarrage
- ✅ Notes affichées correctement selon le type d'examen
- ✅ Bouton "Sauvegarder" désactivé par défaut
- ✅ Bouton s'active quand des notes sont modifiées
- ✅ Bouton se désactive après sauvegarde réussie

### Synchronisation
- ✅ Les notes saisies via une interface apparaissent dans l'autre
- ✅ Les modifications sont persistées en base de données
- ✅ Les données sont cohérentes entre les deux interfaces
- ✅ Pas de perte de données lors du passage d'une interface à l'autre

## Dépannage

### Si les notes ne s'affichent pas
1. Vérifier que les notes sont bien enregistrées en base (script SQL)
2. Vérifier les logs de la console pour les erreurs
3. Vérifier que les IDs de classe et matière correspondent

### Si la synchronisation ne fonctionne pas
1. Vérifier que les deux interfaces utilisent la même structure de données
2. Vérifier que les types d'examens sont cohérents
3. Vérifier que les semestres sont correctement gérés

### Si les boutons ne s'activent pas
1. Vérifier que l'état `hasUnsavedChanges` est correctement géré
2. Vérifier que les fonctions de changement de note marquent les changements
3. Vérifier que les fonctions de sauvegarde réinitialisent l'état

