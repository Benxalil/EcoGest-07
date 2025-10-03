
import { useState, useEffect } from "react";
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
import { formatClassName } from "@/utils/classNameFormatter";
import { useUserRole } from "@/hooks/useUserRole";
import { useParentChildren } from "@/hooks/useParentChildren";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

export default function ListeEmplois() {
  const navigate = useNavigate();
  const { isAdmin, isTeacher, isParent, userProfile } = useUserRole();
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);
  
  // Hook pour les enfants du parent
  const { children, loading: parentChildrenLoading } = useParentChildren();
  
  // Utiliser le hook approprié selon le rôle
  const adminData = useClasses();
  const teacherData = useTeacherClasses();
  
  const { classes, loading } = isTeacher() ? teacherData : adminData;
  const hasNoClasses = isTeacher() && teacherData.hasNoClasses;

  // Récupérer la classe de l'élève si c'est un élève
  useEffect(() => {
    const loadStudentClass = async () => {
      if (userProfile?.role === 'student' && userProfile?.id && userProfile?.schoolId) {
        try {
          const { data: student, error } = await supabase
            .from('students')
            .select('class_id')
            .eq('user_id', userProfile.id)
            .eq('school_id', userProfile.schoolId)
            .single();

          if (!error && student) {
            setStudentClassId(student.class_id);
          }
        } catch (err) {
          console.error("Erreur lors du chargement de la classe de l'élève:", err);
        } finally {
          setStudentLoading(false);
        }
      } else {
        setStudentLoading(false);
      }
    };

    loadStudentClass();
  }, [userProfile]);

  // Filtrer les classes pour les élèves et parents
  let displayedClasses = classes;
  
  if (userProfile?.role === 'student' && studentClassId) {
    displayedClasses = classes.filter(c => c.id === studentClassId);
  } else if (isParent() && children.length > 0) {
    // Extraire les IDs de classe uniques des enfants du parent
    const childrenClassIds = [...new Set(children
      .filter(child => child.class_id)
      .map(child => child.class_id)
    )];
    displayedClasses = classes.filter(c => childrenClassIds.includes(c.id));
  }

  // Si aucune classe n'a été enregistrée
  if (loading || studentLoading || (isParent() && parentChildrenLoading)) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chargement des classes...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">
              {isTeacher() ? "Mes classes" : "Liste des classes du Primaire"}
            </h1>
          </div>

          <div className="text-center py-12">
            {hasNoClasses ? (
              <>
                <p className="text-gray-500 text-lg mb-4">Vous n'êtes encore affecté à aucune classe</p>
                <p className="text-gray-400 mb-6">Veuillez contacter l'administrateur pour être assigné à des classes via l'emploi du temps</p>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-lg mb-4">Aucune classe n'a été enregistrée</p>
                <p className="text-gray-400 mb-6">Veuillez d'abord créer des classes avant de gérer les emplois du temps</p>
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
          <h1 className="text-2xl font-bold text-gray-900">
            {userProfile?.role === 'student' 
              ? "Mon Emploi du Temps" 
              : isParent()
                ? "Emploi du temps de mes enfants"
                : isTeacher() 
                  ? "Mes classes" 
                  : "Liste des classes du Primaire"}
          </h1>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">Classe</TableHead>
                <TableHead className="w-1/4 text-center">Emploi du Temps</TableHead>
                {userProfile?.role !== 'student' && (
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
              {displayedClasses.map((classe) => (
                <TableRow key={classe.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{formatClassName(classe)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-blue-500 text-white hover:bg-blue-600"
                      onClick={() => { 
                        localStorage.setItem(`classe-name-${classe.id}`, formatClassName(classe));
                        navigate(`/emplois-du-temps/${classe.id}`);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Emploi du temps
                    </Button>
                  </TableCell>
                  {userProfile?.role !== 'student' && (
                    <>
                      <TableCell className="text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-yellow-500 text-white hover:bg-yellow-600"
                          onClick={() => navigate(`/consulter-absences-retards/${classe.id}`)}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Absence & retard
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
                            <FileText className="h-4 w-4 mr-2" />
                            Cahier de texte
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
