import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AjoutEnseignantForm } from "@/components/enseignants/AjoutEnseignantForm";

interface AjoutEnseignantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AjoutEnseignantModal({ open, onOpenChange, onSuccess }: AjoutEnseignantModalProps) {
  const handleSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un enseignant</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau compte enseignant
          </DialogDescription>
        </DialogHeader>
        <AjoutEnseignantForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}