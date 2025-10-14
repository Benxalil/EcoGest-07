import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

interface PaymentClassRowProps {
  classId: string;
  className: string;
  elevesPayes: number;
  totalEleves: number;
  onClick: (classId: string, mois: string) => void;
  mois: string;
}

/**
 * Composant mémoïsé pour afficher une ligne de classe avec paiements
 * ✅ Évite les re-renders inutiles avec React.memo
 */
export const PaymentClassRow = React.memo<PaymentClassRowProps>(
  ({ classId, className, elevesPayes, totalEleves, onClick, mois }) => {
    const nonPayes = totalEleves - elevesPayes;

    return (
      <div
        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => onClick(classId, mois)}
      >
        <div className="flex items-center space-x-4">
          <div>
            <h4 className="font-medium">{className}</h4>
            <p className="text-sm text-muted-foreground">
              {elevesPayes}/{totalEleves} élèves payés
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {elevesPayes} payés
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              {nonPayes} non payés
            </Badge>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    );
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    return (
      prevProps.classId === nextProps.classId &&
      prevProps.className === nextProps.className &&
      prevProps.elevesPayes === nextProps.elevesPayes &&
      prevProps.totalEleves === nextProps.totalEleves &&
      prevProps.mois === nextProps.mois
    );
  }
);

PaymentClassRow.displayName = 'PaymentClassRow';
