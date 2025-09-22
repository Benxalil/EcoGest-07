-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false);

-- Create student_documents table
CREATE TABLE public.student_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for student documents
CREATE POLICY "School data access for student documents" 
ON public.student_documents 
FOR ALL 
USING (school_id = get_user_school_id());

-- Create storage policies for student documents
CREATE POLICY "Users can view student documents in their school" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'student-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload student documents in their school" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'student-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update student documents in their school" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'student-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete student documents in their school" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'student-documents' AND auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_student_documents_updated_at
BEFORE UPDATE ON public.student_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();