
import { School } from "lucide-react";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useEffect } from "react";

interface SchoolInfoProps {
  schoolName?: string;
  schoolLogo?: string;
  className?: string;
}

export function SchoolInfo({ 
  schoolName, 
  schoolLogo, 
  className = "" 
}: SchoolInfoProps) {
  const { schoolData, refreshSchoolData } = useSchoolData();

  // Écouter les mises à jour des paramètres d'école
  useEffect(() => {
    const handleSchoolSettingsUpdate = () => {
      refreshSchoolData();
    };

    window.addEventListener('schoolSettingsUpdated', handleSchoolSettingsUpdate);
    
    return () => {
      window.removeEventListener('schoolSettingsUpdated', handleSchoolSettingsUpdate);
    };
  }, [refreshSchoolData]);

  const displayName = schoolName || schoolData.name || "École Connectée";
  const displaySlogan = schoolData.slogan || "Excellence et Innovation";
  const displayLogo = schoolLogo || schoolData.logo_url;
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="text-right">
        <h2 className="text-sm font-semibold text-gray-900">{displayName}</h2>
        <p className="text-xs text-gray-500">{displaySlogan}</p>
      </div>
      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
        {displayLogo ? (
          <img 
            src={displayLogo} 
            alt={`Logo ${displayName}`} 
            className="w-8 h-8 object-contain rounded-md"
          />
        ) : (
          <School className="w-6 h-6 text-white" />
        )}
      </div>
    </div>
  );
}
