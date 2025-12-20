// Responsive layout hook for detecting screen size
import { useState, useEffect } from 'react';

type BreakPoint = 'mobile' | 'tablet' | 'desktop';

export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState<BreakPoint>('desktop');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width < 768) {
        setBreakpoint('mobile');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width >= 768 && width < 1024) {
        setBreakpoint('tablet');
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else {
        setBreakpoint('desktop');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { breakpoint, isMobile, isTablet, isDesktop };
};
