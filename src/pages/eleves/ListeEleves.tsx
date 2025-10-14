import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AjoutEleveForm } from "@/components/eleves/AjoutEleveForm";
import { Eye, Edit, Trash2, Search, Users, UserCheck, Clock, Download, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { formatClassName } from "@/utils/classNameFormatter";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Student {
  id: string;
  nom: string;
  prenom: string;
  classe: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  numeroPerso?: string;
  sexe?: string;
  photo?: string;
  perePrenom?: string;
  pereNom?: string;
  pereAdresse?: string;
  pereTelephone?: string;
  merePrenom?: string;
  mereNom?: string;
  mereAdresse?: string;
  mereTelephone?: string;
  dateAjout?: string;
  contactUrgenceNom?: string;
  contactUrgenceTelephone?: string;
  contactUrgenceRelation?: string;
}

interface ClasseWithStudents {
  nom: string;
  eleves: Student[];
}

// Fonction pour récupérer les élèves organisés par classe
const fetchStudentsByClass = async (userProfile?: any, isTeacher?: boolean): Promise<ClasseWithStudents[]> => {
  try {
    let allowedClassIds: string[] = [];

    // Si c'est un enseignant, récupérer uniquement ses classes
    if (isTeacher && userProfile?.id && userProfile?.schoolId) {
      // Trouver l'entrée teacher correspondant au user_id
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('school_id', userProfile.schoolId)
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (teacherError) {
        console.error('❌ Erreur teacher:', teacherError);
        throw teacherError;
      }

      if (!teacherData) {
        console.log('⚠️ Aucune entrée teacher trouvée');
        return [];
      }

      // Récupérer les classes de l'enseignant depuis schedules
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('class_id')
        .eq('school_id', userProfile.schoolId)
        .eq('teacher_id', teacherData.id);

      if (scheduleError) {
        console.error('❌ Erreur schedules:', scheduleError);
        throw scheduleError;
      }

      // Extraire les IDs uniques des classes
      allowedClassIds = [...new Set(scheduleData?.map(s => s.class_id) || [])];

      if (allowedClassIds.length === 0) {
        console.log('⚠️ Aucune classe trouvée pour cet enseignant');
        return [];
      }

      console.log('✅ Classes enseignant:', allowedClassIds);
    }

    // ✅ Paralléliser les requêtes pour classes et students (optimisation N+1)
    const [classesResult, studentsResult] = await Promise.all([
      (async () => {
        let classesQuery = supabase
          .from('classes')
          .select('*')
          .order('name');

        if (isTeacher && allowedClassIds.length > 0) {
          classesQuery = classesQuery.in('id', allowedClassIds);
        }

        return await classesQuery;
      })(),
      (async () => {
        let studentsQuery = supabase
          .from('students')
          .select(`
            *,
            classes!inner(*)
          `)
          .order('first_name');

        if (isTeacher && allowedClassIds.length > 0) {
          studentsQuery = studentsQuery.in('class_id', allowedClassIds);
        }

        return await studentsQuery;
      })()
    ]);

    const { data: classes, error: classesError } = classesResult;
    const { data: students, error: studentsError } = studentsResult;

    if (classesError) throw classesError;
    if (studentsError) throw studentsError;

    // Organiser les élèves par classe
    const classeMap = new Map<string, Student[]>();
    
    classes.forEach(classe => {
      const className = formatClassName(classe);
      classeMap.set(className, []);
    });

    students.forEach(student => {
      const className = formatClassName(student.classes);
      if (classeMap.has(className)) {
        classeMap.get(className)!.push({
          id: student.id,
          nom: student.last_name,
          prenom: student.first_name,
          classe: className,
          dateNaissance: student.date_of_birth,
          lieuNaissance: student.place_of_birth,
          adresse: student.address,
          telephone: student.phone,
          email: student.parent_email,
          numeroPerso: student.student_number,
          sexe: student.gender,
          photo: null, // Pas de photo dans le schéma actuel
          perePrenom: null, // Pas de champs père/mère séparés dans le schéma actuel
          pereNom: null,
          pereAdresse: null,
          pereTelephone: null,
          merePrenom: null,
          mereNom: null,
          mereAdresse: null,
          mereTelephone: null,
          dateAjout: student.created_at,
          contactUrgenceNom: null, // Utiliser emergency_contact qui est un string
          contactUrgenceTelephone: student.parent_phone,
          contactUrgenceRelation: null,
        });
      }
    });

    const result = Array.from(classeMap.entries()).map(([nom, eleves]) => ({
      nom,
      eleves
    }));
    
    return result;
  } catch (error) {
    console.error("Erreur lors de la récupération des élèves par classe:", error);
    return [];
  }
};

// Composant pour afficher les documents de l'élève
function DocumentsSection({ studentId }: { studentId: string }) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [studentId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Récupérer les documents depuis Supabase
      const { data, error } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      // Télécharger le fichier depuis Supabase Storage
      const { data, error } = await supabase.storage
        .from('student-documents')
        .download(filePath);

      if (error) throw error;

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement du document",
        variant: "destructive"
      });
    }
  };

  const previewDocument = async (filePath: string) => {
    try {
      // Obtenir l'URL publique du fichier
      const { data } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath);

      if (data.publicUrl) {
        window.open(data.publicUrl, '_blank'); } else {
        toast({
          title: "Erreur",
          description: "Impossible de prévisualiser ce document",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la prévisualisation du document",
        variant: "destructive"
      });
    }
  };

  const deleteDocument = async (documentId: string, filePath: string) => {
    try {
      // Supprimer le fichier du storage
      const { error: storageError } = await supabase.storage
        .from('student-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Supprimer l'enregistrement de la base de données
      const { error: dbError } = await supabase
        .from('student_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      toast({
        title: "Document supprimé",
        description: "Document supprimé avec succès",
      });
      
      fetchDocuments();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du document",
        variant: "destructive"
      });
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-orange-600">Documents de l'élève</h3>
      
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{doc.document_name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.file_name} • {Math.round(doc.file_size / 1024)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => previewDocument(doc.file_path)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Prévisualiser le document"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                  className="text-green-600 hover:text-green-800"
                  title="Télécharger le document"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDocument(doc.id, doc.file_path)}
                  className="text-red-600 hover:text-red-800"
                  title="Supprimer le document"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic">Aucun document disponible</p>
      )}
    </div>
  );
}

