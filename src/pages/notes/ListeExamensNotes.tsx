import { useState, useEffect, useMemo, useRef } from "react";
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
  const variants = {
    "1er semestre": "default",
    "2e semestre": "secondary",
    "3e semestre": "outline"
  };
  return <Badge variant={(variants[semestre as keyof typeof variants] || "outline") as any}>
      {semestre}
    </Badge>;
};
export default function ListeExamensNotes() {
  const [examens, setExamens] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  // ⚡ Protection contre les appels multiples
  const isLoadingRef = useRef(false);
  
  // ✅ Utiliser useTeacherData pour obtenir les classes filtrées de l'enseignant
  const { classes: teacherClasses, loading: teacherDataLoading } = useTeacherData();
  
  // ⚡ Stabiliser teacherClassIds avec JSON.stringify pour éviter les boucles infinies
  const teacherClassIdsString = useMemo(() => 
    JSON.stringify(isTeacher() ? teacherClasses.map(c => c.id) : []),
    [isTeacher, teacherClasses]
  );
  
  const teacherClassIds = useMemo(() => 
    JSON.parse(teacherClassIdsString),
    [teacherClassIdsString]
  );
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
  // ✅ useEffect 1 : Chargement initial uniquement
  useEffect(() => {
    // Attendre que le profil utilisateur soit chargé
    if (!userProfile?.schoolId) return;
    
    // Pour les enseignants, attendre que teacherDataLoading soit terminé
    if (isTeacher() && teacherDataLoading) return;
    
    // ⚡ Éviter les appels multiples simultanés
    if (isLoadingRef.current) return;
    
    loadData();
  }, [userProfile?.schoolId, teacherClassIdsString, teacherDataLoading]);

  // ✅ useEffect 2 : Realtime INDÉPENDANT (ne dépend QUE de schoolId)
  useEffect(() => {
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
          // ⚡ Ne pas recharger si un chargement est déjà en cours
          if (!isLoadingRef.current) {
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(examsChannel);
    };
  }, [userProfile?.schoolId]);
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
    // ⚡ Protection contre les appels multiples
    if (isLoadingRef.current) {
      console.log('⚠️ loadData déjà en cours, appel ignoré');
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null); // ✅ Réinitialiser l'erreur
      
      // ✅ PASSER les teacherClassIds à fetchExamens pour filtrage côté serveur
      const examensData = await fetchExamens(
        isTeacher() ? teacherClassIds : undefined
      );
      
      // Plus besoin de filtrer côté client - déjà fait côté serveur
      setExamens(examensData);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
      setError("Impossible de charger les examens. Veuillez réessayer.");
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };
  const filteredExamens = examens.filter(examen => examen.titre.toLowerCase().includes(searchTerm.toLowerCase()) || examen.type.toLowerCase().includes(searchTerm.toLowerCase()) || getClassesNoms(examen).toLowerCase().includes(searchTerm.toLowerCase()));
  if (loading) {
    return <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Chargement des examens...</p>
            </div>
          </div>
        </div>
      </Layout>;
  }

  // ✅ Afficher l'erreur avec un bouton Réessayer
  if (error) {
    return <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-destructive mb-4 text-lg">{error}</p>
              <Button onClick={() => loadData()} variant="default">
                Réessayer
              </Button>
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
              <h1 className="text-2xl font-bold text-foreground">
                Gestion des Notes - {selectedExamen.titre}
              </h1>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-3xl font-bold text-foreground">{selectedExamen.titre}</h1>
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
            {classesExamen.map(classe => <div key={classe.id} className="flex items-center justify-between p-4 bg-card text-card-foreground rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5 text-primary" />
                   <span className="font-medium">{formatClassName(classe)}</span>
                </div>
                <Button onClick={() => handleGererNotesClasse(classe.id)} variant="default" size="sm">
                  Gérer les Notes
                </Button>
              </div>)}
          </div>

          {classesExamen.length === 0 && <div className="text-center py-12">
              <p className="text-muted-foreground">
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
            <h1 className="text-2xl font-bold text-foreground">Gestion des Notes</h1>
          </div>
          
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground mb-4">
            Sélectionnez un examen pour consulter et saisir les notes des élèves.
          </p>
          
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
          {filteredExamens.map(examen => <Card key={examen.id} className="hover:shadow-md transition-shadow border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-foreground">{examen.titre}</h3>
                      {getSemestreBadge(examen.semestre)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Aucun examen trouvé pour cette recherche." 
                : isTeacher() && teacherClassIds.length === 0
                  ? "Aucun examen disponible. Vous n'êtes assigné à aucune classe pour le moment."
                  : "Aucun examen disponible. Créez d'abord des examens dans la section Examens."}
            </p>
          </div>}
        
      </div>
    </Layout>;
}