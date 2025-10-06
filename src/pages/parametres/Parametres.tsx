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
import { School, Users, GraduationCap, Calendar, Bell, Shield, Database, Settings, Save, Upload, Download, Trash2, Eye, EyeOff, TestTube } from "lucide-react";
import { getSchoolSettings, saveSchoolSettings, SchoolSettings } from "@/utils/schoolSettings";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useSubscription } from "@/hooks/useSubscription";
import { useSchoolData } from "@/hooks/useSchoolData";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { TeacherSettings } from "@/components/parametres/TeacherSettings";
import { StudentSettings } from "@/components/parametres/StudentSettings";
import { ParentSettings } from "@/components/parametres/ParentSettings";
interface GeneralSettings {
  formatNomUtilisateur: string;
  motDePasseDefaut: string;
  systemType: 'semestre' | 'trimestre';
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
export default function Parametres() {
  const {
    toast
  } = useToast();
  const {
    academicYear,
    updateAcademicYear
  } = useAcademicYear();
  const { subscriptionStatus, simulateSubscriptionState } = useSubscription();
  const { isTeacher, isStudent, isParent, loading, userProfile, simulateRole, resetRoleSimulation, isSimulating } = useUserRole();
  const { schoolData, updateSchoolData } = useSchoolData();
  const [showPasswords, setShowPasswords] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // États pour tous les paramètres
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({
    nom: '',
    adresse: '',
    telephone: '',
    logo: '',
    slogan: ''
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    formatNomUtilisateur: 'ELEVE',
    motDePasseDefaut: 'password123',
    systemType: 'semestre',
    anneeScolaire: academicYear,
    dateDebutAnnee: '2024-09-01',
    dateFinAnnee: '2025-07-31',
    nombreSemestres: 2,
    nombreTrimestres: 3
  });
  const [teacherSettings, setTeacherSettings] = useState<TeacherSettings>({
    teacherPrefix: 'Prof',
    defaultTeacherPassword: 'teacher123',
    autoGenerateUsername: true
  });
  const [studentSettings, setStudentSettings] = useState<StudentSettings>({
    autoGenerateMatricule: true,
    matriculeFormat: 'ELEVE',
    defaultStudentPassword: 'student123',
    parentNotifications: true
  });
  const [parentSettings, setParentSettings] = useState<ParentSettings>({
    autoGenerateMatricule: true,
    matriculeFormat: 'PAR',
    defaultParentPassword: 'parent123'
  });
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

  // Synchroniser l'année académique avec le hook
  useEffect(() => {
    setGeneralSettings(prev => ({
      ...prev,
      anneeScolaire: academicYear
    }));
  }, [academicYear]);

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

  // Synchroniser schoolSettings avec schoolData (base de données)
  useEffect(() => {
    if (schoolData) {
      setSchoolSettings({
        nom: schoolData.name || '',
        adresse: schoolData.address || '',
        telephone: schoolData.phone || '',
        slogan: schoolData.slogan || 'Excellence et Innovation',
        logo: schoolData.logo_url || ''
      });
      
      if (schoolData.logo_url) {
        setLogoPreview(schoolData.logo_url);
      }
    }
  }, [schoolData]);
  const loadAllSettings = () => {
    try {
      // Paramètres de l'école - chargés via useEffect depuis schoolData
      // (ne plus utiliser getSchoolSettings déprécié)

      // Paramètres généraux
      const general = localStorage.getItem('settings');
      if (general) {
        const parsedGeneral = JSON.parse(general);
        setGeneralSettings(prev => ({
          ...prev,
          ...parsedGeneral
        }));
      }

      // Paramètres des enseignants
      const teachers = localStorage.getItem('teacherSettings');
      if (teachers) {
        setTeacherSettings(JSON.parse(teachers));
      }

      // Paramètres des élèves
      const students = localStorage.getItem('studentSettings');
      if (students) {
        setStudentSettings(JSON.parse(students));
      }

      // Paramètres des parents
      const parents = localStorage.getItem('parentSettings');
      if (parents) {
        setParentSettings(JSON.parse(parents));
      }

      // Paramètres de notifications
      const notifications = localStorage.getItem('notificationSettings');
      if (notifications) {
        setNotificationSettings(JSON.parse(notifications));
      }

      // Paramètres de sécurité
      const security = localStorage.getItem('securitySettings');
      if (security) {
        setSecuritySettings(JSON.parse(security));
      }

      // Paramètres de sauvegarde
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
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille du fichier ne doit pas dépasser 2MB",
        variant: "destructive"
      });
      return;
    }

