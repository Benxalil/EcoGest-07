/**
 * Inline critical CSS to reduce render-blocking
 * This should contain minimal styles for above-the-fold content
 */

export const injectCriticalCSS = () => {
  if (typeof window === 'undefined' || document.getElementById('critical-css')) {
    return;
  }

  const criticalCSS = `
    /* Critical styles for initial render */
    *,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:currentColor}
    html{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif}
    body{margin:0;line-height:inherit}
    
    /* Loading spinner - critical for LCP */
    .flex{display:flex}
    .items-center{align-items:center}
    .justify-center{justify-content:center}
    .min-h-screen{min-height:100vh}
    .animate-spin{animation:spin 1s linear infinite}
    .rounded-full{border-radius:9999px}
    .h-12{height:3rem}
    .w-12{width:3rem}
    .border-b-2{border-bottom-width:2px}
    .border-primary{border-color:#150095}
    
    @keyframes spin{to{transform:rotate(360deg)}}
    
    /* Hide content until hydrated */
    #root{min-height:100vh}
  `;

  const style = document.createElement('style');
  style.id = 'critical-css';
  style.textContent = criticalCSS;
  document.head.insertBefore(style, document.head.firstChild);
};

// Auto-inject on module load
if (typeof window !== 'undefined') {
  injectCriticalCSS();
}
