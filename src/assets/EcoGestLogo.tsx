import React from 'react';

const logoComplete = '/lovable-uploads/ab6574fa-0c03-4b18-a143-ccb2fefcf330.png';
const logoIcon = '/lovable-uploads/d0294ccf-3e95-4f9e-95cf-e735d3e2cd62.png';

export const EcoGestLogo = ({ size = 60 }: { size?: number }) => (
  <img 
    src={logoIcon} 
    alt="EcoGest Icon" 
    width={size} 
    height={size}
    className="object-contain"
    style={{
      imageRendering: 'crisp-edges',
      ...(({
        WebkitImageRendering: 'crisp-edges',
        msInterpolationMode: 'nearest-neighbor',
      }) as React.CSSProperties)
    }}
  />
);

export const EcoGestFullLogo = ({ height = 30 }: { height?: number }) => (
  <img 
    src={logoComplete} 
    alt="EcoGest Logo" 
    height={height}
    width="auto"
    className="object-contain"
    style={{
      imageRendering: 'crisp-edges',
      ...(({
        WebkitImageRendering: 'crisp-edges',
        msInterpolationMode: 'nearest-neighbor',
      }) as React.CSSProperties)
    }}
  />
);