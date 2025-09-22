
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AjoutClasseModal } from "@/components/classes/AjoutClasseModal";

export default function AjoutClasse() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/classes");
  };

  const handleSuccess = () => {
    navigate("/classes");
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Ajouter une classe</h1>
        </div>
        
        <div className="max-w-md">
          <AjoutClasseModal onSuccess={handleSuccess} />
        </div>
      </div>
    </Layout>
  );
}
