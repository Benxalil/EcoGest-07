import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AjoutEleveForm } from "@/components/eleves/AjoutEleveForm";
import { Eye, Edit, Trash2, UserPlus, Search, ArrowLeft, Users, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClasses } from "@/hooks/useClasses";
import { useStudents, Student } from "@/hooks/useStudents";
import { useStudentDocuments, StudentDocument } from "@/hooks/useStudentDocuments";
import { DocumentViewerModal } from "@/components/eleves/DocumentViewerModal";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { formatClassName } from "@/utils/classNameFormatter";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Composant pour afficher les documents de l'élève (excluant les photos)
function DocumentsSection({
  studentId
}: {
  studentId: string;
}) {
  const {
    toast
  } = useToast();
  const {
    documents,
    loading,
    deleteDocument,
    getDocumentUrl,
    downloadDocument
  } = useStudentDocuments(studentId);
  const {
    userProfile
  } = useUserRole();
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>("");

  // Filtrer les documents pour exclure les photos
  const documentFiles = documents.filter(doc => doc.file_type === 'document');
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'document') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Uploader le fichier vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${Date.now()}.${fileExt}`;
      const filePath = `schools/${userProfile?.schoolId || 'default'}/students/${studentId}/${type}s/${fileName}`;
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('student-files').upload(filePath, file);
      if (uploadError) {
        throw uploadError;
      }

      // Enregistrer les métadonnées en base
      const {
        error: dbError
      } = await supabase.from('student_documents').insert([{
        student_id: studentId,
        file_name: file.name,
        file_path: filePath,
        file_type: type,
        file_size: file.size,
        document_name: file.name,
        school_id: userProfile?.schoolId || 'default',
        uploaded_by: userProfile?.id || 'default',
        mime_type: file.type
      }]);
      if (dbError) {
        throw dbError;
      }
      toast({
        title: "Document uploadé",
        description: "Le document a été uploadé avec succès"
      });
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload",
        variant: "destructive"
      });
    }
    setUploading(false);
  };
  const handleDeleteDocument = async (documentId: string) => {
    const result = await deleteDocument(documentId);
    if (result.success) {
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès"
      });
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Erreur lors de la suppression",
        variant: "destructive"
      });
    }
  };
  const handleDownloadDocument = async (document: any) => {
    await downloadDocument(document.file_path, document.file_name);
  };
  const handlePreviewDocument = async (document: StudentDocument) => {
    const url = await getDocumentUrl(document.file_path);
    if (url) {
      setSelectedDocument(document);
      setDocumentUrl(url);
      setViewerOpen(true);
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de charger le document",
        variant: "destructive"
      });
    }
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedDocument(null);
    setDocumentUrl("");
  };

  const handleDownloadFromViewer = () => {
    if (selectedDocument) {
      downloadDocument(selectedDocument.file_path, selectedDocument.file_name);
    }
  };
  return <div>
      <h3 className="text-lg font-semibold mb-3 text-orange-600">Documents de l'élève</h3>
      
      {/* Section d'upload - seulement pour les documents */}
      <div className="mb-4 space-y-2">
        
      </div>
      
      {loading ? <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div> : documentFiles.length > 0 ? <div className="space-y-3">
          {documentFiles.map(doc => <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">{doc.document_name}</p>
                  <p className="text-sm text-gray-500">
                    {doc.file_type} • {Math.round(doc.file_size / 1024)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handlePreviewDocument(doc)} className="text-blue-600 hover:text-blue-800" title="Prévisualiser le document">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc)} className="text-green-600 hover:text-green-800" title="Télécharger le document">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-red-600 hover:text-red-800" title="Supprimer le document">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>)}
        </div> : <p className="text-gray-500 italic">Aucun document disponible</p>}

      {selectedDocument && (
        <DocumentViewerModal
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
          document={selectedDocument}
          documentUrl={documentUrl}
          onDownload={handleDownloadFromViewer}
        />
      )}
    </div>;
}
export default function ElevesParClasse() {
  const {
    className
  } = useParams<{
    className: string;
  }>();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    classes: classesData
  } = useClasses();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);

  // Trouver l'ID de la classe à partir du nom de classe
  const currentClass = useMemo(() => {
    if (!className || !classesData) return null;
    const decodedClassName = decodeURIComponent(className);
    const foundClass = classesData.find(classe => formatClassName(classe) === decodedClassName);
    return foundClass;
  }, [className, classesData]);

  // Utiliser le hook useStudents avec l'ID de la classe
  const {
    students,
    loading,
    deleteStudent,
    refreshStudents
  } = useStudents(currentClass?.id);

  // Log pour débogage
  // Filtrer les élèves en fonction de la recherche
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase().trim();
    return students.filter(student => student.last_name.toLowerCase().includes(query) || student.first_name.toLowerCase().includes(query) || `${student.first_name} ${student.last_name}`.toLowerCase().includes(query) || student.student_number?.toLowerCase().includes(query));
  }, [students, searchQuery]);
  const handleAddSuccess = () => {
    setIsAddDialogOpen(false);
    refreshStudents();
  };
  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setStudentToEdit(null);
    refreshStudents();
  };
  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsDialogOpen(true);
  };

  // Charger la photo de l'élève quand selectedStudent change
  useEffect(() => {
    const loadStudentPhoto = async () => {
      if (!selectedStudent) {
        setStudentPhoto(null);
        return;
      }
      try {
        const {
          data: documents,
          error
        } = await supabase.from('student_documents').select('id, student_id, file_path, file_name, file_type, created_at').eq('student_id', selectedStudent.id).eq('file_type', 'photo').order('created_at', {
          ascending: false
        }).limit(1);
        if (error) {
          console.error('Erreur lors de la récupération de la photo:', error);
          setStudentPhoto(null);
          return;
        }
        if (documents && documents.length > 0) {
          // Utiliser createSignedUrl pour les buckets privés
          const { data, error: urlError } = await supabase.storage
            .from('student-files')
            .createSignedUrl(documents[0].file_path, 3600); // URL valide pendant 1 heure
          
          if (urlError) {
            console.error('Erreur lors de la génération de l\'URL signée:', urlError);
            setStudentPhoto(null);
            return;
          }
          
          setStudentPhoto(data.signedUrl);
        } else {
          setStudentPhoto(null);
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la photo:', error);
        setStudentPhoto(null);
      }
    };
    loadStudentPhoto();
  }, [selectedStudent]);
  const handleModifierEleve = (student: Student) => {
    setStudentToEdit(student);
    setIsEditDialogOpen(true);
  };
  const handleSupprimerEleve = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      toast({
        title: "Succès",
        description: "Élève supprimé avec succès"
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'élève:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de l'élève",
        variant: "destructive"
      });
    }
  };

  // Fonction pour uploader une photo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'document') => {
    const file = event.target.files?.[0];
    if (!file || !selectedStudent) return;
    try {
      // Uploader le fichier vers Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedStudent.id}_${Date.now()}.${fileExt}`;
      const filePath = `schools/${selectedStudent.school_id}/students/${selectedStudent.id}/${type}s/${fileName}`;
      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('student-files').upload(filePath, file);
      if (uploadError) {
        throw uploadError;
      }

      // Enregistrer les métadonnées en base
      const {
        error: dbError
      } = await supabase.from('student_documents').insert([{
        student_id: selectedStudent.id,
        file_name: file.name,
        file_path: filePath,
        file_type: type,
        file_size: file.size,
        document_name: file.name,
        school_id: selectedStudent.school_id,
        uploaded_by: selectedStudent.school_id,
        // Utiliser school_id temporairement
        mime_type: file.type
      }]);
      if (dbError) {
        throw dbError;
      }
      toast({
        title: "Photo uploadée",
        description: "La photo a été uploadée avec succès"
      });

      // Recharger la photo
      const {
        data: documents,
        error
      } = await supabase.from('student_documents').select('id, student_id, file_path, file_name, file_type, created_at').eq('student_id', selectedStudent.id).eq('file_type', 'photo').order('created_at', {
        ascending: false
      }).limit(1);
      if (!error && documents && documents.length > 0) {
        const {
          data
        } = supabase.storage.from('student-files').getPublicUrl(documents[0].file_path);
        setStudentPhoto(data.publicUrl);
      }
    } catch (error) {
      console.error("Erreur lors de l'upload:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload de la photo",
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-8">Chargement...</h1>
        </div>
      </Layout>;
  }
  return <Layout>
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/eleves')} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Élèves de la classe {decodeURIComponent(className || '')}</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 ml-auto">
                <UserPlus className="h-4 w-4" />
                Ajouter un élève
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un élève</DialogTitle>
              </DialogHeader>
              <AjoutEleveForm onSuccess={handleAddSuccess} classId={currentClass?.id} className={currentClass ? `${currentClass.name} ${currentClass.level}${currentClass.section ? ` - ${currentClass.section}` : ''}` : undefined} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistiques */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total élèves</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Garçons</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {students.filter(s => s.gender === 'M').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filles</CardTitle>
              <Users className="h-4 w-4 text-pink-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {students.filter(s => s.gender === 'F').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Rechercher un élève (nom, prénom, matricule...)" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>

        {/* Liste des élèves */}
        {filteredStudents.length === 0 ? <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              {searchQuery ? "Aucun élève trouvé pour cette recherche" : "Aucun élève dans cette classe"}
            </p>
          </div> : <div className="grid gap-4">
            {filteredStudents.map(student => <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                          {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                          </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {student.first_name} {student.last_name}
                        </h3>
                        <p className="text-gray-600">
                          {student.student_number && `Matricule: ${student.student_number}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {student.gender && student.date_of_birth ? `${student.gender === 'M' ? 'Masculin' : 'Féminin'} • Né(e) le ${new Date(student.date_of_birth).toLocaleDateString('fr-FR')}` : student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleViewStudent(student)} className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleModifierEleve(student)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-800">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer l'élève</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'élève {student.first_name} {student.last_name} ? 
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleSupprimerEleve(student.id)} className="bg-red-600 hover:bg-red-700">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>)}
          </div>}

        {/* Dialog pour voir les détails de l'élève */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails de l'élève</DialogTitle>
            </DialogHeader>
            {selectedStudent && <div className="space-y-6">
                {/* En-tête avec nom et informations principales */}
                <div className="flex items-start gap-6">
                  {/* Photo */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                      {studentPhoto ? <img src={studentPhoto} alt={`Photo de ${selectedStudent.first_name} ${selectedStudent.last_name}`} className="w-full h-full object-cover" /> : <div className="text-center text-gray-500">
                          <Users className="h-6 w-6 mx-auto mb-1" />
                          <p className="text-xs">Aucune photo</p>
                        </div>}
                    </div>
                    {/* Bouton pour changer la photo */}
                    <label className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 cursor-pointer hover:bg-blue-700 transition-colors" title="Changer la photo">
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'photo')} className="hidden" />
                      <Edit className="h-3 w-3" />
                    </label>
                  </div>
                  
                  {/* Informations principales */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-blue-600 mb-2">
                      {selectedStudent.first_name} {selectedStudent.last_name}
                    </h2>
                    <p className="text-gray-600 mb-1">
                      <span className="font-medium">Matricule:</span> {selectedStudent.student_number}
                    </p>
                    <p className="text-gray-600 mb-1">
                      <span className="font-medium">Classe:</span> {selectedStudent.classes ? `${selectedStudent.classes.name} ${selectedStudent.classes.level}${selectedStudent.classes.section ? ` - ${selectedStudent.classes.section}` : ''}` : currentClass ? `${currentClass.name} ${currentClass.level}${currentClass.section ? ` - ${currentClass.section}` : ''}` : 'Non assignée'}
                    </p>
                    <p className="text-gray-600">
                      {selectedStudent.gender === 'M' ? 'Masculin' : selectedStudent.gender === 'F' ? 'Féminin' : 'Non renseigné'} • {selectedStudent.date_of_birth ? `Né(e) le ${new Date(selectedStudent.date_of_birth).toLocaleDateString('fr-FR')}` : 'Date de naissance non renseignée'}
                    </p>
                  </div>
                </div>

                {/* Grille d'informations en 2 colonnes */}
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Colonne gauche */}
                  <div className="space-y-8">
                    {/* Informations personnelles */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-orange-600">Informations personnelles</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Lieu de naissance:</p>
                          <p className="text-gray-900">{selectedStudent.place_of_birth || 'Non renseigné'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Adresse:</p>
                          <p className="text-gray-900">{selectedStudent.address || 'Non renseignée'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Téléphone:</p>
                          <p className="text-gray-900">{selectedStudent.phone || 'Non renseigné'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email:</p>
                          <p className="text-gray-900">{selectedStudent.parent_email || 'Non renseigné'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Informations du père */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-orange-600">Informations du père</h3>
                      <div className="space-y-3">
                        {(() => {
                      const emergencyParts = selectedStudent.emergency_contact?.split(' - ') || [];
                      const fatherName = emergencyParts[0] || '';
                      const fatherPhone = emergencyParts[1] || '';
                      return <>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Nom:</p>
                                <p className="text-gray-900">{fatherName || 'Non renseigné'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Adresse:</p>
                                <p className="text-gray-900">{selectedStudent.address || 'Non renseignée'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Téléphone:</p>
                                <p className="text-gray-900">{selectedStudent.parent_phone || fatherPhone || 'Non renseigné'}</p>
                              </div>
                            </>;
                    })()}
                      </div>
                    </div>
                  </div>

                  {/* Colonne droite */}
                  <div className="space-y-8">
                    {/* Contact d'urgence */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-orange-600">Contact d'urgence</h3>
                      <div className="space-y-3">
                        {(() => {
                      const emergencyParts = selectedStudent.emergency_contact?.split(' - ') || [];
                      const contactName = emergencyParts[0] || '';
                      const contactPhone = emergencyParts[1] || '';
                      const contactRelation = emergencyParts[2]?.replace(/[()]/g, '') || '';
                      return <>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Nom:</p>
                                <p className="text-gray-900">{contactName || 'Non renseigné'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Téléphone:</p>
                                <p className="text-gray-900">{contactPhone || 'Non renseigné'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-700">Relation:</p>
                                <p className="text-gray-900">{contactRelation || 'Non renseigné'}</p>
                              </div>
                            </>;
                    })()}
                      </div>
                    </div>

                    {/* Informations de la mère */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-orange-600">Informations de la mère</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Nom:</p>
                          <p className="text-gray-900">Non renseigné</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Adresse:</p>
                          <p className="text-gray-900">Non renseigné</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Téléphone:</p>
                          <p className="text-gray-900">Non renseigné</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents de l'élève */}
                <DocumentsSection studentId={selectedStudent.id} />
              </div>}
          </DialogContent>
        </Dialog>

        {/* Dialog pour modifier l'élève */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier l'élève</DialogTitle>
            </DialogHeader>
            {studentToEdit && <AjoutEleveForm onSuccess={handleEditSuccess} initialData={studentToEdit} isEditing={true} classId={currentClass?.id} className={currentClass ? `${currentClass.name} ${currentClass.level}${currentClass.section ? ` - ${currentClass.section}` : ''}` : undefined} />}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>;
}