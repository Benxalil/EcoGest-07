import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AjoutEleveForm } from "@/components/eleves/AjoutEleveForm";

interface AjoutEleveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AjoutEleveModal({ open, onOpenChange, onSuccess }: AjoutEleveModalProps) {
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
          <DialogTitle>Ajouter un élève</DialogTitle>
        </DialogHeader>
        <AjoutEleveForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}