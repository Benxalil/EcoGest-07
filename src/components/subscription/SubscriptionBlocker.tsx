import React from 'react';
import { AlertCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export const SubscriptionBlocker = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Pages autorisées quand l'abonnement est expiré
  const allowedPages = ['/abonnement', '/parametres'];
  const isOnAllowedPage = allowedPages.includes(location.pathname);

  const handleChoosePlan = () => {
    navigate('/abonnement');
  };

  const handleInteraction = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Afficher le message d'expiration
    const message = document.getElementById('expiry-message');
    if (message) {
      message.classList.add('animate-pulse');
      setTimeout(() => {
        message.classList.remove('animate-pulse');
      }, 1000);
    }
  };

  // Empêcher toute navigation par clavier et raccourcis seulement si pas sur une page autorisée
  useEffect(() => {
    if (isOnAllowedPage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Empêcher Tab, F5, Ctrl+R, Ctrl+F5, etc.
      if (
        e.key === 'Tab' ||
        e.key === 'F5' ||
        (e.ctrlKey && (e.key === 'r' || e.key === 'R')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) ||
        (e.ctrlKey && e.key === 'F5')
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleInteraction(e);
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isOnAllowedPage]);

  return (
    <>
      {/* Overlay qui bloque les interactions SEULEMENT si pas sur une page autorisée */}
      {!isOnAllowedPage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/10 backdrop-blur-[0.5px]"
          onClick={handleInteraction}
          onContextMenu={handleInteraction}
          onMouseDown={handleInteraction}
          onTouchStart={handleInteraction}
          onKeyDown={handleInteraction}
          style={{ 
            cursor: 'not-allowed',
            userSelect: 'none',
            pointerEvents: 'all'
          }}
        />
      )}
      
      {/* Message d'expiration fixe en haut - toujours visible */}
      <div className="fixed top-0 left-0 right-0 z-[10000] bg-red-50 border-b-2 border-red-200 shadow-lg">
        <div 
          id="expiry-message"
          className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-red-800 font-semibold text-sm sm:text-base">
                Votre période d'essai gratuite de 30 jours a expiré.
              </span>
              <span className="text-red-700 ml-2 text-sm">
                Veuillez choisir un plan d'abonnement pour continuer à utiliser toutes les fonctionnalités.
              </span>
            </div>
          </div>
          <Button 
            onClick={handleChoosePlan}
            className="bg-red-600 hover:bg-red-700 text-white font-medium flex-shrink-0"
            size="sm"
          >
            <Star className="h-4 w-4 mr-2" />
            Choisir un plan
          </Button>
        </div>
      </div>
    </>
  );
};