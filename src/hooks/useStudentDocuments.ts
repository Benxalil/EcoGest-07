import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';

export interface StudentDocument {
  id: string;
  student_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size: number;
  document_name: string;
  school_id: string;
  uploaded_by: string;
  mime_type: string;
  created_at: string;
  updated_at: string;
}

export function useStudentDocuments(studentId?: string) {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserRole();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!studentId) {
        setDocuments([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Erreur lors de la récupération des documents:', fetchError);
        throw fetchError;
      }

      setDocuments(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des documents:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    studentId: string, 
    file: File, 
    type: 'photo' | 'document'
  ): Promise<{ success: boolean; document?: StudentDocument; error?: string }> => {
    try {
      if (!userProfile?.schoolId) {
        return { success: false, error: 'Aucun schoolId trouvé' };
      }

      // Essayer de créer le bucket s'il n'existe pas
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
          console.error('Erreur lors de la vérification des buckets:', bucketError);
          // Continuer quand même, on essaiera de créer le bucket } else {
          const bucketExists = buckets?.some(bucket => bucket.id === 'student-files');
          if (!bucketExists) {
            // Essayer de créer le bucket via l'API
            const { error: createError } = await supabase.storage.createBucket('student-files', {
              public: false,
              fileSizeLimit: 10485760, // 10MB
              allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
            });
            
            if (createError) {
              console.error('Erreur lors de la création du bucket:', createError);
              // Continuer quand même, peut-être que le bucket existe déjà } else {
              }
          }
        }
      } catch (error) {
        console.error('Erreur lors de la gestion du bucket:', error);
        // Continuer quand même
      }

      // Créer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${Date.now()}.${fileExt}`;
      const filePath = `schools/${userProfile.schoolId}/students/${studentId}/${type}s/${fileName}`;

      // Upload du fichier vers Supabase Storage
      let uploadResult = await supabase.storage
        .from('student-files')
        .upload(filePath, file);

      // Si le bucket student-files n'existe pas, essayer avec le bucket par défaut
      if (uploadResult.error && uploadResult.error.message.includes('Bucket not found')) {
        uploadResult = await supabase.storage
          .from('default')
          .upload(filePath, file);
      }

      const { data: uploadData, error: uploadError } = uploadResult;

      if (uploadError) {
        console.error('Erreur lors de l\'upload:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Enregistrer les métadonnées dans la base de données
      const { data: documentData, error: dbError } = await supabase
        .from('student_documents')
        .insert([{
          student_id: studentId,
          file_name: file.name,
          file_path: filePath,
          file_type: type,
          file_size: file.size,
          document_name: file.name,
          school_id: userProfile.schoolId,
          uploaded_by: userProfile.id,
          mime_type: file.type
        }])
        .select()
        .single();

      if (dbError) {
        console.error('Erreur lors de l\'enregistrement en base:', dbError);
        // Supprimer le fichier uploadé en cas d'erreur
        await supabase.storage.from('student-files').remove([filePath]);
        return { success: false, error: dbError.message };
      }

      // Rafraîchir la liste des documents
      await fetchDocuments();

      return { success: true, document: documentData };
    } catch (err) {
      console.error('Erreur lors de l\'upload du document:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erreur inconnue' 
      };
    }
  };

  const deleteDocument = async (documentId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Récupérer les informations du document
      const { data: document, error: fetchError } = await supabase
        .from('student_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !document) {
        return { success: false, error: 'Document non trouvé' };
      }

      // Supprimer le fichier du storage
      let storageResult = await supabase.storage
        .from('student-files')
        .remove([document.file_path]);

      // Si le bucket student-files n'existe pas, essayer avec le bucket par défaut
      if (storageResult.error && storageResult.error.message.includes('Bucket not found')) {
        storageResult = await supabase.storage
          .from('default')
          .remove([document.file_path]);
      }

      const { error: storageError } = storageResult;

      if (storageError) {
        console.error('Erreur lors de la suppression du fichier:', storageError);
        // Continuer même si la suppression du fichier échoue
      }

      // Supprimer l'enregistrement de la base de données
      const { error: dbError } = await supabase
        .from('student_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error('Erreur lors de la suppression en base:', dbError);
        return { success: false, error: dbError.message };
      }

      // Rafraîchir la liste des documents
      await fetchDocuments();

      return { success: true };
    } catch (err) {
      console.error('Erreur lors de la suppression du document:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erreur inconnue' 
      };
    }
  };

  const getDocumentUrl = (filePath: string): string => {
    // Essayer d'abord avec le bucket student-files
    let { data } = supabase.storage
      .from('student-files')
      .getPublicUrl(filePath);
    
    // Si l'URL ne fonctionne pas, essayer avec le bucket par défaut
    if (!data || !data.publicUrl) {
      data = supabase.storage
        .from('default')
        .getPublicUrl(filePath).data;
    }
    
    return data?.publicUrl || '';
  };

  const downloadDocument = async (filePath: string, fileName: string): Promise<void> => {
    try {
      let downloadResult = await supabase.storage
        .from('student-files')
        .download(filePath);

      // Si le bucket student-files n'existe pas, essayer avec le bucket par défaut
      if (downloadResult.error && downloadResult.error.message.includes('Bucket not found')) {
        downloadResult = await supabase.storage
          .from('default')
          .download(filePath);
      }

      const { data, error } = downloadResult;

      if (error) {
        console.error('Erreur lors du téléchargement:', error);
        return;
      }

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [studentId]);

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
    downloadDocument,
    refreshDocuments: fetchDocuments
  };
}
