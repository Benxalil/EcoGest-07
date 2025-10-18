import React from 'react';
import logoComplete from './logo-complete.webp';
import logoIcon from './logo-icon.webp';

export const EcoGestLogo = ({ size = 60 }: { size?: number }) => (
  <img 
    src={logoIcon} 
    alt="EcoGest Icon" 
    width={size} 
    height={size}
    className="object-contain"
    loading="eager"
    decoding="async"
  />
);

export const EcoGestFullLogo = ({ height = 30 }: { height?: number }) => {
  // Aspect ratio: 2.15:1 (based on WebP dimensions)
  const width = Math.round(height * 2.15);
  
  return (
    <img 
      src={logoComplete} 
      alt="EcoGest Logo" 
      height={height}
      width={width}
      className="object-contain"
      loading="eager"
      decoding="async"
      fetchPriority="high"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
};