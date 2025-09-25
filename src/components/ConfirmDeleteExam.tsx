import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmDeleteExamProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  examTitle: string;
  notesCount?: number;
  isLoading?: boolean;
}

export const ConfirmDeleteExam: React.FC<ConfirmDeleteExamProps> = ({
  isOpen,
  onClose,
  onConfirm,
  examTitle,
  notesCount = 0,
  isLoading = false
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-lg font-semibold text-gray-900">
                Supprimer l'examen
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600 mt-3">
            <div className="space-y-2">
              <p>
                Êtes-vous sûr de vouloir supprimer l'examen <strong>"{examTitle}"</strong> ?
              </p>
              
              {notesCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Trash2 className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-red-800">
                        Attention : Cette action supprimera également toutes les notes associées.
                      </p>
                      <p className="text-red-700 mt-1">
                        {notesCount} note{notesCount > 1 ? 's' : ''} sera{notesCount > 1 ? 'nt' : ''} supprimée{notesCount > 1 ? 's' : ''} définitivement.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-red-600 font-medium">
                Cette action est irréversible !
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-100 hover:bg-gray-200"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Suppression...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
