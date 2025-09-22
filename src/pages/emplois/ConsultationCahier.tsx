
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Plus, Calendar, Clock, User, CalendarIcon, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLessonLogs, type LessonLog } from "@/hooks/useLessonLogs";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function ConsultationCahier() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lessonLogs: allLessonLogs, loading } = useLessonLogs();
  const [lessonLogs, setLessonLogs] = useState<LessonLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LessonLog[]>([]);
  const [teachers, setTeachers] = useState<{ [key: string]: Teacher }>({});
  const [subjects, setSubjects] = useState<{ [key: string]: Subject }>({});
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  
  const matiereId = searchParams.get('matiereId');
  const matiereName = searchParams.get('matiereName');
  const classeId = searchParams.get('classeId');

  useEffect(() => {
    const loadData = async () => {
      if (!classeId) return;

      try {
        // Charger les enseignants depuis localStorage
        // Remplacé par hook Supabase
        const teachersMap: { [key: string]: Teacher } = {};
        
        if (savedEnseignants) {
          const enseignantsData = JSON.parse(savedEnseignants);
          enseignantsData.forEach((ens: any, index: number) => {
            const id = `local-${index}`;
            teachersMap[id] = {
              id,
              first_name: ens.prenom,
              last_name: ens.nom
            };
          });
        }

        // Charger les matières depuis localStorage
        // Remplacé par hook Supabase
        const subjectsMap: { [key: string]: Subject } = {};
        
        if (savedMatieres) {
          const matieresData = JSON.parse(savedMatieres);
          matieresData.forEach((matiere: any) => {
            const id = `local-${matiere.id}`;
            subjectsMap[id] = {
              id,
              name: matiere.nom
            };
          });
        }

        setTeachers(teachersMap);
        setSubjects(subjectsMap);

        // Filter lesson logs based on parameters
        let logs: LessonLog[];
        if (matiereId && classeId) {
          logs = allLessonLogs.filter(log => log.class_id === classeId && log.subject_id === matiereId);
        } else if (classeId) {
          logs = allLessonLogs.filter(log => log.class_id === classeId); } else {
          logs = [];
        }
        
        setLessonLogs(logs);
        setFilteredLogs(logs);
        // Supprimer le paramètre refresh de l'URL après rechargement
        const refreshParam = searchParams.get('refresh');
        if (refreshParam === 'true') {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('refresh');
          navigate(`?${newParams.toString()}`, { replace: true });
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [matiereId, classeId, allLessonLogs]);

  // Filter logs by date when date filter changes
  useEffect(() => {
    if (!dateFilter) {
      setFilteredLogs(lessonLogs); } else {
      const filteredByDate = lessonLogs.filter(log => {
        const logDate = new Date(log.lesson_date);
        const filterDate = new Date(dateFilter);
        return (
          logDate.getFullYear() === filterDate.getFullYear() &&
          logDate.getMonth() === filterDate.getMonth() &&
          logDate.getDate() === filterDate.getDate()
        );
      });
      setFilteredLogs(filteredByDate);
    }
  }, [lessonLogs, dateFilter]);

  const clearDateFilter = () => {
    setDateFilter(undefined);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleAjouterEntree = () => {
    const params = new URLSearchParams({
      activite: matiereName || "",
      matiereId: matiereId || "",
      classeId: classeId || ""
    });
    navigate(`/cahier-de-texte?${params.toString()}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.replace(':', 'h');
  };

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="mr-4 p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Cahier de texte - {matiereName}
            </h1>
          </div>
          <Button
            variant="default"
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={handleAjouterEntree}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une entrée
          </Button>
        </div>

        {/* Date Filter Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-medium text-gray-700">Filtrer par date :</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !dateFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : <span>Sélectionner une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDateFilter}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            )}
            <div className="text-sm text-gray-600">
              {dateFilter 
                ? `${filteredLogs.length} résultat(s) pour le ${format(dateFilter, "dd/MM/yyyy")}`
                : `${filteredLogs.length} résultat(s) au total`
              }
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Chargement des cahiers de texte...</p>
          </div>
        ) : filteredLogs.length === 0 && lessonLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune entrée dans le cahier de texte</p>
            <p className="text-gray-400 mb-6">Commencez par ajouter du contenu pour cette matière</p>
            <Button
              variant="default"
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleAjouterEntree}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter la première entrée
            </Button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune entrée trouvée pour cette date</p>
            <p className="text-gray-400 mb-6">Essayez de sélectionner une autre date ou effacez le filtre</p>
            <Button
              variant="outline"
              onClick={clearDateFilter}
            >
              <X className="h-4 w-4 mr-2" />
              Effacer le filtre
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">{log.topic}</span>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(log.lesson_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(log.start_time)}
                      </div>
                      {teachers[log.teacher_id] && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {teachers[log.teacher_id].first_name} {teachers[log.teacher_id].last_name}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subjects[log.subject_id] && (
                      <div className="text-sm text-blue-600 font-medium">
                        Matière: {subjects[log.subject_id].name}
                      </div>
                    )}
                    <div className="prose max-w-none">
                      <p className="whitespace-pre-wrap text-gray-700">{log.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
