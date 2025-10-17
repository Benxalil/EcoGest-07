import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { StudentRouteHandler } from "@/components/navigation/StudentRouteHandler";
import { ParentRouteHandler } from "@/components/navigation/ParentRouteHandler";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";

// ✅ Pages critiques - chargement immédiat
import Index from "./pages/Index";
import AuthPage from "./pages/auth/AuthPage";
import SchoolRegistrationPage from "./pages/auth/SchoolRegistrationPage";
import CompleteRegistration from "./pages/auth/CompleteRegistration";
import PendingConfirmation from "./pages/auth/PendingConfirmation";

// ✅ Pages secondaires - chargement lazy
const PageListeEnseignants = lazy(() => import("./pages/enseignants/ListeEnseignants"));
const ModifierEnseignant = lazy(() => import("./pages/enseignants/ModifierEnseignant"));
const ListeEleves = lazy(() => import("./pages/eleves/ListeEleves"));
const ElevesParClasse = lazy(() => import("./pages/eleves/ElevesParClasse"));
const ModifierEleve = lazy(() => import("./pages/eleves/ModifierEleve"));
const MonProfil = lazy(() => import("./pages/eleves/MonProfil"));
const ProfilEnfant = lazy(() => import("./pages/eleves/ProfilEnfant"));
const ListeClasses = lazy(() => import("./pages/classes/ListeClasses"));
const ModifierClasse = lazy(() => import("./pages/classes/ModifierClasse"));
const ListeMatieres = lazy(() => import("./pages/matieres/ListeMatieres"));
const ListeClassesExamens = lazy(() => import("./pages/examens/ListeClassesExamens"));
const ListeExamens = lazy(() => import("./pages/examens/ListeExamens"));
const ListeElevesNotes = lazy(() => import("./pages/examens/ListeElevesNotes"));
const ListeExamensNotes = lazy(() => import("./pages/notes/ListeExamensNotes"));
const ListeMatieresNotes = lazy(() => import("./pages/notes/ListeMatieres"));
const ListeElevesNotesPage = lazy(() => import("./pages/notes/ListeElevesNotes"));
const EvaluerEleve = lazy(() => import("./pages/notes/EvaluerEleve"));
const NotesParEleve = lazy(() => import("./pages/notes/NotesParEleve"));
const ListeElevesClasse = lazy(() => import("./pages/notes/ListeElevesClasse"));
const ConsulterNotes = lazy(() => import("./pages/notes/ConsulterNotes"));
const ListeClassesResultats = lazy(() => import("./pages/resultats/ListeClassesResultats"));
const ResultatsSemestre = lazy(() => import("./pages/resultats/ResultatsSemestre"));
const BulletinAnnuel = lazy(() => import("./pages/resultats/BulletinAnnuel"));
const MesResultats = lazy(() => import("./pages/resultats/MesResultats"));
const DetailsResultatEleve = lazy(() => import("./pages/resultats/DetailsResultatEleve"));
const ListeEmplois = lazy(() => import("./pages/emplois/ListeEmplois"));
const EmploiDuTemps = lazy(() => import("./pages/emplois/EmploiDuTemps"));
const CahierDeTexte = lazy(() => import("./pages/emplois/CahierDeTexte"));
const AbsenceRetardClasse = lazy(() => import("./pages/emplois/AbsenceRetardClasse"));
const ListeMatieresCahier = lazy(() => import("./pages/emplois/ListeMatieresCahier"));
const ConsultationCahier = lazy(() => import("./pages/emplois/ConsultationCahier"));
const ConsulterAbsencesRetards = lazy(() => import("./pages/emplois/ConsulterAbsencesRetards"));
const EnregistrerAbsenceRetard = lazy(() => import("./pages/emplois/EnregistrerAbsenceRetard"));
const ListeCahiersClasse = lazy(() => import("./pages/emplois/ListeCahiersClasse"));
const GestionPaiements = lazy(() => import("./pages/paiements/GestionPaiements"));
const PaiementsClasse = lazy(() => import("./pages/paiements/PaiementsClasse"));
const MesPaiements = lazy(() => import("./pages/paiements/MesPaiements"));
const PaiementsEnfant = lazy(() => import("./pages/paiements/PaiementsEnfant"));
const ResultatsEnfant = lazy(() => import("./pages/resultats/ResultatsEnfant"));
const ListeAnnonces = lazy(() => import("./pages/annonces/ListeAnnonces"));
const Abonnement = lazy(() => import("@/pages/abonnement/Abonnement"));
const Parametres = lazy(() => import("./pages/parametres/Parametres"));
const SchoolSettings = lazy(() => import("./pages/admin/SchoolSettings"));
const UserMigration = lazy(() => import("./pages/admin/UserMigration"));
const Utilisateurs = lazy(() => import("./pages/utilisateurs/Utilisateurs"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

function App() {
  const { toast } = useToast();
  
  // 🔄 Système de détection de nouvelle version et nettoyage automatique des caches
  useEffect(() => {
    const currentVersion = '2025.10.16-22:15';
    const lastVersion = localStorage.getItem('app_version');
    
    if (lastVersion !== currentVersion) {
      console.log('🔄 Nouvelle version détectée, vidage du cache...');
      
      // Vider les caches React Query
      queryClient.clear();
      
      // Vider les caches personnalisés (cache_, optimized_, etc.)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_') || key.startsWith('optimized_') || key.startsWith('prefetch_')) {
          localStorage.removeItem(key);
          console.log(`🗑️ Cache supprimé: ${key}`);
        }
      });
      
      // Mettre à jour la version
      localStorage.setItem('app_version', currentVersion);
      
      toast({
        title: "🔄 Mise à jour appliquée",
        description: "L'application a été mise à jour avec les dernières modifications",
        duration: 3000,
      });
    }
  }, [toast]);
  
  return (
    <ThemeProvider defaultTheme="system" storageKey="ecogest-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
        <AuthenticatedLayout>
          <StudentRouteHandler>
            <ParentRouteHandler>
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/enseignants" element={<PageListeEnseignants />} />
            <Route path="/enseignants/modifier" element={<ModifierEnseignant />} />
            <Route path="/eleves" element={<ListeEleves />} />
            <Route path="/eleves/mon-profil" element={<MonProfil />} />
            <Route path="/eleves/profil-enfant" element={<ProfilEnfant />} />
            <Route path="/eleves/classe/:className" element={<ElevesParClasse />} />
            <Route path="/eleves/modifier" element={<ModifierEleve />} />
            <Route path="/classes" element={<ListeClasses />} />
            <Route path="/classes/modifier" element={<ModifierClasse />} />
            <Route path="/matieres" element={<ListeMatieres />} />
            <Route path="/examens" element={<ListeClassesExamens />} />
            <Route path="/examens/classe/:classeId" element={<ListeExamens />} />
            <Route path="/examens/:classeId/activites/:activiteId/eleve/:eleveId/notes" element={<ListeElevesNotes />} />
            <Route path="/notes" element={<ListeExamensNotes />} />
            <Route path="/notes/eleves" element={<ListeElevesClasse />} />
            <Route path="/notes/eleves-notes" element={<NotesParEleve />} />
            <Route path="/notes/consulter" element={<ConsulterNotes />} />
            <Route path="/notes/classe/:classeId" element={<ListeMatieresNotes />} />
            <Route path="/notes/:classeId/matiere/:matiereId/eleves" element={<ListeElevesNotesPage />} />
            <Route path="/notes/:classeId/matiere/:matiereId/eleve/:eleveId" element={<EvaluerEleve />} />
            <Route path="/resultats" element={<ListeClassesResultats />} />
            <Route path="/resultats/mes-resultats" element={<MesResultats />} />
            <Route path="/resultats/resultats-enfant" element={<ResultatsEnfant />} />
            <Route path="/resultats/eleve/:studentId/examen/:examId" element={<DetailsResultatEleve />} />
            <Route path="/resultats/classe/:classeId/semestre/:semestre" element={<ResultatsSemestre />} />
            <Route path="/resultats/classe/:classeId/examen/:examId" element={<ResultatsSemestre />} />
            <Route path="/resultats/classe/:classeId/tous" element={<BulletinAnnuel />} />
            <Route path="/emplois-du-temps" element={<ListeEmplois />} />
            <Route path="/emplois-du-temps/:classeId" element={<EmploiDuTemps />} />
            <Route path="/emplois-du-temps/:classeId/cahier-texte" element={<CahierDeTexte />} />
            <Route path="/absences-retards/:classeId" element={<AbsenceRetardClasse />} />
            <Route path="/consulter-absences-retards/:classeId" element={<ConsulterAbsencesRetards />} />
            <Route path="/enregistrer-absence-retard/:classeId" element={<EnregistrerAbsenceRetard />} />
            <Route path="/matieres-cahier/:classeId" element={<ListeMatieresCahier />} />
            <Route path="/liste-cahiers-classe/:classeId" element={<ListeCahiersClasse />} />
            <Route path="/cahier-consultation" element={<ConsultationCahier />} />
            <Route path="/emplois/cahier/:classeId/:subjectId" element={<ConsultationCahier />} />
            <Route path="/cahier-de-texte" element={<CahierDeTexte />} />
            <Route path="/paiements" element={<GestionPaiements />} />
            <Route path="/paiements/mes-paiements" element={<MesPaiements />} />
            <Route path="/paiements/paiements-enfant" element={<PaiementsEnfant />} />
            <Route path="/paiements/classe/:classeId" element={<PaiementsClasse />} />
            <Route path="/annonces" element={<ListeAnnonces />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="/parametres/ecole" element={<SchoolSettings />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/inscription" element={<SchoolRegistrationPage />} />
          <Route path="/auth/pending-confirmation" element={<PendingConfirmation />} />
          <Route path="/complete-registration" element={<CompleteRegistration />} />
          <Route path="/abonnement" element={<Abonnement />} />
          <Route path="/admin/user-migration" element={<UserMigration />} />
          <Route path="/utilisateurs" element={<Utilisateurs />} />
            </Routes>
              </Suspense>
            </ParentRouteHandler>
          </StudentRouteHandler>
        </AuthenticatedLayout>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
