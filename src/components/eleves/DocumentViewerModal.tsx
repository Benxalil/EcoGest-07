import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useState, useEffect } from "react";

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    file_name: string;
    file_path: string;
    document_name: string;
    mime_type: string;
  };
  documentUrl: string;
  onDownload: () => void;
}

export function DocumentViewerModal({
  isOpen,
  onClose,
  document,
  documentUrl,
  onDownload
}: DocumentViewerModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen, documentUrl]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const isPdf = document.mime_type === 'application/pdf' || document.file_name.toLowerCase().endsWith('.pdf');
  const isImage = document.mime_type.startsWith('image/') || 
    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(document.file_name);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{document.document_name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted mx-6 rounded-lg flex relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
          
          {isPdf ? (
            <iframe
              src={documentUrl}
              className="w-full h-full border-0 rounded-lg"
              title={document.document_name}
              onLoad={handleLoad}
            />
          ) : isImage ? (
            <img
              src={documentUrl}
              alt={document.document_name}
              className="w-full h-full object-contain rounded-lg"
              onLoad={handleLoad}
            />
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">
                Aperçu non disponible pour ce type de fichier
              </p>
              <Button onClick={onDownload} className="gap-2">
                <Download className="h-4 w-4" />
                Télécharger le fichier
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between px-6 py-4">
          <Button onClick={onDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Télécharger
          </Button>
          <Button onClick={onClose} variant="default" className="gap-2">
            <X className="h-4 w-4" />
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
