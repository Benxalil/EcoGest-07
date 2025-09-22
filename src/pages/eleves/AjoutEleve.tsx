import { Layout } from "@/components/layout/Layout";
import { AjoutEleveForm } from "@/components/eleves/AjoutEleveForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AjoutEleve() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/eleves");
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
          <h1 className="text-3xl font-bold">Ajouter un élève</h1>
        </div>
        <AjoutEleveForm />
      </div>
    </Layout>
  );
}