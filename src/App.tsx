import React, { useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/navigation/ProtectedRoute";
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
    const currentVersion = '2025.10.19-fix-routing'; // 🔄 Fix routing structure
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
        description: "Structure de navigation corrigée",
        duration: 3000,
      });
    }
  }, [toast]);
  
  return (
    <ThemeProvider defaultTheme="system" storageKey="ecogest-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Chargement...</p>
            </div>
          </div>}>
            <Routes>
              {/* Routes publiques */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/inscription" element={<SchoolRegistrationPage />} />
              <Route path="/auth/pending-confirmation" element={<PendingConfirmation />} />
              <Route path="/auth/complete-registration" element={<CompleteRegistration />} />
              <Route path="/auth/email-verified" element={<EmailVerified />} />
              
              {/* Routes protégées */}
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/enseignants" element={<ProtectedRoute><PageListeEnseignants /></ProtectedRoute>} />
              <Route path="/enseignants/modifier" element={<ProtectedRoute><ModifierEnseignant /></ProtectedRoute>} />
              <Route path="/eleves" element={<ProtectedRoute><ListeEleves /></ProtectedRoute>} />
              <Route path="/eleves/mon-profil" element={<ProtectedRoute><MonProfil /></ProtectedRoute>} />
              <Route path="/eleves/profil-enfant" element={<ProtectedRoute><ProfilEnfant /></ProtectedRoute>} />
              <Route path="/eleves/classe/:className" element={<ProtectedRoute><ElevesParClasse /></ProtectedRoute>} />
              <Route path="/eleves/modifier" element={<ProtectedRoute><ModifierEleve /></ProtectedRoute>} />
              <Route path="/classes" element={<ProtectedRoute><ListeClasses /></ProtectedRoute>} />
              <Route path="/classes/modifier" element={<ProtectedRoute><ModifierClasse /></ProtectedRoute>} />
              <Route path="/matieres" element={<ProtectedRoute><ListeMatieres /></ProtectedRoute>} />
              <Route path="/examens" element={<ProtectedRoute><ListeClassesExamens /></ProtectedRoute>} />
              <Route path="/examens/classe/:classeId" element={<ProtectedRoute><ListeExamens /></ProtectedRoute>} />
              <Route path="/examens/:classeId/activites/:activiteId/eleve/:eleveId/notes" element={<ProtectedRoute><ListeElevesNotes /></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><ListeExamensNotes /></ProtectedRoute>} />
              <Route path="/notes/eleves" element={<ProtectedRoute><ListeElevesClasse /></ProtectedRoute>} />
              <Route path="/notes/eleves-notes" element={<ProtectedRoute><NotesParEleve /></ProtectedRoute>} />
              <Route path="/notes/consulter" element={<ProtectedRoute><ConsulterNotes /></ProtectedRoute>} />
              <Route path="/notes/classe/:classeId" element={<ProtectedRoute><ListeMatieresNotes /></ProtectedRoute>} />
              <Route path="/notes/:classeId/matiere/:matiereId/eleves" element={<ProtectedRoute><ListeElevesNotesPage /></ProtectedRoute>} />
              <Route path="/notes/:classeId/matiere/:matiereId/eleve/:eleveId" element={<ProtectedRoute><EvaluerEleve /></ProtectedRoute>} />
              <Route path="/resultats" element={<ProtectedRoute><ListeClassesResultats /></ProtectedRoute>} />
              <Route path="/resultats/mes-resultats" element={<ProtectedRoute><MesResultats /></ProtectedRoute>} />
              <Route path="/resultats/resultats-enfant" element={<ProtectedRoute><ResultatsEnfant /></ProtectedRoute>} />
              <Route path="/resultats/eleve/:studentId/examen/:examId" element={<ProtectedRoute><DetailsResultatEleve /></ProtectedRoute>} />
              <Route path="/resultats/classe/:classeId/semestre/:semestre" element={<ProtectedRoute><ResultatsSemestre /></ProtectedRoute>} />
              <Route path="/resultats/classe/:classeId/examen/:examId" element={<ProtectedRoute><ResultatsSemestre /></ProtectedRoute>} />
              <Route path="/resultats/classe/:classeId/tous" element={<ProtectedRoute><BulletinAnnuel /></ProtectedRoute>} />
              <Route path="/emplois-du-temps" element={<ProtectedRoute><ListeEmplois /></ProtectedRoute>} />
              <Route path="/emplois-du-temps/:classeId" element={<ProtectedRoute><EmploiDuTemps /></ProtectedRoute>} />
              <Route path="/emplois-du-temps/:classeId/cahier-texte" element={<ProtectedRoute><CahierDeTexte /></ProtectedRoute>} />
              <Route path="/absences-retards/:classeId" element={<ProtectedRoute><AbsenceRetardClasse /></ProtectedRoute>} />
              <Route path="/consulter-absences-retards/:classeId" element={<ProtectedRoute><ConsulterAbsencesRetards /></ProtectedRoute>} />
              <Route path="/enregistrer-absence-retard/:classeId" element={<ProtectedRoute><EnregistrerAbsenceRetard /></ProtectedRoute>} />
              <Route path="/matieres-cahier/:classeId" element={<ProtectedRoute><ListeMatieresCahier /></ProtectedRoute>} />
              <Route path="/liste-cahiers-classe/:classeId" element={<ProtectedRoute><ListeCahiersClasse /></ProtectedRoute>} />
              <Route path="/cahier-consultation" element={<ProtectedRoute><ConsultationCahier /></ProtectedRoute>} />
              <Route path="/emplois/cahier/:classeId/:subjectId" element={<ProtectedRoute><ConsultationCahier /></ProtectedRoute>} />
              <Route path="/cahier-de-texte" element={<ProtectedRoute><CahierDeTexte /></ProtectedRoute>} />
              <Route path="/paiements" element={<ProtectedRoute><GestionPaiements /></ProtectedRoute>} />
              <Route path="/paiements/mes-paiements" element={<ProtectedRoute><MesPaiements /></ProtectedRoute>} />
              <Route path="/paiements/paiements-enfant" element={<ProtectedRoute><PaiementsEnfant /></ProtectedRoute>} />
              <Route path="/paiements/classe/:classeId" element={<ProtectedRoute><PaiementsClasse /></ProtectedRoute>} />
              <Route path="/annonces" element={<ProtectedRoute><ListeAnnonces /></ProtectedRoute>} />
              <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
              <Route path="/parametres/ecole" element={<ProtectedRoute><SchoolSettings /></ProtectedRoute>} />
              <Route path="/email-verified" element={<ProtectedRoute><EmailVerified /></ProtectedRoute>} />
              <Route path="/complete-registration" element={<ProtectedRoute><CompleteRegistration /></ProtectedRoute>} />
              <Route path="/abonnement" element={<ProtectedRoute><Abonnement /></ProtectedRoute>} />
              <Route path="/admin/user-migration" element={<ProtectedRoute><UserMigration /></ProtectedRoute>} />
              <Route path="/utilisateurs" element={<ProtectedRoute><Utilisateurs /></ProtectedRoute>} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;