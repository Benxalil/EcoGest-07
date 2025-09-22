import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, CheckCircle } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon, iconBgColor }) => (
  <Card className="bg-white border border-gray-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      <div className={`h-8 w-8 rounded-lg ${iconBgColor} flex items-center justify-center`}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </CardContent>
  </Card>
);

interface ExamensStatsProps {
  classes: any[];
}

export const ExamensStats: React.FC<ExamensStatsProps> = ({ classes }) => {
  // Remplacé par hook Supabase - plus de localStorage
  // Les examens sont maintenant gérés par useExams hook
  const examens: any[] = []; // Placeholder temporaire
  const totalExamens = examens.length;
  
  // Date actuelle pour les comparaisons
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
  
  // Examens prévus : dont la date est supérieure à aujourd'hui
  const examensPrevu = examens.filter((e: any) => {
    if (!e.dateExamen) return false;
    const examDate = new Date(e.dateExamen);
    examDate.setHours(0, 0, 0, 0);
    return examDate > today;
  }).length;
  
  // Examens passés : dont la date est inférieure ou égale à aujourd'hui
  const examensPassés = examens.filter((e: any) => {
    if (!e.dateExamen) return false;
    const examDate = new Date(e.dateExamen);
    examDate.setHours(0, 0, 0, 0);
    return examDate <= today;
  }).length;

  const stats = [
    {
      title: "Total des examens",
      value: totalExamens,
      subtitle: "Tous les temps",
      icon: <BookOpen className="h-4 w-4 text-blue-600" />,
      iconBgColor: "bg-blue-50"
    },
    {
      title: "Prévus",
      value: examensPrevu,
      subtitle: "Examens à venir",
      icon: <Calendar className="h-4 w-4 text-orange-600" />,
      iconBgColor: "bg-orange-50"
    },
    {
      title: "Examens passés",
      value: examensPassés,
      subtitle: "Examens terminés",
      icon: <CheckCircle className="h-4 w-4 text-green-600" />,
      iconBgColor: "bg-green-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          subtitle={stat.subtitle}
          icon={stat.icon}
          iconBgColor={stat.iconBgColor}
        />
      ))}
    </div>
  );
};