export default function ListeEleves() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, isTeacher, userProfile } = useUserRole();
  const { students, loading: studentsLoading, error: studentsError, refreshStudents } = useStudents();
  const { classes, loading: classesLoading, error: classesError } = useClasses();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setStudentToEdit(null);
    refreshStudents();
  };
  
  const { data: classesWithStudents, isLoading, error } = useQuery({
    queryKey: ['studentsByClass', userProfile?.id, isTeacher()],
    queryFn: () => fetchStudentsByClass(userProfile, isTeacher()),
  });

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (!classesWithStudents) return { total: 0, actifs: 0, nouveaux: 0 };
    
    const allStudents = classesWithStudents.flatMap(classe => classe.eleves);
    const total = allStudents.length;
    const actifs = total;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const nouveaux = allStudents.filter(student => {
      if (!student.dateAjout) return false;
      const dateAjout = new Date(student.dateAjout);
      return dateAjout.getMonth() === currentMonth && dateAjout.getFullYear() === currentYear;
    }).length;
    
    return { total, actifs, nouveaux };
  }, [classesWithStudents]);

  // Fonction pour déterminer l'ordre des classes
  const getClassOrder = (className: string): number => {
    // Extraire le niveau de classe (CI, CP, CE1, etc.) du nom complet
    const classLevel = className.split(' ')[0]; // Par exemple: "CI A" → "CI"
    
    const classOrder: Record<string, number> = {
      'CI': 1,
      'CP': 2,
      'CE1': 3,
      'CE2': 4,
      'CM1': 5,
      'CM2': 6,
      '6ème': 7,
      '5ème': 8,
      '4ème': 9,
      '3ème': 10,
      'Seconde': 11,
      'Première': 12,
      'Terminale': 13
    };
    
    return classOrder[classLevel] || 999; // 999 pour les classes non reconnues
  };

  // Filtrer et trier les classes en fonction de la recherche
  const filteredClasses = useMemo(() => {
    let result = classesWithStudents;
    
    // Filtrage par recherche
    if (result && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      result = result.map(classe => ({
        ...classe,
        eleves: classe.eleves.filter(eleve => 
          eleve.nom.toLowerCase().includes(query) ||
          eleve.prenom.toLowerCase().includes(query) ||
          `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(query)
        )
      })).filter(classe => classe.eleves.length > 0);
    }
    
    // Tri des classes par ordre éducationnel
    if (result) {
      result = [...result].sort((a, b) => {
        const orderA = getClassOrder(a.nom);
        const orderB = getClassOrder(b.nom);
        
        // Si même niveau, trier par ordre alphabétique (A, B, C, etc.)
        if (orderA === orderB) {
          return a.nom.localeCompare(b.nom);
        }
        
        return orderA - orderB;
      });
      
      // Tri alphabétique des élèves par prénom dans chaque classe
      result = result.map(classe => ({
        ...classe,
        eleves: [...classe.eleves].sort((a, b) => {
          return a.prenom.toLowerCase().localeCompare(b.prenom.toLowerCase());
        })
      }));
    }
    
    return result;
  }, [classesWithStudents, searchQuery]);

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsDialogOpen(true);
  };

  const handleModifierEleve = (student: Student) => {
    setStudentToEdit(student);
    setIsEditDialogOpen(true);
  };

  const handleSupprimerEleve = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) throw error;
      
      refreshStudents();
      
      toast({
        title: "Succès",
        description: "Élève supprimé avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'élève:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de l'élève",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8">Chargement...</h1>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8">Erreur de chargement</h1>
          <p className="text-red-600">Erreur lors du chargement des élèves</p>
        </div>
      </Layout>
    );
  }

  if (!classesWithStudents || classesWithStudents.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              {isTeacher() ? "Mes élèves par classe" : "Liste des élèves par classe"}
            </h1>
          </div>
          
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune classe n'a été créée</p>
            <Button onClick={() => navigate('/classes/ajouter')}>
              Créer une classe
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            {isTeacher() ? "Mes élèves par classe" : "Liste des élèves par classe"}
          </h1>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total des étudiants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Étudiants actifs</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.actifs}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nouveauté ce mois-ci</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.nouveaux}</div>
            </CardContent>
          </Card>
        </div>

        {/* Champ de recherche */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Rechercher par nom ou prénom..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500 mt-2">
              {filteredClasses?.reduce((total, classe) => total + classe.eleves.length, 0) || 0} élève(s) trouvé(s)
            </p>
          )}
        </div>
        {/* Liste des classes */}
        <div className="space-y-4">
          {filteredClasses && filteredClasses.length > 0 ? (
            filteredClasses.map((classe) => (
              <Card key={classe.nom} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent 
                  className="p-6"
                  onClick={() => navigate(`/eleves/classe/${encodeURIComponent(classe.nom)}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-lg">{classe.nom}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {classe.eleves.length} élève{classe.eleves.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery ? "Aucune classe trouvée pour cette recherche" : "Aucune classe trouvée"}
              </p>
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de l'élève</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-6">
                {/* Photo et Informations personnelles */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-600">Détails de l'élève</h3>
                  <div className="flex gap-6 mb-4">
                    {/* Photo de l'élève */}
                    <div className="flex-shrink-0">
                      <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                        {selectedStudent.photo ? (
                          <img 
                            src={selectedStudent.photo} 
                            alt={`Photo de ${selectedStudent.prenom} ${selectedStudent.nom}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    
                     {/* Informations de base */}
                     <div className="flex-1 grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-sm font-medium text-gray-500">Prénom</label>
                         <p className="text-base font-medium">{selectedStudent.prenom}</p>
                       </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nom</label>
                      <p className="text-base font-medium">{selectedStudent.nom}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Classe</label>
                      <p className="text-base">{selectedStudent.classe}</p>
                    </div>
                    {selectedStudent.numeroPerso && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Numéro Personnel</label>
                        <p className="text-base">{selectedStudent.numeroPerso}</p>
                      </div>
                    )}
                    {selectedStudent.sexe && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Sexe</label>
                        <p className="text-base">{selectedStudent.sexe}</p>
                      </div>
                    )}
                    {selectedStudent.dateNaissance && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date de naissance</label>
                        <p className="text-base">{new Date(selectedStudent.dateNaissance).toLocaleDateString('fr-FR')}</p>
                      </div>
                       )}
                     </div>
                   </div>
                  
                  {/* Contact */}
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    {selectedStudent.adresse && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Adresse</label>
                        <p className="text-base">{selectedStudent.adresse}</p>
                      </div>
                    )}
                    {selectedStudent.telephone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Téléphone</label>
                        <p className="text-base">{selectedStudent.telephone}</p>
                      </div>
                    )}
                    {selectedStudent.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-base">{selectedStudent.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations du père */}
                {(selectedStudent.perePrenom || selectedStudent.pereNom || selectedStudent.pereAdresse || selectedStudent.pereTelephone) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-green-600">Informations du père</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedStudent.perePrenom && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Prénom du père</label>
                          <p className="text-base">{selectedStudent.perePrenom}</p>
                        </div>
                      )}
                      {selectedStudent.pereNom && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Nom du père</label>
                          <p className="text-base">{selectedStudent.pereNom}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      {selectedStudent.pereAdresse && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Adresse du père</label>
                          <p className="text-base">{selectedStudent.pereAdresse}</p>
                        </div>
                      )}
                      {selectedStudent.pereTelephone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Téléphone du père</label>
                          <p className="text-base">{selectedStudent.pereTelephone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Informations de la mère */}
                {(selectedStudent.merePrenom || selectedStudent.mereNom || selectedStudent.mereAdresse || selectedStudent.mereTelephone) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-purple-600">Informations de la mère</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedStudent.merePrenom && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Prénom de la mère</label>
                          <p className="text-base">{selectedStudent.merePrenom}</p>
                        </div>
                      )}
                      {selectedStudent.mereNom && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Nom de la mère</label>
                          <p className="text-base">{selectedStudent.mereNom}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      {selectedStudent.mereAdresse && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Adresse de la mère</label>
                          <p className="text-base">{selectedStudent.mereAdresse}</p>
                        </div>
                      )}
                      {selectedStudent.mereTelephone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Téléphone de la mère</label>
                          <p className="text-base">{selectedStudent.mereTelephone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contact d'urgence */}
                {(selectedStudent.contactUrgenceNom || selectedStudent.contactUrgenceTelephone || selectedStudent.contactUrgenceRelation) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-red-600">Contact d'urgence</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedStudent.contactUrgenceNom && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Nom du contact</label>
                          <p className="text-base">{selectedStudent.contactUrgenceNom}</p>
                        </div>
                      )}
                      {selectedStudent.contactUrgenceTelephone && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Téléphone</label>
                          <p className="text-base">{selectedStudent.contactUrgenceTelephone}</p>
                        </div>
                      )}
                      {selectedStudent.contactUrgenceRelation && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Relation</label>
                          <p className="text-base">{selectedStudent.contactUrgenceRelation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Documents de l'élève */}
                <DocumentsSection studentId={selectedStudent.id} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal pour modifier un élève */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l'élève</DialogTitle>
            </DialogHeader>
            {studentToEdit && (
              <AjoutEleveForm 
                onSuccess={handleEditSuccess} 
                initialData={studentToEdit}
                isEditing={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}