    try {
      // Upload vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `school-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath);

      // Sauvegarder immédiatement en base de données
      const updateSuccess = await updateSchoolData({
        logo_url: publicUrl
      });

      if (!updateSuccess) {
        throw new Error("Échec de la sauvegarde du logo");
      }

      // Mettre à jour l'aperçu local
      setLogoPreview(publicUrl);
      setSchoolSettings(prev => ({
        ...prev,
        logo: publicUrl
      }));

      toast({
        title: "✅ Logo sauvegardé",
        description: "Le logo a été téléversé et sauvegardé avec succès",
        className: "animate-fade-in bg-green-50 border-green-200 text-green-800",
      });
    } catch (error) {
      console.error('Erreur upload logo:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'uploader le logo",
        variant: "destructive"
      });
    }
  };
  const saveAllSettings = async () => {
    try {
      // 1. Sauvegarder les informations de l'école en base de données
      const schoolUpdateSuccess = await updateSchoolData({
        name: schoolSettings.nom,
        address: schoolSettings.adresse,
        phone: schoolSettings.telephone,
        slogan: schoolSettings.slogan,
        logo_url: schoolSettings.logo
      });

      if (!schoolUpdateSuccess) {
        throw new Error("Échec de la mise à jour des informations de l'école");
      }

      // 2. Sauvegarder l'année académique en base de données
      const success = await updateAcademicYear(generalSettings.anneeScolaire);
      if (!success) {
        throw new Error("Échec de la mise à jour de l'année académique");
      }

      // 3. Mettre à jour les dates de l'année académique dans la base de données
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

      // 4. Sauvegarder les autres paramètres dans localStorage
      localStorage.setItem('settings', JSON.stringify(generalSettings));
      localStorage.setItem('teacherSettings', JSON.stringify(teacherSettings));
      localStorage.setItem('studentSettings', JSON.stringify(studentSettings));
      localStorage.setItem('parentSettings', JSON.stringify(parentSettings));
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
      localStorage.setItem('backupSettings', JSON.stringify(backupSettings));

      // 5. Déclencher un événement pour notifier les autres composants (Header, Dashboard)
      window.dispatchEvent(new Event('schoolSettingsUpdated'));
      
      setHasUnsavedChanges(false);
      
      toast({
        title: "✅ Paramètres sauvegardés avec succès !",
        description: `Toutes les modifications ont été enregistrées en base de données.`,
        className: "animate-fade-in bg-green-50 border-green-200 text-green-800",
        duration: 4000,
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder les paramètres.",
        variant: "destructive"
      });
    }
  };
  const resetToDefaults = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ?')) {
      localStorage.removeItem('schoolSettings');
      localStorage.removeItem('settings');
      localStorage.removeItem('teacherSettings');
      localStorage.removeItem('studentSettings');
      localStorage.removeItem('parentSettings');
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
  const exportSettings = () => {
    const allSettings = {
      school: schoolSettings,
      general: generalSettings,
      teachers: teacherSettings,
      students: studentSettings,
      parents: parentSettings,
      notifications: notificationSettings,
      security: securitySettings,
      backup: backupSettings,
      exportDate: new Date().toISOString()
    };
    const dataStr = JSON.stringify(allSettings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `parametres-ecole-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({
      title: "📤 Export réussi !",
      description: "Les paramètres ont été exportés avec succès dans un fichier JSON",
      className: "animate-fade-in bg-green-50 border-green-200 text-green-800",
      duration: 3000,
    });
  };
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        if (importedSettings.school) setSchoolSettings(importedSettings.school);
        if (importedSettings.general) setGeneralSettings(importedSettings.general);
        if (importedSettings.teachers) setTeacherSettings(importedSettings.teachers);
        if (importedSettings.students) setStudentSettings(importedSettings.students);
        if (importedSettings.parents) setParentSettings(importedSettings.parents);
        if (importedSettings.notifications) setNotificationSettings(importedSettings.notifications);
        if (importedSettings.security) setSecuritySettings(importedSettings.security);
        if (importedSettings.backup) setBackupSettings(importedSettings.backup);
        toast({
          title: "📥 Import réussi !",
          description: "Les paramètres ont été importés et appliqués avec succès",
          className: "animate-fade-in bg-green-50 border-green-200 text-green-800",
          duration: 3000,
        });
      } catch (error) {
        toast({
          title: "Erreur d'import",
          description: "Le fichier sélectionné n'est pas valide",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };
  // Interface spécifique pour les enseignants - SAUF si on est en mode simulation
  if (isTeacher() && !isSimulating()) {
    return (
      <Layout>
        <TeacherSettings />
      </Layout>
    );
  }

  // Interface spécifique pour les parents - SAUF si on est en mode simulation
  if (isParent() && !isSimulating()) {
    return <ParentSettings />;
  }

  // Interface spécifique pour les élèves - SAUF si on est en mode simulation
  if (isStudent() && !isSimulating()) {
    return <StudentSettings />;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Interface administrateur complète
  return <Layout>
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
            <Button onClick={exportSettings} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild>
                <span>
                <Upload className="w-4 h-4 mr-2" />
                  Importer
                </span>
              </Button>
              <input type="file" accept=".json" onChange={importSettings} className="hidden" />
            </label>
            <Button onClick={resetToDefaults} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
            <Button 
              onClick={saveAllSettings} 
              size="sm" 
              disabled={!hasUnsavedChanges}
              className={!hasUnsavedChanges ? "opacity-50 cursor-not-allowed" : ""}
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Tabs pour organiser les paramètres */}
        <Tabs defaultValue="school" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="school">École</TabsTrigger>
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
            <TabsTrigger value="backup">Sauvegarde</TabsTrigger>
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
                      value={schoolSettings.nom} 
                      onChange={e => {
                        setSchoolSettings(prev => ({...prev, nom: e.target.value}));
                        setHasUnsavedChanges(true);
                      }} 
                      placeholder="École Connectée" 
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input 
                      id="telephone" 
                      value={schoolSettings.telephone} 
                      onChange={e => {
                        setSchoolSettings(prev => ({...prev, telephone: e.target.value}));
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
                    value={schoolSettings.adresse} 
                    onChange={e => {
                      setSchoolSettings(prev => ({...prev, adresse: e.target.value}));
                      setHasUnsavedChanges(true);
                    }} 
                    placeholder="Adresse complète de l'école" 
                    rows={3} 
                  />
                </div>

                <div>
                  <Label htmlFor="slogan">Slogan de l'École</Label>
                  <Input 
                    id="slogan" 
                    value={schoolSettings.slogan || ''} 
                    onChange={e => {
                      setSchoolSettings(prev => ({...prev, slogan: e.target.value}));
                      setHasUnsavedChanges(true);
                    }} 
                    placeholder="Excellence et Innovation" 
                  />
                </div>

                <div>
                  <Label>Logo de l'École</Label>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-32 h-32 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                        {logoPreview || schoolSettings.logo ? (
                          <img 
                            src={logoPreview || schoolSettings.logo} 
                            alt="Logo preview" 
                            className="w-full h-full object-contain p-2" 
                          />
                        ) : (
                          <School className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="cursor-pointer">
                          <Button variant="outline" asChild>
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Cliquer pour ajouter une photo
                            </span>
                          </Button>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        <p className="text-sm text-gray-500 mt-1">
                          Format recommandé: PNG, JPG (max 2MB)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paramètres généraux */}
          <TabsContent value="general">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Système Scolaire</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="systemType">Type de Système</Label>
                      <Select value={generalSettings.systemType} onValueChange={(value: 'semestre' | 'trimestre') => {
                        setGeneralSettings(prev => ({
                          ...prev,
                          systemType: value
                        }));
                        setHasUnsavedChanges(true);
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semestre">Système Semestriel</SelectItem>
                          <SelectItem value="trimestre">Système Trimestriel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="anneeScolaire">Année Scolaire</Label>
                      <Select value={generalSettings.anneeScolaire} onValueChange={value => {
                        setGeneralSettings(prev => ({
                          ...prev,
                          anneeScolaire: value
                        }));
                        setHasUnsavedChanges(true);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner l'année scolaire" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024/2025">2024/2025</SelectItem>
                          <SelectItem value="2025/2026">2025/2026</SelectItem>
                          <SelectItem value="2026/2027">2026/2027</SelectItem>
                          <SelectItem value="2027/2028">2027/2028</SelectItem>
                          <SelectItem value="2028/2029">2028/2029</SelectItem>
                          <SelectItem value="2029/2030">2029/2030</SelectItem>
                          <SelectItem value="2030/2031">2030/2031</SelectItem>
                          <SelectItem value="2031/2032">2031/2032</SelectItem>
                          <SelectItem value="2032/2033">2032/2033</SelectItem>
                          <SelectItem value="2033/2034">2033/2034</SelectItem>
                          <SelectItem value="2034/2035">2034/2035</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dateDebut">Date de Début</Label>
                      <Input id="dateDebut" type="date" value={generalSettings.dateDebutAnnee} onChange={e => {
                        setGeneralSettings(prev => ({
                          ...prev,
                          dateDebutAnnee: e.target.value
                        }));
                        setHasUnsavedChanges(true);
                      }} />
                    </div>
                    <div>
                      <Label htmlFor="dateFin">Date de Fin</Label>
                      <Input id="dateFin" type="date" value={generalSettings.dateFinAnnee} onChange={e => {
                        setGeneralSettings(prev => ({
                          ...prev,
                          dateFinAnnee: e.target.value
                        }));
                        setHasUnsavedChanges(true);
                      }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nombrePeriodes">
                        {generalSettings.systemType === 'semestre' ? 'Nombre de Semestres' : 'Nombre de Trimestres'}
                      </Label>
                      <Select value={generalSettings.systemType === 'semestre' ? generalSettings.nombreSemestres.toString() : generalSettings.nombreTrimestres.toString()} onValueChange={value => {
                      const numValue = parseInt(value);
                      if (generalSettings.systemType === 'semestre') {
                        setGeneralSettings(prev => ({
                          ...prev,
                          nombreSemestres: numValue
                        })); } else {
                        setGeneralSettings(prev => ({
                          ...prev,
                          nombreTrimestres: numValue
                        }));
                      }
                    }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {generalSettings.systemType === 'semestre' ? <>
                              <SelectItem value="2">2 Semestres</SelectItem>
                              <SelectItem value="3">3 Semestres</SelectItem>
                            </> : <>
                              <SelectItem value="3">3 Trimestres</SelectItem>
                              <SelectItem value="4">4 Trimestres</SelectItem>
                            </>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Paramètres utilisateurs */}
          <TabsContent value="users">
            <div className="space-y-6">
              {/* Préfixe d'École */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <School className="w-5 h-5" />
                    <span>Identifiant d'École</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ce préfixe est utilisé dans les matricules des élèves et enseignants
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-suffix">Préfixe d'école</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="school-suffix"
                        value={(() => {
                          // Générer automatiquement le préfixe si absent
                          if (!schoolData?.school_suffix && schoolData?.name) {
                            const generateSchoolPrefix = (name: string) => {
                              return name
                                .toLowerCase()
                                .replace(/[^a-z0-9\s]/g, '') // Supprimer caractères spéciaux
                                .replace(/\s+/g, '_') // Remplacer espaces par underscores
                                .replace(/_+/g, '_') // Éviter underscores multiples
                                .replace(/^_|_$/g, ''); // Supprimer underscores début/fin
                            };
                            
                            const autoPrefix = generateSchoolPrefix(schoolData.name);
                            
                            // Mettre à jour automatiquement en base de données
                            if (updateSchoolData && autoPrefix) {
                              updateSchoolData({ school_suffix: autoPrefix }).catch(console.error);
                            }
                            
                            return autoPrefix;
                          }
                          return schoolData?.school_suffix || '';
                        })()}
                        onChange={async (e) => {
                          const newSuffix = e.target.value.replace(/\s+/g, '_').toLowerCase();
                          if (schoolData && updateSchoolData) {
                            try {
                              await updateSchoolData({ school_suffix: newSuffix });
                              toast({
                                title: "Préfixe mis à jour",
                                description: "Le préfixe d'école a été modifié avec succès.",
                              });
                            } catch (error) {
                              toast({
                                title: "Erreur",
                                description: "Impossible de mettre à jour le préfixe.",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        placeholder="ex: complexe_al_mahdi"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (schoolData?.name && updateSchoolData) {
                            const autoSuffix = schoolData.name
                              .toLowerCase()
                              .replace(/[^a-z0-9\s]/g, '')
                              .replace(/\s+/g, '_')
                              .trim();
                            try {
                              await updateSchoolData({ school_suffix: autoSuffix });
                              toast({
                                title: "Préfixe généré",
                                description: "Le préfixe a été généré automatiquement depuis le nom de l'école.",
                              });
                            } catch (error) {
                              toast({
                                title: "Erreur",
                                description: "Impossible de générer le préfixe automatiquement.",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                      >
                        Auto-générer
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Exemple de matricule généré : Eleve001@{schoolData?.school_suffix || 'votre_ecole'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Paramètres Élèves */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Paramètres Élèves</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Génération automatique du matricule</Label>
                      <p className="text-sm text-gray-500">Générer automatiquement les matricules des élèves</p>
                    </div>
                    <Switch checked={studentSettings.autoGenerateMatricule} onCheckedChange={checked => {
                      setStudentSettings(prev => ({
                        ...prev,
                        autoGenerateMatricule: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="matriculeFormat">Format du Matricule</Label>
                      <Input id="matriculeFormat" value={studentSettings.matriculeFormat} onChange={e => {
                        setStudentSettings(prev => ({
                          ...prev,
                          matriculeFormat: e.target.value
                        }));
                        setHasUnsavedChanges(true);
                      }} placeholder="ELEVE" />
                      <p className="text-xs text-gray-500 mt-1">Exemple: ELEVE0001</p>
                    </div>
                    <div>
                      <Label htmlFor="defaultStudentPassword">Mot de passe par défaut</Label>
                      <div className="relative">
                        <Input id="defaultStudentPassword" type={showPasswords ? "text" : "password"} value={studentSettings.defaultStudentPassword} onChange={e => {
                          setStudentSettings(prev => ({
                            ...prev,
                            defaultStudentPassword: e.target.value
                          }));
                          setHasUnsavedChanges(true);
                        }} placeholder="student123" />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2" onClick={() => setShowPasswords(!showPasswords)}>
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notifications aux parents</Label>
                      <p className="text-sm text-gray-500">Envoyer des notifications aux parents</p>
                    </div>
                    <Switch checked={studentSettings.parentNotifications} onCheckedChange={checked => {
                      setStudentSettings(prev => ({
                        ...prev,
                        parentNotifications: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>
                </CardContent>
              </Card>

              {/* Paramètres Enseignants */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5" />
                    <span>Paramètres Enseignants</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Génération automatique du nom d'utilisateur</Label>
                      <p className="text-sm text-gray-500">Générer automatiquement les noms d'utilisateur</p>
                    </div>
                    <Switch checked={teacherSettings.autoGenerateUsername} onCheckedChange={checked => {
                      setTeacherSettings(prev => ({
                        ...prev,
                        autoGenerateUsername: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="teacherPrefix">Préfixe Enseignant</Label>
                      <Input id="teacherPrefix" value={teacherSettings.teacherPrefix} onChange={e => {
                        setTeacherSettings(prev => ({
                          ...prev,
                          teacherPrefix: e.target.value
                        }));
                        setHasUnsavedChanges(true);
                      }} placeholder="Prof" />
                      <p className="text-xs text-gray-500 mt-1">Exemple: Prof.Dupont</p>
                    </div>
                    <div>
                      <Label htmlFor="defaultTeacherPassword">Mot de passe par défaut</Label>
                      <div className="relative">
                        <Input id="defaultTeacherPassword" type={showPasswords ? "text" : "password"} value={teacherSettings.defaultTeacherPassword} onChange={e => {
                          setTeacherSettings(prev => ({
                            ...prev,
                            defaultTeacherPassword: e.target.value
                          }));
                          setHasUnsavedChanges(true);
                        }} placeholder="teacher123" />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2" onClick={() => setShowPasswords(!showPasswords)}>
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Paramètres Parents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Paramètres Parents</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Génération automatique du matricule</Label>
                      <p className="text-sm text-gray-500">Générer automatiquement les matricules des parents</p>
                    </div>
                    <Switch checked={parentSettings.autoGenerateMatricule} onCheckedChange={checked => {
                      setParentSettings(prev => ({
                        ...prev,
                        autoGenerateMatricule: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="parentMatriculeFormat">Format du Matricule</Label>
                      <Input id="parentMatriculeFormat" value={parentSettings.matriculeFormat} onChange={e => {
                        setParentSettings(prev => ({
                          ...prev,
                          matriculeFormat: e.target.value
                        }));
                        setHasUnsavedChanges(true);
                      }} placeholder="PAR" />
                      <p className="text-xs text-gray-500 mt-1">Exemple: PAR001</p>
                    </div>
                    <div>
                      <Label htmlFor="defaultParentPassword">Mot de passe par défaut</Label>
                      <div className="relative">
                        <Input id="defaultParentPassword" type={showPasswords ? "text" : "password"} value={parentSettings.defaultParentPassword} onChange={e => {
                          setParentSettings(prev => ({
                            ...prev,
                            defaultParentPassword: e.target.value
                          }));
                          setHasUnsavedChanges(true);
                        }} placeholder="parent123" />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2" onClick={() => setShowPasswords(!showPasswords)}>
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Paramètres de notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Paramètres de Notifications</span>
                </CardTitle>
                <CardDescription>
                  Configurez les types de notifications à envoyer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notifications par email</Label>
                      <p className="text-sm text-gray-500">Envoyer des notifications par email</p>
                    </div>
                    <Switch checked={notificationSettings.emailNotifications} onCheckedChange={checked => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        emailNotifications: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notifications par SMS</Label>
                      <p className="text-sm text-gray-500">Envoyer des notifications par SMS</p>
                    </div>
                    <Switch checked={notificationSettings.smsNotifications} onCheckedChange={checked => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        smsNotifications: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notifier les absences</Label>
                      <p className="text-sm text-gray-500">Notifier automatiquement les absences</p>
                    </div>
                    <Switch checked={notificationSettings.notifyAbsences} onCheckedChange={checked => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        notifyAbsences: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notifier les retards de paiement</Label>
                      <p className="text-sm text-gray-500">Notifier les paiements en retard</p>
                    </div>
                    <Switch checked={notificationSettings.notifyLatePayments} onCheckedChange={checked => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        notifyLatePayments: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notifier les résultats d'examens</Label>
                      <p className="text-sm text-gray-500">Notifier la publication des résultats</p>
                    </div>
                    <Switch checked={notificationSettings.notifyExamResults} onCheckedChange={checked => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        notifyExamResults: checked
                      }));
                      setHasUnsavedChanges(true);
                    }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paramètres de sécurité */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Paramètres de Sécurité</span>
                </CardTitle>
                <CardDescription>
                  Configurez les paramètres de sécurité de l'application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionTimeout">Délai d'expiration de session (minutes)</Label>
                    <Input id="sessionTimeout" type="number" value={securitySettings.sessionTimeout} onChange={e => setSecuritySettings(prev => ({
                    ...prev,
                    sessionTimeout: parseInt(e.target.value)
                  }))} min="5" max="1440" />
                  </div>
                  <div>
                    <Label htmlFor="passwordMinLength">Longueur minimale du mot de passe</Label>
                    <Input id="passwordMinLength" type="number" value={securitySettings.passwordMinLength} onChange={e => setSecuritySettings(prev => ({
                    ...prev,
                    passwordMinLength: parseInt(e.target.value)
                  }))} min="4" max="20" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exiger un changement de mot de passe</Label>
                      <p className="text-sm text-gray-500">Forcer les utilisateurs à changer leur mot de passe</p>
                    </div>
                    <Switch checked={securitySettings.requirePasswordChange} onCheckedChange={checked => setSecuritySettings(prev => ({
                    ...prev,
                    requirePasswordChange: checked
                  }))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Authentification à deux facteurs</Label>
                      <p className="text-sm text-gray-500">Activer l'authentification à deux facteurs</p>
                    </div>
                    <Switch checked={securitySettings.enableTwoFactor} onCheckedChange={checked => setSecuritySettings(prev => ({
                    ...prev,
                    enableTwoFactor: checked
                  }))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Autoriser plusieurs sessions</Label>
                      <p className="text-sm text-gray-500">Permettre à un utilisateur d'être connecté sur plusieurs appareils</p>
                    </div>
                    <Switch checked={securitySettings.allowMultipleSessions} onCheckedChange={checked => setSecuritySettings(prev => ({
                    ...prev,
                    allowMultipleSessions: checked
                  }))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paramètres de sauvegarde */}
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Paramètres de Sauvegarde</span>
                </CardTitle>
                <CardDescription>
                  Configurez les sauvegardes automatiques des données
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sauvegarde automatique</Label>
                    <p className="text-sm text-gray-500">Activer les sauvegardes automatiques</p>
                  </div>
                  <Switch checked={backupSettings.autoBackup} onCheckedChange={checked => setBackupSettings(prev => ({
                  ...prev,
                  autoBackup: checked
                }))} />
                </div>

                {backupSettings.autoBackup && <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="backupFrequency">Fréquence de sauvegarde</Label>
                        <Select value={backupSettings.backupFrequency} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setBackupSettings(prev => ({
                      ...prev,
                      backupFrequency: value
                    }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Quotidienne</SelectItem>
                            <SelectItem value="weekly">Hebdomadaire</SelectItem>
                            <SelectItem value="monthly">Mensuelle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="retentionDays">Durée de rétention (jours)</Label>
                        <Input id="retentionDays" type="number" value={backupSettings.retentionDays} onChange={e => setBackupSettings(prev => ({
                      ...prev,
                      retentionDays: parseInt(e.target.value)
                    }))} min="1" max="365" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Inclure les fichiers</Label>
                        <p className="text-sm text-gray-500">Inclure les fichiers et images dans la sauvegarde</p>
                      </div>
                      <Switch checked={backupSettings.includeFiles} onCheckedChange={checked => setBackupSettings(prev => ({
                    ...prev,
                    includeFiles: checked
                  }))} />
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Informations système */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>Informations Système</span>
                </CardTitle>
                <CardDescription>
                  Informations techniques et statistiques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Version de l'application</div>
                    <div className="text-lg font-semibold">v1.0.0</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Dernière sauvegarde</div>
                    <div className="text-lg font-semibold">Jamais</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-gray-500">Espace utilisé</div>
                    <div className="text-lg font-semibold">
                      {Math.round(JSON.stringify(localStorage).length / 1024)} KB
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <Label>Migration des comptes utilisateurs</Label>
                    <p className="text-sm text-gray-500 mb-3">
                      Créez automatiquement des comptes de connexion pour tous les utilisateurs existants
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/admin/user-migration'} 
                      variant="outline"
                      className="w-full"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Gérer la migration des comptes
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Statut des services</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span>Base de données locale</span>
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                        Actif
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span>Sauvegardes automatiques</span>
                      <Badge variant="outline" className={backupSettings.autoBackup ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}>
                        {backupSettings.autoBackup ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 border rounded">
                      <span>Notifications</span>
                      <Badge variant="outline" className={notificationSettings.emailNotifications || notificationSettings.smsNotifications ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}>
                        {notificationSettings.emailNotifications || notificationSettings.smsNotifications ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>;
  }