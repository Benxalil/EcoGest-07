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
import { useTeacherFilter } from "@/hooks/useTeacherFilter";

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

const fetchExamens = async (): Promise<Examen[]> => {
  try {
    // Récupérer les examens sans join (car pas de foreign key définie)
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('exam_date', { ascending: false });

    if (error) {
      console.error("Erreur Supabase:", error);
      throw error;
    }

    console.log('Examens récupérés:', data);

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
      }
      
      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(groupedExams || []);
    console.log('Examens groupés:', result);
    return result;
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
  return (
    <Badge variant="outline" className={colors[semestre as keyof typeof colors] || "bg-gray-100 text-gray-800"}>
      {semestre}
    </Badge>
  );
};

export default function ListeExamensNotes() {
  const [examens, setExamens] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamen, setSelectedExamen] = useState<Examen | null>(null);
  const navigate = useNavigate();
  const { classes } = useClasses();
  const { isTeacher } = useUserRole();
  const { teacherClassIds } = useTeacherFilter();

  const safeFormatDate = (value?: string, fmt = "PPP") => {
    if (!value) return "Date non définie";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "Date non définie";
    try { return format(d, fmt, { locale: fr }); } catch { return "Date non définie"; }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getClasseNom = (classeId: string, classesData?: Array<{id: string; name: string; level: string; section?: string}>) => {
    // Utiliser d'abord les données jointes si disponibles
    if (classesData) {
      const classe = classesData.find(c => c.id === classeId);
      if (classe) {
        return `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}`;
      }
    }
    // Fallback sur la recherche dans la liste des classes (ne devrait plus être nécessaire)
    const classe = classes.find(c => c.id === classeId);
    return classe ? `${classe.name} ${classe.level}${classe.section ? ` - ${classe.section}` : ''}` : classeId;
  };

  const getClassesNoms = (examen: Examen) => {
    if (examen.classes.length === classes.length) {
      return "Toutes les classes";
    }
    return examen.classes.map((id, index) => 
      getClasseNom(id, examen.classesData)
    ).join(", ");
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
          examId: selectedExamen.id, // Change examenId to examId pour cohérence
          semestre: selectedExamen.type === "Composition" ? semKey : null, // Only set semester for Composition
          rawSemestre: selectedExamen.semestre,
          examType: selectedExamen.type,
          examTitle: selectedExamen.titre,
          classeId,
        }));
      }
    } catch {}
    navigate(`/notes/classe/${classeId}`);
  };


  const loadData = async () => {
    try {
      setLoading(true);
      const examensData = await fetchExamens();
      
      // Filtrer les examens pour les enseignants - seulement ceux des classes qu'ils enseignent
      const filteredData = isTeacher() 
        ? examensData.filter(exam => 
            exam.classes.some(classId => teacherClassIds.includes(classId))
          )
        : examensData;
      
      setExamens(filteredData);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExamens = examens.filter(examen =>
    examen.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    examen.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getClassesNoms(examen).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Chargement des examens...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Si un examen est sélectionné, afficher ses classes
  if (selectedExamen) {
    console.log('Examen sélectionné:', selectedExamen);
    console.log('Classes de l\'examen:', selectedExamen.classes);
    console.log('Toutes les classes disponibles:', classes);
    
    let classesExamen = classes.filter(classe => 
      selectedExamen.classes.includes(classe.id)
    );

    console.log('Classes filtrées pour l\'examen:', classesExamen);

    // Filtrer pour les enseignants - seulement leurs classes
    if (isTeacher()) {
      console.log('Classes enseignant:', teacherClassIds);
      classesExamen = classesExamen.filter(classe => 
        teacherClassIds.includes(classe.id)
      );
      console.log('Classes après filtre enseignant:', classesExamen);
    }

    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetourExamens}
              >
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
            {classesExamen.map((classe) => (
              <div key={classe.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5 text-primary" />
                   <span className="font-medium">{classe.name} {classe.level}{classe.section ? ` - ${classe.section}` : ''}</span>
                </div>
                <Button
                  onClick={() => handleGererNotesClasse(classe.id)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  Gérer les Notes
                </Button>
              </div>
            ))}
          </div>

          {classesExamen.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Aucune classe associée à cet examen.
              </p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Affichage principal des examens
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Notes</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/notes/eleves')}
              variant="outline"
              size="sm"
            >
              Notes par Élève
            </Button>
            <Button
              onClick={() => navigate('/classes')}
              variant="default"
              size="sm"
            >
              Consulter les Notes
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Sélectionnez un examen pour consulter et saisir les notes des élèves.
          </p>
          
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un examen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredExamens.map((examen) => (
            <Card key={examen.id} className="hover:shadow-md transition-shadow">
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
                    <Button 
                      onClick={() => handleGererExamen(examen)}
                      variant="default"
                      size="sm"
                    >
                      Gérer Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredExamens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? "Aucun examen trouvé pour cette recherche." : "Aucun examen disponible. Créez d'abord des examens dans la section Examens."}
            </p>
          </div>
        )}
        
      </div>
    </Layout>
  );
}