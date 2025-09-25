import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, UserCheck, UserX, Clock, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useOptimizedClasses } from "@/hooks/useOptimizedClasses";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";

interface Classe {
  id: string;
  name: string;
  level: string;
  section?: string;
  capacity: number;
  effectif?: number;
  academic_year_id: string;
  school_id: string;
  created_at: string;
  updated_at: string;
}

interface Eleve {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string;
  class_id: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  parent_phone?: string;
  address?: string;
  enrollment_date?: string;
  is_active: boolean;
  school_id: string;
  created_at: string;
  updated_at: string;
}

interface Enseignant {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  specialization?: string;
  phone?: string;
  address?: string;
  hire_date?: string;
  is_active: boolean;
  school_id: string;
  created_at: string;
  updated_at: string;
}

const getClasseById = (classes: Classe[], classeId: string): Classe | null => {
  try {
    const classe = classes.find((c: any) => c.id === classeId);
    return classe || null;
  } catch (error) {
    console.error("Erreur lors de la récupération de la classe:", error);
    return null;
  }
};

const getEleveById = (eleves: Eleve[], eleveId: string): Eleve | null => {
  try {
    const eleve = eleves.find((e: any) => e.id === eleveId);
    return eleve || null;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'élève:", error);
    return null;
  }
};

const getEnseignantById = (enseignants: Enseignant[], enseignantId: string): Enseignant | null => {
  try {
    const enseignant = enseignants.find((e: any) => e.id === enseignantId);
    return enseignant || null;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'enseignant:", error);
    return null;
  }
};

interface AbsenceRetard {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  type: 'absence' | 'retard';
  period?: string;
  reason?: string;
  is_justified: boolean;
  recorded_by?: string;
  teacher_id?: string;
  subject_id?: string;
  justification_document?: string;
  created_at: string;
}

export default function AbsenceRetardClasse() {
  const [absencesRetards, setAbsencesRetards] = useState<AbsenceRetard[]>([]);
  const [filtreClasse, setFiltreClasse] = useState<string>("");
  const [filtreType, setFiltreType] = useState<string>("");
  const [filtreDate, setFiltreDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const { classes } = useOptimizedClasses();
  const { students } = useStudents();
  const { teachers } = useTeachers();

  useEffect(() => {
    // Simuler le chargement des données
    setLoading(false);
  }, []);

  const absencesRetardsFiltrees = absencesRetards.filter(ar => {
    const matchClasse = !filtreClasse || ar.class_id === filtreClasse;
    const matchType = !filtreType || ar.type === filtreType;
    const matchDate = !filtreDate || ar.date.startsWith(filtreDate);
    return matchClasse && matchType && matchDate;
  });

  const getStatistiques = () => {
    const total = absencesRetardsFiltrees.length;
    const absences = absencesRetardsFiltrees.filter(ar => ar.type === 'absence').length;
    const retards = absencesRetardsFiltrees.filter(ar => ar.type === 'retard').length;
    const justifiees = absencesRetardsFiltrees.filter(ar => ar.is_justified).length;
    
    return { total, absences, retards, justifiees };
  };

  const stats = getStatistiques();

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Absences et Retards par Classe</h1>
          <p className="text-muted-foreground">
            Consultez les absences et retards des élèves organisés par classe
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserX className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Absences</p>
                  <p className="text-2xl font-bold text-red-600">{stats.absences}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Retards</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.retards}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Justifiées</p>
                  <p className="text-2xl font-bold text-green-600">{stats.justifiees}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Classe</label>
                <select
                  value={filtreClasse}
                  onChange={(e) => setFiltreClasse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les classes</option>
                  {classes.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <select
                  value={filtreType}
                  onChange={(e) => setFiltreType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les types</option>
                  <option value="absence">Absences</option>
                  <option value="retard">Retards</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={filtreDate}
                  onChange={(e) => setFiltreDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des absences et retards */}
        <Card>
          <CardHeader>
            <CardTitle>
              Liste des Absences et Retards
              <Badge variant="secondary" className="ml-2">
                {absencesRetardsFiltrees.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {absencesRetardsFiltrees.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune absence ou retard trouvé(e)</p>
              </div>
            ) : (
              <div className="space-y-4">
                {absencesRetardsFiltrees.map((ar) => {
          const classe = classes.find((c: any) => c.id === ar.class_id) as any;
          const eleve = students.find((e: any) => e.id === ar.student_id) as any;
          const enseignant = ar.teacher_id ? teachers.find((e: any) => e.id === ar.teacher_id) as any : null;
                  
                  return (
                    <div key={ar.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant={ar.type === 'absence' ? 'destructive' : 'secondary'}>
                              {ar.type === 'absence' ? 'Absence' : 'Retard'}
                            </Badge>
                            {ar.is_justified && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                Justifié
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="font-medium">
                            {eleve ? `${eleve.first_name} ${eleve.last_name}` : 'Élève inconnu'}
                          </h3>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Classe: {classe?.name || 'Classe inconnue'}</p>
                            <p>Date: {format(new Date(ar.date), 'dd MMMM yyyy', { locale: fr })}</p>
                            {ar.period && <p>Période: {ar.period}</p>}
                            {ar.reason && <p>Motif: {ar.reason}</p>}
                            {enseignant && (
                              <p>Signalé par: {enseignant.first_name} {enseignant.last_name}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Détails
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}