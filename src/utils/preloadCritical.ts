/**
 * Preload critical resources to reduce network chain length
 * This helps break the critical rendering path
 */

export const preloadCriticalData = async () => {
  // This will be called early in the app lifecycle
  // to start fetching critical data before components mount
  
  if (typeof window === 'undefined') return;

  try {
    // Preload font files if any
    const fonts = [
      // Add any custom fonts here
    ];

    fonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = fontUrl;
      document.head.appendChild(link);
    });

    // Mark as preloaded
    window.__CRITICAL_PRELOADED__ = true;
  } catch (error) {
    console.error('Error preloading critical resources:', error);
  }
};

// Auto-execute on module load
if (typeof window !== 'undefined' && !window.__CRITICAL_PRELOADED__) {
  preloadCriticalData();
}

declare global {
  interface Window {
    __CRITICAL_PRELOADED__?: boolean;
  }
}
