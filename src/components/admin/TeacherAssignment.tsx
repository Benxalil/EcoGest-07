import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subjects: Array<{ id: string; name: string }>;
  classes: Array<{ id: string; name: string }>;
}

export const TeacherAssignment: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const { classes } = useClasses();
  const { subjects } = useSubjects();
  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          subjects:teacher_subjects(
            subject_id,
            subjects!inner(id, name)
          ),
          classes:teacher_classes(
            class_id,
            classes!inner(id, name)
          )
        `)
        .eq('role', 'teacher');

      if (error) throw error;

      const formattedTeachers = data?.map(teacher => ({
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        subjects: teacher.subjects?.map((s: any) => ({
          id: s.subjects.id,
          name: s.subjects.name
        })) || [],
        classes: teacher.classes?.map((c: any) => ({
          id: c.classes.id,
          name: c.classes.name
        })) || []
      })) || [];

      setTeachers(formattedTeachers);
    } catch (error) {
      console.error('Erreur lors de la récupération des enseignants:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer la liste des enseignants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSelect = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      setSelectedTeacher(teacherId);
      setSelectedSubjects(teacher.subjects.map(s => s.id));
      setSelectedClasses(teacher.classes.map(c => c.id));
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSave = async () => {
    if (!selectedTeacher) return;

    try {
      // Supprimer les assignations existantes
      await supabase
        .from('teacher_subjects')
        .delete()
        .eq('teacher_id', selectedTeacher);

      await supabase
        .from('teacher_classes')
        .delete()
        .eq('teacher_id', selectedTeacher);

      // Ajouter les nouvelles assignations
      if (selectedSubjects.length > 0) {
        await supabase
          .from('teacher_subjects')
          .insert(selectedSubjects.map(subjectId => ({
            teacher_id: selectedTeacher,
            subject_id: subjectId
          })));
      }

      if (selectedClasses.length > 0) {
        await supabase
          .from('teacher_classes')
          .insert(selectedClasses.map(classId => ({
            teacher_id: selectedTeacher,
            class_id: classId
          })));
      }

      toast({
        title: "Assignations mises à jour",
        description: "Les matières et classes ont été assignées avec succès.",
      });

      // Rafraîchir la liste
      await fetchTeachers();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les assignations",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Assignation des matières et classes</h2>
        <p className="text-gray-600">
          Assignez les matières et classes aux enseignants pour contrôler leurs accès aux notes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des enseignants */}
        <Card>
          <CardHeader>
            <CardTitle>Enseignants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedTeacher === teacher.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleTeacherSelect(teacher.id)}
                >
                  <div className="font-medium">
                    {teacher.first_name} {teacher.last_name}
                  </div>
                  <div className="text-sm text-gray-500">{teacher.email}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {teacher.subjects.map((subject) => (
                      <Badge key={subject.id} variant="outline" className="text-xs">
                        {subject.name}
                      </Badge>
                    ))}
                    {teacher.classes.map((classe) => (
                      <Badge key={classe.id} variant="secondary" className="text-xs">
                        {classe.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assignation des matières et classes */}
        {selectedTeacher && (
          <Card>
            <CardHeader>
              <CardTitle>
                Assignation pour {teachers.find(t => t.id === selectedTeacher)?.first_name} {teachers.find(t => t.id === selectedTeacher)?.last_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Matières */}
              <div>
                <h3 className="font-medium mb-3">Matières</h3>
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject.id}`}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={() => handleSubjectToggle(subject.id)}
                      />
                      <label
                        htmlFor={`subject-${subject.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {subject.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Classes */}
              <div>
                <h3 className="font-medium mb-3">Classes</h3>
                <div className="space-y-2">
                  {classes.map((classe) => (
                    <div key={classe.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`class-${classe.id}`}
                        checked={selectedClasses.includes(classe.id)}
                        onCheckedChange={() => handleClassToggle(classe.id)}
                      />
                      <label
                        htmlFor={`class-${classe.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {classe.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                Sauvegarder les assignations
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

