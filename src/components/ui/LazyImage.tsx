import React, { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  showSkeleton?: boolean;
  width?: number | string;
  height?: number | string;
}

/**
 * Composant d'image avec lazy loading natif et fallback
 * ✅ Charge les images uniquement quand elles entrent dans le viewport
 * ✅ Affiche un skeleton pendant le chargement
 * ✅ Gère les erreurs avec une image de fallback
 * 
 * @example
 * ```tsx
 * <LazyImage
 *   src={student.photo}
 *   alt="Photo de l'élève"
 *   fallbackSrc="/default-avatar.png"
 *   className="w-20 h-20 rounded-full"
 * />
 * ```
 */
export const LazyImage = React.memo<LazyImageProps>(({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  showSkeleton = true,
  className,
  width,
  height,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setHasError(false);
    setImageSrc(null);

    // ✅ Utiliser IntersectionObserver pour détecter quand l'image entre dans le viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Charger l'image quand elle devient visible
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Commencer à charger 50px avant d'entrer dans le viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    setImageSrc(fallbackSrc);
  };

  return (
    <div className="relative inline-block" ref={imgRef}>
      {isLoading && showSkeleton && (
        <Skeleton className={className} />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={className}
          width={width || 'auto'}
          height={height || 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          style={{ display: isLoading ? 'none' : 'block' }}
          {...props}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
