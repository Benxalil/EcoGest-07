import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

interface ClassRowProps {
  classId: string;
  className: string;
  effectif: number;
  onClick: (classId: string) => void;
}

/**
 * Composant mémoïsé pour afficher une ligne de classe
 * ✅ Évite les re-renders inutiles avec React.memo
 */
export const ClassRow = React.memo<ClassRowProps>(
  ({ classId, className, effectif, onClick }) => {
    return (
      <div
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => onClick(classId)}
      >
        <div className="flex items-center space-x-4">
          <div>
            <h4 className="font-medium">{className}</h4>
            <p className="text-sm text-muted-foreground">{effectif} élèves</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary">{effectif}</Badge>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  },
  // Custom comparison function pour optimiser
  (prevProps, nextProps) => {
    return (
      prevProps.classId === nextProps.classId &&
      prevProps.className === nextProps.className &&
      prevProps.effectif === nextProps.effectif
    );
  }
);

ClassRow.displayName = 'ClassRow';
