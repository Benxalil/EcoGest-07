import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNotifications } from "@/hooks/useNotifications";
import { useSubscriptionPlan } from "@/hooks/useSubscriptionPlan";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useUserRole } from "@/hooks/useUserRole";
import { useStudentDocuments } from "@/hooks/useStudentDocuments";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  perePrenom: string;
  pereNom: string;
  pereAdresse: string;
  pereTelephone: string;
  pereNomUtilisateur: string;
  pereMotDePasse: string;
  merePrenom?: string;
  mereNom?: string;
  mereAdresse?: string;
  mereTelephone?: string;
  mereNomUtilisateur?: string;
  mereMotDePasse?: string;
  contactUrgenceNom: string;
  contactUrgenceTelephone: string;
  contactUrgenceRelation: string;
  photo?: FileList;
  documents?: DocumentData[];
}

// Fonction pour récupérer les paramètres des élèves depuis le localStorage
const getStudentSettingsFromStorage = () => {
  try {
    const savedSettings = localStorage.getItem('studentSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return {
      autoGenerateMatricule: true,
      matriculeFormat: 'ELEVE',
      defaultStudentPassword: 'student123',
      parentNotifications: true
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres des élèves:", error);
    return {
      autoGenerateMatricule: true,
      matriculeFormat: 'ELEVE',
      defaultStudentPassword: 'student123',
      parentNotifications: true
    };
  }
};

// Fonction pour générer le prochain numéro automatiquement basé sur les matricules existants
const getNextStudentNumber = async (schoolId: string, prefix: string): Promise<string> => {
  try {
    // Récupérer tous les matricules existants avec ce préfixe
    const { data: students, error } = await supabase
      .from('students')
      .select('student_number')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .like('student_number', `${prefix}%`);

    if (error) {
      console.error("Erreur lors de la récupération des matricules:", error);
      return `${prefix}001`;
    }

    // Extraire les numéros existants
    const existingNumbers = students
      ?.map(s => {
        const numStr = s.student_number?.replace(prefix, '');
        return parseInt(numStr) || 0;
      })
      .filter(n => !isNaN(n)) || [];

    // Trouver le premier numéro disponible
    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    
    // Formater avec 3 chiffres minimum (ex: 001, 002, 015)
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    return `${prefix}${formattedNumber}`;
    
  } catch (error) {
    console.error("Erreur lors de la génération du numéro:", error);
    return `${prefix}001`;
  }
};

// Fonction pour récupérer les paramètres des parents
const getParentSettingsFromStorage = () => {
  try {
    const settings = localStorage.getItem('parentSettings');
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres parents:', error);
  }
  
  // Valeurs par défaut si aucun paramètre n'est trouvé
  return {
    matriculeFormat: 'PAR',
    defaultParentPassword: '123456',
    autoGenerateMatricule: true
  };
};

// Générer le prochain numéro de matricule pour les parents (basé sur le matricule élève)
const getNextParentNumber = (studentMatricule: string, type: 'PERE' | 'MERE', parentFormat: string, studentFormat: string) => {
  try {
    // Extraire le numéro du matricule élève pour le réutiliser
    const numberPart = studentMatricule.replace(studentFormat, '');
    
    // Utiliser le même numéro pour les parents
    return `${parentFormat}${numberPart}`;
  } catch (error) {
    console.error("Erreur lors de la génération du numéro parent:", error);
    return `PAR001`;
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
          parent_email: eleveData.perePrenom && eleveData.pereNom ? `${eleveData.perePrenom.toLowerCase()}.${eleveData.pereNom.toLowerCase()}@parent.com` : null,
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
  const { settings: schoolSettings, loading: settingsLoading } = useSchoolSettings();
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
      classe: initialData?.classes ? `${initialData.classes.name} ${initialData.classes.level}${initialData.classes.section ? ` - ${initialData.classes.section}` : ''}` : "",
      perePrenom: initialData?.perePrenom || "",
      pereNom: initialData?.pereNom || "",
      pereAdresse: initialData?.pereAdresse || "",
      pereTelephone: initialData?.parent_phone || "",
      pereNomUtilisateur: initialData?.pereNomUtilisateur || "",
      pereMotDePasse: initialData?.pereMotDePasse || "",
      merePrenom: initialData?.merePrenom || "",
      mereNom: initialData?.mereNom || "",
      mereAdresse: initialData?.mereAdresse || "",
      mereTelephone: initialData?.mereTelephone || "",
      mereNomUtilisateur: initialData?.mereNomUtilisateur || "",
      mereMotDePasse: initialData?.mereMotDePasse || "",
      contactUrgenceNom: initialData?.contactUrgenceNom || "",
      contactUrgenceTelephone: initialData?.emergency_contact?.split(' - ')[1]?.split(' (')[0] || "",
      contactUrgenceRelation: initialData?.emergency_contact?.split(' (')[1]?.replace(')', '') || ""
    }
  });

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
        classe: initialData.classes ? `${initialData.classes.name} ${initialData.classes.level}${initialData.classes.section ? ` - ${initialData.classes.section}` : ''}` : "",
        perePrenom: initialData.perePrenom || "",
        pereNom: initialData.pereNom || "",
        pereAdresse: initialData.pereAdresse || "",
        pereTelephone: initialData.parent_phone || "",
        pereNomUtilisateur: initialData.pereNomUtilisateur || "",
        pereMotDePasse: initialData.pereMotDePasse || "",
        merePrenom: initialData.merePrenom || "",
        mereNom: initialData.mereNom || "",
        mereAdresse: initialData.mereAdresse || "",
        mereTelephone: initialData.mereTelephone || "",
        mereNomUtilisateur: initialData.mereNomUtilisateur || "",
        mereMotDePasse: initialData.mereMotDePasse || "",
        contactUrgenceNom: initialData.contactUrgenceNom || "",
        contactUrgenceTelephone: initialData.emergency_contact?.split(' - ')[1]?.split(' (')[0] || "",
        contactUrgenceRelation: initialData.emergency_contact?.split(' (')[1]?.replace(')', '') || ""
      });

      // Charger la photo existante de l'élève
      const loadExistingPhoto = async () => {
        try {
          const { data: documents, error } = await supabase
            .from('student_documents')
            .select('*')
            .eq('student_id', initialData.id)
            .eq('file_type', 'photo')
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && documents && documents.length > 0) {
            const { data } = supabase.storage
              .from('student-files')
              .getPublicUrl(documents[0].file_path);
            setPhotoPreview(data.publicUrl);
          }
        } catch (error) {
          console.error('Erreur lors du chargement de la photo existante:', error);
        }
      };

      loadExistingPhoto();
    }
  }, [initialData, isEditing, form]);

  // Générer automatiquement le numéro perso et le mot de passe au chargement
  useEffect(() => {
    // Ne pas générer automatiquement si on est en mode édition ou si les settings ne sont pas chargés
    if (isEditing || initialData || !userProfile?.schoolId || settingsLoading) return;
    
    const generateStudentNumber = async () => {
      // Générer le matricule seulement si la génération automatique est activée
      if (schoolSettings.autoGenerateStudentMatricule) {
        const nextNumber = await getNextStudentNumber(userProfile.schoolId, schoolSettings.studentMatriculeFormat);
        form.setValue("numeroPerso", nextNumber);
        
        // Générer les noms d'utilisateur des parents selon les paramètres
        if (schoolSettings.autoGenerateParentMatricule) {
          const parentNumber = getNextParentNumber(nextNumber, 'PERE', schoolSettings.parentMatriculeFormat, schoolSettings.studentMatriculeFormat);
          const mereNumber = getNextParentNumber(nextNumber, 'MERE', schoolSettings.parentMatriculeFormat, schoolSettings.studentMatriculeFormat);
          
          form.setValue("pereNomUtilisateur", parentNumber);
          form.setValue("mereNomUtilisateur", mereNumber);
        }
      }
    };

    generateStudentNumber();
    
    // Appliquer les mots de passe par défaut depuis les paramètres
    form.setValue("motDePasse", schoolSettings.defaultStudentPassword);
    form.setValue("pereMotDePasse", schoolSettings.defaultParentPassword);
    form.setValue("mereMotDePasse", schoolSettings.defaultParentPassword);
  }, [form, isEditing, initialData, userProfile?.schoolId, schoolSettings, settingsLoading]);

  // Écouter les changements de paramètres et régénérer automatiquement
  useEffect(() => {
    if (isEditing || initialData || settingsLoading) return;

    const handleSettingsUpdate = async () => {
      if (!userProfile?.schoolId) return;
      
      // Régénérer le matricule uniquement si l'utilisateur ne l'a pas modifié manuellement
      if (schoolSettings.autoGenerateStudentMatricule && !manuallyEditedFields.has('numeroPerso')) {
        const nextNumber = await getNextStudentNumber(userProfile.schoolId, schoolSettings.studentMatriculeFormat);
        form.setValue("numeroPerso", nextNumber);
        
        // Mettre à jour les matricules parents si nécessaire
        if (schoolSettings.autoGenerateParentMatricule) {
          const parentNumber = getNextParentNumber(nextNumber, 'PERE', schoolSettings.parentMatriculeFormat, schoolSettings.studentMatriculeFormat);
          if (!manuallyEditedFields.has('pereNomUtilisateur')) {
            form.setValue("pereNomUtilisateur", parentNumber);
          }
          if (!manuallyEditedFields.has('mereNomUtilisateur')) {
            const motherNumber = getNextParentNumber(nextNumber, 'MERE', schoolSettings.parentMatriculeFormat, schoolSettings.studentMatriculeFormat);
            form.setValue("mereNomUtilisateur", motherNumber);
          }
        }
      }
      
      // Mettre à jour le mot de passe par défaut uniquement si l'utilisateur ne l'a pas modifié
      if (!manuallyEditedFields.has('motDePasse')) {
        form.setValue("motDePasse", schoolSettings.defaultStudentPassword);
      }
      
      // Mettre à jour les mots de passe des parents
      if (!manuallyEditedFields.has('pereMotDePasse')) {
        form.setValue("pereMotDePasse", schoolSettings.defaultParentPassword);
      }
      if (!manuallyEditedFields.has('mereMotDePasse')) {
        form.setValue("mereMotDePasse", schoolSettings.defaultParentPassword);
      }
    };

    // Écouter l'événement de mise à jour des paramètres
    window.addEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('schoolSettingsUpdated', handleSettingsUpdate);
    };
  }, [isEditing, initialData, userProfile?.schoolId, form, manuallyEditedFields, schoolSettings, settingsLoading]);
  
  // Si on a un classId, on utilise la classe spécifiée, sinon on utilise la première classe disponible
  const selectedClass = classId ? 
    classes?.find(c => c.id === classId) : 
    classes?.[0];

  // Surveiller les changements de l'adresse de l'élève et du lieu de naissance
  const watchAdresse = form.watch("adresse");
  const watchLieuNaissance = form.watch("lieuNaissance");
  const watchNom = form.watch("nom");
  const watchPrenom = form.watch("prenom");
  
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
  const previewDocument = (document: ExistingDocumentData) => {
    if (document.file_path) {
      window.open(document.file_path, '_blank');
    }
  };

  // Fonction pour télécharger un document existant
  const downloadDocument = (doc: ExistingDocumentData) => {
    if (doc.file_path) {
      const link = window.document.createElement('a');
      link.href = doc.file_path;
      link.download = doc.file_name;
      link.click();
    }
  };

  // Fonction pour supprimer un document existant
  const removeExistingDocument = (documentId: string) => {
    const existingDocs = localStorage.getItem('student_documents');
    if (existingDocs) {
      const allDocuments = JSON.parse(existingDocs);
      const updatedDocuments = allDocuments.filter((doc: any) => doc.id !== documentId);
      localStorage.setItem('student_documents', JSON.stringify(updatedDocuments));
      setExistingDocuments(existingDocuments.filter(doc => doc.id !== documentId));
      showSuccess({ 
        title: "Succès", 
        description: "Document supprimé avec succès" 
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
  // Fonction pour uploader les documents vers Supabase
  const uploadDocuments = async (studentId: string, schoolId: string, studentData: any) => {
    if (!documents || documents.length === 0) return;

    try {
      for (const doc of documents) {
        if (!doc.file || !doc.name.trim()) continue;

        // Upload du document vers Supabase
        const result = await uploadDocument(studentId, doc.file, 'document');
        
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
    if (!selectedClass) {
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
        emergency_contact: recoveredEmergencyContact || `${data.contactUrgenceNom} - ${data.contactUrgenceTelephone} (${data.contactUrgenceRelation})`,
        school_id: schoolId,
        class_id: classId || selectedClass?.id,
        is_active: true,
        parent_matricule: useFatherExisting ? fatherMatricule : (useMotherExisting ? motherMatricule : null)
      };

      let result;
      if (isEditing && initialData) {
        // Mise à jour d'un élève existant
        result = await updateStudent(initialData.id, studentData);
      } else {
        // Ajout d'un nouvel élève
        result = await addStudent(studentData);
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
        description: `${data.prenom} ${data.nom} a été ${isEditing ? 'modifié(e)' : 'ajouté(e)'} ${!isEditing ? `à la classe ${selectedClass?.name} ${selectedClass?.level}${selectedClass?.section ? ` - ${selectedClass.section}` : ''}` : ''}`,
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
        is_active: true
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
                <Input 
                  value={fatherMatricule}
                  onChange={(e) => setFatherMatricule(e.target.value)}
                  placeholder="Ex: PAR001"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Entrez le matricule du parent existant pour l'associer à cet élève
              </p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="pereNomUtilisateur" render={({
                field
              }) => <FormItem>
                      <FormLabel>Nom d'utilisateur</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" />
                      </FormControl>
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
                <Input 
                  value={motherMatricule}
                  onChange={(e) => setMotherMatricule(e.target.value)}
                  placeholder="Ex: PAR001"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Entrez le matricule du parent existant pour l'associer à cet élève
              </p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="mereNomUtilisateur" render={({
                field
              }) => <FormItem>
                      <FormLabel>Nom d'utilisateur (optionnel)</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="mereMotDePasse" render={({
                field
              }) => <FormItem>
                      <FormLabel>Mot de passe (optionnel)</FormLabel>
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

        <Button type="submit" className="w-full">
          Enregistrer
        </Button>
      </form>
    </Form>
    </>
  );
}