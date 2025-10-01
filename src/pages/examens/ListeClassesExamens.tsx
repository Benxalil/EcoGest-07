
import React, { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ExamensStats } from "@/components/examens/ExamensStats";
import { CreerExamenModal } from "@/components/examens/CreerExamenModal";
import { ListeExamens } from "@/components/examens/ListeExamens";
import { useClasses } from "@/hooks/useClasses";
import { useExams } from "@/hooks/useExams";

interface Classe {
  id: string;
  session: string;
  libelle: string;
  effectif: number;
}

export default function ListeClassesExamens() {
  const navigate = useNavigate();
  const { classes, loading } = useClasses();
  const { exams, loading: examsLoading, createExam, updateExam, deleteExam, refreshExams } = useExams();

  const handleExamenCreated = () => {
    // Rafraîchir la liste des examens automatiquement
    refreshExams();
  };

  const handleClasseClick = (classe: any) => {
    navigate(`/examens/classe/${classe.id}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Chargement des classes...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Si aucune classe n'a été créée
  if (classes.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-primary">Les activités par classe</h1>
            </div>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">Aucune classe n'a été créée</p>
            <p className="text-gray-400 mb-6">Commencez par créer des classes pour gérer les examens</p>
            <Button onClick={() => navigate("/classes/ajouter")}>
              Créer une classe
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">Examens</h1>
              <p className="text-gray-600 text-sm">Gérer les examens et les évaluations</p>
            </div>
          </div>
          <CreerExamenModal 
            createExam={createExam}
            onExamenCreated={handleExamenCreated} 
          />
        </div>

        {/* Blocs d'information statistiques */}
        <ExamensStats classes={classes} />

        {/* Liste des examens */}
        <ListeExamens 
          exams={exams}
          loading={examsLoading}
          updateExam={updateExam}
          deleteExam={deleteExam}
          refreshExams={refreshExams}
        />
      </div>
    </Layout>
  );
}
