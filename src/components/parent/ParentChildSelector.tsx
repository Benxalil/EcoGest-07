import { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { User } from 'lucide-react';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  classes?: {
    name: string;
    level: string;
    section: string | null;
  };
}

interface ParentChildSelectorProps {
  children: Child[];
  selectedChildId: string | null;
  onChildSelect: (childId: string) => void;
}

export const ParentChildSelector = memo(({ children, selectedChildId, onChildSelect }: ParentChildSelectorProps) => {
  // Si un seul enfant, ne pas afficher le sélecteur
  if (children.length <= 1) {
    return null;
  }

  const getChildDisplayName = (child: Child) => {
    const fullName = `${child.first_name} ${child.last_name}`;
    if (child.classes) {
      return `${fullName} - ${child.classes.name} ${child.classes.level}`;
    }
    return fullName;
  };

  return (
    <Card className="p-4 mb-6 bg-primary/5 border-primary/20">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Sélectionner un élève
          </label>
          <Select value={selectedChildId || undefined} onValueChange={onChildSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un élève" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {getChildDisplayName(child)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
});

ParentChildSelector.displayName = 'ParentChildSelector';
