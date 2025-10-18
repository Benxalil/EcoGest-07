import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNotifications } from "@/hooks/useNotifications";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useUserRole } from "@/hooks/useUserRole";
import { useStudentDocuments } from "@/hooks/useStudentDocuments";
import { useMatriculeSettings } from "@/hooks/useMatriculeSettings";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { generateUUID } from "@/utils/uuid";
interface DocumentData {
  name: string;
  file: File | null;
}

// Interface pour les documents existants
interface ExistingDocumentData {
  id: string;
  document_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

interface EleveFormData {
  numeroPerso: string;
  motDePasse: string;
  prenom: string;
  nom: string;
  sexe: string;
  dateNaissance: string;
  lieuNaissance: string;
  adresse: string;
  telephone?: string;
  classe: string;
  
  // Informations du père (avec matricule + mot de passe)
  perePrenom: string;
  pereNom: string;
  pereAdresse: string;
  pereTelephone: string;
  pereStatut: 'alive' | 'deceased'; // ✅ NOUVEAU
  pereFonction: string; // ✅ NOUVEAU
  pereNomUtilisateur: string;
  pereMotDePasse: string;
  
  // Informations de la mère (SANS matricule ni mot de passe)
  merePrenom?: string;
  mereNom?: string;
  mereAdresse?: string;
  mereTelephone?: string;
  mereStatut?: 'alive' | 'deceased'; // ✅ NOUVEAU
  mereFonction?: string; // ✅ NOUVEAU
  // ❌ SUPPRIMÉ : mereNomUtilisateur
  // ❌ SUPPRIMÉ : mereMotDePasse
  
  // Contact d'urgence
  contactUrgenceNom: string;
  contactUrgenceTelephone: string;
  contactUrgenceRelation: string;

  // Informations médicales
  hasMedicalCondition: boolean;
  medicalConditionType?: string;
  medicalConditionDescription?: string;
  doctorName?: string;
  doctorPhone?: string;
  
  statut: boolean;
  photo?: FileList;
  documents?: DocumentData[];
}

// Les paramètres sont désormais récupérés uniquement depuis la base de données via useSchoolSettings
// Plus besoin de localStorage - supprimé pour éviter les problèmes de synchronisation

// Fonction pour générer le prochain numéro automatiquement basé sur le nombre total d'élèves
// ✅ LOGIQUE HARMONISÉE avec les enseignants : comptage continu indépendant du format
const getNextStudentNumber = async (schoolId: string, prefix: string): Promise<string> => {
  try {
    // ✅ NOUVEAU : Compter TOUS les élèves actifs (comme pour les enseignants)
    const { count, error } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (error) {
      console.error("Erreur lors du comptage des élèves:", error);
      return `${prefix}001`;
    }

    // ✅ Le prochain numéro = total d'élèves + 1
    const nextNumber = (count || 0) + 1;
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    return `${prefix}${formattedNumber}`;
    
  } catch (error) {
    console.error("Erreur lors de la génération du numéro:", error);
    return `${prefix}001`;
  }
};

// Cette fonction a été supprimée - les paramètres sont maintenant gérés via useSchoolSettings()

// Générer le prochain numéro de matricule pour les parents
// ✅ LOGIQUE HARMONISÉE : numérotation indépendante basée sur le nombre total de parents
const getNextParentNumber = async (schoolId: string, parentFormat: string): Promise<string> => {
  try {
    // ✅ NOUVEAU : Compter TOUS les parents actifs via leurs profils
    // Chercher dans la table profiles les utilisateurs avec role='parent'
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'parent')
      .eq('is_active', true);

    if (error) {
      console.error("Erreur lors du comptage des parents:", error);
      return `${parentFormat}001`;
    }

    // ✅ Le prochain numéro = total de parents + 1
    const nextNumber = (count || 0) + 1;
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    return `${parentFormat}${formattedNumber}`;
    
  } catch (error) {
    console.error("Erreur lors de la génération du numéro parent:", error);
    return `${parentFormat}001`;
  }
};

// Fonction pour déterminer l'ordre académique d'une classe
const getClassOrder = (session: string, libelle: string): number => {
  const sessionOrder: { [key: string]: number } = {
    'CI': 1, 'CP': 2, 'CE1': 3, 'CE2': 4, 'CM1': 5, 'CM2': 6,
    '6ème': 7, '5ème': 8, '4ème': 9, '3ème': 10,
    '2nde': 11, '1ère': 12, 'Terminale': 13
  };
  
  const sessionValue = sessionOrder[session] || 999;
  const libelleValue = libelle.charCodeAt(0) || 0;
  
  return sessionValue * 100 + libelleValue;
};

// Fonction pour trier les classes par ordre académique
const sortClassesAcademically = (classes: any[]): any[] => {
  return classes.sort((a, b) => {
    const orderA = getClassOrder(a.session, a.libelle);
    const orderB = getClassOrder(b.session, b.libelle);
    return orderA - orderB;
  });
};


// Fonction pour mettre à jour un élève existant dans le localStorage
const updateEleveInStorage = async (eleveData: EleveFormData, studentId: string, photo?: string | null): Promise<void> => {
  try {
    const existingEleves = localStorage.getItem('eleves');
    const eleves = existingEleves ? JSON.parse(existingEleves) : [];
    
    const updatedEleves = eleves.map((eleve: any) => {
      if (eleve.id === studentId) {
        return {
          ...eleve,
          ...eleveData,
          photo: photo !== undefined ? photo : eleve.photo, // Update photo if provided, otherwise keep existing
          dateModification: new Date().toISOString()
        };
      }
      return eleve;
    });
    
    localStorage.setItem('eleves', JSON.stringify(updatedEleves));
    // Debug remplacé par hook Supabase
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'élève:", error);
  }
};

