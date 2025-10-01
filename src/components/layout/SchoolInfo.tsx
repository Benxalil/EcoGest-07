import { School } from "lucide-react";

interface SchoolInfoProps {
  schoolName?: string;
  schoolLogo?: string;
  schoolSlogan?: string;
  className?: string;
}

export function SchoolInfo({ 
  schoolName, 
  schoolLogo,
  schoolSlogan,
  className = "" 
}: SchoolInfoProps) {
  const displayName = schoolName || "École Connectée";
  const displaySlogan = schoolSlogan || "Excellence et Innovation";
  const displayLogo = schoolLogo;
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
