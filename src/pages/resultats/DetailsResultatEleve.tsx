import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Eye, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatClassName } from "@/utils/classNameFormatter";

interface ExamDetails {
  id: string;
  title: string;
  exam_date: string;
  is_published: boolean;
  class_name: string;
  class_section: string;
}

interface SubjectGrade {
  subject_name: string;
  devoir_note?: number;
  composition_note?: number;
  note?: number;
  coefficient: number;
  moyenne?: number;
}

interface StudentStats {
  general_average: number;
  devoir_average?: number;
  composition_average?: number;
  total_devoir_notes?: number;
  total_composition_notes?: number;
  grades: SubjectGrade[];
}

export default function DetailsResultatEleve() {
  const [loading, setLoading] = useState(true);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState(0);
  const [showCalculatedRank] = useState(false);
  const navigate = useNavigate();
  const { studentId, examId } = useParams();

  useEffect(() => {
    if (studentId && examId) {
      loadExamAndGrades();
    }
  }, [studentId, examId]);

  const loadExamAndGrades = async () => {
    try {
      setLoading(true);

      // Fetch exam details with class info
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select(`
          id, 
          title, 
          exam_date, 
          is_published,
          classes (
            name,
            level,
            section
          )
        `)
        .eq("id", examId)
        .single();

      if (examError) throw examError;
      
      setExamDetails({
        ...examData,
        class_name: examData.classes?.name || "",
        class_section: examData.classes?.section || ""
      });

      // Fetch student details
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("first_name, last_name, student_number")
        .eq("id", studentId)
        .single();

      if (studentError) throw studentError;
      setStudentName(`${studentData.first_name} ${studentData.last_name}`);
      
      // Extract numeric part from student_number (e.g., "Eleve001" -> 1)
      const numMatch = studentData.student_number?.match(/\d+/);
      setStudentNumber(numMatch ? parseInt(numMatch[0]) : 1);

      // Fetch grades with subject information
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select(`
          grade_value,
          max_grade,
          coefficient,
          exam_type,
          subjects (
            name
          )
        `)
        .eq("student_id", studentId)
        .eq("exam_id", examId);

      if (gradesError) throw gradesError;

      // Process grades
      const isComposition = examData.title.toLowerCase().includes("composition");
      const gradesMap = new Map<string, SubjectGrade>();

      gradesData.forEach((grade: any) => {
        const subjectName = grade.subjects.name;
        
        if (!gradesMap.has(subjectName)) {
          gradesMap.set(subjectName, {
            subject_name: subjectName,
            coefficient: grade.coefficient || 1,
          });
        }

        const subjectGrade = gradesMap.get(subjectName)!;

        if (isComposition) {
          if (grade.exam_type === "devoir") {
            subjectGrade.devoir_note = (grade.grade_value / grade.max_grade) * 20;
          } else if (grade.exam_type === "composition") {
            subjectGrade.composition_note = (grade.grade_value / grade.max_grade) * 20;
          }
        } else {
          subjectGrade.note = (grade.grade_value / grade.max_grade) * 20;
        }
      });

      // Calculate averages
      const grades = Array.from(gradesMap.values());
      let totalWeighted = 0;
      let totalCoefficient = 0;
      let devoirWeighted = 0;
      let devoirCoefficient = 0;
      let compositionWeighted = 0;
      let compositionCoefficient = 0;
      let totalDevoirNotes = 0;
      let totalCompositionNotes = 0;

      grades.forEach((grade) => {
        if (isComposition) {
          if (grade.devoir_note !== undefined && grade.devoir_note > 0) {
            devoirWeighted += grade.devoir_note * grade.coefficient;
            devoirCoefficient += grade.coefficient;
            totalDevoirNotes += grade.devoir_note;
          }
          if (grade.composition_note !== undefined && grade.composition_note > 0) {
            compositionWeighted += grade.composition_note * grade.coefficient;
            compositionCoefficient += grade.coefficient;
            totalCompositionNotes += grade.composition_note;
          }
          
          // Calculate subject average (40% devoir, 60% composition)
          if (grade.devoir_note !== undefined && grade.composition_note !== undefined) {
            grade.moyenne = (grade.devoir_note * 0.4 + grade.composition_note * 0.6);
            totalWeighted += grade.moyenne * grade.coefficient;
            totalCoefficient += grade.coefficient;
          }
        } else {
          if (grade.note !== undefined && grade.note > 0) {
            totalWeighted += grade.note * grade.coefficient;
            totalCoefficient += grade.coefficient;
            grade.moyenne = grade.note;
          }
        }
      });

      const stats: StudentStats = {
        general_average: totalCoefficient > 0 ? totalWeighted / totalCoefficient : 0,
        grades,
      };

      if (isComposition) {
        stats.devoir_average = devoirCoefficient > 0 ? devoirWeighted / devoirCoefficient : 0;
        stats.composition_average = compositionCoefficient > 0 ? compositionWeighted / compositionCoefficient : 0;
        stats.total_devoir_notes = totalDevoirNotes;
        stats.total_composition_notes = totalCompositionNotes;
      }

      setStudentStats(stats);
    } catch (error) {
      console.error("Error loading exam and grades:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (note: number) => {
    if (note >= 16) return "text-green-600 dark:text-green-400 font-semibold";
    if (note >= 14) return "text-blue-600 dark:text-blue-400 font-semibold";
    if (note >= 12) return "text-yellow-600 dark:text-yellow-400 font-semibold";
    if (note >= 10) return "text-orange-600 dark:text-orange-400 font-semibold";
    return "text-red-600 dark:text-red-400 font-semibold";
  };

  const handleGeneratePDF = () => {
    // Placeholder for PDF generation - non-functional for students
    console.log("PDF generation not available for students");
  };

  // Loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Chargement des résultats...</span>
        </div>
      </Layout>
    );
  }

  // Check if exam is published
  if (!examDetails || !examDetails.is_published) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Résultats non encore disponibles
                </h3>
                <p className="text-gray-500">
                  Les résultats de cet examen n'ont pas encore été publiés par l'administrateur.
                </p>
                <Button onClick={() => navigate(-1)} className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Check if we have student stats
  if (!studentStats) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Aucune note disponible
                </h3>
                <p className="text-gray-500">
                  Aucune note n'a été enregistrée pour cet examen.
                </p>
                <Button onClick={() => navigate(-1)} className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isComposition = examDetails.title.toLowerCase().includes("composition");

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header - Exact Admin Format */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {formatClassName({ name: examDetails.class_name, section: examDetails.class_section })}
              </h1>
              {examDetails && (
                <p className="text-sm text-gray-500">
                  Date: {new Date(examDetails.exam_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Results Table with Exact Admin Format */}
        <div className="bg-card rounded-lg shadow border">
          {/* Blue Bar with Exam Title */}
          <div className="bg-primary text-primary-foreground text-center py-3 rounded-t-lg">
            <h2 className="text-lg font-semibold">{examDetails.title}</h2>
          </div>
          
          {/* Dark Bar */}
          <div className="bg-muted text-muted-foreground text-center py-2">
            <span className="text-sm font-medium">Tous les bulletins</span>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">N°</TableHead>
                {showCalculatedRank && <TableHead className="w-16 text-center">Rang</TableHead>}
                <TableHead>Nom et Prénom</TableHead>
                {isComposition ? (
                  <>
                    <TableHead className="w-40 text-center bg-blue-100 dark:bg-blue-900/30 border-r">Devoir</TableHead>
                    <TableHead className="w-40 text-center bg-green-100 dark:bg-green-900/30">Composition</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="w-32 text-center">Note</TableHead>
                    <TableHead className="w-32 text-center">Moyenne</TableHead>
                  </>
                )}
                <TableHead className="w-20 text-center">Action</TableHead>
              </TableRow>
              {isComposition && (
                <TableRow className="bg-muted/50">
                  <TableHead></TableHead>
                  {showCalculatedRank && <TableHead></TableHead>}
                  <TableHead></TableHead>
                  <TableHead className="text-center text-sm bg-blue-100 dark:bg-blue-900/30 border-r">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="font-medium">Notes</span>
                      <span className="font-medium">Moyenne</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-sm bg-green-100 dark:bg-green-900/30">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="font-medium">Notes</span>
                      <span className="font-medium">Moyenne</span>
                    </div>
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{studentNumber}</TableCell>
                {showCalculatedRank && (
                  <TableCell className="text-center font-bold text-blue-600">
                    1
                  </TableCell>
                )}
                <TableCell className="font-medium">{studentName}</TableCell>
                
                {isComposition ? (
                  <>
                    {/* Devoir Column with Separator */}
                    <TableCell className="text-center bg-blue-100 dark:bg-blue-900/30 border-r">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-foreground">
                          {studentStats.total_devoir_notes && studentStats.total_devoir_notes > 0 
                            ? studentStats.total_devoir_notes.toFixed(1) 
                            : "-"}
                        </div>
                        <div className={`text-sm font-bold ${studentStats.devoir_average && studentStats.devoir_average > 0 ? getGradeColor(studentStats.devoir_average) : "text-muted-foreground"}`}>
                          {studentStats.devoir_average && studentStats.devoir_average > 0 
                            ? studentStats.devoir_average.toFixed(2) 
                            : "-"}
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Composition Column */}
                    <TableCell className="text-center bg-green-100 dark:bg-green-900/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium text-foreground">
                          {studentStats.total_composition_notes && studentStats.total_composition_notes > 0 
                            ? studentStats.total_composition_notes.toFixed(1) 
                            : "-"}
                        </div>
                        <div className={`text-sm font-bold ${studentStats.composition_average && studentStats.composition_average > 0 ? getGradeColor(studentStats.composition_average) : "text-muted-foreground"}`}>
                          {studentStats.composition_average && studentStats.composition_average > 0 
                            ? studentStats.composition_average.toFixed(2) 
                            : "-"}
                        </div>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-center">
                      <span className={`text-sm font-medium ${getGradeColor(studentStats.general_average)}`}>
                        {studentStats.general_average > 0 ? studentStats.general_average.toFixed(2) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-bold ${getGradeColor(studentStats.general_average)}`}>
                        {studentStats.general_average > 0 ? studentStats.general_average.toFixed(2) : "-"}
                      </span>
                    </TableCell>
                  </>
                )}
                
                {/* Action Column - Eye icon */}
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
