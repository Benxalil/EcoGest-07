import React, { memo, useMemo, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { HeaderDarkMode } from "./HeaderDarkMode";
import { HeaderNotifications } from "./HeaderNotifications";
import { HeaderLanguageSelector } from "./HeaderLanguageSelector";
import { UserProfile } from "./UserProfile";
import { SchoolInfo } from "./SchoolInfo";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBlocker } from "@/components/subscription/SubscriptionBlocker";
import { useSchoolData } from "@/hooks/useSchoolData";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  // Sidebar collapse state management with localStorage sync
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  
  const isMobile = useIsMobile();
  const { subscriptionStatus } = useSubscription();
  const { schoolData, refreshSchoolData } = useSchoolData();
  
  // Optimized subscription status check
  const isExpired = useMemo(() => {
    return subscriptionStatus.isExpired; // Blocker uniquement si vraiment expiré
  }, [subscriptionStatus]);

  // Handle sidebar toggle
  const handleSidebarToggle = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
  };

  // Écouter les mises à jour des paramètres de l'école pour rafraîchir en temps réel
  useEffect(() => {
    const handleSchoolUpdate = () => {
      refreshSchoolData();
    };
    
    window.addEventListener('schoolSettingsUpdated', handleSchoolUpdate);
    
    return () => {
      window.removeEventListener('schoolSettingsUpdated', handleSchoolUpdate);
    };
  }, [refreshSchoolData]);

  // Memoized header components to prevent unnecessary re-renders
  const headerContent = useMemo(() => (
    <>
      <HeaderDarkMode />
      <HeaderNotifications />
      <HeaderLanguageSelector />
      <UserProfile />
      <SchoolInfo 
        schoolName={schoolData?.name}
        schoolSlogan={schoolData?.slogan}
        schoolLogo={schoolData?.logo_url}
      />
    </>
  ), [schoolData]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onToggle={handleSidebarToggle} />
      
      {/* Header with responsive positioning based on sidebar state */}
      <header className={`fixed top-0 right-0 z-30 bg-background border-b transition-all duration-200 ${
        isMobile 
          ? 'left-0 px-2 py-1.5 pl-12' 
          : isSidebarCollapsed 
            ? 'left-20 p-4' 
            : 'left-64 p-4'
      } ${isExpired ? 'pt-14' : ''}`}>
        <div className="flex items-center justify-end w-full">
          <div className="flex items-center gap-1 sm:gap-2">
            {headerContent}
          </div>
        </div>
      </header>

      {/* Main content with responsive margins based on sidebar state */}
      <main className={`transition-all duration-200 animate-fade-in ${
        isMobile 
          ? 'ml-0 p-3 pt-12' 
          : isSidebarCollapsed 
            ? 'ml-20 p-8 pt-20' 
            : 'ml-64 p-8 pt-20'
      } ${isExpired ? 'pt-28' : ''}`}>
        {children}
      </main>

      {isExpired && <SubscriptionBlocker />}
    </div>
  );
});

Layout.displayName = 'Layout';

export { Layout };