// Fonction pour sauvegarder un élève dans le localStorage
const saveEleveToStorage = async (eleveData: EleveFormData, photo?: string | null): Promise<string> => {
  try {
    const existingEleves = localStorage.getItem('eleves');
    const eleves = existingEleves ? JSON.parse(existingEleves) : [];
    const eleveId = generateUUID();
    const eleveWithId = {
      id: eleveId,
      ...eleveData,
      photo: photo || null, // Save photo with student data
      dateCreation: new Date().toISOString(),
      dateAjout: new Date().toISOString()
    };
    eleves.push(eleveWithId);
    localStorage.setItem('eleves', JSON.stringify(eleves));
    // Debug remplacé par hook Supabase

    // Sauvegarder dans Supabase également
    try {
      const { data: user } = await supabase.auth.getUser();
      let schoolId = '11111111-1111-1111-1111-111111111111'; // Default test school ID
      
      if (user.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.user.id)
          .single();
        
        schoolId = profile?.school_id || schoolId;
      }

      // Utiliser les classes du hook useClasses
      const { classes: classesFromHook } = useClasses();
      const firstClassId = classesFromHook?.[0]?.id;
      
      if (!classesFromHook?.[0]?.id) {
        throw new Error("Aucune classe disponible pour ajouter l'élève");
      }

      const { error } = await supabase
        .from('students')
        .insert({
          student_number: eleveData.numeroPerso,
          first_name: eleveData.prenom,
          last_name: eleveData.nom,
          date_of_birth: eleveData.dateNaissance || null,
          place_of_birth: eleveData.lieuNaissance || null,
          gender: (eleveData.sexe === 'Masculin' ? 'M' : eleveData.sexe === 'Féminin' ? 'F' : null) as 'M' | 'F' | null,
          address: eleveData.adresse || null,
          phone: eleveData.telephone || null,
          parent_phone: eleveData.pereTelephone || null,
          emergency_contact: `${eleveData.contactUrgenceNom} - ${eleveData.contactUrgenceTelephone} (${eleveData.contactUrgenceRelation})`,
          school_id: schoolId,
          class_id: classesFromHook?.[0]?.id,
          is_active: true
        });

      if (error) {
        console.error("Erreur lors de la sauvegarde dans Supabase:", error); } else {
      }
    } catch (supabaseError) {
      console.error("Erreur Supabase:", supabaseError);
      // On continue même si Supabase échoue, les données sont dans localStorage
    }

    
    return eleveId;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de l'élève:", error);
    throw error;
  }
};

const genres = ["Masculin", "Féminin"];
interface AjoutEleveFormProps {
  onSuccess?: () => void;
  initialData?: any;
  isEditing?: boolean;
  classId?: string;
  className?: string;
}

