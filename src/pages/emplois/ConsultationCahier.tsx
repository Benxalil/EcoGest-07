import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layout } from '@/components/layout/Layout';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useLessonLogs, LessonLogData } from '@/hooks/useLessonLogs';
import { useTeachers } from '@/hooks/useTeachers';
import { useSubjects } from '@/hooks/useSubjects';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}

interface Subject {
  id: string;
  name: string;
}

const ConsultationCahier: React.FC = () => {
  const navigate = useNavigate();
  const { classeId, matiereId } = useParams();
  
  const { lessonLogs, loading } = useLessonLogs(classeId);
  const { teachers } = useTeachers();
  const { subjects } = useSubjects();
  
  const [filteredLogs, setFilteredLogs] = useState<LessonLogData[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [subjectName, setSubjectName] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      if (!classeId) return;

      try {
        // Find subject name
        if (matiereId) {
          const subject = subjects.find(s => s.id === matiereId);
          if (subject) {
            setSubjectName(subject.name);
          }
        }

        // Filter lesson logs by subject if matiereId is provided
        let logs: LessonLogData[];
        if (matiereId) {
          logs = lessonLogs.filter(log => log.subject_id === matiereId);
        } else {
          logs = lessonLogs;
        }
        
        setFilteredLogs(logs);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [matiereId, classeId, lessonLogs, subjects]);

  // Filter logs by date when dateFilter changes
  useEffect(() => {
    if (dateFilter) {
      let logs = lessonLogs;
      if (matiereId) {
        logs = lessonLogs.filter(log => log.subject_id === matiereId);
      }
      
      const filtered = logs.filter(log => {
        const logDate = new Date(log.lesson_date);
        return logDate.toDateString() === dateFilter.toDateString();
      });
      setFilteredLogs(filtered);
    } else {
      let logs = lessonLogs;
      if (matiereId) {
        logs = lessonLogs.filter(log => log.subject_id === matiereId);
      }
      setFilteredLogs(logs);
    }
  }, [dateFilter, lessonLogs, matiereId]);

  const clearDateFilter = () => {
    setDateFilter(undefined);
  };

  const handleBack = () => {
    if (classeId) {
      navigate(`/matieres-cahier/${classeId}`);
    } else {
      navigate(-1);
    }
  };

  const handleAjouterEntree = () => {
    const params = new URLSearchParams();
    if (classeId) params.set('classeId', classeId);
    if (matiereId) params.set('matiereId', matiereId);
    navigate(`/cahier-de-texte?${params.toString()}`);
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Enseignant inconnu';
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Matière inconnue';
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE d MMMM yyyy', { locale: fr });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString.replace(':', 'h');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Chargement des cahiers de textes...</div>
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
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">
              Cahier de texte {subjectName && `- ${subjectName}`}
            </h1>
          </div>
          <Button onClick={handleAjouterEntree} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une entrée
          </Button>
        </div>

        {/* Filtres */}
        <div className="flex items-center space-x-4">
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
                {dateFilter ? format(dateFilter, "PPP", { locale: fr }) : "Filtrer par date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFilter}
                onSelect={setDateFilter}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {dateFilter && (
            <Button variant="outline" onClick={clearDateFilter}>
              Effacer le filtre
            </Button>
          )}
        </div>

        {/* Liste des entrées */}
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {dateFilter ? "Aucune entrée trouvée pour cette date." : "Aucune entrée trouvée."}
              </p>
              <Button onClick={handleAjouterEntree}>
                Créer la première entrée
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{log.topic}</CardTitle>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📅 {formatDate(log.lesson_date)}</p>
                    {log.start_time && <p>🕒 {formatTime(log.start_time)}</p>}
                    <p>👨‍🏫 {getTeacherName(log.teacher_id)}</p>
                    <p>📚 {getSubjectName(log.subject_id)}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Contenu du cours :</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {log.content}
                      </p>
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
};

export default ConsultationCahier;