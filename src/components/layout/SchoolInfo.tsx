import { School } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  const displayName = schoolName || "École Connectée";
  const displaySlogan = schoolSlogan || "Excellence et Innovation";
  const displayLogo = schoolLogo;
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="text-right">
        <h2 className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
          {displayName}
        </h2>
        {!isMobile && (
          <p className="text-xs text-muted-foreground">{displaySlogan}</p>
        )}
      </div>
      <div className="w-12 h-12 bg-background border-2 border-border rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        {displayLogo ? (
          <>
            <img 
              src={displayLogo} 
              alt={`Logo ${displayName}`} 
              className="w-full h-full object-contain p-1"
              width="48"
              height="48"
              loading="eager"
              decoding="async"
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
