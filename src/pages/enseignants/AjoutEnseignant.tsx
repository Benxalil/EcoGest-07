
import { Layout } from "@/components/layout/Layout";
import { AjoutEnseignantForm } from "@/components/enseignants/AjoutEnseignantForm";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AjoutEnseignant() {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/enseignants');
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoBack}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Ajouter un enseignant</h1>
        </div>
        <AjoutEnseignantForm onSuccess={handleGoBack} />
      </div>
    </Layout>
  );
}
