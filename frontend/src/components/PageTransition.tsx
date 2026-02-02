import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition Component
 * 
 * Adds smooth fade-in animation when navigating between routes.
 * Uses CSS animations for performance.
 */
export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'fadeOut'>('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setDisplayLocation(location);
      setTransitionStage('fadeIn');
    }
  };

  return (
    <div
      className={`${
        transitionStage === 'fadeIn' ? 'animate-fade-in' : 'animate-fade-out'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
};

/**
 * Simple Page Wrapper
 * Just adds fade-in on mount (simpler approach)
 */
export const PageFadeIn = ({ children }: PageTransitionProps) => {
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  );
};
