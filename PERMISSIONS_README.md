# Système de Gestion des Permissions pour les Notes

## 🎯 Vue d'ensemble

Ce système implémente une gestion complète des rôles et permissions pour la gestion des notes dans l'application EcoGest. Il permet de contrôler l'accès des enseignants et administrateurs aux différentes fonctionnalités selon leurs responsabilités.

## 👥 Rôles et Permissions

### 🔧 Enseignants
- **Accès limité** : Peuvent consulter et modifier les notes uniquement pour les matières qu'ils enseignent
- **Filtrage automatique** : Les données sont automatiquement filtrées selon leurs assignations
- **Sécurité** : Impossible d'accéder aux notes d'autres matières

### 👑 Administrateurs d'école
- **Accès complet** : Peuvent consulter et modifier toutes les notes, toutes les matières, toutes les classes
- **Contrôle total** : Peuvent corriger ou compléter les notes de tous les enseignants
- **Gestion des assignations** : Peuvent assigner des matières et classes aux enseignants

## 🏗️ Architecture Technique

### Hooks Principaux

#### `usePermissions()`
```typescript
interface UserPermissions {
  canViewAllGrades: boolean;
  canEditAllGrades: boolean;
  canViewSubjectGrades: (subjectId: string) => boolean;
  canEditSubjectGrades: (subjectId: string) => boolean;
  canViewClassGrades: (classId: string) => boolean;
  canEditClassGrades: (classId: string) => boolean;
  isAdmin: boolean;
  isTeacher: boolean;
}
```

#### `useGrades(examId?, studentId?, subjectId?, classId?)`
- Filtre automatiquement les notes selon les permissions
- Applique les restrictions d'accès en temps réel
- Vérifie les permissions avant chaque opération CRUD

### Composants Principaux

#### `GradesManagement`
- Interface principale pour la gestion des notes
- Affiche les données selon les permissions de l'utilisateur
- Filtres automatiques par matière et classe

#### `GradesTable`
- Tableau des notes avec édition en ligne
- Vérification des permissions avant chaque action
- Interface adaptée selon le rôle de l'utilisateur

#### `TeacherAssignment` (Admin uniquement)
- Interface pour assigner des matières et classes aux enseignants
- Gestion complète des assignations
- Mise à jour en temps réel des permissions

## 🗄️ Structure de la Base de Données

### Tables Principales

#### `teacher_subjects`
```sql
CREATE TABLE teacher_subjects (
    id UUID PRIMARY KEY,
    teacher_id UUID REFERENCES users(id),
    subject_id UUID REFERENCES subjects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, subject_id)
);
```

#### `teacher_classes`
```sql
CREATE TABLE teacher_classes (
    id UUID PRIMARY KEY,
    teacher_id UUID REFERENCES users(id),
    class_id UUID REFERENCES classes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, class_id)
);
```

### Colonnes Ajoutées à `users`
- `subjects`: JSONB - Matières assignées (mis à jour automatiquement)
- `classes`: JSONB - Classes assignées (mis à jour automatiquement)
- `role`: TEXT - Rôle de l'utilisateur

## 🚀 Utilisation

### 1. Configuration Initiale
```bash
# Exécuter le script SQL pour créer les tables et colonnes
psql -d your_database -f add_user_subjects_classes.sql
```

### 2. Assignation des Enseignants (Admin)
1. Aller sur la page "Assignation des Enseignants"
2. Sélectionner un enseignant
3. Cocher les matières et classes qu'il doit enseigner
4. Sauvegarder

### 3. Gestion des Notes
1. Aller sur la page "Gestion des Notes"
2. Les données sont automatiquement filtrées selon les permissions
3. Les enseignants voient seulement leurs matières/classes
4. Les administrateurs voient tout

## 🔒 Sécurité

### Vérifications Automatiques
- **Lecture** : Filtrage des données selon les permissions
- **Écriture** : Vérification des permissions avant chaque modification
- **Suppression** : Contrôle d'accès avant suppression

### Messages d'Erreur
- Accès refusé avec explication claire
- Redirection automatique si pas d'autorisation
- Interface adaptée selon le rôle

## 📊 Fonctionnalités

### Pour les Enseignants
- ✅ Voir uniquement leurs matières et classes
- ✅ Modifier les notes de leurs élèves
- ✅ Statistiques limitées à leurs données
- ✅ Interface simplifiée et ciblée

### Pour les Administrateurs
- ✅ Vue complète de toutes les données
- ✅ Gestion des assignations
- ✅ Correction des notes de tous les enseignants
- ✅ Statistiques globales
- ✅ Contrôle total du système

## 🧪 Test et Débogage

### Page de Test
Accédez à `/test/permissions` pour :
- Voir les permissions actuelles
- Tester l'accès aux différentes matières/classes
- Vérifier les données disponibles
- Déboguer les problèmes d'accès

### Logs de Débogage
- Les erreurs de permissions sont loggées dans la console
- Messages d'erreur explicites pour l'utilisateur
- Vérification des permissions en temps réel

## 🔄 Mise à Jour des Permissions

### Automatique
- Les permissions sont mises à jour automatiquement lors des changements d'assignation
- Pas besoin de redémarrage de l'application
- Synchronisation en temps réel

### Manuelle
- Les administrateurs peuvent modifier les assignations à tout moment
- Les changements prennent effet immédiatement
- Historique des modifications disponible

## 🎨 Interface Utilisateur

### Indicateurs Visuels
- Badges de rôle dans la sidebar
- Couleurs différentes selon les permissions
- Messages d'information contextuels
- Interface adaptée selon le niveau d'accès

### Navigation
- Pages protégées selon les permissions
- Redirection automatique si accès refusé
- Menu adapté selon le rôle de l'utilisateur

## 📈 Performance

### Optimisations
- Requêtes filtrées côté base de données
- Cache des permissions utilisateur
- Chargement paresseux des données
- Index optimisés pour les requêtes

### Scalabilité
- Support de nombreux enseignants et matières
- Requêtes efficaces même avec beaucoup de données
- Mise à jour incrémentale des permissions

## 🛠️ Maintenance

### Surveillance
- Vérification régulière des permissions
- Logs des accès refusés
- Monitoring des performances

### Mise à Jour
- Scripts de migration inclus
- Compatibilité ascendante
- Tests automatisés des permissions

---

**Note** : Ce système est conçu pour être robuste, sécurisé et facile à utiliser. Il respecte les principes de sécurité en profondeur et offre une expérience utilisateur optimale selon le rôle de chaque utilisateur.

