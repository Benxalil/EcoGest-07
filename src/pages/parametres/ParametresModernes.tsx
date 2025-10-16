import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { School, Users, GraduationCap, Calendar, Bell, Shield, Database, Settings, Save, Upload, Download, Trash2, Eye, EyeOff, TestTube, AlertTriangle } from "lucide-react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { useUserRole } from "@/hooks/useUserRole";
import { TeacherSettings } from "@/components/parametres/TeacherSettings";
import { SchoolPrefixManager } from "@/components/admin/SchoolPrefixManager";
import { Database as DatabaseType } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface GeneralSettings {
  formatNomUtilisateur: string;
  motDePasseDefaut: string;
  systemType: 'semester' | 'trimester';
  anneeScolaire: string;
  dateDebutAnnee: string;
  dateFinAnnee: string;
  nombreSemestres: number;
  nombreTrimestres: number;
}

interface TeacherSettings {
  teacherPrefix: string;
  defaultTeacherPassword: string;
  autoGenerateUsername: boolean;
}

interface StudentSettings {
  autoGenerateMatricule: boolean;
  matriculeFormat: string;
  defaultStudentPassword: string;
  parentNotifications: boolean;
}

interface ParentSettings {
  autoGenerateMatricule: boolean;
  matriculeFormat: string;
  defaultParentPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  notifyAbsences: boolean;
  notifyLatePayments: boolean;
  notifyExamResults: boolean;
}

interface SecuritySettings {
  sessionTimeout: number;
  passwordMinLength: number;
  requirePasswordChange: boolean;
  enableTwoFactor: boolean;
  allowMultipleSessions: boolean;
}

interface BackupSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  includeFiles: boolean;
}

