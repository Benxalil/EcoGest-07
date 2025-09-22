import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ListeEnseignants } from "@/components/enseignants/ListeEnseignants";
import { ModifierEnseignantForm } from "@/components/enseignants/ModifierEnseignantForm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function PageListeEnseignants() {
  const [selectedEnseignant, setSelectedEnseignant] = useState<any>(null);

  const handleClose = () => {
    setSelectedEnseignant(null);
  };

  return (
    <Layout>
      <ListeEnseignants onEdit={setSelectedEnseignant} />

      <Sheet 
        open={selectedEnseignant !== null} 
        onOpenChange={(open) => !open && handleClose()}
      >
        <SheetContent className="w-[90%] sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Modifier l'enseignant</SheetTitle>
          </SheetHeader>
          {selectedEnseignant && (
            <ModifierEnseignantForm
              enseignant={selectedEnseignant}
              onClose={handleClose}
            />
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}