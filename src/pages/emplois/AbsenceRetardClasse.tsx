import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserCheck, UserX, Clock } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";

interface Classe {
  id: string;
  session: string;
  libelle: string;
}

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  presence: string;
}

const AbsenceRetardClasse: React.FC = () => {
  const { classeId } = useParams<{ classeId: string }>();
  const navigate = useNavigate();
  const { classes } = useClasses();
  const { students } = useStudents();
  const { teachers } = useTeachers();

  const [classe, setClasse] = useState<Classe | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);

  // Fonction pour récupérer une classe par son ID
  const getClasseById = (id: string) => {
    return classes.find(c => c.id === id);
  };

  // Fonction pour récupérer les élèves d'une classe
  const getElevesByClasse = (classId: string) => {
    return students
      .filter(student => student.class_id === classId)
      .map(student => ({
        id: student.id,
        nom: student.last_name,
        prenom: student.first_name,
        presence: "present"
      }));
  };

  // Fonction pour récupérer les enseignants
  const getEnseignants = () => {
    return teachers.map(teacher => `${teacher.first_name} ${teacher.last_name}`);
  };

  useEffect(() => {
    const loadData = () => {
      if (classeId) {
        const classeData = getClasseById(classeId);
        if (classeData) {
          setClasse({
            id: classeData.id,
            session: classeData.level,
            libelle: classeData.name
          });
          
          const elevesData = getElevesByClasse(classeId);
          setEleves(elevesData);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [classeId, classes, students]);

  const handlePresenceChange = (eleveId: string, newPresence: string) => {
    setEleves(prevEleves =>
      prevEleves.map(eleve =>
        eleve.id === eleveId ? { ...eleve, presence: newPresence } : eleve
      )
    );
  };

  const handleSave = () => {
    console.log("Sauvegarde des présences:", eleves);
    // Ici vous pouvez ajouter la logique pour sauvegarder les présences
    navigate(-1);
  };

  const getPresenceCount = () => {
    const present = eleves.filter(e => e.presence === "present").length;
    const absent = eleves.filter(e => e.presence === "absent").length;
    const retard = eleves.filter(e => e.presence === "retard").length;
    return { present, absent, retard };
  };

  const counts = getPresenceCount();

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Chargement...</div>
        </div>
      </Layout>
    );
  }

  if (!classe) {
    return (
      <Layout>
        <div className="text-center">
          <p className="text-red-500 mb-4">Classe introuvable</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">
              Présence - {classe.session} {classe.libelle}
            </h1>
          </div>
          <Button onClick={handleSave} className="flex items-center">
            Sauvegarder
          </Button>
        </div>

        {/* Statistiques */}
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 text-green-600">
              <UserCheck className="w-5 h-5" />
              <span className="font-medium">Présents: {counts.present}</span>
            </div>
            <div className="flex items-center space-x-2 text-red-600">
              <UserX className="w-5 h-5" />
              <span className="font-medium">Absents: {counts.absent}</span>
            </div>
            <div className="flex items-center space-x-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Retards: {counts.retard}</span>
            </div>
          </div>
        </Card>

        {/* Liste des élèves */}
        <div className="space-y-2">
          {eleves.map((eleve) => (
            <Card key={eleve.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {eleve.prenom} {eleve.nom}
                  </h3>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={eleve.presence === "present" ? "default" : "outline"}
                    onClick={() => handlePresenceChange(eleve.id, "present")}
                    className="flex items-center"
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Présent
                  </Button>
                  <Button
                    size="sm"
                    variant={eleve.presence === "absent" ? "destructive" : "outline"}
                    onClick={() => handlePresenceChange(eleve.id, "absent")}
                    className="flex items-center"
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Absent
                  </Button>
                  <Button
                    size="sm"
                    variant={eleve.presence === "retard" ? "secondary" : "outline"}
                    onClick={() => handlePresenceChange(eleve.id, "retard")}
                    className="flex items-center"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    Retard
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {eleves.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              Aucun élève trouvé pour cette classe.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default AbsenceRetardClasse;