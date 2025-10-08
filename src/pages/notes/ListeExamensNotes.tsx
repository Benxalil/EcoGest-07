import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Calendar, School, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useClasses } from "@/hooks/useClasses";
import { useUserRole } from "@/hooks/useUserRole";
import { useTeacherData } from "@/hooks/useTeacherData";
import { formatClassName } from "@/utils/classNameFormatter";
interface Examen {
  id: string;
  titre: string;
  type: string;
  semestre: string;
  anneeAcademique: string;
  dateExamen: string;
  classes: string[];
  classesData?: Array<{
    id: string;
    name: string;
    level: string;
    section?: string;
  }>;
  dateCreation: string;
  statut: string;
}
interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}
const fetchExamens = async (teacherClassIds?: string[]): Promise<Examen[]> => {
  try {
    // Construire la requête de base
    let query = supabase.from('exams').select(`
        *,
        classes(
          id,
          name,
          level,
          section
        )
      `);
    
    // ✅ FILTRE CÔTÉ SERVEUR pour les enseignants
    if (teacherClassIds && teacherClassIds.length > 0) {
      query = query.in('class_id', teacherClassIds);
    }
    
    const { data, error } = await query.order('exam_date', {
      ascending: false
    });
    
    if (error) throw error;

    // Grouper les examens par titre et date pour afficher une seule bande par examen
    const groupedExams = data?.reduce((acc, exam) => {
      const key = `${exam.title}-${exam.exam_date}`;
      if (!acc[key]) {
        acc[key] = {
          id: exam.id,
          titre: exam.title,
          type: exam.title,
          semestre: exam.title === "Composition" ? "1er semestre" : "",
          anneeAcademique: '2024/2025',
          dateExamen: exam.exam_date,
          classes: [],
          classesData: [],
          dateCreation: exam.created_at,
          statut: 'planifié'
        };
      }

      // Ajouter la classe à la liste des classes pour cet examen
      if (exam.class_id) {
        acc[key].classes.push(exam.class_id);
        if (exam.classes) {
          acc[key].classesData.push(exam.classes);
        }
      }
      return acc;
    }, {} as Record<string, any>);
    return Object.values(groupedExams || []);
  } catch (error) {
    console.error("Erreur lors de la récupération des examens:", error);
    return [];
  }
};
const getSemestreBadge = (semestre: string) => {
  const colors = {
    "1er semestre": "bg-blue-100 text-blue-800",
    "2e semestre": "bg-green-100 text-green-800",
    "3e semestre": "bg-purple-100 text-purple-800"
  };
  return <Badge variant="outline" className={colors[semestre as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
      {semestre}
    </Badge>;
};
export default function ListeExamensNotes() {
  const [examens, setExamens] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const navigate = useNavigate();
  const {
    classes
  } = useClasses();
  const {
    isTeacher,
    userProfile
  } = useUserRole();
  
  // ✅ Utiliser useTeacherData pour obtenir les classes filtrées de l'enseignant
  const { classes: teacherClasses, loading: teacherDataLoading } = useTeacherData();
  const teacherClassIds = isTeacher() ? teacherClasses.map(c => c.id) : [];
  const safeFormatDate = (value?: string, fmt = "PPP") => {
    if (!value) return "Date non définie";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "Date non définie";
    try {
      return format(d, fmt, {
        locale: fr
      });
    } catch {
      return "Date non définie";
    }
  };
  useEffect(() => {
    // ⚡ Attendre que teacherClassIds soit chargé pour les enseignants
    if (isTeacher() && teacherClassIds.length === 0) return;
    
    loadData();

    // Synchronisation en temps réel pour les examens
    if (!userProfile?.schoolId) return;

    const examsChannel = supabase
      .channel('exams-notes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `school_id=eq.${userProfile.schoolId}`
        },
        (payload) => {
          console.log('Exam change detected in notes:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(examsChannel);
    };
  }, [userProfile?.schoolId, teacherClassIds]);
  const getClasseNom = (classeId: string, classesData?: Array<{
    id: string;
    name: string;
    level: string;
    section?: string;
  }>) => {
    // Utiliser d'abord les données jointes si disponibles
    if (classesData) {
      const classe = classesData.find(c => c.id === classeId);
      if (classe) {
        return formatClassName(classe);
      }
    }
    // Fallback sur la recherche dans la liste des classes (ne devrait plus être nécessaire)
    const classe = classes.find(c => c.id === classeId);
    return classe ? formatClassName(classe) : classeId;
  };
  const getClassesNoms = (examen: Examen) => {
    if (examen.classes.length === classes.length) {
      return "Toutes les classes";
    }
    return examen.classes.map((id, index) => getClasseNom(id, examen.classesData)).join(", ");
  };
  const handleGererExamen = (examen: Examen) => {
    setSelectedExamen(examen);
  };
  const handleRetourExamens = () => {
    setSelectedExamen(null);
  };
  const handleGererNotesClasse = (classeId: string) => {
    try {
      if (selectedExamen) {
        const rawSem = selectedExamen.semestre || '';
        const semKey: 'semestre1' | 'semestre2' = rawSem.toLowerCase().includes('2') ? 'semestre2' : 'semestre1';
        sessionStorage.setItem('current_examen_notes', JSON.stringify({
          examId: selectedExamen.id,
          // Change examenId to examId pour cohérence
          semestre: selectedExamen.type === "Composition" ? semKey : null,
          // Only set semester for Composition
          rawSemestre: selectedExamen.semestre,
          examType: selectedExamen.type,
          examTitle: selectedExamen.titre,
          classeId
        }));
      }
    } catch {}
    navigate(`/notes/classe/${classeId}`);
  };
  const loadData = async () => {
    try {
      setLoading(true);
      
      // ✅ PASSER les teacherClassIds à fetchExamens pour filtrage côté serveur
      const examensData = await fetchExamens(
        isTeacher() ? teacherClassIds : undefined
      );
      
      // Plus besoin de filtrer côté client - déjà fait côté serveur
      setExamens(examensData);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };
  const filteredExamens = examens.filter(examen => examen.titre.toLowerCase().includes(searchTerm.toLowerCase()) || examen.type.toLowerCase().includes(searchTerm.toLowerCase()) || getClassesNoms(examen).toLowerCase().includes(searchTerm.toLowerCase()));
  if (loading || teacherDataLoading) {
    return <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Chargement des examens...</p>
            </div>
          </div>
        </div>
      </Layout>;
  }

  // Si un examen est sélectionné, afficher ses classes
  if (selectedExamen) {
    let classesExamen = classes.filter(classe => selectedExamen.classes.includes(classe.id));

    // Filtrer pour les enseignants - seulement leurs classes
    if (isTeacher()) {
      classesExamen = classesExamen.filter(classe => teacherClassIds.includes(classe.id));
    }

    // Tri académique des classes (CI → Terminale)
    const getClassOrder = (name: string, section: string = ''): number => {
      const academicOrder: { [key: string]: number } = {
        'CI': 1, 'CP': 2, 'CE1': 3, 'CE2': 4, 'CM1': 5, 'CM2': 6,
        'Sixième': 7, '6ème': 7, '6e': 7,
        'Cinquième': 8, '5ème': 8, '5e': 8,
        'Quatrième': 9, '4ème': 9, '4e': 9,
        'Troisième': 10, '3ème': 10, '3e': 10,
        'Seconde': 11, '2nde': 11,
        'Première': 12, '1ère': 12,
        'Terminale': 13, 'Tle': 13
      };
      const order = academicOrder[name] || 999;
      const sectionOrder = section ? section.charCodeAt(0) : 0;
      return order * 100 + sectionOrder;
    };

    classesExamen = classesExamen.sort((a, b) => {
      const orderA = getClassOrder(a.name, a.section || '');
      const orderB = getClassOrder(b.name, b.section || '');
      return orderA - orderB;
    });
    return <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handleRetourExamens}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestion des Notes - {selectedExamen.titre}
              </h1>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl font-bold">{selectedExamen.titre}</h1>
              {selectedExamen.type === "Composition" && selectedExamen.semestre && getSemestreBadge(selectedExamen.semestre)}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {safeFormatDate(selectedExamen.dateExamen, "dd/MM/yyyy")}
              </div>
            </div>
            <p className="text-muted-foreground">
              Sélectionnez une classe pour gérer les notes de cet examen.
            </p>
          </div>

          <div className="space-y-3">
            {classesExamen.map(classe => <div key={classe.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5 text-primary" />
                   <span className="font-medium">{formatClassName(classe)}</span>
                </div>
                <Button onClick={() => handleGererNotesClasse(classe.id)} className="bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
                  Gérer les Notes
                </Button>
              </div>)}
          </div>

          {classesExamen.length === 0 && <div className="text-center py-12">
              <p className="text-gray-500">
                Aucune classe associée à cet examen.
              </p>
            </div>}
        </div>
      </Layout>;
  }

  // Affichage principal des examens
  return <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Notes</h1>
          </div>
          
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Sélectionnez un examen pour consulter et saisir les notes des élèves.
          </p>
          
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              id="search-exams"
              name="search-exams"
              placeholder="Rechercher un examen..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredExamens.map(examen => <Card key={examen.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-gray-900">{examen.titre}</h3>
                      {getSemestreBadge(examen.semestre)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {safeFormatDate(examen.dateExamen)}
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {examen.type}
                      </div>
                      <div className="flex items-center gap-1">
                        <School className="h-4 w-4" />
                        {getClassesNoms(examen)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button onClick={() => handleGererExamen(examen)} variant="default" size="sm">
                      Gérer Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {filteredExamens.length === 0 && <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "Aucun examen trouvé pour cette recherche." : "Aucun examen disponible. Créez d'abord des examens dans la section Examens."}
            </p>
          </div>}
        
      </div>
    </Layout>;
}