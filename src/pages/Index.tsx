
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/OptimizedLayout";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { Users, GraduationCap, School, Calendar, UserPlus, BookOpen, Megaphone, BarChart3, Clock, TrendingUp, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { ExamensStats } from "@/components/examens/ExamensStats";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { TeacherDashboard } from "@/components/dashboard/OptimizedTeacherDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { ParentDashboard } from "@/components/dashboard/ParentDashboard";
import { AjoutEleveModal } from "@/components/eleves/AjoutEleveModal";
import { formatClassName } from "@/utils/classNameFormatter";
import { AjoutEnseignantModal } from "@/components/enseignants/AjoutEnseignantModal";
import { AjoutClasseModal } from "@/components/classes/AjoutClasseModal";
import { AjoutMatiereModal } from "@/components/matieres/AjoutMatiereModal";

// 🚀 Lazy load des composants lourds (charts, recharts)
const ChartContainer = lazy(() => import("@/components/ui/chart").then(m => ({ default: m.ChartContainer })));
const ChartTooltip = lazy(() => import("@/components/ui/chart").then(m => ({ default: m.ChartTooltip })));
const ChartTooltipContent = lazy(() => import("@/components/ui/chart").then(m => ({ default: m.ChartTooltipContent })));
const ChartLegend = lazy(() => import("@/components/ui/chart").then(m => ({ default: m.ChartLegend })));
const ChartLegendContent = lazy(() => import("@/components/ui/chart").then(m => ({ default: m.ChartLegendContent })));

// Lazy load recharts (librairie lourde ~100kb)
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import("recharts").then(m => ({ default: m.Bar })));
const XAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
const PieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import("recharts").then(m => ({ default: m.Pie })));
const Cell = lazy(() => import("recharts").then(m => ({ default: m.Cell })));

// Lazy load PerformanceMonitor (seulement en dev)
const PerformanceMonitor = import.meta.env.DEV 
  ? lazy(() => import("@/components/performance/PerformanceMonitor").then(m => ({ default: m.PerformanceMonitor })))
  : null;
import { CreerAnnonceModal } from "@/components/annonces/CreerAnnonceModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Session } from "@supabase/supabase-js";
import { useDashboardData } from "@/hooks/useDashboardData";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useOptimizedUserData } from "@/hooks/useOptimizedUserData";
import { useTodaySchedules } from "@/hooks/useTodaySchedules";

const stats = [
  {
    title: "Total des étudiants",
    value: "0",
    icon: Users,
    color: "text-blue-500",
  },
  {
    title: "Nombre total d'enseignants",
    value: "0",
    icon: GraduationCap,
    color: "text-green-500",
  },
  {
    title: "Classes actives",
    value: "0",
    icon: School,
    color: "text-purple-500",
  },
  {
    title: "Année Académique",
    value: "2024/2025",
    icon: Calendar,
    color: "text-orange-500",
  },
];

