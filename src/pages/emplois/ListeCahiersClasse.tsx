import { Layout } from "@/components/layout/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLessonLogs, type LessonLog } from "@/hooks/useLessonLogs";
import { useTeachers } from "@/hooks/useTeachers";
import { useSubjects } from "@/hooks/useSubjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Calendar, Clock, User, BookOpen } from "lucide-react";

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function ListeCahiersClasse() {
  const { classeId } = useParams();
  const navigate = useNavigate();
  const { lessonLogs: allLessonLogs, loading } = useLessonLogs();
  const { teachers } = useTeachers();
  const { subjects } = useSubjects();
  const [filteredLogs, setFilteredLogs] = useState<LessonLog[]>([]);
  const [className, setClassName] = useState<string>('');

  useEffect(() => {
    if (!classeId) return;

    // Filter lesson logs by class
    const logs = allLessonLogs.filter(log => log.class_id === classeId);
    setFilteredLogs(logs);

    // Récupérer le nom de la classe depuis localStorage
    const savedClassName = localStorage.getItem(`classe-name-${classeId}`) || '';
    setClassName(savedClassName);
  }, [classeId, allLessonLogs]);

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Enseignant inconnu';
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Matière inconnue';
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
    return timeString ? timeString.slice(0, 5) : '';
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddEntry = () => {
    navigate(`/matieres-cahier/${classeId}`);
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
              Cahiers de textes - {className}
            </h1>
          </div>
          <Button onClick={handleAddEntry} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une entrée
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Chargement des cahiers de textes...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucun cahier de texte enregistré pour cette classe</p>
            <Button onClick={handleAddEntry} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier cahier
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-gray-800">
                    {log.topic}
                  </CardTitle>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(log.lesson_date)}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime(log.start_time)}
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {getTeacherName(log.teacher_id)}
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {getSubjectName(log.subject_id)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{log.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}