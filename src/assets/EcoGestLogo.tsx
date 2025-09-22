const logoComplete = '/lovable-uploads/ab6574fa-0c03-4b18-a143-ccb2fefcf330.png';
const logoIcon = '/lovable-uploads/d0294ccf-3e95-4f9e-95cf-e735d3e2cd62.png';

export const EcoGestLogo = ({ size = 60 }: { size?: number }) => (
  <img 
    src={logoIcon} 
    alt="EcoGest Icon" 
    width={size} 
    height={size}
    className="object-contain"
  />
);

export const EcoGestFullLogo = ({ height = 50 }: { height?: number }) => (
  <img 
    src={logoComplete} 
    alt="EcoGest Logo" 
    height={height}
    className="object-contain"
  />
);