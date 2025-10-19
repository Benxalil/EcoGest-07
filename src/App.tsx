import React, { useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { StudentRouteHandler } from "@/components/navigation/StudentRouteHandler";
import { ParentRouteHandler } from "@/components/navigation/ParentRouteHandler";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import { lazyWithPrefetch } from "@/utils/routePrefetch";

// ✅ Pages critiques - chargement immédiat
import Index from "./pages/Index";
import AuthPage from "./pages/auth/AuthPage";
import SchoolRegistrationPage from "./pages/auth/SchoolRegistrationPage";
import CompleteRegistration from "./pages/auth/CompleteRegistration";
import PendingConfirmation from "./pages/auth/PendingConfirmation";
import EmailVerified from "./pages/auth/EmailVerified";

// ✅ Pages secondaires - chargement lazy avec prefetch intelligent
const PageListeEnseignants = lazyWithPrefetch(() => import("./pages/enseignants/ListeEnseignants"), 'idle');
const ModifierEnseignant = lazyWithPrefetch(() => import("./pages/enseignants/ModifierEnseignant"), 'idle');
const ListeEleves = lazyWithPrefetch(() => import("./pages/eleves/ListeEleves"), 'idle');
const ElevesParClasse = lazyWithPrefetch(() => import("./pages/eleves/ElevesParClasse"), 'idle');
const ModifierEleve = lazyWithPrefetch(() => import("./pages/eleves/ModifierEleve"), 'idle');
const MonProfil = lazyWithPrefetch(() => import("./pages/eleves/MonProfil"), 'idle');
const ProfilEnfant = lazyWithPrefetch(() => import("./pages/eleves/ProfilEnfant"), 'idle');
const ListeClasses = lazyWithPrefetch(() => import("./pages/classes/ListeClasses"), 'idle');
const ModifierClasse = lazyWithPrefetch(() => import("./pages/classes/ModifierClasse"), 'idle');
const ListeMatieres = lazyWithPrefetch(() => import("./pages/matieres/ListeMatieres"), 'idle');
const ListeClassesExamens = lazyWithPrefetch(() => import("./pages/examens/ListeClassesExamens"), 'idle');
const ListeExamens = lazyWithPrefetch(() => import("./pages/examens/ListeExamens"), 'idle');
const ListeElevesNotes = lazyWithPrefetch(() => import("./pages/examens/ListeElevesNotes"), 'idle');
const ListeExamensNotes = lazyWithPrefetch(() => import("./pages/notes/ListeExamensNotes"), 'idle');
const ListeMatieresNotes = lazyWithPrefetch(() => import("./pages/notes/ListeMatieres"), 'idle');
const ListeElevesNotesPage = lazyWithPrefetch(() => import("./pages/notes/ListeElevesNotes"), 'idle');
const EvaluerEleve = lazyWithPrefetch(() => import("./pages/notes/EvaluerEleve"), 'idle');
const NotesParEleve = lazyWithPrefetch(() => import("./pages/notes/NotesParEleve"), 'idle');
const ListeElevesClasse = lazyWithPrefetch(() => import("./pages/notes/ListeElevesClasse"), 'idle');
const ConsulterNotes = lazyWithPrefetch(() => import("./pages/notes/ConsulterNotes"), 'idle');
const ListeClassesResultats = lazyWithPrefetch(() => import("./pages/resultats/ListeClassesResultats"), 'idle');
const ResultatsSemestre = lazyWithPrefetch(() => import("./pages/resultats/ResultatsSemestre"), 'idle');
const BulletinAnnuel = lazyWithPrefetch(() => import("./pages/resultats/BulletinAnnuel"), 'idle');
const MesResultats = lazyWithPrefetch(() => import("./pages/resultats/MesResultats"), 'idle');
const DetailsResultatEleve = lazyWithPrefetch(() => import("./pages/resultats/DetailsResultatEleve"), 'idle');
const ListeEmplois = lazyWithPrefetch(() => import("./pages/emplois/ListeEmplois"), 'idle');
const EmploiDuTemps = lazyWithPrefetch(() => import("./pages/emplois/EmploiDuTemps"), 'idle');
const CahierDeTexte = lazyWithPrefetch(() => import("./pages/emplois/CahierDeTexte"), 'idle');
const AbsenceRetardClasse = lazyWithPrefetch(() => import("./pages/emplois/AbsenceRetardClasse"), 'idle');
const ListeMatieresCahier = lazyWithPrefetch(() => import("./pages/emplois/ListeMatieresCahier"), 'idle');
const ConsultationCahier = lazyWithPrefetch(() => import("./pages/emplois/ConsultationCahier"), 'idle');
const ConsulterAbsencesRetards = lazyWithPrefetch(() => import("./pages/emplois/ConsulterAbsencesRetards"), 'idle');
const EnregistrerAbsenceRetard = lazyWithPrefetch(() => import("./pages/emplois/EnregistrerAbsenceRetard"), 'idle');
const ListeCahiersClasse = lazyWithPrefetch(() => import("./pages/emplois/ListeCahiersClasse"), 'idle');
const GestionPaiements = lazyWithPrefetch(() => import("./pages/paiements/GestionPaiements"), 'idle');
const PaiementsClasse = lazyWithPrefetch(() => import("./pages/paiements/PaiementsClasse"), 'idle');
const MesPaiements = lazyWithPrefetch(() => import("./pages/paiements/MesPaiements"), 'idle');
const PaiementsEnfant = lazyWithPrefetch(() => import("./pages/paiements/PaiementsEnfant"), 'idle');
const ResultatsEnfant = lazyWithPrefetch(() => import("./pages/resultats/ResultatsEnfant"), 'idle');
const ListeAnnonces = lazyWithPrefetch(() => import("./pages/annonces/ListeAnnonces"), 'idle');
const Abonnement = lazyWithPrefetch(() => import("@/pages/abonnement/Abonnement"), 'idle');
const Parametres = lazyWithPrefetch(() => import("./pages/parametres/Parametres"), 'idle');
const SchoolSettings = lazyWithPrefetch(() => import("./pages/admin/SchoolSettings"), 'idle');
const UserMigration = lazyWithPrefetch(() => import("./pages/admin/UserMigration"), 'idle');
const Utilisateurs = lazyWithPrefetch(() => import("./pages/utilisateurs/Utilisateurs"), 'idle');

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
    const currentVersion = '2025.10.19-cleanup-v2'; // 🔄 Forcer rechargement complet après nettoyage
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
      
      // Forcer le rechargement du service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });
      }
      
      // Mettre à jour la version
      localStorage.setItem('app_version', currentVersion);
      
      toast({
        title: "🔄 Mise à jour appliquée",
        description: "Application nettoyée et optimisée",
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
          <Route path="/email-verified" element={<EmailVerified />} />
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