const Index = () => {
  const navigate = useNavigate();
  // Hooks optimisés
  const { profile, loading: userLoading } = useOptimizedUserData();
  const [activeTab, setActiveTab] = useState<"apercu" | "analytique">("apercu");
  const [showMoreSchedules, setShowMoreSchedules] = useState(false);
  
  // Helper pour vérifier le rôle de l'utilisateur
  const isTeacher = profile?.role === 'teacher';
  const isStudent = profile?.role === 'student';
  
  // Hook optimisé pour charger toutes les données en parallèle (uniquement pour admin)
  const { 
    classes, 
    students, 
    teachers, 
    schoolData: schoolSettings, 
    announcements, 
    academicYear, 
    loading: dataLoading, 
    error: dataError,
    refetch
  } = useDashboardData();
  
  // Hook pour récupérer les emplois du temps du jour
  const { schedules: todaySchedules, loading: schedulesLoading, currentDay } = useTodaySchedules();
  
  // État de chargement global
  const isLoading = dataLoading || userLoading;
  
  // État pour les modaux
  const [modals, setModals] = useState({
    eleve: false,
    enseignant: false,
    classe: false,
    matiere: false,
    annonce: false
  });

  const openModal = (modalType: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalType]: true }));
  };

  const closeModal = (modalType: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [modalType]: false }));
  };

  const handleModalSuccess = () => {
    // Recharger les données après succès via le hook optimisé
    refetch();
  };

  // Optimisation avec useMemo pour éviter les recalculs
  const recentAnnouncements = useMemo(() => 
    (announcements || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3), 
    [announcements]
  );
  const urgentAnnouncements = useMemo(() => 
    (announcements || []).filter(announcement => announcement.priority === 'urgent' || announcement.is_urgent), 
    [announcements]
  );


  // Optimisation avec useMemo pour éviter les recalculs
  const recentStudents = useMemo(() => {
    return (students || [])
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || '2024-01-01');
        const dateB = new Date(b.created_at || '2024-01-01');
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  }, [students]);

  // Optimisation avec useMemo pour les statistiques
  const statsData = useMemo(() => [
      {
        title: "Total des étudiants",
        value: (students || []).length.toString(),
        icon: Users,
        color: "text-blue-500",
      },
      {
        title: "Nombre total d'enseignants",
      value: (teachers || []).length.toString(),
        icon: GraduationCap,
        color: "text-green-500",
      },
      {
        title: "Classes actives",
        value: (classes || []).length.toString(),
        icon: School,
        color: "text-purple-500",
      },
      {
        title: "Année Académique",
        value: academicYear,
        icon: Calendar,
        color: "text-orange-500",
      },
  ], [students, teachers, classes, academicYear]);

  // Define helper function first
  const generateMonthlyEnrollment = useMemo(() => (students: any[]) => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return months.map((month, index) => ({
      month,
      inscriptions: Math.floor(Math.random() * 20) + 5
    }));
  }, []);

  // Optimisation avec useMemo pour les données analytiques
  const analyticsData = useMemo(() => ({
    classDistribution: (classes || []).map((classe: any) => ({
      name: formatClassName(classe),
      students: (students || []).filter((s: any) => s.class_id === classe.id).length
    })),
    monthlyEnrollment: generateMonthlyEnrollment(students || []),
    attendanceRate: 85, // Placeholder
    averageGrade: 14.5 // Placeholder
  }), [classes, students, generateMonthlyEnrollment]);

  
  const upcomingAnnouncements = useMemo(() => recentAnnouncements, [recentAnnouncements]);

  // Supprimer les useEffect multiples - les données sont maintenant gérées par useDashboardData

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    // Bonjour de 00h00 à 14h59, Bonsoir de 15h00 à 23h59
    return currentHour < 15 ? "Bonjour" : "Bonsoir";
  };

  const fabActions = [
    {
      icon: UserPlus,
      label: "Ajouter un étudiant",
      onClick: () => openModal("eleve")
    },
    {
      icon: GraduationCap,
      label: "Ajouter un enseignant",
      onClick: () => openModal("enseignant")
    },
    {
      icon: School,
      label: "Ajouter une classe",
      onClick: () => openModal("classe")
    },
    {
      icon: BookOpen,
      label: "Ajouter une matière",
      onClick: () => openModal("matiere")
    },
    {
      icon: Megaphone,
      label: "Créer une annonce",
      onClick: () => openModal("annonce")
    }
  ];

  const displayedSchedules = useMemo(() => 
    showMoreSchedules ? (todaySchedules || []) : (todaySchedules || []).slice(0, 5), 
    [showMoreSchedules, todaySchedules]
  );

  const chartConfig = {
    students: {
      label: "Étudiants",
      color: "hsl(var(--chart-1))",
    },
    inscriptions: {
      label: "Inscriptions",
      color: "hsl(var(--chart-2))",
    },
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Attendre uniquement que le chargement du rôle soit terminé
  if (userLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          {/* Header de bienvenue skeleton */}
          <div className="bg-gray-100 rounded-lg p-6 animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 rounded"></div>
          </div>
          
          {/* Statistiques skeleton */}
          <LoadingSkeleton type="stats" count={4} />
          
          {/* Contenu skeleton */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              <LoadingSkeleton type="list" count={3} />
            </div>
            <div className="space-y-4">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
              <LoadingSkeleton type="list" count={3} />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Dashboard spécifique pour les enseignants - Affichage immédiat sans attendre les données
  if (isTeacher) {
    return (
      <Layout>
        <TeacherDashboard />
      </Layout>
    );
  }

  // Dashboard spécifique pour les élèves
  if (isStudent) {
    return (
      <Layout>
        <StudentDashboard />
      </Layout>
    );
  }

  // Dashboard spécifique pour les parents
  const isParent = profile?.role === 'parent';
  if (isParent) {
    return (
      <Layout>
        <ParentDashboard />
      </Layout>
    );
  }

  // Afficher skeleton si les données sont encore en cours de chargement pour l'admin
  if (dataLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-gray-100 rounded-lg p-6 animate-pulse">
            <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 rounded"></div>
          </div>
          <LoadingSkeleton type="stats" count={4} />
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <LoadingSkeleton type="list" count={3} />
            <LoadingSkeleton type="list" count={3} />
          </div>
        </div>
      </Layout>
    );
  }

  // Dashboard administrateur (par défaut)
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header de bienvenue */}
        <div className="bg-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">{getGreeting()}, {schoolSettings?.name || "École Connectée"} !</h1>
          <p className="text-blue-100">
            Bienvenue dans votre tableau de bord d'administration. Voici ce qui se passe aujourd'hui.
          </p>
        </div>

        {/* Message d'abonnement */}
        <SubscriptionAlert />

        {/* Statistiques */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {statsData.map((stat) => (
            <Card key={stat.title} className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                    {stat.title}
                  </p>
                  <p className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color} flex-shrink-0 ml-2`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex gap-2 sm:gap-6 border-b overflow-x-auto">
          <button 
            className={`pb-2 px-2 font-medium whitespace-nowrap text-sm sm:text-base ${activeTab === "apercu" ? "border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("apercu")}
          >
            Aperçu
          </button>
          <button 
            className={`pb-2 px-2 font-medium whitespace-nowrap text-sm sm:text-base ${activeTab === "analytique" ? "border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("analytique")}
          >
            Analytique
          </button>
        </div>

        {/* Contenu des onglets */}
        {activeTab === "apercu" && (
          <>
            {/* Sections Aperçu */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  <h3 className="font-semibold text-sm sm:text-base">Emploi du temps - {currentDay}</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Classes prévues aujourd'hui
                </p>
                {schedulesLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : displayedSchedules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                    {currentDay === 'Dimanche' ? "Aucun cours prévu le dimanche" : "Aucun cours prévu aujourd'hui"}
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {displayedSchedules.map((schedule, index) => (
                      <div key={schedule.id || index} className="border rounded-lg p-2 sm:p-3 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <h4 className="font-medium text-xs sm:text-sm truncate pr-2">{schedule.className}</h4>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{schedule.courses.length} cours</span>
                        </div>
                        <div className="text-xs space-y-1">
                          {schedule.courses.slice(0, 2).map((course, courseIndex) => (
                            <div key={course.id || courseIndex} className="flex items-center justify-between py-1">
                              <div className="flex-1 min-w-0 pr-2">
                                <span className="font-medium text-foreground">{course.subject}</span>
                                {course.teacher && (
                                  <span className="text-muted-foreground ml-1">• {course.teacher}</span>
                                )}
                              </div>
                              <span className="flex-shrink-0 text-muted-foreground font-medium">
                                {course.startTime} - {course.endTime}
                              </span>
                            </div>
                          ))}
                          {schedule.courses.length > 2 && (
                            <div className="text-center mt-1 pt-1 border-t">
                              <span className="text-xs text-muted-foreground">
                                et {schedule.courses.length - 2} autre{schedule.courses.length - 2 > 1 ? 's' : ''} cours...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {(todaySchedules || []).length > 5 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowMoreSchedules(!showMoreSchedules)}
                        className="w-full text-xs sm:text-sm"
                      >
                        {showMoreSchedules ? "Voir moins" : `Voir plus (${(todaySchedules || []).length - 5} autres)`}
                      </Button>
                    )}
                  </div>
                )}
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                  <h3 className="font-semibold text-sm sm:text-base">5 derniers étudiants</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Étudiants récemment inscrits
                </p>
                {recentStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                    Aucun étudiant récent trouvé
                  </p>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {recentStudents.map((student, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm truncate">{student.first_name} {student.last_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.classes?.name || 'Classe non assignée'}</p>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {new Date(student.created_at || '2024-01-01').toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Section Annonces */}
            <Card className="p-4 sm:p-6 bg-muted/20 border-primary/10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <h3 className="font-semibold text-sm sm:text-base">Annonces et événements</h3>
                </div>
                <Button 
                  variant="ghost" 
                  className="text-primary hover:text-primary/80 text-xs sm:text-sm px-2 sm:px-4"
                  onClick={() => navigate("/annonces")}
                >
                  Voir tout
                </Button>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Mises à jour importantes et événements à venir
              </p>
              {upcomingAnnouncements && upcomingAnnouncements.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                  Aucune annonce ni aucun événement trouvé
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                   {upcomingAnnouncements && upcomingAnnouncements.slice(0, 3).map((announcement, index) => (
                     <div key={index} className="border rounded-lg p-3 bg-white">
                       <div className="flex items-start justify-between mb-2 gap-2">
                         <h4 className="font-medium text-xs sm:text-sm flex-1 min-w-0 pr-2">{announcement.title}</h4>
                          <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                            announcement.priority === 'urgent' || announcement.is_urgent ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {announcement.priority === 'urgent' || announcement.is_urgent ? 'Urgent' : 'Normal'}
                          </span>
                       </div>
                       <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{announcement.content}</p>
                       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-muted-foreground">
                         <span>Publié le: {new Date(announcement.created_at).toLocaleDateString()}</span>
                         <span>Statut: {announcement.is_published ? 'Publié' : 'Brouillon'}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </Card>
          </>
        )}

        {activeTab === "analytique" && (
          <>
            {/* Statistiques d'examens */}
            <ExamensStats classes={classes} />
            
            {/* Graphiques analytiques */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Distribution des étudiants par classe */}
              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <h3 className="font-semibold text-sm sm:text-base">Distribution par classe</h3>
                </div>
                {(classes || []).length > 0 ? (
                  <Suspense fallback={<div className="h-[250px] sm:h-[300px] flex items-center justify-center text-sm text-muted-foreground">Chargement...</div>}>
                    <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(classes || []).map(cls => ({ name: cls.name, students: 0 }))}>
                          <XAxis dataKey="name" fontSize={12} />
                          <YAxis fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="students" fill="var(--color-students)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Suspense>
                ) : (
                  <p className="text-center text-muted-foreground py-12 sm:py-16 text-sm">Aucune donnée disponible</p>
                )}
              </Card>

              {/* Évolution des inscriptions */}
              <Card className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                  <h3 className="font-semibold text-sm sm:text-base">Inscriptions mensuelles</h3>
                </div>
                {(students || []).length > 0 ? (
                  <Suspense fallback={<div className="h-[250px] sm:h-[300px] flex items-center justify-center text-sm text-muted-foreground">Chargement...</div>}>
                    <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { month: 'Jan', inscriptions: 5 },
                          { month: 'Fév', inscriptions: 8 },
                          { month: 'Mar', inscriptions: 12 },
                          { month: 'Avr', inscriptions: 6 },
                          { month: 'Mai', inscriptions: 9 },
                          { month: 'Jun', inscriptions: 7 }
                        ]}>
                          <XAxis dataKey="month" fontSize={12} />
                          <YAxis fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="inscriptions" fill="var(--color-inscriptions)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Suspense>
                ) : (
                  <p className="text-center text-muted-foreground py-12 sm:py-16 text-sm">Aucune donnée disponible</p>
                )}
              </Card>
            </div>

            {/* Métriques de performance */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                      Taux de présence
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-500">
                      95%
                    </p>
                  </div>
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0 ml-2" />
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                      Moyenne générale
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-500">
                      15.5/20
                    </p>
                  </div>
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0 ml-2" />
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                      Classes actives
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-500">
                      {(classes || []).length}
                    </p>
                  </div>
                  <School className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 flex-shrink-0 ml-2" />
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 sm:mb-2 truncate">
                      Cours aujourd'hui
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-orange-500">
                      {todaySchedules.reduce((total, schedule) => total + schedule.courses.length, 0)}
                    </p>
                  </div>
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 flex-shrink-0 ml-2" />
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Floating Action Button */}
        <FloatingActionButton actions={fabActions} />

        {/* Modaux */}
        <AjoutEleveModal 
          open={modals.eleve} 
          onOpenChange={(open) => !open && closeModal("eleve")}
          onSuccess={handleModalSuccess}
        />
        
        <AjoutEnseignantModal 
          open={modals.enseignant} 
          onOpenChange={(open) => !open && closeModal("enseignant")}
          onSuccess={handleModalSuccess}
        />
        
        <Dialog open={modals.classe} onOpenChange={(open) => !open && closeModal("classe")}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une classe</DialogTitle>
            </DialogHeader>
            <AjoutClasseModal onSuccess={handleModalSuccess} />
          </DialogContent>
        </Dialog>
        
        <AjoutMatiereModal 
          open={modals.matiere} 
          onOpenChange={(open) => !open && closeModal("matiere")}
          onSuccess={handleModalSuccess}
        />
        
        <CreerAnnonceModal 
          open={modals.annonce} 
          onOpenChange={(open) => !open && closeModal("annonce")}
        />
      </div>
    </Layout>
  );
};

export default Index;
