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
        <h2 className="text-sm font-semibold text-foreground">{displayName}</h2>
        <p className="text-xs text-muted-foreground">{displaySlogan}</p>
      </div>
      <div className="w-12 h-12 bg-background border-2 border-border rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        {displayLogo ? (
          <>
            <img 
              src={displayLogo} 
              alt={`Logo ${displayName}`} 
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                console.error('Erreur chargement logo:', displayLogo);
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('logo-error');
              }}
            />
            <School className="w-6 h-6 text-primary hidden [.logo-error_&]:block" />
          </>
        ) : (
          <School className="w-6 h-6 text-primary" />
        )}
      </div>
    </div>
  );
}
