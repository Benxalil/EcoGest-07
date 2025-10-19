import React, { useEffect, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import { StudentRouteHandler } from "@/components/navigation/StudentRouteHandler";
import { ParentRouteHandler } from "@/components/navigation/ParentRouteHandler";
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

// Wrapper pour les routes protégées
const Protected = ({ children }: { children: React.ReactNode }) => (
  <AuthenticatedLayout>
    <StudentRouteHandler>
      <ParentRouteHandler>
        {children}
      </ParentRouteHandler>
    </StudentRouteHandler>
  </AuthenticatedLayout>
);

function App() {
  const { toast } = useToast();
  
  // 🔄 Système de détection de nouvelle version et nettoyage automatique des caches
  useEffect(() => {
    const currentVersion = '2025.10.19-routing-fix-v2'; // 🔄 Routing corrigé v2
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
        description: "Navigation corrigée avec succès",
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
              <Route path="/" element={<Protected><Index /></Protected>} />
              <Route path="/enseignants" element={<Protected><PageListeEnseignants /></Protected>} />
              <Route path="/enseignants/modifier" element={<Protected><ModifierEnseignant /></Protected>} />
              <Route path="/eleves" element={<Protected><ListeEleves /></Protected>} />
              <Route path="/eleves/mon-profil" element={<Protected><MonProfil /></Protected>} />
              <Route path="/eleves/profil-enfant" element={<Protected><ProfilEnfant /></Protected>} />
              <Route path="/eleves/classe/:className" element={<Protected><ElevesParClasse /></Protected>} />
              <Route path="/eleves/modifier" element={<Protected><ModifierEleve /></Protected>} />
              <Route path="/classes" element={<Protected><ListeClasses /></Protected>} />
              <Route path="/classes/modifier" element={<Protected><ModifierClasse /></Protected>} />
              <Route path="/matieres" element={<Protected><ListeMatieres /></Protected>} />
              <Route path="/examens" element={<Protected><ListeClassesExamens /></Protected>} />
              <Route path="/examens/classe/:classeId" element={<Protected><ListeExamens /></Protected>} />
              <Route path="/examens/:classeId/activites/:activiteId/eleve/:eleveId/notes" element={<Protected><ListeElevesNotes /></Protected>} />
              <Route path="/notes" element={<Protected><ListeExamensNotes /></Protected>} />
              <Route path="/notes/eleves" element={<Protected><ListeElevesClasse /></Protected>} />
              <Route path="/notes/eleves-notes" element={<Protected><NotesParEleve /></Protected>} />
              <Route path="/notes/consulter" element={<Protected><ConsulterNotes /></Protected>} />
              <Route path="/notes/classe/:classeId" element={<Protected><ListeMatieresNotes /></Protected>} />
              <Route path="/notes/:classeId/matiere/:matiereId/eleves" element={<Protected><ListeElevesNotesPage /></Protected>} />
              <Route path="/notes/:classeId/matiere/:matiereId/eleve/:eleveId" element={<Protected><EvaluerEleve /></Protected>} />
              <Route path="/resultats" element={<Protected><ListeClassesResultats /></Protected>} />
              <Route path="/resultats/mes-resultats" element={<Protected><MesResultats /></Protected>} />
              <Route path="/resultats/resultats-enfant" element={<Protected><ResultatsEnfant /></Protected>} />
              <Route path="/resultats/eleve/:studentId/examen/:examId" element={<Protected><DetailsResultatEleve /></Protected>} />
              <Route path="/resultats/classe/:classeId/semestre/:semestre" element={<Protected><ResultatsSemestre /></Protected>} />
              <Route path="/resultats/classe/:classeId/examen/:examId" element={<Protected><ResultatsSemestre /></Protected>} />
              <Route path="/resultats/classe/:classeId/tous" element={<Protected><BulletinAnnuel /></Protected>} />
              <Route path="/emplois-du-temps" element={<Protected><ListeEmplois /></Protected>} />
              <Route path="/emplois-du-temps/:classeId" element={<Protected><EmploiDuTemps /></Protected>} />
              <Route path="/emplois-du-temps/:classeId/cahier-texte" element={<Protected><CahierDeTexte /></Protected>} />
              <Route path="/absences-retards/:classeId" element={<Protected><AbsenceRetardClasse /></Protected>} />
              <Route path="/consulter-absences-retards/:classeId" element={<Protected><ConsulterAbsencesRetards /></Protected>} />
              <Route path="/enregistrer-absence-retard/:classeId" element={<Protected><EnregistrerAbsenceRetard /></Protected>} />
              <Route path="/matieres-cahier/:classeId" element={<Protected><ListeMatieresCahier /></Protected>} />
              <Route path="/liste-cahiers-classe/:classeId" element={<Protected><ListeCahiersClasse /></Protected>} />
              <Route path="/cahier-consultation" element={<Protected><ConsultationCahier /></Protected>} />
              <Route path="/emplois/cahier/:classeId/:subjectId" element={<Protected><ConsultationCahier /></Protected>} />
              <Route path="/cahier-de-texte" element={<Protected><CahierDeTexte /></Protected>} />
              <Route path="/paiements" element={<Protected><GestionPaiements /></Protected>} />
              <Route path="/paiements/mes-paiements" element={<Protected><MesPaiements /></Protected>} />
              <Route path="/paiements/paiements-enfant" element={<Protected><PaiementsEnfant /></Protected>} />
              <Route path="/paiements/classe/:classeId" element={<Protected><PaiementsClasse /></Protected>} />
              <Route path="/annonces" element={<Protected><ListeAnnonces /></Protected>} />
              <Route path="/parametres" element={<Protected><Parametres /></Protected>} />
              <Route path="/parametres/ecole" element={<Protected><SchoolSettings /></Protected>} />
              <Route path="/email-verified" element={<Protected><EmailVerified /></Protected>} />
              <Route path="/complete-registration" element={<Protected><CompleteRegistration /></Protected>} />
              <Route path="/abonnement" element={<Protected><Abonnement /></Protected>} />
              <Route path="/admin/user-migration" element={<Protected><UserMigration /></Protected>} />
              <Route path="/utilisateurs" element={<Protected><Utilisateurs /></Protected>} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;