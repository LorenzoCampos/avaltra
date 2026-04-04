import { useEffect, useState, useCallback, useRef } from 'react';
import Joyride, { type CallBackProps, STATUS, type Step, ACTIONS, EVENTS, LIFECYCLE } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { analytics } from '@/lib/analytics';

export const FeatureTour = () => {
  const { t } = useTranslation('tour');
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const preparingMenuRef = useRef(false);

  // Check if tour should run
  useEffect(() => {
    const tourCompleted = localStorage.getItem('tourCompleted') === 'true';
    const tourRequested = localStorage.getItem('tourRequested') === 'true';
    
    // Only start if: not completed, requested, and not already running
    if (!tourCompleted && tourRequested && !runTour) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        console.log('[FeatureTour] Starting tour...');
        setRunTour(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [runTour]);

  // Detect if mobile or desktop
  const isMobile = window.innerWidth < 768;
  
  console.log('[FeatureTour] Device type:', isMobile ? 'MOBILE' : 'DESKTOP');

  // Helper to check if MoreMenu is open
  const isMoreMenuOpen = useCallback(() => {
    return document.querySelector('[data-more-menu-backdrop="true"]') !== null;
  }, []);

  // Helper to open MoreMenu programmatically
  const openMoreMenu = useCallback(() => {
    if (isMoreMenuOpen()) {
      console.log('[FeatureTour] MoreMenu already open');
      return true;
    }
    
    const moreButton = document.querySelector('[data-more-menu-trigger="true"]') as HTMLButtonElement;
    if (moreButton) {
      console.log('[FeatureTour] Opening MoreMenu...');
      moreButton.click();
      return true;
    }
    console.warn('[FeatureTour] More button not found!');
    return false;
  }, [isMoreMenuOpen]);

  // Helper to close MoreMenu programmatically
  const closeMoreMenu = useCallback(() => {
    if (!isMoreMenuOpen()) {
      console.log('[FeatureTour] MoreMenu already closed');
      return true;
    }
    
    // Use backdrop click to close (more reliable than close button)
    const backdrop = document.querySelector('[data-more-menu-backdrop="true"]') as HTMLElement;
    
    if (backdrop) {
      console.log('[FeatureTour] Closing MoreMenu via backdrop...');
      // Temporarily mark as non-tour to allow close
      localStorage.setItem('tourAllowMenuClose', 'true');
      backdrop.click();
      setTimeout(() => localStorage.removeItem('tourAllowMenuClose'), 100);
      return true;
    }
    console.warn('[FeatureTour] Could not close MoreMenu - backdrop not found');
    return false;
  }, [isMoreMenuOpen]);

  // Define steps - different selectors for mobile vs desktop
  const steps: Step[] = isMobile
    ? [
        // Step 1: Available Balance
        {
          target: '[data-tour="available-balance"]',
          content: t('steps.availableBalance'),
          disableBeacon: true,
          placement: 'bottom',
        },
        // Step 2: Quick Actions
        {
          target: '[data-tour="quick-actions"]',
          content: t('steps.quickActions'),
          disableBeacon: true,
          placement: 'bottom',
        },
        // Step 3: Expenses (BottomNav - mobile only)
        {
          target: '[data-tour="expenses"]',
          content: t('steps.expenses'),
          disableBeacon: true,
          placement: 'top',
          disableScrolling: true,
        },
        // Step 4: Incomes (BottomNav - mobile only)
        {
          target: '[data-tour="incomes"]',
          content: t('steps.incomes'),
          disableBeacon: true,
          placement: 'top',
          disableScrolling: true,
        },
        // Step 5: Reports (MoreMenu) - will open menu automatically
        {
          target: '[data-tour="reports"]',
          content: t('steps.reports'),
          disableBeacon: true,
          placement: 'bottom',
        },
        // Step 6: Settings (MoreMenu)
        {
          target: '[data-tour="settings"]',
          content: t('steps.settings'),
          disableBeacon: true,
          placement: 'bottom',
        },
      ]
    : [
        // Desktop steps - use desktop-specific selectors
        {
          target: '[data-tour="available-balance"]',
          content: t('steps.availableBalance'),
          disableBeacon: true,
          placement: 'bottom',
        },
        {
          target: '[data-tour="quick-actions"]',
          content: t('steps.quickActions'),
          disableBeacon: true,
          placement: 'bottom',
        },
        {
          target: '[data-tour="expenses-desktop"]',
          content: t('steps.expenses'),
          disableBeacon: true,
          placement: 'right',
        },
        {
          target: '[data-tour="incomes-desktop"]',
          content: t('steps.incomes'),
          disableBeacon: true,
          placement: 'right',
        },
        {
          target: '[data-tour="reports-desktop"]',
          content: t('steps.reports'),
          disableBeacon: true,
          placement: 'right',
        },
        {
          target: '[data-tour="settings-desktop"]',
          content: t('steps.settings'),
          disableBeacon: true,
          placement: 'right',
        },
      ];

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type, lifecycle } = data;
    
    // Debug logging
    console.log('[FeatureTour] 📞 Callback:', { 
      status, 
      action, 
      index, 
      type, 
      lifecycle, 
      preparing: preparingMenuRef.current,
      isFinished: status === STATUS.FINISHED,
      isSkipped: status === STATUS.SKIPPED
    });
    
    // Handle target not found - critical for mobile
    if (type === EVENTS.TARGET_NOT_FOUND) {
      const step = steps[index];
      const target = step.target as string;
      
      console.error('[FeatureTour] ❌ TARGET NOT FOUND:', target, '(index:', index, ')');
      console.error('[FeatureTour] 🔍 All available data-tour elements:', 
        Array.from(document.querySelectorAll('[data-tour]')).map(el => el.getAttribute('data-tour'))
      );
      
      // If reports or settings not found in mobile, try opening MoreMenu
      if (isMobile && (target.includes('reports') || target.includes('settings'))) {
        if (!preparingMenuRef.current) {
          console.log('[FeatureTour] 🚪 Attempting to open MoreMenu due to missing target...');
          preparingMenuRef.current = true;
          
          // Pause tour
          setRunTour(false);
          
          // Open menu
          const opened = openMoreMenu();
          console.log('[FeatureTour] 🚪 Menu open result:', opened);
          
          if (opened) {
            // Wait longer for menu animation and element to render
            setTimeout(() => {
              const element = document.querySelector(target);
              console.log('[FeatureTour] ⏰ After 800ms, element found?', !!element);
              
              if (element) {
                console.log('[FeatureTour] ✅ Target found after opening menu:', target);
                console.log('[FeatureTour] 📍 Element details:', {
                  tag: element.tagName,
                  visible: element.offsetParent !== null,
                  rect: element.getBoundingClientRect()
                });
              } else {
                console.error('[FeatureTour] ❌ Target STILL not found after opening menu:', target);
              }
              
              // Resume tour regardless
              preparingMenuRef.current = false;
              setRunTour(true);
            }, 800);
          } else {
            console.error('[FeatureTour] ❌ Failed to open MoreMenu');
            preparingMenuRef.current = false;
            setRunTour(true);
          }
        }
      }
    }
    
    // Handle step lifecycle
    if (lifecycle === LIFECYCLE.COMPLETE && type === EVENTS.STEP_AFTER) {
      const currentStep = steps[index];
      const currentTarget = currentStep.target as string;
      
      console.log('[FeatureTour] ✅ Step completed:', index, currentTarget, 'action:', action);
      
      // Track analytics
      analytics.tourStepViewed(index + 1, currentTarget);
      
      // Handle CLOSE action (Finish button on last step)
      if (action === ACTIONS.CLOSE) {
        console.log('[FeatureTour] 🏁 CLOSE action detected (Finish button clicked)');
        
        // Force tour to finish
        setRunTour(false);
        setStepIndex(0);
        preparingMenuRef.current = false;
        
        localStorage.setItem('tourCompleted', 'true');
        localStorage.removeItem('tourRequested');
        
        // Close MoreMenu if open
        if (isMobile && isMoreMenuOpen()) {
          localStorage.setItem('tourAllowMenuClose', 'true');
          closeMoreMenu();
          setTimeout(() => localStorage.removeItem('tourAllowMenuClose'), 100);
        }
        
        analytics.tourCompleted();
        return; // Exit early
      }
      
      // Handle NEXT action
      if (action === ACTIONS.NEXT) {
        const nextIndex = index + 1;
        const nextStep = steps[nextIndex];
        
        if (nextStep) {
          const nextTarget = nextStep.target as string;
          
          // MOBILE: If moving TO reports (index 4) or settings (index 5), ensure MoreMenu is open
          if (isMobile && (nextTarget.includes('reports') || nextTarget.includes('settings'))) {
            console.log('[FeatureTour] 📋 Next step needs MoreMenu - ensuring it\'s open...');
            console.log('[FeatureTour] 🎯 Looking for target:', nextTarget);
            
            if (!isMoreMenuOpen()) {
              console.log('[FeatureTour] 🚪 MoreMenu is closed, opening it now...');
              
              // Pause tour
              setRunTour(false);
              preparingMenuRef.current = true;
              
              // Open menu
              const opened = openMoreMenu();
              console.log('[FeatureTour] 🚪 Menu open command sent:', opened);
              
              // Wait for menu animation + rendering (increased to 700ms for safety)
              setTimeout(() => {
                console.log('[FeatureTour] ⏰ Timeout complete, checking for element...');
                
                const element = document.querySelector(nextTarget);
                if (element) {
                  console.log('[FeatureTour] ✅ Target FOUND:', nextTarget);
                  console.log('[FeatureTour] 📍 Element position:', element.getBoundingClientRect());
                  
                  // Scroll to make it visible
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  
                  // Wait a bit more for scroll
                  setTimeout(() => {
                    console.log('[FeatureTour] 🚀 Advancing to step:', nextIndex);
                    preparingMenuRef.current = false;
                    setStepIndex(nextIndex);
                    setRunTour(true);
                  }, 200);
                } else {
                  console.error('[FeatureTour] ❌ Target NOT FOUND after opening menu:', nextTarget);
                  console.error('[FeatureTour] 🔍 Available tour elements:', 
                    Array.from(document.querySelectorAll('[data-tour]')).map(el => el.getAttribute('data-tour'))
                  );
                  
                  // Try to continue anyway
                  preparingMenuRef.current = false;
                  setStepIndex(nextIndex);
                  setRunTour(true);
                }
              }, 700);
            } else {
              console.log('[FeatureTour] ✅ MoreMenu already open, advancing directly');
              // Menu already open, just advance
              setStepIndex(nextIndex);
            }
          } else {
            // Normal step advancement
            console.log('[FeatureTour] ➡️ Normal step advancement to:', nextIndex);
            setStepIndex(nextIndex);
          }
        }
      }
      
      // Handle PREV action
      else if (action === ACTIONS.PREV) {
        const prevIndex = Math.max(0, index - 1);
        const prevStep = steps[prevIndex];
        
        if (prevStep) {
          const prevTarget = prevStep.target as string;
          
          // MOBILE: If moving BACK TO incomes (index 3) FROM reports (index 4), close MoreMenu
          if (isMobile && index === 4 && prevTarget.includes('incomes')) {
            console.log('[FeatureTour] Moving back to BottomNav - closing MoreMenu...');
            
            if (isMoreMenuOpen()) {
              // Pause tour
              setRunTour(false);
              preparingMenuRef.current = true;
              
              // Close menu
              closeMoreMenu();
              
              // Wait for menu to close
              setTimeout(() => {
                console.log('[FeatureTour] MoreMenu closed, going back to step:', prevIndex);
                
                // Resume tour
                preparingMenuRef.current = false;
                setStepIndex(prevIndex);
                setRunTour(true);
              }, 400);
            } else {
              // Menu already closed, just go back
              setStepIndex(prevIndex);
            }
          } else {
            // Normal step going back
            setStepIndex(prevIndex);
          }
        }
      }
    }
    
    // Track completion or skip
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      console.log('[FeatureTour] 🏁 Tour ending:', status);
      
      // Immediately stop the tour to prevent re-triggering
      setRunTour(false);
      setStepIndex(0);
      preparingMenuRef.current = false;
      
      // Mark as completed FIRST
      localStorage.setItem('tourCompleted', 'true');
      localStorage.removeItem('tourRequested');
      
      // Close MoreMenu if open
      if (isMobile && isMoreMenuOpen()) {
        console.log('[FeatureTour] 🚪 Closing MoreMenu after tour completion...');
        localStorage.setItem('tourAllowMenuClose', 'true');
        closeMoreMenu();
        setTimeout(() => localStorage.removeItem('tourAllowMenuClose'), 100);
      }
      
      // Track analytics
      if (status === STATUS.FINISHED) {
        console.log('[FeatureTour] ✅ Tour completed successfully');
        analytics.tourCompleted();
      } else {
        console.log('[FeatureTour] ⏭️ Tour skipped at step:', index + 1);
        analytics.tourSkipped(index + 1);
      }
    }
  }, [isMobile, steps, openMoreMenu, closeMoreMenu, isMoreMenuOpen]);

  if (!runTour) return null;

  return (
    <Joyride
      steps={steps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableScrolling={false}
      disableOverlayClose
      disableCloseOnEsc={false}
      spotlightClicks={true}
      scrollOffset={isMobile ? 100 : 150}
      scrollDuration={300}
      spotlightPadding={isMobile ? 4 : 10}
      callback={handleJoyrideCallback}
      locale={{
        back: t('controls.back'),
        close: t('controls.close'),
        last: t('controls.last'),
        next: t('controls.next'),
        skip: t('controls.skip'),
      }}
      styles={{
        options: {
          primaryColor: '#3B82F6',
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          textColor: '#333',
        },
        tooltip: {
          borderRadius: 8,
          fontSize: isMobile ? 15 : 14,
          padding: isMobile ? 16 : 20,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: isMobile ? '8px 0' : '4px 0',
        },
        buttonNext: {
          backgroundColor: '#3B82F6',
          borderRadius: 6,
          fontSize: isMobile ? 15 : 14,
          padding: isMobile ? '10px 20px' : '8px 16px',
        },
        buttonBack: {
          color: '#6B7280',
          fontSize: isMobile ? 15 : 14,
          marginRight: 8,
        },
        buttonSkip: {
          color: '#9CA3AF',
          fontSize: isMobile ? 14 : 13,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        },
      }}
    />
  );
};

// Helper to start the tour manually
export const startFeatureTour = () => {
  localStorage.setItem('tourRequested', 'true');
  // Trigger a page reload or navigation to dashboard
  window.location.href = '/dashboard';
};