export function AjoutEleveForm({ onSuccess, initialData, isEditing = false, classId, className }: AjoutEleveFormProps) {
  const { showSuccess, showError } = useNotifications();
  const { currentPlan, isFeatureLimited, getFeatureLimit, checkStarterLimits, markAsNotStarterCompatible } = useSubscriptionPlan();
  const { classes, loading: classesLoading } = useClasses();
  const { addStudent, updateStudent } = useStudents();
  const { userProfile } = useUserRole();
  const { uploadDocument } = useStudentDocuments();
  const { settings: schoolSettings, loading: settingsLoading } = useMatriculeSettings();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocumentData[]>([]);
  const [showStarterWarning, setShowStarterWarning] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [useFatherExisting, setUseFatherExisting] = useState(false);
  const [useMotherExisting, setUseMotherExisting] = useState(false);
  const [fatherMatricule, setFatherMatricule] = useState("");
  const [motherMatricule, setMotherMatricule] = useState("");
  const [fatherValidationStatus, setFatherValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [motherValidationStatus, setMotherValidationStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  
  // États pour suivre les champs modifiés manuellement
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());
  
  // Fonction pour marquer un champ comme modifié manuellement
  const markFieldAsManuallyEdited = (fieldName: string) => {
    setManuallyEditedFields(prev => new Set(prev).add(fieldName));
  };
  
  // Fonction pour ajouter un nouveau document
  const addDocument = () => {
    setDocuments([...documents, { name: "", file: null }]);
  };

  // Fonction pour supprimer un document
  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  // Fonction pour mettre à jour un document
  const updateDocument = (index: number, field: keyof DocumentData, value: string | File) => {
    const updatedDocuments = [...documents];
    if (field === 'name' && typeof value === 'string') {
      updatedDocuments[index].name = value;
    } else if (field === 'file' && value instanceof File) {
      updatedDocuments[index].file = value;
    }
    setDocuments(updatedDocuments);
  };
  const form = useForm<EleveFormData>({
    defaultValues: {
      numeroPerso: initialData?.student_number || "",
      motDePasse: initialData?.motDePasse || "",
      prenom: initialData?.first_name || "",
      nom: initialData?.last_name || "",
      sexe: initialData?.gender === 'M' ? 'Masculin' : initialData?.gender === 'F' ? 'Féminin' : "",
      dateNaissance: initialData?.date_of_birth || "",
      lieuNaissance: initialData?.place_of_birth || "",
      adresse: initialData?.address || "",
      telephone: initialData?.phone || "",
      classe: initialData?.classes ? `${initialData.classes?.name || ''} ${initialData.classes?.level || ''}${initialData.classes?.section ? ` - ${initialData.classes.section}` : ''}` : "",
      perePrenom: initialData?.father_first_name || initialData?.parent_first_name || initialData?.perePrenom || "",
      pereNom: initialData?.father_last_name || initialData?.parent_last_name || initialData?.pereNom || "",
      pereAdresse: initialData?.father_address || initialData?.pereAdresse || "",
      pereTelephone: initialData?.father_phone || initialData?.parent_phone || "",
      pereStatut: initialData?.father_status || 'alive', // ✅ NOUVEAU
      pereFonction: initialData?.father_profession || "", // ✅ NOUVEAU
      pereNomUtilisateur: initialData?.pereNomUtilisateur || "",
      pereMotDePasse: initialData?.pereMotDePasse || "",
      
      merePrenom: initialData?.mother_first_name || initialData?.merePrenom || "",
      mereNom: initialData?.mother_last_name || initialData?.mereNom || "",
      mereAdresse: initialData?.mother_address || initialData?.mereAdresse || "",
      mereTelephone: initialData?.mother_phone || initialData?.mereTelephone || "",
      mereStatut: initialData?.mother_status || 'alive', // ✅ NOUVEAU
      mereFonction: initialData?.mother_profession || "", // ✅ NOUVEAU
      
      contactUrgenceNom: initialData?.contactUrgenceNom || "",
      contactUrgenceTelephone: initialData?.emergency_contact?.split(' - ')[1]?.split(' (')[0] || "",
      contactUrgenceRelation: initialData?.emergency_contact?.split(' (')[1]?.replace(')', '') || "",
      
      // ✅ NOUVEAU: Informations médicales
      hasMedicalCondition: initialData?.has_medical_condition || false,
      medicalConditionType: initialData?.medical_condition_type || "",
      medicalConditionDescription: initialData?.medical_condition_description || "",
      doctorName: initialData?.doctor_name || "",
      doctorPhone: initialData?.doctor_phone || "",
      
      statut: initialData?.is_active !== undefined ? initialData.is_active : true
    }
  });

  // Fonctions pour lire depuis localStorage
  const getStudentSettingsFromStorage = () => {
    const stored = localStorage.getItem('studentSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          matriculeFormat: parsed.matriculeFormat,
          defaultStudentPassword: parsed.defaultStudentPassword,
          autoGenerateMatricule: parsed.autoGenerateMatricule
        };
      } catch (e) {
        console.error('❌ Error parsing studentSettings:', e);
      }
    }
    // Fallback vers schoolSettings (base de données) avec valeurs par défaut
    return {
      matriculeFormat: schoolSettings?.studentMatriculeFormat || 'ELEVE',
      defaultStudentPassword: schoolSettings?.defaultStudentPassword || 'student123',
      autoGenerateMatricule: schoolSettings?.autoGenerateStudentMatricule ?? true
    };
  };

  const getParentSettingsFromStorage = () => {
    const stored = localStorage.getItem('parentSettings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          matriculeFormat: parsed.matriculeFormat,
          defaultParentPassword: parsed.defaultParentPassword,
          autoGenerateMatricule: parsed.autoGenerateMatricule
        };
      } catch (e) {
        console.error('❌ Error parsing parentSettings:', e);
      }
    }
    // Fallback vers schoolSettings (base de données) avec valeurs par défaut
    return {
      matriculeFormat: schoolSettings?.parentMatriculeFormat || 'PAR',
      defaultParentPassword: schoolSettings?.defaultParentPassword || 'parent123',
      autoGenerateMatricule: schoolSettings?.autoGenerateParentMatricule ?? true
    };
  };

  // Réinitialiser le formulaire quand initialData change (pour la modification)
  useEffect(() => {
    if (initialData && isEditing) {
      form.reset({
        numeroPerso: initialData.student_number || "",
        motDePasse: initialData.motDePasse || "",
        prenom: initialData.first_name || "",
        nom: initialData.last_name || "",
        sexe: initialData.gender === 'M' ? 'Masculin' : initialData.gender === 'F' ? 'Féminin' : "",
        dateNaissance: initialData.date_of_birth || "",
        lieuNaissance: initialData.place_of_birth || "",
        adresse: initialData.address || "",
        telephone: initialData.phone || "",
        classe: initialData.classes ? `${initialData.classes?.name || ''} ${initialData.classes?.level || ''}${initialData.classes?.section ? ` - ${initialData.classes.section}` : ''}` : className || "",
        perePrenom: initialData.parent_first_name || "",
        pereNom: initialData.parent_last_name || "",
        pereAdresse: initialData.address || "",
        pereTelephone: initialData.parent_phone || "",
        pereNomUtilisateur: initialData.parent_matricule || "",
        pereMotDePasse: "",
        merePrenom: "",
        mereNom: "",
        mereAdresse: "",
        mereTelephone: "",
        mereStatut: 'alive', // ✅ NOUVEAU
        mereFonction: "", // ✅ NOUVEAU
        contactUrgenceNom: initialData.emergency_contact?.split(' - ')[0] || "",
        contactUrgenceTelephone: initialData.emergency_contact?.split(' - ')[1]?.split(' (')[0] || "",
        contactUrgenceRelation: initialData.emergency_contact?.split(' (')[1]?.replace(')', '') || "",
        statut: initialData?.is_active !== undefined ? initialData.is_active : true
      });

      // Charger la photo et les documents existants de l'élève
      const loadExistingData = async () => {
        try {
          // Charger tous les documents
          const { data: allDocuments, error: docsError } = await supabase
            .from('student_documents')
            .select('*')
            .eq('student_id', initialData.id)
            .order('created_at', { ascending: false });

          if (docsError) {
            console.error('Erreur lors du chargement des documents:', docsError);
            return;
          }

          if (allDocuments && allDocuments.length > 0) {
            // Séparer la photo des autres documents
            const photoDoc = allDocuments.find(doc => doc.file_type === 'photo');
            const otherDocs = allDocuments.filter(doc => doc.file_type === 'document');

            // Charger la photo
            if (photoDoc) {
              const { data: photoData, error: photoError } = await supabase.storage
                .from('student-files')
                .createSignedUrl(photoDoc.file_path, 3600);
              
              if (!photoError && photoData) {
                setPhotoPreview(photoData.signedUrl);
              }
            }

            // Charger les documents existants
            const formattedDocs: ExistingDocumentData[] = otherDocs.map((doc) => ({
              id: doc.id,
              document_name: doc.document_name,
              file_name: doc.file_name,
              file_path: doc.file_path,
              file_size: doc.file_size,
              mime_type: doc.mime_type
            }));

            setExistingDocuments(formattedDocs);
          }
        } catch (error) {
          console.error('Erreur lors du chargement des données existantes:', error);
        }
      };

      loadExistingData();
    }
  }, [initialData, isEditing, form, className]);

  // Générer automatiquement le matricule et mot de passe au chargement initial ou lors de changements de settings
  useEffect(() => {
    // Ne rien faire si on est en mode édition et qu'on a des données initiales
    if (isEditing && initialData) {
      return;
    }

    // Ne rien faire si les paramètres ne sont pas encore chargés
    if (!userProfile?.schoolId || settingsLoading) {
      return;
    }

    const generateInitialValues = async () => {
      // Lire les paramètres depuis localStorage
      const currentStudentSettings = getStudentSettingsFromStorage();
      const currentParentSettings = getParentSettingsFromStorage();
      
      console.log('🔧 Initialisation avec paramètres localStorage:', {
        student: currentStudentSettings,
        parent: currentParentSettings
      });
      
      // Générer le matricule de l'élève
      if (currentStudentSettings.autoGenerateMatricule && !manuallyEditedFields.has('numeroPerso')) {
        const nextNumber = await getNextStudentNumber(userProfile.schoolId, currentStudentSettings.matriculeFormat);
        form.setValue("numeroPerso", nextNumber);
        
        // ✅ Générer les matricules parents indépendamment
        if (currentParentSettings.autoGenerateMatricule) {
          const parentNumber = await getNextParentNumber(userProfile.schoolId, currentParentSettings.matriculeFormat);
          if (!manuallyEditedFields.has('pereNomUtilisateur')) {
            form.setValue("pereNomUtilisateur", parentNumber);
          }
          
          // ❌ SUPPRIMÉ : Plus de génération de matricule pour la mère
        }
      }
      
      // Définir le mot de passe par défaut pour l'élève
      if (!manuallyEditedFields.has('motDePasse')) {
        form.setValue("motDePasse", currentStudentSettings.defaultStudentPassword);
      }
      
      // Définir le mot de passe par défaut pour le père uniquement
      if (!manuallyEditedFields.has('pereMotDePasse')) {
        form.setValue("pereMotDePasse", currentParentSettings.defaultParentPassword);
      }
    };
    
    generateInitialValues();

    // Fonction pour gérer les mises à jour en temps réel des paramètres
    const handleSettingsUpdate = async () => {
      if (isEditing || !userProfile?.schoolId) return;
      
      // Lire les nouveaux paramètres depuis localStorage
      const currentStudentSettings = getStudentSettingsFromStorage();
      const currentParentSettings = getParentSettingsFromStorage();
      
      console.log('🔄 Mise à jour avec paramètres localStorage:', {
        student: currentStudentSettings,
        parent: currentParentSettings
      });
      
      // Régénérer le matricule uniquement si l'utilisateur ne l'a pas modifié manuellement
      if (currentStudentSettings.autoGenerateMatricule && !manuallyEditedFields.has('numeroPerso')) {
        const nextNumber = await getNextStudentNumber(userProfile.schoolId, currentStudentSettings.matriculeFormat);
        form.setValue("numeroPerso", nextNumber);
        
        // ✅ Mettre à jour les matricules parents indépendamment si nécessaire
        if (currentParentSettings.autoGenerateMatricule) {
          const parentNumber = await getNextParentNumber(userProfile.schoolId, currentParentSettings.matriculeFormat);
          if (!manuallyEditedFields.has('pereNomUtilisateur')) {
            form.setValue("pereNomUtilisateur", parentNumber);
          }
          // ❌ SUPPRIMÉ : Plus de génération de matricule pour la mère
        }
      }
      
      // Mettre à jour le mot de passe par défaut uniquement si l'utilisateur ne l'a pas modifié
      if (!manuallyEditedFields.has('motDePasse')) {
        form.setValue("motDePasse", currentStudentSettings.defaultStudentPassword);
      }
      
      // Mettre à jour le mot de passe du père uniquement
      if (!manuallyEditedFields.has('pereMotDePasse')) {
        form.setValue("pereMotDePasse", currentParentSettings.defaultParentPassword);
      }
    };

    // Écouter l'événement de mise à jour des paramètres
    window.addEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    };
  }, [isEditing, initialData, userProfile?.schoolId, form, manuallyEditedFields, settingsLoading]);
  
  // Si on a un classId, on utilise la classe spécifiée, sinon on utilise la première classe disponible
  const selectedClass = classId ? 
    classes?.find(c => c.id === classId) : 
    classes?.[0];

  // Surveiller les changements de l'adresse de l'élève et du lieu de naissance
  const watchAdresse = form.watch("adresse");
  const watchLieuNaissance = form.watch("lieuNaissance");
  const watchNom = form.watch("nom");
  const watchPrenom = form.watch("prenom");
  const watchHasMedicalCondition = form.watch("hasMedicalCondition");
  
  // Auto-remplir le lieu de naissance → adresse élève
  useEffect(() => {
    if (isEditing) return; // Ne pas auto-fill en mode édition
    
    if (watchLieuNaissance) {
      const currentAdresse = form.getValues("adresse");
      // Copier seulement si le champ est vide
      if (!currentAdresse || currentAdresse.trim() === "") {
        form.setValue("adresse", watchLieuNaissance);
      }
    }
  }, [watchLieuNaissance, form, isEditing]);
  
  // Auto-remplir le lieu de naissance → adresse père
  useEffect(() => {
    if (isEditing || useFatherExisting) return;
    
    if (watchLieuNaissance) {
      const currentPereAdresse = form.getValues("pereAdresse");
      // Copier seulement si le champ est vide
      if (!currentPereAdresse || currentPereAdresse.trim() === "") {
        form.setValue("pereAdresse", watchLieuNaissance);
      }
    }
  }, [watchLieuNaissance, form, isEditing, useFatherExisting]);
  
  // Auto-remplir nom élève → nom père
  useEffect(() => {
    if (isEditing || useFatherExisting) return;
    
    if (watchNom) {
      const currentPereNom = form.getValues("pereNom");
      // Copier seulement si le champ est vide
      if (!currentPereNom || currentPereNom.trim() === "") {
        form.setValue("pereNom", watchNom);
      }
    }
  }, [watchNom, form, isEditing, useFatherExisting]);
  
  // ❌ Ne plus copier automatiquement le prénom de l'élève vers le prénom du père

  // Surveiller les changements de relation d'urgence pour auto-remplir
  const watchContactRelation = form.watch("contactUrgenceRelation");
  useEffect(() => {
    if (watchContactRelation === "Père") {
      const perePrenom = form.getValues("perePrenom");
      const pereNom = form.getValues("pereNom");
      const pereTelephone = form.getValues("pereTelephone");
      
      if (perePrenom && pereNom) {
        form.setValue("contactUrgenceNom", `${perePrenom} ${pereNom}`);
      }
      if (pereTelephone) {
        form.setValue("contactUrgenceTelephone", pereTelephone);
      }
    } else if (watchContactRelation === "Mère") {
      const merePrenom = form.getValues("merePrenom");
      const mereNom = form.getValues("mereNom");
      const mereTelephone = form.getValues("mereTelephone");
      
      if (merePrenom && mereNom) {
        form.setValue("contactUrgenceNom", `${merePrenom} ${mereNom}`);
      }
      if (mereTelephone) {
        form.setValue("contactUrgenceTelephone", mereTelephone);
      }
    } else if (watchContactRelation !== "Père" && watchContactRelation !== "Mère") {
      // Réinitialiser les champs si une autre relation est sélectionnée
      form.setValue("contactUrgenceNom", "");
      form.setValue("contactUrgenceTelephone", "");
    }
  }, [watchContactRelation, form]);

  // Charger les documents existants lors de l'édition
  useEffect(() => {
    if (isEditing && initialData) {
      // Note: La photo est déjà chargée par le useEffect principal via Supabase
      
      // Charger les documents existants
      const existingDocs = localStorage.getItem('student_documents');
      if (existingDocs) {
        const allDocuments = JSON.parse(existingDocs);
        const studentDocs = allDocuments.filter((doc: any) => doc.student_id === initialData.id);
        setExistingDocuments(studentDocs);
      }
    }
  }, [isEditing, initialData]);

  // Fonction pour prévisualiser un document
  const previewDocument = async (document: ExistingDocumentData) => {
    try {
      const { data, error } = await supabase.storage
        .from('student-files')
        .createSignedUrl(document.file_path, 3600);
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      showError({ 
        title: "Erreur", 
        description: "Impossible de prévisualiser le document" 
      });
    }
  };

  // Fonction pour télécharger un document existant
  const downloadDocument = async (doc: ExistingDocumentData) => {
    try {
      const { data, error } = await supabase.storage
        .from('student-files')
        .download(doc.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      showError({ 
        title: "Erreur", 
        description: "Impossible de télécharger le document" 
      });
    }
  };

  // Fonction pour supprimer un document existant
  const removeExistingDocument = async (documentId: string) => {
    try {
      const docToDelete = existingDocuments.find(doc => doc.id === documentId);
      if (!docToDelete) return;

      // Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from('student-files')
        .remove([docToDelete.file_path]);

      if (storageError) throw storageError;

      // Supprimer l'enregistrement de la base de données
      const { error: dbError } = await supabase
        .from('student_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      setExistingDocuments(existingDocuments.filter(doc => doc.id !== documentId));
      showSuccess({ 
        title: "Succès", 
        description: "Document supprimé avec succès" 
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      showError({ 
        title: "Erreur", 
        description: "Impossible de supprimer le document" 
      });
    }
  };

  // Fonction pour vérifier si un parent existe par son matricule et récupérer le contact urgent
  const verifyParentExists = async (matricule: string): Promise<{ exists: boolean; emergencyContact?: string }> => {
    if (!matricule.trim() || !userProfile?.schoolId) return { exists: false };
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('parent_matricule, emergency_contact')
        .eq('school_id', userProfile.schoolId)
        .eq('parent_matricule', matricule.trim())
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors de la vérification du matricule parent:', error);
        return { exists: false };
      }

      return { 
        exists: !!data, 
        emergencyContact: data?.emergency_contact || undefined 
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du matricule parent:', error);
      return { exists: false };
    }
  };

  // Vérification en temps réel du matricule père
  useEffect(() => {
    if (!useFatherExisting || !fatherMatricule.trim()) {
      setFatherValidationStatus('idle');
      return;
    }

    setFatherValidationStatus('checking');
    
    const timeoutId = setTimeout(async () => {
      const result = await verifyParentExists(fatherMatricule);
      setFatherValidationStatus(result.exists ? 'valid' : 'invalid');
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [fatherMatricule, useFatherExisting, userProfile?.schoolId]);

  // Vérification en temps réel du matricule mère
  useEffect(() => {
    if (!useMotherExisting || !motherMatricule.trim()) {
      setMotherValidationStatus('idle');
      return;
    }

    setMotherValidationStatus('checking');
    
    const timeoutId = setTimeout(async () => {
      const result = await verifyParentExists(motherMatricule);
      setMotherValidationStatus(result.exists ? 'valid' : 'invalid');
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [motherMatricule, useMotherExisting, userProfile?.schoolId]);
  // Fonction pour uploader les documents vers Supabase
  const uploadDocuments = async (studentId: string, schoolId: string, studentData: any) => {
    if (!documents || documents.length === 0) return;

    try {
      for (const doc of documents) {
        if (!doc.file || !doc.name.trim()) continue;

        // Upload du document vers Supabase avec le nom saisi par l'utilisateur
        const result = await uploadDocument(studentId, doc.file, 'document', doc.name);
        
        if (!result.success) {
          console.error('Erreur lors de l\'upload du document:', result.error);
          showError({
            title: "Erreur d'upload",
            description: `Erreur lors de l'upload du document ${doc.name}: ${result.error}`,
          }); } else {
          }
      }
    } catch (error) {
      console.error("Erreur lors de l'upload des documents:", error);
      showError({
        title: "Erreur d'upload",
        description: "Erreur lors de l'upload des documents",
      });
    }
  };

  const onSubmit = async (data: EleveFormData) => {
    // Validation supplémentaire pour s'assurer qu'une classe est disponible
    if (!selectedClass && !classId) {
      showError({
        title: "Erreur",
        description: "Aucune classe disponible pour ajouter l'élève",
      });
      return;
    }

    // Vérifier les matricules parents et récupérer le contact urgent s'ils existent
    let recoveredEmergencyContact: string | undefined;

    if (useFatherExisting && fatherMatricule) {
      const fatherResult = await verifyParentExists(fatherMatricule);
      if (!fatherResult.exists) {
        showError({
          title: "Erreur",
          description: "Ce matricule parent (père) n'existe pas dans le système",
        });
        return;
      }
      recoveredEmergencyContact = fatherResult.emergencyContact;
    }

    if (useMotherExisting && motherMatricule) {
      const motherResult = await verifyParentExists(motherMatricule);
      if (!motherResult.exists) {
        showError({
          title: "Erreur",
          description: "Ce matricule parent (mère) n'existe pas dans le système",
        });
        return;
      }
      // Si pas encore récupéré du père, utiliser celui de la mère
      if (!recoveredEmergencyContact) {
        recoveredEmergencyContact = motherResult.emergencyContact;
      }
    }

    // Vérifier les limites d'abonnement uniquement pour les nouveaux élèves
    if (!isEditing) {
      const existingEleves = localStorage.getItem('eleves');
      const eleves = existingEleves ? JSON.parse(existingEleves) : [];
      const currentStudentCount = eleves.length;
      
      // Pour les plans payants, utiliser la logique existante
      if (currentPlan !== 'trial' && isFeatureLimited('students', currentStudentCount)) {
        const limit = getFeatureLimit('students');
        showError({
          title: "Limite d'abonnement atteinte",
          description: `Votre plan ${currentPlan.replace('_', ' ').toUpperCase()} permet maximum ${limit} élèves. Passez à un forfait supérieur pour ajouter plus d'élèves.`,
        });
        return;
      }

      // Pour la période d'essai, vérifier les limites Starter et afficher un avertissement
      if (currentPlan === 'trial') {
        const starterLimits = checkStarterLimits('students', currentStudentCount);
        
        if (starterLimits.exceedsStarter) {
          setPendingFormData(data);
          setShowStarterWarning(true);
          return;
        }
      }
    }

    try {
        // Récupérer les informations de l'utilisateur et de l'école
        const { data: user } = await supabase.auth.getUser();
        let schoolId = '11111111-1111-1111-1111-111111111111'; // Default test school ID
        
        if (user.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('school_id')
            .eq('id', user.user.id)
            .single();
          
          schoolId = profile?.school_id || schoolId;
        }

        // Récupérer les paramètres personnalisés depuis localStorage
        const currentStudentSettings = getStudentSettingsFromStorage();
        const currentParentSettings = getParentSettingsFromStorage();
        
        console.log('📝 Soumission avec paramètres localStorage:', {
          student: currentStudentSettings,
          parent: currentParentSettings
        });
        
      const studentData = {
        student_number: data.numeroPerso,
        first_name: data.prenom,
        last_name: data.nom,
        date_of_birth: data.dateNaissance || null,
        place_of_birth: data.lieuNaissance || null,
        gender: (data.sexe === 'Masculin' ? 'M' : data.sexe === 'Féminin' ? 'F' : null) as 'M' | 'F' | null,
        address: data.adresse || null,
        phone: data.telephone || null,
        
        // Informations père
        father_first_name: data.perePrenom || null,
        father_last_name: data.pereNom || null,
        father_phone: data.pereTelephone || null,
        father_address: data.pereAdresse || null,
        father_status: data.pereStatut || 'alive',
        father_profession: data.pereFonction || null,
        
        // Informations mère
        mother_first_name: data.merePrenom || null,
        mother_last_name: data.mereNom || null,
        mother_phone: data.mereTelephone || null,
        mother_address: data.mereAdresse || null,
        mother_status: data.mereStatut || 'alive',
        mother_profession: data.mereFonction || null,
        
        // Informations médicales
        has_medical_condition: data.hasMedicalCondition || false,
        medical_condition_type: data.hasMedicalCondition ? data.medicalConditionType : null,
        medical_condition_description: data.hasMedicalCondition ? data.medicalConditionDescription : null,
        doctor_name: data.hasMedicalCondition ? data.doctorName : null,
        doctor_phone: data.hasMedicalCondition ? data.doctorPhone : null,
        
        // Compatibilité
        parent_phone: data.pereTelephone || null,
        parent_email: data.perePrenom && data.pereNom ? `${data.perePrenom.toLowerCase()}.${data.pereNom.toLowerCase()}@parent.com` : null,
        parent_first_name: data.perePrenom || null,
        parent_last_name: data.pereNom || null,
        emergency_contact: recoveredEmergencyContact || `${data.contactUrgenceNom} - ${data.contactUrgenceTelephone} (${data.contactUrgenceRelation})`,
        school_id: schoolId,
        class_id: classId || selectedClass?.id,
        is_active: data.statut,
        parent_matricule: useFatherExisting ? fatherMatricule : (useMotherExisting ? motherMatricule : null)
      };

      let result;
      if (isEditing && initialData) {
        // Mise à jour d'un élève existant
        result = await updateStudent(initialData.id, studentData);
      } else {
        // Ajout d'un nouvel élève avec les paramètres personnalisés
        console.log('🔐 Mots de passe transmis à addStudent:', {
          studentPassword: currentStudentSettings.defaultStudentPassword ? '***' + currentStudentSettings.defaultStudentPassword.slice(-3) : 'vide',
          parentPassword: currentParentSettings.defaultParentPassword ? '***' + currentParentSettings.defaultParentPassword.slice(-3) : 'vide'
        });
        
        result = await addStudent(studentData, {
          studentMatriculeFormat: currentStudentSettings.matriculeFormat,
          parentMatriculeFormat: currentParentSettings.matriculeFormat,
          defaultStudentPassword: currentStudentSettings.defaultStudentPassword,
          defaultParentPassword: currentParentSettings.defaultParentPassword
        });
      }
      
      // Vérifier que l'élève a bien été créé/modifié
      if (!result || !result.id) {
        throw new Error("Erreur lors de la création/modification de l'élève");
      }
      
      // Uploader la photo si elle existe
      if (photoFile && result.id) {
        try {
          const photoResult = await uploadDocument(result.id, photoFile, 'photo');
          if (!photoResult.success) {
            console.error('Erreur lors de l\'upload de la photo:', photoResult.error);
            showError({
              title: "Avertissement",
              description: `L'élève a été ${isEditing ? 'modifié' : 'créé'} mais l'upload de la photo a échoué: ${photoResult.error}`,
            });
          }
        } catch (photoError) {
          console.error('Erreur lors de l\'upload de la photo:', photoError);
          showError({
            title: "Avertissement", 
            description: `L'élève a été ${isEditing ? 'modifié' : 'créé'} mais l'upload de la photo a échoué`,
          });
        }
      }

      // Uploader les documents si il y en a
      if (documents && documents.length > 0) {
        await uploadDocuments(result.id, schoolId, data);
      }

      showSuccess({
        title: isEditing ? "Élève modifié avec succès" : "Élève ajouté avec succès",
        description: `${data.prenom} ${data.nom} a été ${isEditing ? 'modifié(e)' : 'ajouté(e)'} ${!isEditing && selectedClass ? `à la classe ${selectedClass.name} ${selectedClass.level}${selectedClass.section ? ` - ${selectedClass.section}` : ''}` : ''}`,
      });

      // Réinitialiser le formulaire après sauvegarde
      if (!isEditing) {
        form.reset();
        setPhotoPreview(null);
        setPhotoFile(null);
        setDocuments([]); // Réinitialiser les documents
      }
      
      // Appeler onSuccess si fourni (pour fermer le modal)
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Erreur lors de ${isEditing ? 'la modification' : "l'ajout"} de l'élève:`, error);
      showError({
        title: "Erreur",
        description: `Une erreur est survenue lors de ${isEditing ? 'la modification' : "l'ajout"} de l'élève`,
      });
    }
  };

  const handleStarterWarningConfirm = async () => {
    if (!pendingFormData) return;
    
    await markAsNotStarterCompatible();
    setShowStarterWarning(false);
    
    // Continuer avec la création de l'élève en utilisant les données sauvegardées
    const data = pendingFormData;
    setPendingFormData(null);

    try {
      // Récupérer les informations de l'utilisateur et de l'école
      const { data: user } = await supabase.auth.getUser();
      let schoolId = '11111111-1111-1111-1111-111111111111'; // Default test school ID
      
      if (user.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.user.id)
          .single();
        
        schoolId = profile?.school_id || schoolId;
      }
      
      const studentData = {
        student_number: data.numeroPerso,
        first_name: data.prenom,
        last_name: data.nom,
        date_of_birth: data.dateNaissance || null,
        place_of_birth: data.lieuNaissance || null,
        gender: (data.sexe === 'Masculin' ? 'M' : data.sexe === 'Féminin' ? 'F' : null) as 'M' | 'F' | null,
        address: data.adresse || null,
        phone: data.telephone || null,
        parent_phone: data.pereTelephone || null,
        parent_email: data.perePrenom && data.pereNom ? `${data.perePrenom.toLowerCase()}.${data.pereNom.toLowerCase()}@parent.com` : null,
        parent_first_name: data.perePrenom || null,
        parent_last_name: data.pereNom || null,
        emergency_contact: `${data.contactUrgenceNom} - ${data.contactUrgenceTelephone} (${data.contactUrgenceRelation})`,
        school_id: schoolId,
        class_id: selectedClass?.id,
        is_active: data.statut
      };

      const result = await addStudent(studentData);
      if (result) {
        showSuccess({
          title: "Succès",
          description: "L'élève a été ajouté avec succès",
        });
        
        form.reset();
        setPhotoPreview(null);
        setPhotoFile(null);
        setDocuments([]);
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'élève:", error);
      showError({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout de l'élève",
      });
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target?.files;

    // Add null check for event.target
    if (!event.target) {
      return;
    }

    // Add null check for files
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0];
    // Add null check for file type
    if (!file || !file.type) {
      showError({
        title: "Erreur",
        description: "Format de fichier invalide",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError({
        title: "Erreur",
        description: "La taille de l'image ne doit pas dépasser 2Mo",
      });
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      showError({
        title: "Erreur",
        description: "Seuls les formats .jpg et .png sont acceptés",
      });
      return;
    }
    // Stocker le fichier pour l'upload
    setPhotoFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  return (
    <>
      <AlertDialog open={showStarterWarning} onOpenChange={setShowStarterWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limite du plan Starter dépassée</AlertDialogTitle>
            <AlertDialogDescription>
              En ajoutant plus de 200 élèves, vous ne pourrez plus choisir le plan Starter à la fin de l'essai gratuit. 
              Vous devrez opter pour un plan Pro ou Premium. Voulez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleStarterWarningConfirm}>
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Informations sur l'élève</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="numeroPerso" render={({
            field
          }) => <FormItem>
                  <FormLabel>Matricule</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                  {!settingsLoading && userProfile?.schoolId && schoolSettings && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Format: {schoolSettings.studentMatriculeFormat}XXX@{userProfile.schoolId.substring(0, 8)}.ecogest.app
                    </div>
                  )}
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="motDePasse" render={({
            field
          }) => <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="prenom" rules={{
            required: "Le prénom est requis"
          }} render={({
            field
          }) => <FormItem>
                  <FormLabel>Prénom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="nom" rules={{
            required: "Le nom est requis"
          }} render={({
            field
          }) => <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
          </div>

          <FormField control={form.control} name="sexe" rules={{
          required: "Le sexe est requis"
        }} render={({
          field
        }) => <FormItem>
                <FormLabel>Sexe</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le sexe" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {genres.map(genre => <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="dateNaissance" rules={{
            required: "La date de naissance est requise"
          }} render={({
            field
          }) => <FormItem>
                  <FormLabel>Date de naissance</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="lieuNaissance" rules={{
            required: "Le lieu de naissance est requis"
          }} render={({
            field
          }) => <FormItem>
                  <FormLabel>Lieu de naissance</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ville/région de naissance" />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
          </div>

          <FormField control={form.control} name="telephone" render={({
            field
          }) => <FormItem>
                  <FormLabel>Numéro de téléphone (optionnel)</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} placeholder="+237..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

          <FormField control={form.control} name="adresse" rules={{
          required: "L'adresse est requise"
        }} render={({
          field
        }) => <FormItem>
                <FormLabel>Adresse</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                {watchLieuNaissance && field.value === watchLieuNaissance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Valeur copiée automatiquement du lieu de naissance — modifiable
                  </p>
                )}
                <FormMessage />
              </FormItem>} />

          {/* Affichage de la classe sélectionnée */}
          {selectedClass && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Classe :</strong> {selectedClass.name} {selectedClass.level}{selectedClass.section ? ` - ${selectedClass.section}` : ''}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                L'élève sera automatiquement ajouté à cette classe
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Informations du père</h2>
          
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="useFatherExisting"
              checked={useFatherExisting}
              onCheckedChange={(checked) => setUseFatherExisting(checked as boolean)}
            />
            <label
              htmlFor="useFatherExisting"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ce parent existe déjà dans le système
            </label>
          </div>

          {useFatherExisting ? (
            <FormItem>
              <FormLabel>Matricule du parent (père)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    value={fatherMatricule}
                    onChange={(e) => setFatherMatricule(e.target.value)}
                    placeholder="Ex: PAR001"
                    className={
                      fatherValidationStatus === 'valid' ? 'border-green-500' :
                      fatherValidationStatus === 'invalid' ? 'border-red-500' :
                      ''
                    }
                  />
                  {fatherValidationStatus === 'checking' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                  {fatherValidationStatus === 'valid' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      ✓
                    </div>
                  )}
                  {fatherValidationStatus === 'invalid' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                      ✗
                    </div>
                  )}
                </div>
              </FormControl>
              {fatherValidationStatus === 'valid' && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Matricule valide - Parent trouvé dans le système
                </p>
              )}
              {fatherValidationStatus === 'invalid' && (
                <p className="text-xs text-red-600 mt-1">
                  ✗ Matricule invalide - Aucun parent trouvé avec ce matricule
                </p>
              )}
              {fatherValidationStatus === 'idle' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Entrez le matricule du parent existant pour l'associer à cet élève
                </p>
              )}
            </FormItem>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="perePrenom" rules={{
                required: "Le prénom du père est requis"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="pereNom" rules={{
                required: "Le nom du père est requis"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      {watchNom && field.value === watchNom && (
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Valeur copiée automatiquement — modifiable
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="pereAdresse" rules={{
                required: "L'adresse du père est requise"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      {watchLieuNaissance && field.value === watchLieuNaissance && (
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Valeur copiée automatiquement du lieu de naissance — modifiable
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="pereTelephone" rules={{
                required: "Le numéro de téléphone du père est requis"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Numéro de téléphone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              {/* ✅ NOUVEAU : Statut de vie et Fonction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="pereStatut" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Statut de vie</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || 'alive'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="alive">En vie</SelectItem>
                          <SelectItem value="deceased">Décédé</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="pereFonction" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Fonction / Profession</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Enseignant, Commerçant, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="pereNomUtilisateur" render={({
                field
              }) => <FormItem>
                      <FormLabel>Nom d'utilisateur (Père)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          disabled={schoolSettings?.autoGenerateParentMatricule && !useFatherExisting}
                          className={schoolSettings?.autoGenerateParentMatricule && !useFatherExisting ? "bg-muted" : ""}
                        />
                      </FormControl>
                      {!settingsLoading && !useFatherExisting && userProfile?.schoolId && schoolSettings && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Format: {schoolSettings.parentMatriculeFormat}XXX@{userProfile.schoolId.substring(0, 8)}.ecogest.app
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="pereMotDePasse" render={({
                field
              }) => <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Informations de la mère</h2>
          
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox 
              id="useMotherExisting"
              checked={useMotherExisting}
              onCheckedChange={(checked) => setUseMotherExisting(checked as boolean)}
            />
            <label
              htmlFor="useMotherExisting"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ce parent existe déjà dans le système
            </label>
          </div>

          {useMotherExisting ? (
            <FormItem>
              <FormLabel>Matricule du parent (mère)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input 
                    value={motherMatricule}
                    onChange={(e) => setMotherMatricule(e.target.value)}
                    placeholder="Ex: PAR002"
                    className={
                      motherValidationStatus === 'valid' ? 'border-green-500' :
                      motherValidationStatus === 'invalid' ? 'border-red-500' :
                      ''
                    }
                  />
                  {motherValidationStatus === 'checking' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                  {motherValidationStatus === 'valid' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      ✓
                    </div>
                  )}
                  {motherValidationStatus === 'invalid' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
                      ✗
                    </div>
                  )}
                </div>
              </FormControl>
              {motherValidationStatus === 'valid' && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Matricule valide - Parent trouvé dans le système
                </p>
              )}
              {motherValidationStatus === 'invalid' && (
                <p className="text-xs text-red-600 mt-1">
                  ✗ Matricule invalide - Aucun parent trouvé avec ce matricule
                </p>
              )}
              {motherValidationStatus === 'idle' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Entrez le matricule du parent existant pour l'associer à cet élève
                </p>
              )}
            </FormItem>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="merePrenom" render={({
                field
              }) => <FormItem>
                      <FormLabel>Prénom (optionnel)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="mereNom" render={({
                field
              }) => <FormItem>
                      <FormLabel>Nom (optionnel)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="mereAdresse" render={({
                field
              }) => <FormItem>
                      <FormLabel>Adresse (optionnel)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="mereTelephone" render={({
                field
              }) => <FormItem>
                      <FormLabel>Numéro de téléphone (optionnel)</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              {/* ✅ NOUVEAU : Statut de vie et Fonction pour la mère */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="mereStatut" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Statut de vie (optionnel)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || 'alive'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="alive">En vie</SelectItem>
                          <SelectItem value="deceased">Décédée</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="mereFonction" render={({
                  field
                }) => <FormItem>
                      <FormLabel>Fonction / Profession (optionnel)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Infirmière, Couturière, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>
            </>
          )}
        </div>

        {/* Informations médicales */}
        <div className="space-y-6 bg-red-50/30 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Informations médicales
            </h2>
          </div>

          <FormField
            control={form.control}
            name="hasMedicalCondition"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-red-300 bg-white p-4 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold">
                    L'élève souffre-t-il d'une maladie ?
                  </FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Activez pour renseigner les informations médicales
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!checked) {
                        form.setValue('medicalConditionType', '');
                        form.setValue('medicalConditionDescription', '');
                        form.setValue('doctorName', '');
                        form.setValue('doctorPhone', '');
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {watchHasMedicalCondition && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <FormField
                control={form.control}
                name="medicalConditionType"
                rules={{
                  required: watchHasMedicalCondition ? "Le type de maladie est requis" : false
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      Type de maladie
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex : Asthme, Diabète, Allergie alimentaire, etc."
                        className="border-red-300 focus-visible:ring-red-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalConditionDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description de la maladie (facultatif)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Détails sur la maladie, traitement, allergies, précautions à prendre..."
                        rows={4}
                        className="border-red-300 focus-visible:ring-red-500 resize-none"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Indiquez les traitements, allergies ou précautions spéciales
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="doctorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du médecin traitant (facultatif)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Dr. Nom du médecin"
                          className="border-red-300 focus-visible:ring-red-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro du médecin (facultatif)</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          {...field} 
                          placeholder="+237 6XX XXX XXX"
                          className="border-red-300 focus-visible:ring-red-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-amber-50 border border-amber-300 rounded-md p-3 text-sm text-amber-800">
                <p className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Ces informations sont <strong>confidentielles</strong> et ne seront accessibles qu'à l'administration, 
                    aux enseignants principaux et aux parents de l'élève.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Contact d'urgence</h2>
          {(useFatherExisting || useMotherExisting) && (
            <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
              ℹ️ Le contact urgent sera automatiquement récupéré depuis le parent existant
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="contactUrgenceNom" rules={{
            required: (useFatherExisting || useMotherExisting) ? false : "Le nom du contact d'urgence est requis"
          }} render={({
            field
          }) => <FormItem>
                  <FormLabel>
                    Nom
                    {(useFatherExisting || useMotherExisting) && (
                      <span className="text-muted-foreground text-sm ml-2">(Facultatif)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="par exemple : John"
                      disabled={useFatherExisting || useMotherExisting}
                      className={useFatherExisting || useMotherExisting ? "bg-muted" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="contactUrgenceTelephone" rules={{
            required: (useFatherExisting || useMotherExisting) ? false : "Le téléphone du contact d'urgence est requis"
          }} render={({
            field
          }) => <FormItem>
                  <FormLabel>
                    Téléphone
                    {(useFatherExisting || useMotherExisting) && (
                      <span className="text-muted-foreground text-sm ml-2">(Facultatif)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      {...field} 
                      placeholder="par exemple : +237xxx"
                      disabled={useFatherExisting || useMotherExisting}
                      className={useFatherExisting || useMotherExisting ? "bg-muted" : ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="contactUrgenceRelation" rules={{
            required: (useFatherExisting || useMotherExisting) ? false : "La relation est requise"
          }} render={({
            field
          }) => <FormItem>
                  <FormLabel>
                    Relation
                    {(useFatherExisting || useMotherExisting) && (
                      <span className="text-muted-foreground text-sm ml-2">(Facultatif)</span>
                    )}
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={useFatherExisting || useMotherExisting}
                  >
                    <FormControl>
                      <SelectTrigger className={useFatherExisting || useMotherExisting ? "bg-muted" : ""}>
                        <SelectValue placeholder="Parent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Père">Père</SelectItem>
                      <SelectItem value="Mère">Mère</SelectItem>
                      <SelectItem value="Frère">Frère</SelectItem>
                      <SelectItem value="Sœur">Sœur</SelectItem>
                      <SelectItem value="Tuteur">Tuteur</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Photo</h2>
          <div className="flex flex-col items-center gap-6">
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Aperçu" className="w-32 h-32 object-cover rounded-full border-4 border-primary/20 shadow-lg" />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs hover:bg-destructive/80 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/10 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-xs text-muted-foreground">Photo</span>
                </div>
              </div>
            )}
            
            <div className="relative">
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handlePhotoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {photoPreview ? 'Changer la photo' : 'Choisir une photo'}
              </label>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Formats acceptés : .jpg, .png (max 2Mo)
            </p>
          </div>
        </div>

        {/* Section Documents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Documents (optionnel)</h2>
            <Button
              type="button"
              variant="outline"
              onClick={addDocument}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Ajouter un document
            </Button>
          </div>

          {/* Documents existants */}
          {existingDocuments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Documents enregistrés</h3>
              {existingDocuments.map((doc, index) => (
                <div key={doc.id} className="border border-primary/20 bg-primary/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-primary">{doc.document_name}</h4>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => previewDocument(doc)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Prévisualiser le document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadDocument(doc)}
                        className="text-green-600 hover:text-green-700"
                        title="Télécharger le document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExistingDocument(doc.id)}
                        className="text-destructive hover:text-destructive"
                        title="Supprimer le document"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Nom du fichier: {doc.file_name}</p>
                    <p>Taille: {(doc.file_size / 1024 / 1024).toFixed(2)} Mo</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Nouveaux documents à ajouter */}
          {documents.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Nouveaux documents à ajouter</h3>
              {documents.map((doc, index) => (
                <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Document {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nom du document *
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: Acte de naissance, Certificat de scolarité..."
                      value={doc.name}
                      onChange={(e) => updateDocument(index, 'name', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Fichier *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateDocument(index, 'file', file);
                          }
                        }}
                        className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                      {doc.file && (
                        <span className="text-sm text-muted-foreground">
                          {doc.file.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {documents.length === 0 && existingDocuments.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <svg className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-muted-foreground mb-2">Aucun document ajouté</p>
              <p className="text-sm text-muted-foreground">
                Cliquez sur "Ajouter un document" pour joindre des fichiers
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Formats acceptés : PDF, DOC, DOCX, JPG, PNG (max 10Mo par fichier)
          </p>
        </div>

        {/* Section Statut de l'élève */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="statut"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Statut de l'élève</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Activer ou désactiver l'élève
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          Enregistrer
        </Button>
      </form>
    </Form>
    </>
  );
}