export default function ParametresModernes() {
  const { toast } = useToast();
  const { academicYear, updateAcademicYear } = useAcademicYear();
  const { subscriptionStatus, simulateSubscriptionState } = useSubscription();
  const { isTeacher, loading, userProfile, simulateRole, resetRoleSimulation, isSimulating } = useUserRole();
  const { schoolData, updateSchoolData, loading: schoolLoading } = useSchoolData();
  const { settings: schoolSettings, loading: settingsLoading, updateSettings: updateSchoolSettings } = useSchoolSettings();
  
  const [showPasswords, setShowPasswords] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // États pour la confirmation de modification des formats
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => Promise<void>) | null>(null);
  
  // États pour les informations d'école éditables - initialisées vides pour éviter les valeurs par défaut
  const [schoolInfo, setSchoolInfo] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
    language: 'french' as DatabaseType['public']['Enums']['language_type'],
    schoolPrefix: '',
    slogan: ''
  });

  // États pour tous les paramètres
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    formatNomUtilisateur: 'ELEVE',
    motDePasseDefaut: 'password123',
    systemType: schoolData.semester_type || 'semester',
    anneeScolaire: schoolData.academic_year || academicYear,
    dateDebutAnnee: '2024-09-01',
    dateFinAnnee: '2025-07-31',
    nombreSemestres: 2,
    nombreTrimestres: 3
  });

  const [teacherSettings, setTeacherSettings] = useState<TeacherSettings | null>(null);
  const [studentSettings, setStudentSettings] = useState<StudentSettings | null>(null);
  const [parentSettings, setParentSettings] = useState<ParentSettings | null>(null);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    notifyAbsences: true,
    notifyLatePayments: true,
    notifyExamResults: true
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    sessionTimeout: 60,
    passwordMinLength: 6,
    requirePasswordChange: false,
    enableTwoFactor: false,
    allowMultipleSessions: true
  });

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackup: false,
    backupFrequency: 'daily',
    retentionDays: 30,
    includeFiles: true
  });

  // Charger les paramètres existants au démarrage
  useEffect(() => {
    loadAllSettings();
  }, []);

  // Synchroniser avec les données de l'école - uniquement quand les vraies données sont chargées
  useEffect(() => {
    console.log('useEffect schoolData sync - schoolData:', schoolData, 'loading:', schoolLoading);
    
    if (schoolData && !schoolLoading) {
      console.log('Synchronisation des vraies données école:', {
        name: schoolData.name,
        phone: schoolData.phone,
        address: schoolData.address,
        email: schoolData.email,
        slogan: schoolData.slogan,
        school_suffix: schoolData.school_suffix,
        language: schoolData.language
      });
      
      setGeneralSettings(prev => ({
        ...prev,
        systemType: schoolData.semester_type || 'semester',
        anneeScolaire: schoolData.academic_year || academicYear
      }));
      
      // Synchroniser les informations de l'école avec les vraies données de la base
      const generateSchoolPrefix = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Supprimer caractères spéciaux
          .replace(/\s+/g, '_') // Remplacer espaces par underscores
          .replace(/_+/g, '_') // Éviter underscores multiples
          .replace(/^_|_$/g, ''); // Supprimer underscores début/fin
      };
      
      setSchoolInfo({
        name: schoolData.name || '',
        phone: schoolData.phone || '',
        address: schoolData.address || '',
        email: schoolData.email || '',
        language: schoolData.language || 'french',
        schoolPrefix: schoolData.school_suffix || generateSchoolPrefix(schoolData.name || 'ecole'),
        slogan: schoolData.slogan || ''
      });
      
      if (schoolData.logo_url) {
        setLogoPreview(schoolData.logo_url);
      }
      
      console.log('schoolInfo mis à jour avec:', {
        name: schoolData.name,
        phone: schoolData.phone,
        address: schoolData.address,
        email: schoolData.email,
        slogan: schoolData.slogan
      });
    }
  }, [schoolData, academicYear, schoolLoading]);

  // Synchroniser les paramètres élèves/parents avec la base de données
  useEffect(() => {
    console.log('🔍 [ParametresModernes] Synchronisation avec schoolSettings:', {
      settingsLoading,
      schoolSettings,
      currentStudentSettings: studentSettings,
      currentParentSettings: parentSettings,
      currentTeacherSettings: teacherSettings
    });
    
    if (!settingsLoading && schoolSettings) {
      console.log('✅ [ParametresModernes] REMPLACEMENT COMPLET des états avec les vraies valeurs de la base');
      
      // ✅ Remplacement COMPLET (pas de merge avec prev)
      setStudentSettings({
        autoGenerateMatricule: schoolSettings.autoGenerateStudentMatricule,
        matriculeFormat: schoolSettings.studentMatriculeFormat,
        defaultStudentPassword: schoolSettings.defaultStudentPassword,
        parentNotifications: true // Valeur par défaut UI uniquement
      });
      
      setParentSettings({
        autoGenerateMatricule: schoolSettings.autoGenerateParentMatricule,
        matriculeFormat: schoolSettings.parentMatriculeFormat,
        defaultParentPassword: schoolSettings.defaultParentPassword
      });
      
      setTeacherSettings({
        teacherPrefix: schoolSettings.teacherMatriculeFormat,
        defaultTeacherPassword: schoolSettings.defaultTeacherPassword,
        autoGenerateUsername: schoolSettings.autoGenerateTeacherMatricule
      });
      
      console.log('✅ [ParametresModernes] États remplacés avec:', {
        studentSettings: {
          matriculeFormat: schoolSettings.studentMatriculeFormat,
          defaultStudentPassword: schoolSettings.defaultStudentPassword
        },
        parentSettings: {
          matriculeFormat: schoolSettings.parentMatriculeFormat,
          defaultParentPassword: schoolSettings.defaultParentPassword
        },
        teacherSettings: {
          teacherPrefix: schoolSettings.teacherMatriculeFormat,
          defaultTeacherPassword: schoolSettings.defaultTeacherPassword
        }
      });
    }
  }, [schoolSettings, settingsLoading]);

  // Charger les dates de l'année académique depuis la base de données
  useEffect(() => {
    const loadAcademicYearDates = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.id)
            .single();
          
          if (profile?.school_id) {
            const { data: academicYear } = await supabase
              .from('academic_years')
              .select('start_date, end_date')
              .eq('school_id', profile.school_id)
              .eq('is_current', true)
              .single();
            
            if (academicYear) {
              setGeneralSettings(prev => ({
                ...prev,
                dateDebutAnnee: academicYear.start_date,
                dateFinAnnee: academicYear.end_date
              }));
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des dates académiques:', error);
      }
    };
    
    loadAcademicYearDates();
  }, []);

  // Écouter les changements de paramètres en temps réel (pour synchroniser entre fenêtres)
  useEffect(() => {
    const handleSettingsUpdate = () => {
      console.log('🔄 [ParametresModernes] Événement schoolSettingsUpdated reçu (Realtime)');
      
      // Forcer la re-synchronisation depuis useSchoolSettings avec REMPLACEMENT COMPLET
      if (schoolSettings) {
        setStudentSettings({
          autoGenerateMatricule: schoolSettings.autoGenerateStudentMatricule,
          matriculeFormat: schoolSettings.studentMatriculeFormat,
          defaultStudentPassword: schoolSettings.defaultStudentPassword,
          parentNotifications: studentSettings?.parentNotifications ?? true
        });
        
        setParentSettings({
          autoGenerateMatricule: schoolSettings.autoGenerateParentMatricule,
          matriculeFormat: schoolSettings.parentMatriculeFormat,
          defaultParentPassword: schoolSettings.defaultParentPassword
        });
        
        setTeacherSettings({
          teacherPrefix: schoolSettings.teacherMatriculeFormat,
          defaultTeacherPassword: schoolSettings.defaultTeacherPassword,
          autoGenerateUsername: schoolSettings.autoGenerateTeacherMatricule
        });
        
        console.log('✅ [ParametresModernes] États locaux synchronisés via Realtime avec:', {
          studentMatricule: schoolSettings.studentMatriculeFormat,
          parentMatricule: schoolSettings.parentMatriculeFormat,
          teacherMatricule: schoolSettings.teacherMatriculeFormat
        });
      }
    };
    
    window.addEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    };
  }, [schoolSettings]);

  const loadAllSettings = () => {
    try {
      // Paramètres généraux
      const general = localStorage.getItem('settings');
      if (general) {
        const parsedGeneral = JSON.parse(general);
        setGeneralSettings(prev => ({
          ...prev,
          ...parsedGeneral
        }));
      }

      // Autres paramètres depuis localStorage
      const teachers = localStorage.getItem('teacherSettings');
      if (teachers) {
        setTeacherSettings(JSON.parse(teachers));
      }

      // ✅ studentSettings et parentSettings viennent de la base de données via useSchoolSettings
      // Plus de localStorage pour éviter les conflits

      const notifications = localStorage.getItem('notificationSettings');
      if (notifications) {
        setNotificationSettings(JSON.parse(notifications));
      }

      const security = localStorage.getItem('securitySettings');
      if (security) {
        setSecuritySettings(JSON.parse(security));
      }

      const backup = localStorage.getItem('backupSettings');
      if (backup) {
        setBackupSettings(JSON.parse(backup));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les paramètres",
        variant: "destructive"
      });
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille du fichier ne doit pas dépasser 2MB",
          variant: "destructive"
        });
        return;
      }

      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
      setLogoFile(file);
      setHasUnsavedChanges(true);
    }
  };

  const saveAllSettings = async () => {
    console.log('🔍 [saveAllSettings] Début de la sauvegarde');
    console.log('🔍 [saveAllSettings] userProfile:', userProfile);
    console.log('🔍 [saveAllSettings] schoolSettings:', schoolSettings);
    console.log('🔍 [saveAllSettings] settingsLoading:', settingsLoading);
    console.log('🔍 [saveAllSettings] studentSettings:', studentSettings);
    console.log('🔍 [saveAllSettings] parentSettings:', parentSettings);
    console.log('🔍 [saveAllSettings] teacherSettings:', teacherSettings);
    
    // ✅ SIMPLIFICATION : On ne vérifie plus settingsLoading, on utilise les valeurs actuelles des champs
    // Si les champs sont affichés, c'est que les données sont chargées (voir condition ligne 668)
    
    // ✅ AMÉLIORATION : Toujours afficher le dialog de confirmation pour les changements critiques
    // On affiche le dialog si l'utilisateur a modifié quelque chose (hasUnsavedChanges)
    
    console.log('🔍 [saveAllSettings] hasUnsavedChanges:', hasUnsavedChanges);
    
    // ✅ Si des modifications ont été faites et que ce sont des formats/mots de passe, afficher le dialog
    if (hasUnsavedChanges && (studentSettings || parentSettings || teacherSettings)) {
      console.log('✅ [saveAllSettings] Modifications détectées, affichage du dialog de confirmation');
      
      const changedTypes = [];
      
      // Vérifier les changements par rapport aux valeurs en base (si disponibles)
      if (schoolSettings) {
        if (studentSettings?.matriculeFormat !== schoolSettings.studentMatriculeFormat ||
            studentSettings?.defaultStudentPassword !== schoolSettings.defaultStudentPassword) {
          changedTypes.push('élèves');
        }
        
        if (parentSettings?.matriculeFormat !== schoolSettings.parentMatriculeFormat ||
            parentSettings?.defaultParentPassword !== schoolSettings.defaultParentPassword) {
          changedTypes.push('parents');
        }
        
        if (teacherSettings?.teacherPrefix !== schoolSettings.teacherMatriculeFormat ||
            teacherSettings?.defaultTeacherPassword !== schoolSettings.defaultTeacherPassword) {
          changedTypes.push('enseignants');
        }
      } else {
        // Si schoolSettings n'est pas chargé, considérer que tout peut changer
        console.log('⚠️ [saveAllSettings] schoolSettings non chargé, on affiche le dialog par précaution');
        changedTypes.push('utilisateurs');
      }
      
      console.log('✅ [saveAllSettings] Types potentiellement modifiés:', changedTypes);
      
      // Afficher le dialog de confirmation
      const message = changedTypes.length > 0 
        ? `⚠️ Attention ! Si vous validez cette modification, les nouveaux ${changedTypes.join(', ')} enregistrés utiliseront ces nouveaux formats de matricule et mots de passe.\n\nLes anciens membres conserveront leurs identifiants actuels.`
        : `⚠️ Vous êtes sur le point de sauvegarder les paramètres de l'école.\n\nÊtes-vous sûr de vouloir continuer ?`;
      
      console.log('✅ [saveAllSettings] Message du dialog:', message);
      
      setConfirmDialogMessage(message);
      setPendingSaveAction(() => performSave);
      console.log('✅ [saveAllSettings] pendingSaveAction configurée');
      setShowConfirmDialog(true);
      
      console.log('✅ [saveAllSettings] Dialog affiché, showConfirmDialog:', true);
      return;
    }
    
    console.log('ℹ️ [saveAllSettings] Aucune modification détectée OU pas de changements critiques, sauvegarde directe');
    // Si aucune modification, sauvegarder directement
    await performSave();
  };

  const performSave = async () => {
    console.log('🚀 [performSave] DÉBUT de la sauvegarde');
    console.log('🚀 [performSave] Paramètres à sauvegarder:', {
      studentMatricule: studentSettings?.matriculeFormat,
      parentMatricule: parentSettings?.matriculeFormat,
      teacherMatricule: teacherSettings?.teacherPrefix,
      studentPassword: studentSettings?.defaultStudentPassword
    });
    
    try {
      // Sauvegarder l'année académique en base de données
      const success = await updateAcademicYear(generalSettings.anneeScolaire);
      if (!success) {
        throw new Error("Échec de la mise à jour de l'année académique");
      }

      // Mettre à jour les dates de l'année académique dans la base de données
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.school_id) {
          const { error: updateError } = await supabase
            .from('academic_years')
            .update({
              start_date: generalSettings.dateDebutAnnee,
              end_date: generalSettings.dateFinAnnee
            })
            .eq('school_id', profile.school_id)
            .eq('is_current', true);

          if (updateError) {
            console.error('Erreur lors de la mise à jour des dates académiques:', updateError);
          }
        }
      }

      // Sauvegarder les informations de l'école via useSchoolData
      console.log('Sauvegarde des données école:', {
        name: schoolInfo.name,
        phone: schoolInfo.phone,
        address: schoolInfo.address,
        email: schoolInfo.email,
        language: schoolInfo.language,
        school_suffix: schoolInfo.schoolPrefix,
        slogan: schoolInfo.slogan
      });
      
      const schoolUpdateSuccess = await updateSchoolData({
        name: schoolInfo.name,
        address: schoolInfo.address,
        phone: schoolInfo.phone,
        email: schoolInfo.email,
        language: schoolInfo.language,
        school_suffix: schoolInfo.schoolPrefix,
        academic_year: generalSettings.anneeScolaire,
        semester_type: generalSettings.systemType,
        logo_url: logoPreview || schoolData.logo_url,
        slogan: schoolInfo.slogan
      });

      console.log('Résultat sauvegarde école:', schoolUpdateSuccess);

      if (!schoolUpdateSuccess) {
        throw new Error("Échec de la mise à jour des données de l'école");
      }

      // Sauvegarder les formats de matricule dans la base de données via useSchoolSettings
      console.log('💾 [performSave] Appel de updateSchoolSettings avec:', {
        studentMatriculeFormat: studentSettings?.matriculeFormat,
        parentMatriculeFormat: parentSettings?.matriculeFormat,
        teacherMatriculeFormat: teacherSettings?.teacherPrefix,
        defaultStudentPassword: studentSettings?.defaultStudentPassword,
        defaultParentPassword: parentSettings?.defaultParentPassword,
        defaultTeacherPassword: teacherSettings?.defaultTeacherPassword,
        autoGenerateStudentMatricule: studentSettings?.autoGenerateMatricule,
        autoGenerateParentMatricule: parentSettings?.autoGenerateMatricule,
        autoGenerateTeacherMatricule: teacherSettings?.autoGenerateUsername,
      });
      
      const settingsSuccess = await updateSchoolSettings({
        studentMatriculeFormat: studentSettings.matriculeFormat,
        parentMatriculeFormat: parentSettings.matriculeFormat,
        teacherMatriculeFormat: teacherSettings.teacherPrefix,
        defaultStudentPassword: studentSettings.defaultStudentPassword,
        defaultParentPassword: parentSettings.defaultParentPassword,
        defaultTeacherPassword: teacherSettings.defaultTeacherPassword,
        autoGenerateStudentMatricule: studentSettings.autoGenerateMatricule,
        autoGenerateParentMatricule: parentSettings.autoGenerateMatricule,
        autoGenerateTeacherMatricule: teacherSettings.autoGenerateUsername,
      });

      if (!settingsSuccess) {
        console.error('❌ [performSave] updateSchoolSettings a retourné false !');
        throw new Error("Échec de la mise à jour des paramètres de matricules");
      }

      console.log('✅ [performSave] updateSchoolSettings a réussi !');

      // Sauvegarder les autres paramètres en localStorage (notifications, sécurité, sauvegarde)
      localStorage.setItem('settings', JSON.stringify(generalSettings));
      localStorage.setItem('teacherSettings', JSON.stringify(teacherSettings));
      // ✅ NE PLUS sauvegarder studentSettings et parentSettings en localStorage
      // Ils sont maintenant uniquement en base de données
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
      localStorage.setItem('backupSettings', JSON.stringify(backupSettings));

      // Déclencher un événement pour notifier les autres composants
      window.dispatchEvent(new Event('schoolSettingsUpdated'));
      
      // Forcer le rechargement des données école pour une mise à jour instantanée
      await new Promise(resolve => setTimeout(resolve, 200)); // Délai pour s'assurer que la DB est mise à jour
      
      setHasUnsavedChanges(false);
      
      toast({
        title: "✅ Paramètres sauvegardés avec succès !",
        description: `Toutes les modifications ont été enregistrées. Année académique: ${generalSettings.anneeScolaire}`,
        className: "animate-fade-in bg-green-50 border-green-200 text-green-800",
        duration: 4000,
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  };

  const resetToDefaults = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      localStorage.removeItem('settings');
      localStorage.removeItem('teacherSettings');
      // ✅ studentSettings et parentSettings sont en base de données uniquement
      localStorage.removeItem('notificationSettings');
      localStorage.removeItem('securitySettings');
      localStorage.removeItem('backupSettings');
      loadAllSettings();
      toast({
        title: "⚙️ Paramètres réinitialisés",
        description: "Tous les paramètres ont été remis aux valeurs par défaut avec succès",
        className: "animate-fade-in bg-blue-50 border-blue-200 text-blue-800",
        duration: 3000,
      });
    }
  };

  // Interface spécifique pour les enseignants - SAUF si on est en mode simulation
  if (isTeacher() && !isSimulating()) {
    return (
      <Layout>
        <TeacherSettings />
      </Layout>
    );
  }

  // Afficher un loader pendant le chargement des paramètres
  if (loading || schoolLoading || settingsLoading || !studentSettings || !parentSettings || !teacherSettings) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
            <p className="text-lg font-semibold text-foreground mb-2">Chargement des paramètres...</p>
            <p className="text-sm text-muted-foreground">Récupération des données depuis la base de données</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Interface administrateur complète
  return (
    <Layout>
      <div className="space-y-6">
        {/* Message d'abonnement */}
        <SubscriptionAlert />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres de l'École</h1>
            <p className="text-gray-600">Configurez tous les paramètres de votre établissement scolaire</p>
          </div>
          <div className="flex items-center space-x-2">
            {/* Avertissement si pas admin */}
            {userProfile?.role !== 'school_admin' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-800">
                  Seuls les administrateurs peuvent modifier ces paramètres
                </span>
              </div>
            )}
            
            <Button 
              onClick={saveAllSettings} 
              size="sm" 
              disabled={!hasUnsavedChanges || userProfile?.role !== 'school_admin'}
              className={!hasUnsavedChanges ? "opacity-50 cursor-not-allowed" : ""}
              title={userProfile?.role !== 'school_admin' ? 'Seuls les administrateurs peuvent sauvegarder' : ''}
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer {hasUnsavedChanges && '*'}
            </Button>
            <Button 
              onClick={async () => {
                console.log('🔧 [DEBUG] Sauvegarde DIRECTE (bypass dialog)');
                await performSave();
              }}
              size="sm"
              variant="outline"
              className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <TestTube className="w-4 h-4" />
              Debug Save
            </Button>
          </div>
        </div>

        {/* Tabs pour organiser les paramètres */}
        <Tabs defaultValue="school" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="school">École</TabsTrigger>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="system">Système</TabsTrigger>
          </TabsList>

          {/* Paramètres de l'école */}
          <TabsContent value="school">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <School className="w-5 h-5" />
                  <span>Informations de l'École</span>
                </CardTitle>
                <CardDescription>
                  Configurez les informations générales de votre établissement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom">Nom de l'École</Label>
                    <Input 
                      id="nom" 
                      value={schoolInfo.name} 
                      onChange={e => {
                        setSchoolInfo(prev => ({...prev, name: e.target.value}));
                        setHasUnsavedChanges(true);
                      }} 
                      placeholder="École Connectée" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input 
                      id="telephone" 
                      value={schoolInfo.phone} 
                      onChange={e => {
                        setSchoolInfo(prev => ({...prev, phone: e.target.value}));
                        setHasUnsavedChanges(true);
                      }} 
                      placeholder="+221 XX XXX XX XX" 
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="adresse">Adresse Complète</Label>
                  <Textarea 
                    id="adresse" 
                    value={schoolInfo.address} 
                    onChange={e => {
                      setSchoolInfo(prev => ({...prev, address: e.target.value}));
                      setHasUnsavedChanges(true);
                    }} 
                    placeholder="Adresse complète de l'école" 
                    rows={3} 
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email de l'École</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={schoolInfo.email} 
                    onChange={e => {
                      setSchoolInfo(prev => ({...prev, email: e.target.value}));
                      setHasUnsavedChanges(true);
                    }} 
                    placeholder="contact@ecole.com" 
                  />
                </div>
                
                <div>
                  <Label htmlFor="slogan">Slogan de l'École</Label>
                  <Input 
                    id="slogan" 
                    value={schoolInfo.slogan} 
                    onChange={e => {
                      setSchoolInfo(prev => ({...prev, slogan: e.target.value}));
                      setHasUnsavedChanges(true);
                    }} 
                    placeholder="Excellence et Innovation" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Langue principale</Label>
                    <Select 
                      value={schoolInfo.language} 
                      onValueChange={(value) => {
                        setSchoolInfo(prev => ({...prev, language: value as DatabaseType['public']['Enums']['language_type']}));
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="french">Français</SelectItem>
                        <SelectItem value="arabic">Arabe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="semester_type">Type de semestre</Label>
                    <Select 
                      value={schoolData.semester_type || 'semester'} 
                      onValueChange={(value) => {
                        setGeneralSettings(prev => ({...prev, systemType: value as 'semester' | 'trimester'}));
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semester">Semestre</SelectItem>
                        <SelectItem value="trimester">Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="logo">Logo de l'École</Label>
                  <div className="flex items-center space-x-4">
                    {logoPreview && (
                      <img 
                        src={logoPreview} 
                        alt="Logo de l'école" 
                        className="w-16 h-16 object-contain rounded-md border"
                      />
                    )}
                    <input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Gestionnaire de préfixe d'école pour les connexions */}
            <SchoolPrefixManager />
          </TabsContent>

          {/* Autres onglets - contenus abrégés pour l'espace */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configuration générale du système académique</p>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Année académique</Label>
                    <Input 
                      value={generalSettings.anneeScolaire}
                      onChange={e => {
                        setGeneralSettings(prev => ({...prev, anneeScolaire: e.target.value}));
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Gestion des utilisateurs</span>
                </CardTitle>
                <CardDescription>
                  Paramètres pour la création et gestion des comptes utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="schoolPrefix">Préfixe d'école</Label>
                  <Input 
                    id="schoolPrefix"
                    value={schoolInfo.schoolPrefix}
                    onChange={e => {
                      setSchoolInfo(prev => ({...prev, schoolPrefix: e.target.value}));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="ecole_sainte_marie"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ce préfixe sera utilisé pour générer les identifiants utilisateurs (ex: Eleve001@{schoolInfo.schoolPrefix})
                  </p>
                </div>
                
                <Separator />
                
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      Chargement des formats de matricule...
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Préfixe Élèves</Label>
                      <Input 
                        value={studentSettings.matriculeFormat}
                        onChange={e => {
                          setStudentSettings(prev => ({...prev, matriculeFormat: e.target.value}));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="ELEVE"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: {studentSettings.matriculeFormat}001, {studentSettings.matriculeFormat}002, etc.
                      </p>
                    </div>
                    <div>
                      <Label>Préfixe Parents</Label>
                      <Input 
                        value={parentSettings.matriculeFormat}
                        onChange={e => {
                          setParentSettings(prev => ({...prev, matriculeFormat: e.target.value}));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="PAR"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Format: {parentSettings.matriculeFormat}001, {parentSettings.matriculeFormat}002, etc.
                      </p>
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Mot de passe par défaut (Élèves)</Label>
                    <div className="relative">
                      <Input 
                        type={showPasswords ? "text" : "password"}
                        value={studentSettings.defaultStudentPassword}
                        onChange={e => {
                          setStudentSettings(prev => ({...prev, defaultStudentPassword: e.target.value}));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="student123"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Mot de passe par défaut (Parents)</Label>
                    <div className="relative">
                      <Input 
                        type={showPasswords ? "text" : "password"}
                        value={parentSettings.defaultParentPassword}
                        onChange={e => {
                          setParentSettings(prev => ({...prev, defaultParentPassword: e.target.value}));
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="parent123"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoGenMatricule">Génération automatique des matricules élèves</Label>
                    <Switch 
                      id="autoGenMatricule"
                      checked={studentSettings.autoGenerateMatricule}
                      onCheckedChange={(checked) => {
                        setStudentSettings(prev => ({...prev, autoGenerateMatricule: checked}));
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoGenParentMatricule">Génération automatique des matricules parents</Label>
                    <Switch 
                      id="autoGenParentMatricule"
                      checked={parentSettings.autoGenerateMatricule}
                      onCheckedChange={(checked) => {
                        setParentSettings(prev => ({...prev, autoGenerateMatricule: checked}));
                        setHasUnsavedChanges(true);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres système</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Configuration technique du système</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialog de confirmation pour les changements de format */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <Shield className="w-5 h-5" />
              Confirmation de modification
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base whitespace-pre-line">
              {confirmDialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              console.log('❌ [Dialog] Annulation cliquée');
              setShowConfirmDialog(false);
              setPendingSaveAction(null);
              toast({
                title: "Modification annulée",
                description: "Aucune modification n'a été apportée aux formats",
                duration: 2000,
              });
            }}>
              ❌ Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              console.log('✅ [Dialog] Confirmation cliquée');
              console.log('✅ [Dialog] pendingSaveAction existe:', !!pendingSaveAction);
              
              setShowConfirmDialog(false);
              
              if (pendingSaveAction) {
                console.log('✅ [Dialog] Exécution de pendingSaveAction...');
                try {
                  await pendingSaveAction();
                  console.log('✅ [Dialog] pendingSaveAction exécutée avec succès');
                } catch (error) {
                  console.error('❌ [Dialog] Erreur lors de l\'exécution de pendingSaveAction:', error);
                } finally {
                  setPendingSaveAction(null);
                }
              } else {
                console.error('❌ [Dialog] pendingSaveAction est null ! Sauvegarde directe...');
                // Fallback : sauvegarder directement si pendingSaveAction est null
                await performSave();
              }
            }}>
              ✅ Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}