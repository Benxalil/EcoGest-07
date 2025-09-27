import React, { memo, useMemo } from "react";
import { Sidebar } from "./Sidebar";
import { HeaderDarkMode } from "./HeaderDarkMode";
import { HeaderNotifications } from "./HeaderNotifications";
import { HeaderLanguageSelector } from "./HeaderLanguageSelector";
import { UserProfile } from "./UserProfile";
import { SchoolInfo } from "./SchoolInfo";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionBlocker } from "@/components/subscription/SubscriptionBlocker";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = memo(({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const { subscriptionStatus } = useSubscription();
  
  // Optimized subscription status check
  const isExpired = useMemo(() => {
    return subscriptionStatus.isExpired || subscriptionStatus.showWarning;
  }, [subscriptionStatus]);

  // Memoized header components to prevent unnecessary re-renders
  const headerContent = useMemo(() => (
    <>
      <HeaderDarkMode />
      <HeaderNotifications />
      <HeaderLanguageSelector />
      <UserProfile />
      <SchoolInfo />
    </>
  ), []);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-14 items-center justify-end space-x-4 px-4">
            {headerContent}
          </div>
        </header>
        
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      {isExpired && <SubscriptionBlocker />}
    </div>
  );
});

Layout.displayName = 'Layout';

export { Layout };