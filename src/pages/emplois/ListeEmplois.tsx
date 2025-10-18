
import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, AlertTriangle } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useTeacherClasses } from "@/hooks/useTeacherClasses";
import { formatClassName } from "@/utils/classNameFormatter";
import { useUserRole } from "@/hooks/useUserRole";
import { useParentChildren } from "@/hooks/useParentChildren";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to define academic order
const getClassOrder = (name: string, section: string): number => {
  // Ordre des niveaux académiques
  const levelOrder: { [key: string]: number } = {
    'CI': 1, 'CP': 2, 'CE1': 3, 'CE2': 4, 'CM1': 5, 'CM2': 6,
    '6ème': 7, 'Sixième': 7,
    '5ème': 8, 'Cinquième': 8,
    '4ème': 9, 'Quatrième': 9,
    '3ème': 10, 'Troisième': 10,
    '2nde': 11, 'Seconde': 11,
    '1ère': 12, 'Première': 12,
    'Terminale': 13, 'Tle': 13
  };
  
  // Extraire le libellé (dernière lettre de section)
  const labelMatch = section?.match(/[A-Z]$/);
  const label = labelMatch ? labelMatch[0] : '';
  
  // Ordre des libellés (A=1, B=2, etc.)
  const labelOrder: { [key: string]: number } = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 
    'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10
  };
  
  const levelNum = levelOrder[name] || 999;
  const labelNum = labelOrder[label] || 0;
  
  // Formule : niveau * 100 + libellé
  return levelNum * 100 + labelNum;
};

// Fonction pour trier les classes dans l'ordre académique
const sortClassesAcademically = (classes: any[]): any[] => {
  return classes.sort((a, b) => {
    const orderA = getClassOrder(a.name, a.section || '');
    const orderB = getClassOrder(b.name, b.section || '');
    return orderA - orderB;
  });
};

export default function ListeEmplois() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isParent, userProfile: profile } = useUserRole();
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);
  
  // Hook pour les enfants du parent
  const { children, loading: parentChildrenLoading } = useParentChildren();
  
  // Utiliser le hook approprié selon le rôle
  const adminData = useClasses();
  const teacherData = useTeacherClasses();
  
  const { classes, loading } = isTeacher() ? teacherData : adminData;
  const hasNoClasses = isTeacher() && teacherData.hasNoClasses;

  // OPTIMISÉ: Charger en parallèle la classe de l'élève
  useEffect(() => {
    const loadData = async () => {
      if (profile?.role === 'student' && profile?.id && profile?.schoolId) {
        try {
          const { data: student } = await supabase
            .from('students')
            .select('class_id')
            .eq('user_id', profile.id)
            .eq('school_id', profile.schoolId)
            .maybeSingle(); // Évite l'erreur si aucun résultat

          if (student) {
            setStudentClassId(student.class_id);
          }
        } catch (err) {
          console.error("Erreur chargement classe élève:", err);
        } finally {
          setStudentLoading(false);
        }
      } else {
        setStudentLoading(false);
      }
    };

    loadData();
  }, [profile?.role, profile?.id, profile?.schoolId]);

  // Filtrer les classes pour les élèves et parents
  let displayedClasses = classes;
  
  if (profile?.role === 'student' && studentClassId) {
    displayedClasses = classes.filter(c => c.id === studentClassId);
  } else if (isParent() && children.length > 0) {
    // Extraire les IDs de classe uniques des enfants du parent
    const childrenClassIds = [...new Set(children
      .filter(child => child.class_id)
      .map(child => child.class_id)
    )];
    displayedClasses = classes.filter(c => childrenClassIds.includes(c.id));
  }

  // OPTIMISÉ: Mémoriser le tri pour éviter recalcul
  const sortedClasses = useMemo(() => 
    sortClassesAcademically(displayedClasses),
    [displayedClasses]
  );

  // OPTIMISÉ: Squelette de chargement au lieu de texte vide
  if (loading || studentLoading || (isParent() && parentChildrenLoading)) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (displayedClasses.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              {isTeacher() ? "Mes classes" : "Gérer l'emploi des Classes"}
            </h1>
          </div>

          <div className="text-center py-12">
            {hasNoClasses ? (
              <>
                <p className="text-muted-foreground text-lg mb-4">Vous n'êtes encore affecté à aucune classe</p>
                <p className="text-muted-foreground/70 mb-6">Veuillez contacter l'administrateur pour être assigné à des classes via l'emploi du temps</p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-lg mb-4">Aucune classe n'a été enregistrée</p>
                <p className="text-muted-foreground/70 mb-6">Veuillez d'abord créer des classes avant de gérer les emplois du temps</p>
                {isAdmin() && (
                  <Button onClick={() => navigate("/classes")}>
                    Aller à la gestion des classes
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.role === 'student' 
              ? "Mon Emploi du Temps" 
              : isParent()
                ? "Emploi du temps de mes enfants"
                : isTeacher() 
                  ? "Mes classes" 
                  : "Gérer l'emploi des Classes"}
          </h1>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Classe</TableHead>
                <TableHead className="w-1/4 text-center">Emploi du Temps</TableHead>
                {profile?.role !== 'student' && (
                  <>
                    <TableHead className="w-1/4 text-center">Absence & Retard</TableHead>
                    {!isParent() && (
                      <TableHead className="w-1/4 text-center">Cahier de Texte</TableHead>
                    )}
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClasses.map((classe) => (
                <TableRow key={classe.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium">{formatClassName(classe)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-blue-500 text-white hover:bg-blue-600"
                      onClick={() => {
                        navigate(`/emplois-du-temps/${classe.id}`);
                      }}
                      onMouseEnter={() => {
                        // Préchargement au survol
                        if (profile?.schoolId) {
                          supabase
                            .from('schedules')
                            .select('id, subject, teacher, start_time, end_time, day')
                            .eq('school_id', profile.schoolId)
                            .eq('class_id', classe.id)
                            .limit(100)
                            .then(() => {});
                        }
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="ml-2 hidden md:inline">Emploi du temps</span>
                    </Button>
                  </TableCell>
                  {profile?.role !== 'student' && (
                    <>
                      <TableCell className="text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-yellow-500 text-white hover:bg-yellow-600"
                          onClick={() => navigate(`/consulter-absences-retards/${classe.id}`)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <span className="ml-2 hidden md:inline">Absence & retard</span>
                        </Button>
                      </TableCell>
                      {!isParent() && (
                        <TableCell className="text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-red-500 text-white hover:bg-red-600"
                            onClick={() => navigate(`/matieres-cahier/${classe.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="ml-2 hidden md:inline">Cahier de texte</span>
                          </Button>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
