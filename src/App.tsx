import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { StudentRouteHandler } from "@/components/navigation/StudentRouteHandler";
import { ParentRouteHandler } from "@/components/navigation/ParentRouteHandler";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageListeEnseignants from "./pages/enseignants/ListeEnseignants";
import ModifierEnseignant from "./pages/enseignants/ModifierEnseignant";
import ListeEleves from "./pages/eleves/ListeEleves";
import ElevesParClasse from "./pages/eleves/ElevesParClasse";
import ModifierEleve from "./pages/eleves/ModifierEleve";
import MonProfil from "./pages/eleves/MonProfil";
import ProfilEnfant from "./pages/eleves/ProfilEnfant";
import Index from "./pages/Index";
import ListeClasses from "./pages/classes/ListeClasses";
import ModifierClasse from "./pages/classes/ModifierClasse";
import ListeMatieres from "./pages/matieres/ListeMatieres";
import ListeClassesExamens from "./pages/examens/ListeClassesExamens";
import ListeExamens from "./pages/examens/ListeExamens";
import ListeElevesNotes from "./pages/examens/ListeElevesNotes";
import ListeExamensNotes from "./pages/notes/ListeExamensNotes";
import ListeMatieresNotes from "./pages/notes/ListeMatieres";
import ListeElevesNotesPage from "./pages/notes/ListeElevesNotes";
import EvaluerEleve from "./pages/notes/EvaluerEleve";
import NotesParEleve from "./pages/notes/NotesParEleve";
import ListeElevesClasse from "./pages/notes/ListeElevesClasse";
import ConsulterNotes from "./pages/notes/ConsulterNotes";
import ListeClassesResultats from "./pages/resultats/ListeClassesResultats";
import ResultatsSemestre from "./pages/resultats/ResultatsSemestre";
import BulletinAnnuel from "./pages/resultats/BulletinAnnuel";
import MesResultats from "./pages/resultats/MesResultats";
import DetailsResultatEleve from "./pages/resultats/DetailsResultatEleve";
import ListeEmplois from "./pages/emplois/ListeEmplois";
import EmploiDuTemps from "./pages/emplois/EmploiDuTemps";
import CahierDeTexte from "./pages/emplois/CahierDeTexte";
import AbsenceRetardClasse from "./pages/emplois/AbsenceRetardClasse";
import ListeMatieresCahier from "./pages/emplois/ListeMatieresCahier";
import ConsultationCahier from "./pages/emplois/ConsultationCahier";
import ConsulterAbsencesRetards from "./pages/emplois/ConsulterAbsencesRetards";
import EnregistrerAbsenceRetard from "./pages/emplois/EnregistrerAbsenceRetard";
import ListeCahiersClasse from "./pages/emplois/ListeCahiersClasse";
import GestionPaiements from "./pages/paiements/GestionPaiements";
import PaiementsClasse from "./pages/paiements/PaiementsClasse";
import MesPaiements from "./pages/paiements/MesPaiements";
import PaiementsEnfant from "./pages/paiements/PaiementsEnfant";
import ResultatsEnfant from "./pages/resultats/ResultatsEnfant";
import ListeAnnonces from "./pages/annonces/ListeAnnonces";

import Abonnement from "@/pages/abonnement/Abonnement";
import Parametres from "./pages/parametres/Parametres";
import AuthPage from "./pages/auth/AuthPage";
import SchoolRegistrationPage from "./pages/auth/SchoolRegistrationPage";
import CompleteRegistration from "./pages/auth/CompleteRegistration";
import PendingConfirmation from "./pages/auth/PendingConfirmation";
import SchoolSettings from "./pages/admin/SchoolSettings";
import UserMigration from "./pages/admin/UserMigration";
import Utilisateurs from "./pages/utilisateurs/Utilisateurs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ecogest-ui-theme">
      <QueryClientProvider client={queryClient}>
        <Router>
        <AuthenticatedLayout>
          <StudentRouteHandler>
            <ParentRouteHandler>
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
