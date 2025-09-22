import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X, UserPlus, GraduationCap, School, BookOpen, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

interface FABAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
}

export function FloatingActionButton({ actions }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { subscriptionStatus } = useSubscription();

  const toggleMenu = () => {
    if (subscriptionStatus.isExpired) {
      // Faire clignoter le message d'expiration
      const message = document.getElementById('expiry-message');
      if (message) {
        message.classList.add('animate-pulse');
        setTimeout(() => {
          message.classList.remove('animate-pulse');
        }, 1000);
      }
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleActionClick = (action: FABAction) => {
    if (subscriptionStatus.isExpired) {
      // Faire clignoter le message d'expiration
      const message = document.getElementById('expiry-message');
      if (message) {
        message.classList.add('animate-pulse');
        setTimeout(() => {
          message.classList.remove('animate-pulse');
        }, 1000);
      }
      return;
    }
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6" style={{ zIndex: subscriptionStatus.isExpired ? 10 : 50 }}>
      {/* Menu d'actions */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 animate-fade-in">
          {actions.map((action, index) => (
            <div
              key={action.label}
              className="flex items-center gap-3 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="bg-background text-foreground px-3 py-1 rounded-lg shadow-lg text-sm whitespace-nowrap border">
                {action.label}
              </span>
              <Button
                size="sm"
                className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
                onClick={() => handleActionClick(action)}
              >
                <action.icon className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Bouton principal FAB */}
      <Button
        size="lg"
        className={cn(
          "h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-all duration-300",
          isOpen && "rotate-45",
          subscriptionStatus.isExpired && "opacity-60 cursor-not-allowed"
        )}
        onClick={toggleMenu}
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform duration-300" />
        ) : (
          <Plus className="h-6 w-6 transition-transform duration-300" />
        )}
      </Button>

      {/* Overlay pour fermer le menu */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}